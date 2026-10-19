from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.db import models


class User(AbstractUser):
    ROLE_CUSTOMER = "customer"
    ROLE_STAFF = "staff"
    ROLE_ADMIN = "admin"

    ROLE_CHOICES = (
        (ROLE_CUSTOMER, "Customer"),
        (ROLE_STAFF, "Staff"),
        (ROLE_ADMIN, "Admin"),
    )

    CUSTOMER_GROUP_ALL = "all"
    CUSTOMER_GROUP_NEW = "new"
    CUSTOMER_GROUP_VIP = "vip"
    CUSTOMER_GROUP_LOYAL = "loyal"

    CUSTOMER_GROUP_CHOICES = (
        (CUSTOMER_GROUP_ALL, "All Customers"),
        (CUSTOMER_GROUP_NEW, "New Customer"),
        (CUSTOMER_GROUP_VIP, "VIP"),
        (CUSTOMER_GROUP_LOYAL, "Loyal Customer"),
    )

    # =========================
    # Authentication / RBAC
    # =========================
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_CUSTOMER,
    )

    # =========================
    # Marketing segmentation
    # =========================
    customer_group = models.CharField(
        max_length=20,
        choices=CUSTOMER_GROUP_CHOICES,
        default=CUSTOMER_GROUP_ALL,
    )

    # =========================
    # Customer information
    # =========================
    birthday = models.DateField(
        null=True,
        blank=True,
    )

    phone = models.CharField(
        max_length=20,
        null=True,
        blank=True,
    )

    # =========================
    # Customer statistics
    # =========================
    total_spent = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )

    total_orders = models.PositiveIntegerField(
        default=0,
    )

    last_order_date = models.DateTimeField(
        null=True,
        blank=True,
    )

    points = models.PositiveIntegerField(
        default=0,
    )

    def __str__(self):
        return self.username