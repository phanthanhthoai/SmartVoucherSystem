from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="products/", blank=True)
    product_type = models.CharField(max_length=100)
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return self.name


class Order(models.Model):
    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_CANCELED = "canceled"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_CANCELED, "Canceled"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders",
    )

    external_order_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )

    created_at = models.DateTimeField(auto_now_add=True)

    applied_voucher = models.ForeignKey(
        "vouchers.Voucher",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="applied_orders",
    )

    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )

    def __str__(self):
        return self.external_order_id or f"Order {self.id}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )

    name = models.CharField(max_length=255)

    product_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
    )

    product_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
    )

    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )

    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )

    @property
    def line_total(self):
        return self.quantity * self.unit_price