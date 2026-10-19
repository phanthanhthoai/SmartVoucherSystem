from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import get_random_string


def generate_unique_voucher_code():
    while True:
        code = f"VC-{get_random_string(10).upper()}"
        if not Voucher.objects.filter(code=code).exists():
            return code

class Campaign(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_ACTIVE = "active"
    STATUS_PAUSED = "paused"
    STATUS_COMPLETED = "completed"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_PAUSED, "Paused"),
        (STATUS_COMPLETED, "Completed"),
    ]

    name = models.CharField(max_length=255)

    description = models.TextField(
        blank=True,
    )

    start_at = models.DateTimeField()

    end_at = models.DateTimeField()

    budget = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_campaigns",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return self.name

    
class Voucher(models.Model):
    code = models.CharField(
        max_length=50,
        unique=True,
        default=generate_unique_voucher_code,
    )

    campaign = models.ForeignKey(
        "vouchers.Campaign",
        on_delete=models.PROTECT,
        related_name="vouchers",
        null=True,
        blank=True,
    )

    title = models.CharField(max_length=255)

    discount_type = models.CharField(
        max_length=20,
        choices=[
            ("percent", "Percent"),
            ("fixed", "Fixed"),
        ],
    )

    discount_value = models.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    max_discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )

    release_date = models.DateTimeField(
        default=timezone.now,
    )

    expiry_date = models.DateTimeField()

    quantity = models.PositiveIntegerField(
        default=1,
    )

    used_count = models.PositiveIntegerField(
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
    )

    is_deleted = models.BooleanField(
        default=False,
    )

    event_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return self.code


class VoucherRule(models.Model):
    voucher = models.OneToOneField(
        Voucher,
        on_delete=models.CASCADE,
        related_name="rule",
    )

    # =========================
    # Customer segmentation
    # =========================
    customer_group = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=[
            ("all", "All"),
            ("new", "New Customer"),
            ("vip", "VIP"),
            ("loyal", "Loyal Customer"),
        ],
    )

    # LEGACY - chưa xóa trong Phase 1
    required_role = models.CharField(
        max_length=50,
        null=True,
        blank=True,
    )

    birthday_only = models.BooleanField(
        default=False,
    )

    # =========================
    # Accumulated history
    # =========================
    min_accumulated_spent = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
    )

    min_accumulated_orders = models.PositiveIntegerField(
        default=0,
    )

    target_month = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    target_year = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
    )

    lookback_days = models.PositiveIntegerField(
        default=0,
    )

    # =========================
    # Order conditions
    # =========================
    min_order_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
    )

    min_items = models.PositiveIntegerField(
        default=0,
    )

    required_product_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
    )

    # =========================
    # Existing time rule
    # =========================
    period_type = models.CharField(
        max_length=10,
        choices=[
            ("day", "Day"),
            ("week", "Week"),
            ("month", "Month"),
        ],
        null=True,
        blank=True,
    )

    # =========================
    # NEW: Golden hour
    # =========================
    start_time = models.TimeField(
        null=True,
        blank=True,
    )

    end_time = models.TimeField(
        null=True,
        blank=True,
    )

    # =========================
    # NEW: Buy X Get Y
    # =========================
    buy_quantity = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    get_quantity = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    get_product_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
    )

class UserVoucher(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    voucher = models.ForeignKey(Voucher, on_delete=models.CASCADE)

    is_used = models.BooleanField(default=False)
    assigned_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "voucher")


class VoucherUsage(models.Model):
    user_voucher = models.ForeignKey(
        UserVoucher,
        on_delete=models.CASCADE,
        related_name="usages",
    )

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="voucher_usages",
    )

    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
    )

    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user_voucher", "order"],
                name="uniq_voucher_usage_per_order",
            ),
        ]

class VoucherDistributionPlan(models.Model):
    STATUS_PENDING = "pending"
    STATUS_COMPLETED = "completed"
    STATUS_SKIPPED_EXPIRED = "skipped_expired"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_SKIPPED_EXPIRED, "Skipped Expired"),
    ]

    voucher = models.OneToOneField(
        Voucher,
        on_delete=models.CASCADE,
        related_name="distribution_plan"
    )
    user_ids = models.JSONField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    distributed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class VoucherEventLog(models.Model):
    EVENT_TYPE_ORDER_SUCCESS = "order_success"
    STATUS_PROCESSED = "processed"
    STATUS_SKIPPED = "skipped"

    STATUS_CHOICES = [
        (STATUS_PROCESSED, "Processed"),
        (STATUS_SKIPPED, "Skipped"),
    ]

    event_id = models.CharField(max_length=100, unique=True)
    event_type = models.CharField(max_length=50, default=EVENT_TYPE_ORDER_SUCCESS)
    order_id = models.IntegerField()
    user_id = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PROCESSED)
    payload = models.JSONField(null=True, blank=True)
    result = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class VoucherDeliveryLog(models.Model):
    CHANNEL_EMAIL = "email"
    CHANNEL_SMS = "sms"
    CHANNEL_WEBHOOK = "webhook"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_SKIPPED_NO_EMAIL = "skipped_no_email"
    STATUS_SKIPPED_NO_PHONE = "skipped_no_phone"

    CHANNEL_CHOICES = [
        (CHANNEL_EMAIL, "Email"),
        (CHANNEL_SMS, "SMS"),
        (CHANNEL_WEBHOOK, "Webhook"),
    ]
    STATUS_CHOICES = [
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
        (STATUS_SKIPPED_NO_EMAIL, "Skipped No Email"),
        (STATUS_SKIPPED_NO_PHONE, "Skipped No Phone"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    voucher = models.ForeignKey(Voucher, on_delete=models.CASCADE)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default=CHANNEL_EMAIL)
    recipient = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class VoucherFraudEvent(models.Model):
    """Audit trail for voucher attempts that are blocked or considered risky."""

    STATUS_ALLOWED = "allowed"
    STATUS_BLOCKED = "blocked"

    STATUS_CHOICES = [
        (STATUS_ALLOWED, "Allowed"),
        (STATUS_BLOCKED, "Blocked"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="voucher_fraud_events",
    )
    voucher = models.ForeignKey(
        Voucher,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fraud_events",
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="voucher_fraud_events",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_fingerprint_hash = models.CharField(max_length=64, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    reason = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["device_fingerprint_hash", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
        ]
