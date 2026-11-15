from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from unittest import skipIf
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.conf import settings
from django.db import close_old_connections, connection
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from redis import Redis
from redis.exceptions import RedisError
from rest_framework.test import APIClient

from orders.models import Product
from vouchers.models import UserVoucher, Voucher, VoucherRule, VoucherUsage
from vouchers.services.locks import (
    VoucherRedemptionLockUnavailable,
    voucher_redemption_lock,
)

class VoucherRedemptionLockTests(TestCase):
    def test_lock_is_acquired_and_released(self):
        client = MagicMock()
        lock = client.lock.return_value
        lock.acquire.return_value = True

        with patch("vouchers.services.locks.Redis.from_url", return_value=client):
            with voucher_redemption_lock(42):
                lock.acquire.assert_called_once_with(blocking=True)

        client.lock.assert_called_once()
        lock.release.assert_called_once()
        client.close.assert_called_once()

    def test_lock_failure_is_not_silently_ignored(self):
        client = MagicMock()
        client.lock.return_value.acquire.side_effect = RedisError("redis down")

        with patch("vouchers.services.locks.Redis.from_url", return_value=client):
            with self.assertRaises(VoucherRedemptionLockUnavailable):
                with voucher_redemption_lock(42):
                    self.fail("Lock must be acquired before redeeming.")

        client.close.assert_called_once()


@skipIf(connection.vendor != "mysql", "Concurrency proof requires MySQL row locks.")
@override_settings(VOUCHER_REDEMPTION_MAX_ATTEMPTS=1000)
class VoucherConcurrentRedemptionTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        cache_config = settings.CACHES["default"]
        if "redis.RedisCache" not in cache_config.get("BACKEND", ""):
            self.skipTest("Concurrency proof requires the shared Redis backend.")
        redis_client = Redis.from_url(
            cache_config["LOCATION"],
            socket_connect_timeout=1,
        )
        try:
            redis_client.ping()
        except RedisError:
            self.skipTest("Concurrency proof requires a reachable Redis service.")
        finally:
            redis_client.close()

        self.user_model = get_user_model()
        users = [
            self.user_model(username=f"voucher_race_{index}")
            for index in range(100)
        ]
        self.user_model.objects.bulk_create(users)
        self.user_ids = list(
            self.user_model.objects.filter(
                username__startswith="voucher_race_"
            ).order_by("id").values_list("id", flat=True)
        )

        self.product = Product.objects.create(
            name="Race test product",
            product_type="test",
            unit_price=Decimal("100.00"),
        )
        self.voucher = Voucher.objects.create(
            title="Five remaining",
            discount_type="fixed",
            discount_value=Decimal("10.00"),
            release_date=timezone.now(),
            expiry_date=timezone.now() + timedelta(days=1),
            quantity=5,
        )
        VoucherRule.objects.create(voucher=self.voucher)
        UserVoucher.objects.bulk_create([
            UserVoucher(user_id=user_id, voucher=self.voucher)
            for user_id in self.user_ids
        ])

    def test_one_hundred_simultaneous_checkouts_cannot_oversell_five_uses(self):
        def checkout(index, user_id):
            close_old_connections()
            try:
                user = self.user_model.objects.get(pk=user_id)
                client = APIClient()
                client.force_authenticate(user=user)
                return client.post(
                    "/api/vouchers/checkout/",
                    {
                        "external_order_id": f"voucher-race-{index}",
                        "items": [{
                            "product_id": self.product.pk,
                            "quantity": 1,
                        }],
                        "voucher_code": self.voucher.code,
                    },
                    format="json",
                    REMOTE_ADDR=f"10.20.0.{index + 1}",
                    HTTP_X_DEVICE_FINGERPRINT=f"voucher-race-device-{index}",
                )
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=100) as executor:
            responses = list(executor.map(
                lambda item: checkout(*item),
                enumerate(self.user_ids),
            ))

        successful = [response for response in responses if response.status_code == 201]
        self.assertEqual(len(successful), 5)
        self.voucher.refresh_from_db()
        self.assertEqual(self.voucher.used_count, 5)
        self.assertEqual(
            VoucherUsage.objects.filter(
                user_voucher__voucher=self.voucher
            ).count(),
            5,
        )
        self.assertGreaterEqual(
            sum(response.status_code != 201 for response in responses),
            95,
        )
