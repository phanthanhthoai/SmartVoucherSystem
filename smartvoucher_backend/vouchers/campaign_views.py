from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsStaffOrAdmin
from .models import Campaign
from .serializers import CampaignSerializer


class CampaignListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        campaigns = Campaign.objects.annotate(
            voucher_count=Count("vouchers")
        ).select_related("created_by").order_by("-created_at")
        serializer = CampaignSerializer(campaigns, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CampaignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        campaign = serializer.save(created_by=request.user)
        return Response(
            CampaignSerializer(campaign, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CampaignDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get_object(self, campaign_id):
        return get_object_or_404(
            Campaign.objects.annotate(voucher_count=Count("vouchers")).select_related("created_by"),
            id=campaign_id,
        )

    def get(self, request, campaign_id):
        campaign = self.get_object(campaign_id)
        return Response(CampaignSerializer(campaign).data)

    def patch(self, request, campaign_id):
        campaign = self.get_object(campaign_id)
        serializer = CampaignSerializer(campaign, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        campaign = serializer.save()
        return Response(CampaignSerializer(campaign).data)

    def delete(self, request, campaign_id):
        campaign = self.get_object(campaign_id)
        if campaign.vouchers.exists():
            raise ValidationError({
                "campaign": "Không thể xóa chiến dịch đang có voucher liên kết."
            })
        campaign.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
