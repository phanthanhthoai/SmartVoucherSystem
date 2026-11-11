from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from vouchers.models import (
    UserVoucher,
    Voucher,
    VoucherDistributionPlan,
    VoucherRule,
)
from vouchers.services.distribution import process_due_distribution_plans


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class DistributionSchedulerTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="distribution_customer",
            password="Strong-password-123!",
            email="customer@example.com",
        )

    def create_plan(self, *, active=True, expiry_days=5):
        voucher = Voucher.objects.create(
            title="Scheduled voucher",
            discount_type="fixed",
            discount_value=Decimal("1000.00"),
            release_date=timezone.now() - timedelta(minutes=2),
            expiry_date=timezone.now() + timedelta(days=expiry_days),
            quantity=10,
            is_active=active,
        )
        VoucherRule.objects.create(voucher=voucher)
        plan = VoucherDistributionPlan.objects.create(voucher=voucher)
        return voucher, plan

    def test_due_pending_plan_is_distributed(self):
        voucher, plan = self.create_plan()

        processed = process_due_distribution_plans()

        plan.refresh_from_db()
        self.assertEqual(processed, 1)
        self.assertEqual(plan.status, VoucherDistributionPlan.STATUS_COMPLETED)
        self.assertTrue(UserVoucher.objects.filter(user=self.user, voucher=voucher).exists())

    def test_paused_plan_stays_pending(self):
        _, plan = self.create_plan(active=False)

        processed = process_due_distribution_plans()

        plan.refresh_from_db()
        self.assertEqual(processed, 0)
        self.assertEqual(plan.status, VoucherDistributionPlan.STATUS_PENDING)

    def test_expired_plan_is_marked_skipped(self):
        _, plan = self.create_plan(expiry_days=-1)

        processed = process_due_distribution_plans()

        plan.refresh_from_db()
        self.assertEqual(processed, 1)
        self.assertEqual(
            plan.status,
            VoucherDistributionPlan.STATUS_SKIPPED_EXPIRED,
        )
