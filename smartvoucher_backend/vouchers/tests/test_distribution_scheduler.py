from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from vouchers.models import (
    Campaign,
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

    def test_campaign_plan_waits_until_campaign_starts(self):
        now = timezone.now()
        campaign = Campaign.objects.create(
            name="Scheduled campaign",
            start_at=now + timedelta(hours=1),
            end_at=now + timedelta(days=1),
            status=Campaign.STATUS_ACTIVE,
            created_by=self.user,
        )
        voucher = Voucher.objects.create(
            campaign=campaign,
            title="Campaign voucher",
            discount_type="fixed",
            discount_value=Decimal("1000.00"),
            release_date=now - timedelta(minutes=2),
            expiry_date=now + timedelta(days=2),
            quantity=10,
        )
        VoucherRule.objects.create(voucher=voucher)
        plan = VoucherDistributionPlan.objects.create(voucher=voucher)

        process_due_distribution_plans()

        plan.refresh_from_db()
        self.assertEqual(plan.status, VoucherDistributionPlan.STATUS_PENDING)
        self.assertFalse(UserVoucher.objects.filter(user=self.user, voucher=voucher).exists())

        campaign.start_at = now - timedelta(minutes=1)
        campaign.save(update_fields=["start_at"])

        process_due_distribution_plans()

        plan.refresh_from_db()
        self.assertEqual(plan.status, VoucherDistributionPlan.STATUS_COMPLETED)
        self.assertTrue(UserVoucher.objects.filter(user=self.user, voucher=voucher).exists())
