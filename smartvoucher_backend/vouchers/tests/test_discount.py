from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from orders.models import Order, OrderItem
from vouchers.models import Voucher, VoucherRule
from vouchers.services.discount import calculate_discount_amount


User = get_user_model()


class DiscountCalculatorTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="discount_test_user",
            password="test-password-123",
        )

        self.order = Order.objects.create(
            user=self.user,
            status=Order.STATUS_PENDING,
            total_amount=Decimal("100.00"),
            discount_amount=Decimal("0.00"),
        )

        # Voucher giảm 10%.
        self.voucher = Voucher.objects.create(
            title="Discount 10 Percent",
            discount_type="percent",
            discount_value=Decimal("10.00"),
            quantity=100,
            used_count=0,
            is_active=True,
            expiry_date=timezone.now() + timedelta(days=7),
        )

        OrderItem.objects.create(
            order=self.order,
            name="Product A",
            product_type="food",
            quantity=2,
            unit_price=Decimal("30.00"),
        )

        OrderItem.objects.create(
            order=self.order,
            name="Product B",
            product_type="beverage",
            quantity=2,
            unit_price=Decimal("20.00"),
        )

    def test_percent_discount(self):
        """Giảm 10% trên tổng giá trị 100."""
        discount = calculate_discount_amount(
            self.voucher,
            self.order,
        )

        self.assertEqual(discount, Decimal("10.00"))

    def test_fixed_discount_cannot_exceed_order_value(self):
        """Voucher giảm cố định không thể giảm quá giá trị đơn."""
        self.voucher.discount_type = "fixed"
        self.voucher.discount_value = Decimal("200.00")
        self.voucher.save(
            update_fields=["discount_type", "discount_value"]
        )

        discount = calculate_discount_amount(
            self.voucher,
            self.order,
        )

        self.assertEqual(discount, Decimal("100.00"))

    def test_percent_discount_respects_max_discount(self):
        """Giảm 50% nhưng bị giới hạn tối đa 15."""
        self.voucher.discount_value = Decimal("50.00")
        self.voucher.max_discount_amount = Decimal("15.00")
        self.voucher.save(
            update_fields=[
                "discount_value",
                "max_discount_amount",
            ]
        )

        discount = calculate_discount_amount(
            self.voucher,
            self.order,
        )

        self.assertEqual(discount, Decimal("15.00"))

    def test_discount_only_applies_to_required_product_type(self):
        """Voucher chỉ áp dụng cho các sản phẩm thuộc loại beverage."""
        VoucherRule.objects.create(
            voucher=self.voucher,
            required_product_type="beverage",
        )

        discount = calculate_discount_amount(
            self.voucher,
            self.order,
        )

        # Hai sản phẩm beverage, mỗi sản phẩm 20:
        # 40 * 10% = 4.
        self.assertEqual(discount, Decimal("4.00"))