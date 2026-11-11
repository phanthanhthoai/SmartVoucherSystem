from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from orders.models import Order, Product
from vouchers.models import Voucher, VoucherRule, VoucherUsage, UserVoucher
from vouchers.serializers import VoucherRuleSerializer
from vouchers.services.rule_engine import check_accumulated_condition
from vouchers.views import (
    CheckoutAPIView,
    ConfirmOrderAPIView,
    VoucherProductCatalogAPIView,
)


class CheckoutTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        Product.objects.all().delete()
        Product.objects.update_or_create(
            id=1,
            defaults={
                "name": "Test Candy",
                "product_type": "candy",
                "unit_price": "25000",
                "is_active": True,
            },
        )
        Product.objects.update_or_create(
            id=2,
            defaults={
                "name": "Test Drink",
                "product_type": "drink",
                "unit_price": "45000",
                "is_active": True,
            },
        )
        self.user = get_user_model().objects.create_user(
            username="checkout_customer",
            password="Strong-password-123!",
        )

    def test_checkout_uses_catalog_instead_of_client_product_data(self):
        request = self.factory.post(
            "/api/vouchers/checkout/",
            {
                "external_order_id": "checkout-1",
                "total_amount": "50000.00",
                "items": [{
                    "product_id": 1,
                    "name": "Forged item name",
                    "product_type": "drink",
                    "quantity": 2,
                    "unit_price": "1.00",
                }],
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = CheckoutAPIView.as_view()(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], Order.STATUS_PAID)
        order = Order.objects.get(external_order_id="checkout-1")
        self.assertEqual(order.status, Order.STATUS_PAID)
        item = order.items.get()
        self.assertEqual(order.total_amount, Decimal("50000.00"))
        self.assertEqual(item.name, "Test Candy")
        self.assertEqual(item.product_type, "candy")
        self.assertEqual(item.unit_price, Decimal("25000.00"))
        self.assertEqual(item.product_id, 1)

    def test_staff_can_list_active_product_catalog(self):
        staff = get_user_model().objects.create_user(
            username="catalog_staff",
            password="Strong-password-123!",
            role="staff",
            is_staff=True,
        )
        request = self.factory.get("/api/vouchers/products/")
        force_authenticate(request, user=staff)

        response = VoucherProductCatalogAPIView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            [
                {"id": 1, "name": "Test Candy", "product_type": "candy"},
                {"id": 2, "name": "Test Drink", "product_type": "drink"},
            ],
        )

    def test_checkout_applies_discount_to_specific_product_only(self):
        voucher = Voucher.objects.create(
            title="Candy only",
            discount_type="percent",
            discount_value=Decimal("10.00"),
            release_date=timezone.now() - timedelta(days=1),
            expiry_date=timezone.now() + timedelta(days=1),
            quantity=5,
        )
        VoucherRule.objects.create(voucher=voucher, required_product_id=1)
        UserVoucher.objects.create(user=self.user, voucher=voucher)
        request = self.factory.post(
            "/api/vouchers/checkout/",
            {
                "external_order_id": "specific-product-discount",
                "items": [
                    {"product_id": 1, "quantity": 1},
                    {"product_id": 2, "quantity": 1},
                ],
                "voucher_code": voucher.code,
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = CheckoutAPIView.as_view()(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["receipt"]["subtotal"], "70000.00")
        self.assertEqual(response.data["receipt"]["discount"], "2500.00")
        order = Order.objects.get(external_order_id="specific-product-discount")
        self.assertEqual(order.status, Order.STATUS_PAID)
        user_voucher = UserVoucher.objects.get(user=self.user, voucher=voucher)
        self.assertTrue(user_voucher.is_used)
        self.assertEqual(
            VoucherUsage.objects.get(order=order).discount_amount,
            Decimal("2500.00"),
        )
        self.assertEqual(
            list(order.items.order_by("product_id").values_list("product_id", flat=True)),
            [1, 2],
        )

    def test_checkout_marks_order_paid_without_admin_confirmation(self):
        request = self.factory.post(
            "/api/vouchers/checkout/",
            {
                "external_order_id": "auto-paid-checkout",
                "items": [{"product_id": 1, "quantity": 1}],
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = CheckoutAPIView.as_view()(request)

        order = Order.objects.get(external_order_id="auto-paid-checkout")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], Order.STATUS_PAID)
        self.assertEqual(order.status, Order.STATUS_PAID)

    def test_checkout_allows_accumulation_eligible_customer_to_apply_voucher(self):
        Order.objects.create(
            user=self.user,
            status=Order.STATUS_PAID,
            total_amount=Decimal("25000.00"),
            discount_amount=Decimal("5000.00"),
        )
        voucher = Voucher.objects.create(
            title="Accumulation eligible",
            discount_type="fixed",
            discount_value=Decimal("3000.00"),
            release_date=timezone.now() - timedelta(days=1),
            expiry_date=timezone.now() + timedelta(days=1),
            quantity=5,
        )
        VoucherRule.objects.create(
            voucher=voucher,
            min_accumulated_orders=1,
            min_accumulated_spent=Decimal("20000.00"),
        )
        UserVoucher.objects.create(user=self.user, voucher=voucher)
        request = self.factory.post(
            "/api/vouchers/checkout/",
            {
                "external_order_id": "accumulation-eligible-checkout",
                "items": [{"product_id": 1, "quantity": 1}],
                "voucher_code": voucher.code,
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = CheckoutAPIView.as_view()(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["receipt"]["discount"], "3000.00")

    def test_checkout_does_not_count_discounted_subtotal_as_accumulated_spend(self):
        Order.objects.create(
            user=self.user,
            status=Order.STATUS_PAID,
            total_amount=Decimal("25000.00"),
            discount_amount=Decimal("10000.00"),
        )
        voucher = Voucher.objects.create(
            title="Accumulation threshold",
            discount_type="fixed",
            discount_value=Decimal("3000.00"),
            release_date=timezone.now() - timedelta(days=1),
            expiry_date=timezone.now() + timedelta(days=1),
            quantity=5,
        )
        VoucherRule.objects.create(
            voucher=voucher,
            min_accumulated_orders=1,
            min_accumulated_spent=Decimal("20000.00"),
        )
        UserVoucher.objects.create(user=self.user, voucher=voucher)
        request = self.factory.post(
            "/api/vouchers/checkout/",
            {
                "external_order_id": "accumulation-below-threshold",
                "items": [{"product_id": 1, "quantity": 1}],
                "voucher_code": voucher.code,
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = CheckoutAPIView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            Order.objects.filter(
                external_order_id="accumulation-below-threshold"
            ).exists()
        )

    def test_checkout_rejects_unknown_catalog_product(self):
        request = self.factory.post(
            "/api/vouchers/checkout/",
            {
                "items": [{"product_id": 999, "quantity": 1}],
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = CheckoutAPIView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_customer_cannot_confirm_payment(self):
        order = Order.objects.create(
            user=self.user,
            status=Order.STATUS_PENDING,
            total_amount=Decimal("100.00"),
        )
        request = self.factory.post(
            f"/api/vouchers/orders/{order.id}/confirm/"
        )
        force_authenticate(request, user=self.user)

        response = ConfirmOrderAPIView.as_view()(request, order_id=order.id)

        order.refresh_from_db()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(order.status, Order.STATUS_PENDING)

    def test_staff_can_manually_confirm_pending_order(self):
        staff = get_user_model().objects.create_user(
            username="checkout_staff",
            password="Strong-password-123!",
            role="staff",
            is_staff=True,
        )
        order = Order.objects.create(
            user=self.user,
            status=Order.STATUS_PENDING,
            total_amount=Decimal("100.00"),
        )
        request = self.factory.post(
            f"/api/vouchers/orders/{order.id}/confirm/"
        )
        force_authenticate(request, user=staff)

        response = ConfirmOrderAPIView.as_view()(request, order_id=order.id)

        order.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.status, Order.STATUS_PAID)


    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_staff_confirmation_redeems_applied_voucher_and_issues_accumulation_reward(self):
        staff = get_user_model().objects.create_user(
            username="voucher_confirm_staff",
            password="Strong-password-123!",
            role="staff",
            is_staff=True,
        )
        voucher = Voucher.objects.create(
            title="Test discount",
            discount_type="fixed",
            discount_value=Decimal("5000.00"),
            release_date=timezone.now() - timedelta(days=1),
            expiry_date=timezone.now() + timedelta(days=1),
            quantity=5,
        )
        VoucherRule.objects.create(voucher=voucher)
        user_voucher = UserVoucher.objects.create(user=self.user, voucher=voucher)
        accumulated_reward = Voucher.objects.create(
            title="Accumulation reward",
            discount_type="fixed",
            discount_value=Decimal("3000.00"),
            release_date=timezone.now() - timedelta(days=1),
            expiry_date=timezone.now() + timedelta(days=1),
            quantity=5,
            event_type="order_success",
        )
        VoucherRule.objects.create(
            voucher=accumulated_reward,
            min_accumulated_orders=1,
            min_accumulated_spent=Decimal("20000.00"),
        )
        order = Order.objects.create(
            user=self.user,
            status=Order.STATUS_PENDING,
            total_amount=Decimal("25000.00"),
            applied_voucher=voucher,
        )
        self.assertFalse(
            UserVoucher.objects.filter(
                user=self.user,
                voucher=accumulated_reward,
            ).exists()
        )
        order.items.create(
            name="Test Candy",
            product_type="candy",
            quantity=1,
            unit_price=Decimal("25000.00"),
        )
        request = self.factory.post(
            f"/api/vouchers/orders/{order.id}/confirm/"
        )
        force_authenticate(request, user=staff)

        response = ConfirmOrderAPIView.as_view()(request, order_id=order.id)

        order.refresh_from_db()
        user_voucher.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertTrue(user_voucher.is_used)
        self.assertTrue(
            UserVoucher.objects.filter(
                user=self.user,
                voucher=accumulated_reward,
            ).exists()
        )
        voucher.refresh_from_db()
        self.assertEqual(voucher.used_count, 1)

        stats_client = APIClient()
        stats_client.force_authenticate(user=staff)
        admin_orders = stats_client.get("/api/orders/admin/", {"status": "paid"})
        self.assertEqual(admin_orders.status_code, 200)
        self.assertEqual(admin_orders.data[0]["id"], order.id)
        self.assertEqual(admin_orders.data[0]["status"], Order.STATUS_PAID)

        overview = stats_client.get("/api/vouchers/stats/overview/")
        self.assertEqual(overview.status_code, 200)
        self.assertEqual(overview.data["total_used"], 1)
        self.assertEqual(overview.data["total_discount_amount"], 5000.0)
        self.assertEqual(overview.data["gross_revenue"], 25000.0)
        self.assertEqual(overview.data["net_revenue"], 20000.0)

        today = timezone.now().date().isoformat()
        performance = stats_client.get(
            "/api/vouchers/stats/performance/",
            {"start_date": today, "end_date": today},
        )
        voucher_stats = next(
            item for item in performance.data["results"]
            if item["voucher_id"] == voucher.id
        )
        self.assertEqual(voucher_stats["usage_count"], 1)
        self.assertEqual(voucher_stats["total_discount_amount"], Decimal("5000.00"))

    def test_accumulation_counts_only_paid_orders_and_actual_paid_amount(self):
        rule = VoucherRule.objects.create(
            voucher=Voucher.objects.create(
                title="Accumulation rule",
                discount_type="fixed",
                discount_value=Decimal("1000.00"),
                expiry_date=timezone.now() + timedelta(days=1),
            ),
            min_accumulated_orders=2,
            min_accumulated_spent=Decimal("30000.00"),
        )
        Order.objects.create(
            user=self.user,
            status=Order.STATUS_PAID,
            total_amount=Decimal("25000.00"),
            discount_amount=Decimal("5000.00"),
        )
        Order.objects.create(
            user=self.user,
            status=Order.STATUS_PENDING,
            total_amount=Decimal("50000.00"),
        )
        Order.objects.create(
            user=self.user,
            status=Order.STATUS_CANCELED,
            total_amount=Decimal("50000.00"),
        )

        self.assertFalse(check_accumulated_condition(self.user, rule, Order))
        Order.objects.create(
            user=self.user,
            status=Order.STATUS_PAID,
            total_amount=Decimal("15000.00"),
        )
        self.assertTrue(check_accumulated_condition(self.user, rule, Order))

    def test_accumulation_window_cannot_mix_lookback_and_calendar_period(self):
        serializer = VoucherRuleSerializer(data={
            "lookback_days": 30,
            "target_month": 11,
            "min_accumulated_spent": "0",
            "min_accumulated_orders": 0,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("lookback_days", serializer.errors)


class ProductManagementTests(TestCase):
    def setUp(self):
        Product.objects.all().delete()
        self.client = APIClient()
        self.staff = get_user_model().objects.create_user(
            username="product_staff",
            password="test-password",
            role="staff",
            is_staff=True,
        )

    def test_public_catalog_only_returns_active_products(self):
        active = Product.objects.create(
            name="Active product",
            product_type="candy",
            unit_price=Decimal("1000.00"),
        )
        Product.objects.create(
            name="Inactive product",
            product_type="candy",
            unit_price=Decimal("2000.00"),
            is_active=False,
        )

        response = self.client.get("/api/products/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [active.id])

    def test_product_crud_requires_staff_and_delete_is_soft(self):
        payload = {
            "name": "Managed product",
            "description": "Description",
            "product_type": "drink",
            "unit_price": "25000.00",
            "is_active": True,
        }
        self.assertEqual(self.client.post("/api/products/", payload).status_code, 401)

        self.client.force_authenticate(user=self.staff)
        created = self.client.post("/api/products/", payload, format="json")
        self.assertEqual(created.status_code, 201)
        product_id = created.data["id"]

        updated = self.client.patch(
            f"/api/products/{product_id}/",
            {"unit_price": "30000.00"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["unit_price"], "30000.00")

        deleted = self.client.delete(f"/api/products/{product_id}/")
        self.assertEqual(deleted.status_code, 200)
        self.assertTrue(Product.objects.filter(pk=product_id).exists())
        self.assertFalse(Product.objects.get(pk=product_id).is_active)
