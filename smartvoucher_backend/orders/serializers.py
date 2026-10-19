from decimal import Decimal

from rest_framework import serializers


class OrderItemInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    product_type = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)


class OrderSyncSerializer(serializers.Serializer):
    external_order_id = serializers.CharField(max_length=100)
    user_id = serializers.IntegerField(min_value=1)
    status = serializers.ChoiceField(
        choices=["pending", "paid", "canceled"],
        required=False,
        default="pending",
    )
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    items = OrderItemInputSerializer(many=True, allow_empty=True, required=False)

    def validate(self, attrs):
        items = attrs.get("items")
        status = attrs.get("status", "pending")
        if status != "canceled" and not items:
            raise serializers.ValidationError({
                "items": "Đơn hàng không bị hủy phải có ít nhất một sản phẩm."
            })
        if items:
            calculated_total = sum(
                (item["unit_price"] * item["quantity"] for item in items),
                Decimal("0.00"),
            )
            if attrs["total_amount"] != calculated_total:
                raise serializers.ValidationError({
                    "total_amount": "Tổng tiền phải khớp với các dòng sản phẩm."
                })
        return attrs


class OrderCancelSerializer(serializers.Serializer):
    external_order_id = serializers.CharField(max_length=100)
