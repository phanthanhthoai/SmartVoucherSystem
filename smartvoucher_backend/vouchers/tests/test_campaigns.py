from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from vouchers.campaign_views import CampaignDetailAPIView, CampaignListCreateAPIView
from vouchers.models import Campaign, Voucher


class CampaignAPITests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        user_model = get_user_model()
        self.staff = user_model.objects.create_user(
            username="campaign_staff",
            password="Strong-password-123!",
            role="staff",
            is_staff=True,
        )
        self.customer = user_model.objects.create_user(
            username="campaign_customer",
            password="Strong-password-123!",
            role="customer",
        )
        self.start_at = timezone.now() + timedelta(days=1)
        self.end_at = self.start_at + timedelta(days=10)

    def test_staff_can_create_campaign(self):
        request = self.factory.post(
            "/api/vouchers/campaigns/",
            {
                "name": "Summer Sale",
                "description": "Summer campaign",
                "start_at": self.start_at.isoformat(),
                "end_at": self.end_at.isoformat(),
                "budget": "100000.00",
                "status": Campaign.STATUS_DRAFT,
            },
            format="json",
        )
        force_authenticate(request, user=self.staff)

        response = CampaignListCreateAPIView.as_view()(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "Summer Sale")
        self.assertEqual(response.data["created_by"], self.staff.username)
        self.assertEqual(Campaign.objects.get().budget, Decimal("100000.00"))

    def test_customer_cannot_create_campaign(self):
        request = self.factory.post(
            "/api/vouchers/campaigns/",
            {
                "name": "Summer Sale",
                "start_at": self.start_at.isoformat(),
                "end_at": self.end_at.isoformat(),
            },
            format="json",
        )
        force_authenticate(request, user=self.customer)

        response = CampaignListCreateAPIView.as_view()(request)

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Campaign.objects.exists())

    def test_campaign_dates_must_be_ordered(self):
        request = self.factory.post(
            "/api/vouchers/campaigns/",
            {
                "name": "Invalid dates",
                "start_at": self.end_at.isoformat(),
                "end_at": self.start_at.isoformat(),
            },
            format="json",
        )
        force_authenticate(request, user=self.staff)

        response = CampaignListCreateAPIView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Campaign.objects.exists())

    def test_campaign_budget_cannot_be_negative(self):
        request = self.factory.post(
            "/api/vouchers/campaigns/",
            {
                "name": "Invalid budget",
                "start_at": self.start_at.isoformat(),
                "end_at": self.end_at.isoformat(),
                "budget": "-1.00",
            },
            format="json",
        )
        force_authenticate(request, user=self.staff)

        response = CampaignListCreateAPIView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Campaign.objects.exists())

    def test_staff_can_update_campaign(self):
        campaign = Campaign.objects.create(
            name="Old name",
            start_at=self.start_at,
            end_at=self.end_at,
            created_by=self.staff,
        )
        request = self.factory.patch(
            f"/api/vouchers/campaigns/{campaign.id}/",
            {"name": "New name", "status": Campaign.STATUS_ACTIVE},
            format="json",
        )
        force_authenticate(request, user=self.staff)

        response = CampaignDetailAPIView.as_view()(request, campaign_id=campaign.id)

        campaign.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(campaign.name, "New name")
        self.assertEqual(campaign.status, Campaign.STATUS_ACTIVE)

    def test_campaign_with_vouchers_cannot_be_deleted(self):
        campaign = Campaign.objects.create(
            name="Linked campaign",
            start_at=self.start_at,
            end_at=self.end_at,
            created_by=self.staff,
        )
        Voucher.objects.create(
            campaign=campaign,
            title="Campaign voucher",
            discount_type="fixed",
            discount_value=Decimal("10.00"),
            expiry_date=self.end_at,
        )
        request = self.factory.delete(f"/api/vouchers/campaigns/{campaign.id}/")
        force_authenticate(request, user=self.staff)

        response = CampaignDetailAPIView.as_view()(request, campaign_id=campaign.id)

        self.assertEqual(response.status_code, 400)
        self.assertTrue(Campaign.objects.filter(id=campaign.id).exists())
