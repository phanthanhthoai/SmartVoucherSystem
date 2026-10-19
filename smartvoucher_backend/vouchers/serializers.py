from django.db import transaction
from rest_framework import serializers
from .models import Voucher, UserVoucher, VoucherRule

class UserVoucherSerializer(serializers.ModelSerializer):
    voucher_id = serializers.IntegerField(source="voucher.id")
    voucher_code = serializers.CharField(source="voucher.code")
    voucher_title = serializers.CharField(source="voucher.title")
    discount_type = serializers.CharField(source="voucher.discount_type")
    discount_value = serializers.FloatField(source="voucher.discount_value")
    expiry_date = serializers.DateTimeField(source="voucher.expiry_date")
    remaining_uses = serializers.SerializerMethodField()

    class Meta:
        model = UserVoucher
        fields = [
            "id",
            "voucher_id",
            "voucher_code",
            "voucher_title",
            "discount_type",
            "discount_value",
            "expiry_date",
            "is_used",
            "assigned_at",
            "used_at",
            "remaining_uses",
        ]

    def get_remaining_uses(self, obj):
        return 0 if obj.is_used else 1


class CheckVoucherSerializer(serializers.Serializer):
    voucher_code = serializers.CharField()
    order_total = serializers.DecimalField(max_digits=10, decimal_places=2)


class OrderSuccessEventSerializer(serializers.Serializer):
    event_id = serializers.CharField(max_length=100)
    user_id = serializers.IntegerField(min_value=1)
    order_id = serializers.IntegerField(min_value=1)
    status = serializers.ChoiceField(choices=["paid", "success"])
    total_amount = serializers.FloatField(min_value=0)
    paid_at = serializers.DateTimeField(required=False)
    items = serializers.ListField(child=serializers.DictField(), allow_empty=False)


class VoucherRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoucherRule
        fields = [
            "customer_group",
            "required_role",
            "birthday_only",
            "min_order_amount",
            "min_items",
            "required_product_type",
            "period_type",
            "lookback_days",
            "min_accumulated_spent",
            "min_accumulated_orders",
            "target_month",
            "target_year",
            "start_time",
            "end_time",
            "buy_quantity",
            "get_quantity",
            "get_product_type",
        ]

    def validate(self, attrs):
        start_time = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if (start_time is None) != (end_time is None):
            raise serializers.ValidationError(
                "Cần cấu hình cả giờ bắt đầu và giờ kết thúc cho khung giờ vàng."
            )

        buy_quantity = attrs.get("buy_quantity", getattr(self.instance, "buy_quantity", None))
        get_quantity = attrs.get("get_quantity", getattr(self.instance, "get_quantity", None))
        if bool(buy_quantity) != bool(get_quantity):
            raise serializers.ValidationError(
                "Mua X tặng Y cần có cả số lượng mua và số lượng tặng."
            )
        if buy_quantity is not None and buy_quantity <= 0:
            raise serializers.ValidationError({"buy_quantity": "Phải lớn hơn 0."})
        if get_quantity is not None and get_quantity <= 0:
            raise serializers.ValidationError({"get_quantity": "Phải lớn hơn 0."})
        return attrs


class CreateVoucherSerializer(serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True)
    rule = VoucherRuleSerializer()
    

    class Meta:
        model = Voucher
        fields = [
            "code",
            "title",
            "discount_type",
            "discount_value",
            "max_discount_amount",
            "release_date",
            "expiry_date",
            "quantity",
            "event_type",
            "is_active",
            "rule",
        ]

    def validate(self, attrs):
        if attrs["expiry_date"] <= attrs["release_date"]:
            raise serializers.ValidationError({
                "expiry_date": "Ngày hết hạn phải sau ngày phát hành."
            })
        if attrs["discount_type"] == "percent" and attrs["discount_value"] > 100:
            raise serializers.ValidationError({
                "discount_value": "Giảm theo phần trăm không được vượt quá 100%."
            })
        if attrs["discount_value"] <= 0:
            raise serializers.ValidationError({
                "discount_value": "Giá trị giảm phải lớn hơn 0."
            })
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        rule_data = validated_data.pop("rule")
        code = validated_data.get("code")
        if code == "":
            validated_data.pop("code")
        voucher = Voucher.objects.create(**validated_data)
        VoucherRule.objects.create(voucher=voucher, **rule_data)
        return voucher


class CreateAndDistributeVoucherSerializer(CreateVoucherSerializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True
    )

    class Meta(CreateVoucherSerializer.Meta):
        fields = CreateVoucherSerializer.Meta.fields + ["user_ids"]

    def create(self, validated_data):
        user_ids = validated_data.pop("user_ids", None)
        voucher = super().create(validated_data)
        voucher._distribution_user_ids = user_ids
        return voucher


class UpdateVoucherSerializer(serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True)
    rule = VoucherRuleSerializer(required=False)

    class Meta:
        model = Voucher
        fields = [
            "code",
            "title",
            "discount_type",
            "discount_value",
            "max_discount_amount",
            "release_date",
            "expiry_date",
            "quantity",
            "event_type",
            "is_active",
            "rule",
        ]

    def update(self, instance, validated_data):
        rule_data = validated_data.pop("rule", None)
        code = validated_data.get("code")

        if code == "":
            validated_data.pop("code")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if rule_data is not None:
            rule, _ = VoucherRule.objects.get_or_create(voucher=instance)
            for attr, value in rule_data.items():
                setattr(rule, attr, value)
            rule.save()

        return instance
