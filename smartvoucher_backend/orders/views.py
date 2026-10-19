from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsStaffOrAdmin

from .models import Order, OrderItem
from .serializers import OrderCancelSerializer, OrderSyncSerializer


class SyncOrderAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = OrderSyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        is_staff = (
            request.user.is_superuser
            or getattr(request.user, "role", None) in {"staff", "admin"}
        )
        if data["user_id"] != request.user.id and not is_staff:
            return Response(
                {"error": "Bạn chỉ có thể đồng bộ đơn hàng của chính mình."},
                status=403,
            )

        User = get_user_model()
        try:
            user = User.objects.get(id=data["user_id"])
        except User.DoesNotExist:
            return Response({"error": "User khong ton tai"}, status=404)

        order = (
            Order.objects.select_for_update()
            .filter(external_order_id=data["external_order_id"])
            .first()
        )
        created = order is None

        if order is not None:
            if order.user_id != user.id:
                return Response(
                    {"error": "external_order_id đã thuộc về khách hàng khác."},
                    status=409,
                )
            if order.status in {Order.STATUS_PAID, Order.STATUS_CANCELED}:
                return Response(
                    {"error": "Không thể sửa đơn hàng đã hoàn tất hoặc đã hủy."},
                    status=409,
                )
            order.status = data["status"]
            order.total_amount = data["total_amount"]
            order.save(update_fields=["status", "total_amount"])
        else:
            order = Order.objects.create(
                external_order_id=data["external_order_id"],
                user=user,
                status=data["status"],
                total_amount=data["total_amount"],
            )

        items = data.get("items", [])
        OrderItem.objects.filter(order=order).delete()
        if data["status"] != Order.STATUS_CANCELED:
            for item in items:
                OrderItem.objects.create(
                    order=order,
                    name=item["name"],
                    product_type=item.get("product_type"),
                    quantity=item["quantity"],
                    unit_price=item["unit_price"],
                )

        return Response(
            {
                "message": "Order synced",
                "order_id": order.id,
                "external_order_id": order.external_order_id,
                "status": order.status,
                "created": created,
            },
            status=201 if created else 200,
        )


class CancelOrderAPIView(APIView):
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    @transaction.atomic
    def post(self, request):
        serializer = OrderCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        external_order_id = serializer.validated_data["external_order_id"]

        try:
            order = Order.objects.select_for_update().get(
                external_order_id=external_order_id
            )
        except Order.DoesNotExist:
            return Response({"error": "Order khong ton tai"}, status=404)

        if order.status == Order.STATUS_PAID:
            return Response(
                {"error": "Không thể hủy đơn đã thanh toán; cần xử lý hoàn tiền riêng."},
                status=409,
            )
        if order.status == Order.STATUS_CANCELED:
            return Response(
                {"message": "Đơn hàng đã được hủy.", "order_id": order.id,
                 "external_order_id": order.external_order_id, "status": order.status}
            )

        order.status = Order.STATUS_CANCELED
        order.save(update_fields=["status"])

        return Response(
            {
                "message": "Order canceled",
                "order_id": order.id,
                "external_order_id": order.external_order_id,
                "status": order.status,
            }
        )
