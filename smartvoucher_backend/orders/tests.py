from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from vouchers.models import Voucher

from .models import Order, OrderItem
from .serializers import OrderSyncSerializer
from .views import MyOrdersAPIView, SyncOrderAPIView


class OrderSyncTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="order_customer",
            password="Strong-password-123!",
        )
        self.factory = APIRequestFactory()

    def test_sync_rejects_client_marked_paid_order(self):
        serializer = OrderSyncSerializer(data={
            "external_order_id": "external-paid-1",
            "user_id": self.user.id,
            "status": "paid",
            "total_amount": "100.00",
            "items": [{
                "name": "item",
                "quantity": 1,
                "unit_price": "100.00",
            }],
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("status", serializer.errors)

    def test_customer_can_sync_only_pending_order(self):
        request = self.factory.post(
            "/api/orders/sync/",
            {
                "external_order_id": "external-pending-1",
                "user_id": self.user.id,
                "status": "pending",
                "total_amount": "100.00",
                "items": [{
                    "name": "item",
                    "quantity": 1,
                    "unit_price": "100.00",
                }],
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = SyncOrderAPIView.as_view()(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            Order.objects.get(external_order_id="external-pending-1").status,
            Order.STATUS_PENDING,
        )

    def test_customer_can_list_only_their_own_orders(self):
        other_user = get_user_model().objects.create_user(
            username="another_customer",
            password="Strong-password-123!",
        )
        own_order = Order.objects.create(
            user=self.user,
            external_order_id="mine-1",
            status=Order.STATUS_PENDING,
            total_amount=Decimal("100.00"),
            discount_amount=Decimal("10.00"),
        )
        other_order = Order.objects.create(
            user=other_user,
            external_order_id="other-1",
            total_amount=Decimal("200.00"),
        )
        OrderItem.objects.create(
            order=own_order,
            name="Sample item",
            product_type="drink",
            quantity=2,
            unit_price=Decimal("50.00"),
        )
        request = self.factory.get("/api/orders/mine/")
        force_authenticate(request, user=self.user)

        response = MyOrdersAPIView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], own_order.id)
        self.assertEqual(response.data[0]["final_total"], "90.00")
        self.assertEqual(response.data[0]["items"][0]["line_total"], "100.00")
        self.assertNotEqual(response.data[0]["id"], other_order.id)

    def test_order_history_includes_voucher_details(self):
        voucher = Voucher.objects.create(
            title="Order discount",
            discount_type="fixed",
            discount_value=Decimal("10.00"),
            expiry_date=timezone.now() + timedelta(days=1),
        )
        order = Order.objects.create(
            user=self.user,
            external_order_id="mine-voucher",
            total_amount=Decimal("100.00"),
            discount_amount=Decimal("10.00"),
            applied_voucher=voucher,
        )
        request = self.factory.get("/api/orders/mine/")
        force_authenticate(request, user=self.user)

        response = MyOrdersAPIView.as_view()(request)

        self.assertEqual(response.data[0]["id"], order.id)
        self.assertEqual(response.data[0]["applied_voucher"]["code"], voucher.code)
