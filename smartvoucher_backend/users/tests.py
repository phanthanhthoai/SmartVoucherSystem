from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import TestCase
from unittest.mock import patch
from rest_framework.test import APIRequestFactory, force_authenticate
from orders.models import Order

from .views import (
    CustomerListAPI,
    DeleteUserAPI,
    StaffListAPI,
    StaffRegisterAPI,
    UpdateUserPermissionsAPI,
    UpdateUserRoleAPI,
    UserUpdateAPI,
)


class UserAuthorizationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.User = get_user_model()
        self.staff_user = self.User.objects.create_user(
            username="staff1",
            email="staff@example.com",
            password="password123",
            role="staff",
            is_staff=True,
        )
        self.customer_user = self.User.objects.create_user(
            username="customer1",
            email="customer@example.com",
            password="password123",
            role="customer",
        )

    def test_staff_can_get_customer_list(self):
        request = self.factory.get("/api/users/customers/")
        force_authenticate(request, user=self.staff_user)

        response = CustomerListAPI.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["role"], "customer")

    def test_customer_cannot_get_customer_list(self):
        request = self.factory.get("/api/users/customers/")
        force_authenticate(request, user=self.customer_user)

        response = CustomerListAPI.as_view()(request)

        self.assertEqual(response.status_code, 403)

    def test_staff_can_update_user_role_and_is_staff_flag(self):
        request = self.factory.patch(
            f"/api/users/{self.customer_user.id}/role/",
            {"role": "staff"},
            format="json",
        )
        force_authenticate(request, user=self.staff_user)

        response = UpdateUserRoleAPI.as_view()(request, user_id=self.customer_user.id)

        self.customer_user.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.customer_user.role, "staff")
        self.assertTrue(self.customer_user.is_staff)

    def test_staff_cannot_promote_user_to_admin(self):
        request = self.factory.patch(
            f"/api/users/{self.customer_user.id}/role/",
            {"role": "admin"},
            format="json",
        )
        force_authenticate(request, user=self.staff_user)

        response = UpdateUserRoleAPI.as_view()(request, user_id=self.customer_user.id)

        self.customer_user.refresh_from_db()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.customer_user.role, "customer")

    def test_staff_registration_requires_admin(self):
        request = self.factory.post(
            "/api/users/staff-register/",
            {
                "username": "newstaff",
                "email": "newstaff@example.com",
                "password": "Strong-password-123!",
            },
            format="json",
        )
        force_authenticate(request, user=self.staff_user)

        response = StaffRegisterAPI.as_view()(request)

        self.assertEqual(response.status_code, 403)

    def test_admin_can_register_staff(self):
        admin_user = self.User.objects.create_user(
            username="admin_register",
            email="admin-register@example.com",
            password="Strong-password-123!",
            role="admin",
            is_staff=True,
        )
        request = self.factory.post(
            "/api/users/staff-register/",
            {
                "username": "newstaff",
                "email": "newstaff@example.com",
                "password": "Strong-password-123!",
            },
            format="json",
        )
        force_authenticate(request, user=admin_user)

        response = StaffRegisterAPI.as_view()(request)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(self.User.objects.filter(username="newstaff", role="staff").exists())

    def test_seed_admin_requires_explicit_credentials(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(CommandError):
                call_command("seed_admin")

    def test_admin_can_update_direct_permissions(self):
        admin_user = self.User.objects.create_user(
            username="admin_permissions",
            email="admin-permissions@example.com",
            password="Strong-password-123!",
            role="admin",
            is_staff=True,
        )
        permission = Permission.objects.first()
        self.assertIsNotNone(permission)

        request = self.factory.patch(
            f"/api/users/{self.customer_user.id}/permissions/",
            {
                "permissions": [
                    f"{permission.content_type.app_label}.{permission.codename}",
                ],
                "groups": [],
            },
            format="json",
        )
        force_authenticate(request, user=admin_user)

        response = UpdateUserPermissionsAPI.as_view()(request, user_id=self.customer_user.id)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.customer_user.user_permissions.filter(id=permission.id).exists())

    def test_staff_cannot_update_direct_permissions(self):
        request = self.factory.patch(
            f"/api/users/{self.customer_user.id}/permissions/",
            {"permissions": [], "groups": []},
            format="json",
        )
        force_authenticate(request, user=self.staff_user)

        response = UpdateUserPermissionsAPI.as_view()(request, user_id=self.customer_user.id)

        self.assertEqual(response.status_code, 403)

    def test_staff_can_soft_delete_customer(self):
        request = self.factory.delete(f"/api/users/{self.customer_user.id}/")
        force_authenticate(request, user=self.staff_user)

        response = DeleteUserAPI.as_view()(request, user_id=self.customer_user.id)

        self.customer_user.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertFalse(self.customer_user.is_active)

    def test_cannot_delete_admin_user(self):
        admin_user = self.User.objects.create_user(
            username="admin1",
            email="admin@example.com",
            password="password123",
            role="admin",
            is_staff=True,
        )
        request = self.factory.delete(f"/api/users/{admin_user.id}/")
        force_authenticate(request, user=self.staff_user)

        response = DeleteUserAPI.as_view()(request, user_id=admin_user.id)

        admin_user.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertTrue(admin_user.is_active)

    def test_staff_list_hides_inactive_users(self):
        inactive_staff = self.User.objects.create_user(
            username="staff2",
            email="staff2@example.com",
            password="password123",
            role="staff",
            is_staff=True,
            is_active=False,
        )
        request = self.factory.get("/api/users/staff/")
        force_authenticate(request, user=self.staff_user)

        response = StaffListAPI.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(all(user["id"] != inactive_staff.id for user in response.data))

    def test_customer_list_hides_inactive_users(self):
        self.customer_user.is_active = False
        self.customer_user.save(update_fields=["is_active"])

        request = self.factory.get("/api/users/customers/")
        force_authenticate(request, user=self.staff_user)

        response = CustomerListAPI.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 0)

    def test_customer_admin_accumulation_uses_paid_orders_after_discounts(self):
        self.customer_user.total_spent = Decimal("999999.00")
        self.customer_user.save(update_fields=["total_spent"])
        Order.objects.create(
            user=self.customer_user,
            status=Order.STATUS_PAID,
            total_amount=Decimal("100.00"),
            discount_amount=Decimal("10.00"),
        )
        Order.objects.create(
            user=self.customer_user,
            status=Order.STATUS_PAID,
            total_amount=Decimal("80.00"),
            discount_amount=Decimal("20.00"),
        )
        Order.objects.create(
            user=self.customer_user,
            status=Order.STATUS_PENDING,
            total_amount=Decimal("500.00"),
        )

        request = self.factory.get("/api/users/customers/")
        force_authenticate(request, user=self.staff_user)
        response = CustomerListAPI.as_view()(request)

        customer = response.data["results"][0]
        self.assertEqual(Decimal(customer["total_spent"]), Decimal("150.00"))
        self.assertEqual(customer["paid_order_count"], 2)
        self.assertEqual(response.data["total_spent"], Decimal("150.00"))
        self.assertEqual(response.data["paid_order_count"], 2)

    def test_admin_cannot_manually_override_order_derived_total_spent(self):
        admin_user = self.User.objects.create_user(
            username="customer_stats_admin",
            email="customer-stats-admin@example.com",
            role="admin",
            is_staff=True,
        )
        request = self.factory.patch(
            f"/api/users/{self.customer_user.id}/update/",
            {"total_spent": "100000.00"},
            format="json",
        )
        force_authenticate(request, user=admin_user)

        response = UserUpdateAPI.as_view()(request, user_id=self.customer_user.id)

        self.customer_user.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.customer_user.total_spent, Decimal("0.00"))
