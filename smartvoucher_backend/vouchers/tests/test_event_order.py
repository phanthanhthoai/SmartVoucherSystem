from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from vouchers.models import UserVoucher, Voucher, VoucherRule
from vouchers.views import ProcessOrderSuccessEventAPIView


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class OrderSuccessEventTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = get_user_model().objects.create_user(
            username="event_admin",
            password="Strong-password-123!",
            role="admin",
            is_staff=True,
        )
        self.customer = get_user_model().objects.create_user(
            username="event_customer",
            password="Strong-password-123!",
        )
        self.voucher = Voucher.objects.create(
            title="Drink event voucher",
            discount_type="fixed",
            discount_value=Decimal("5000.00"),
            release_date=timezone.now() - timedelta(days=1),
            expiry_date=timezone.now() + timedelta(days=1),
            quantity=10,
            event_type="order_success",
        )
        VoucherRule.objects.create(
            voucher=self.voucher,
            required_product_type="drink",
            min_order_amount=Decimal("100.00"),
        )

    def test_order_event_evaluates_dictionary_items_and_assigns_voucher(self):
        request = self.factory.post(
            "/api/vouchers/events/order-success/",
            {
                "event_id": "event-001",
                "user_id": self.customer.id,
                "order_id": 1001,
                "status": "paid",
                "total_amount": "100.00",
                "items": [{
                    "name": "Tea",
                    "product_type": "drink",
                    "quantity": 2,
                    "unit_price": "50.00",
                }],
            },
            format="json",
        )
        force_authenticate(request, user=self.admin)

        response = ProcessOrderSuccessEventAPIView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["assigned_vouchers"], [self.voucher.code])
        self.assertTrue(
            UserVoucher.objects.filter(user=self.customer, voucher=self.voucher).exists()
        )
