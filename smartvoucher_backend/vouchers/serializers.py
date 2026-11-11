from decimal import Decimal

from django.db import transaction
from rest_framework import serializers
from orders.models import Product
from .models import Campaign, Voucher, UserVoucher, VoucherRule


class CampaignSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source="created_by.username", read_only=True)
    voucher_count = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            "id",
            "name",
            "description",
            "start_at",
            "end_at",
            "budget",
            "status",
            "created_by",
            "voucher_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "voucher_count", "created_at", "updated_at"]

    def validate(self, attrs):
        start_at = attrs.get("start_at", getattr(self.instance, "start_at", None))
        end_at = attrs.get("end_at", getattr(self.instance, "end_at", None))
        budget = attrs.get("budget", getattr(self.instance, "budget", None))
        if budget is not None and budget < 0:
            raise serializers.ValidationError({
                "budget": "Ngân sách không được âm."
            })
        if start_at is not None and end_at is not None and end_at <= start_at:
            raise serializers.ValidationError({
                "end_at": "Ngày kết thúc phải sau ngày bắt đầu."
            })
        return attrs

    def get_voucher_count(self, obj):
        if hasattr(obj, "voucher_count"):
            return obj.voucher_count
        return obj.vouchers.count()

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
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)
    paid_at = serializers.DateTimeField(required=False)
    items = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
    )

    def validate_items(self, items):
        validated_items = []
        errors = []
        for index, item in enumerate(items):
            item_serializer = OrderSuccessEventItemSerializer(data=item)
            if not item_serializer.is_valid():
                errors.append({index: item_serializer.errors})
            else:
                item_data = item_serializer.validated_data
                item_data.setdefault("product_type", None)
                item_data.setdefault("product_id", None)
                validated_items.append(item_data)
        if errors:
            raise serializers.ValidationError(errors)
        return validated_items

    def validate(self, attrs):
        item_total = sum(
            (
                item["unit_price"] * item["quantity"]
                for item in attrs["items"]
            ),
            Decimal("0.00"),
        )
        if item_total != attrs["total_amount"]:
            raise serializers.ValidationError({
                "total_amount": "Tổng tiền phải khớp với các dòng sản phẩm."
            })
        return attrs


class OrderSuccessEventItemSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    product_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    product_type = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0)


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
            "required_product_id",
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

        min_accumulated_spent = attrs.get(
            "min_accumulated_spent",
            getattr(self.instance, "min_accumulated_spent", Decimal("0")),
        )
        min_accumulated_orders = attrs.get(
            "min_accumulated_orders",
            getattr(self.instance, "min_accumulated_orders", 0),
        )
        if min_accumulated_spent < 0:
            raise serializers.ValidationError({
                "min_accumulated_spent": "Không được là số âm."
            })
        if min_accumulated_orders < 0:
            raise serializers.ValidationError({
                "min_accumulated_orders": "Không được là số âm."
            })

        lookback_days = attrs.get(
            "lookback_days",
            getattr(self.instance, "lookback_days", 0),
        )
        target_month = attrs.get(
            "target_month",
            getattr(self.instance, "target_month", None),
        )
        target_year = attrs.get(
            "target_year",
            getattr(self.instance, "target_year", None),
        )
        if target_month is not None and not 1 <= target_month <= 12:
            raise serializers.ValidationError({
                "target_month": "Tháng phải nằm trong khoảng 1 đến 12."
            })
        if target_year is not None and target_year < 1:
            raise serializers.ValidationError({
                "target_year": "Năm phải lớn hơn 0."
            })
        if lookback_days and (target_month is not None or target_year is not None):
            raise serializers.ValidationError({
                "lookback_days": "Chọn số ngày lùi hoặc tháng/năm, không dùng đồng thời."
            })

        product_id = attrs.get(
            "required_product_id",
            getattr(self.instance, "required_product_id", None),
        )
        product_type = attrs.get(
            "required_product_type",
            getattr(self.instance, "required_product_type", None),
        )
        if product_id is not None:
            product = Product.objects.filter(pk=product_id).first()
            if product is None:
                raise serializers.ValidationError({
                    "required_product_id": "Sản phẩm không tồn tại."
                })
            if (
                product_type
                and product.product_type.casefold() != product_type.casefold()
            ):
                raise serializers.ValidationError({
                    "required_product_id": "Sản phẩm không thuộc danh mục đã chọn."
                })
        return attrs


class CreateVoucherSerializer(serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True)
    campaign = serializers.PrimaryKeyRelatedField(
        queryset=Campaign.objects.all(),
        required=False,
        allow_null=True,
    )
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
            "campaign",
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
    campaign = serializers.PrimaryKeyRelatedField(
        queryset=Campaign.objects.all(),
        required=False,
        allow_null=True,
    )
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
            "campaign",
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
