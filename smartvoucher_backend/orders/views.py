from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsStaffOrAdmin

from .models import Order, OrderItem, Product
from .serializers import OrderCancelSerializer, OrderSyncSerializer, ProductSerializer


class ProductListCreateAPIView(APIView):
    def get_permissions(self):
        if self.request.method == "POST" or self.request.query_params.get("include_inactive") == "true":
            return [IsStaffOrAdmin()]
        return [AllowAny()]

    def get(self, request):
        include_inactive = request.query_params.get("include_inactive") == "true"
        products = Product.objects.all()
        if not include_inactive:
            products = products.filter(is_active=True)
        return Response(ProductSerializer(products, many=True).data)

    def post(self, request):
        serializer = ProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)


class ProductDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get_object(self, product_id):
        return get_object_or_404(Product, pk=product_id)

    def patch(self, request, product_id):
        product = self.get_object(product_id)
        serializer = ProductSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, product_id):
        product = self.get_object(product_id)
        if not product.is_active:
            return Response({"message": "Sản phẩm đã ngừng kinh doanh."})
        product.is_active = False
        product.save(update_fields=["is_active", "updated_at"])
        return Response({"message": "Đã ngừng kinh doanh sản phẩm."})


class MyOrdersAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = (
            Order.objects.filter(user=request.user)
            .select_related("applied_voucher")
            .prefetch_related("items")
            .order_by("-created_at")
        )
        data = [
            {
                "id": order.id,
                "external_order_id": order.external_order_id,
                "status": order.status,
                "total_amount": str(order.total_amount),
                "discount_amount": str(order.discount_amount),
                "final_total": str(max(order.total_amount - order.discount_amount, 0)),
                "created_at": order.created_at,
                "applied_voucher": (
                    {
                        "id": order.applied_voucher_id,
                        "code": order.applied_voucher.code,
                        "title": order.applied_voucher.title,
                    }
                    if order.applied_voucher_id
                    else None
                ),
                "items": [
                    {
                        "name": item.name,
                        "product_id": item.product_id,
                        "product_type": item.product_type,
                        "quantity": item.quantity,
                        "unit_price": str(item.unit_price),
                        "line_total": str(item.line_total),
                    }
                    for item in order.items.all()
                ],
            }
            for order in orders
        ]
        return Response(data)


class AdminOrdersAPIView(APIView):
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        orders = (
            Order.objects.select_related("user", "applied_voucher")
            .prefetch_related("items")
            .order_by("-created_at")
        )
        status_filter = request.query_params.get("status")
        if status_filter in {
            Order.STATUS_PENDING,
            Order.STATUS_PAID,
            Order.STATUS_CANCELED,
        }:
            orders = orders.filter(status=status_filter)

        return Response([
            {
                "id": order.id,
                "external_order_id": order.external_order_id,
                "customer": order.user.username,
                "customer_email": order.user.email,
                "status": order.status,
                "total_amount": str(order.total_amount),
                "discount_amount": str(order.discount_amount),
                "final_total": str(max(order.total_amount - order.discount_amount, 0)),
                "created_at": order.created_at,
                "applied_voucher": (
                    {
                        "id": order.applied_voucher_id,
                        "code": order.applied_voucher.code,
                        "title": order.applied_voucher.title,
                    }
                    if order.applied_voucher_id
                    else None
                ),
                "items": [
                    {
                        "name": item.name,
                        "quantity": item.quantity,
                        "unit_price": str(item.unit_price),
                        "line_total": str(item.line_total),
                    }
                    for item in order.items.all()
                ],
            }
            for order in orders
        ])


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
            if order.applied_voucher_id:
                return Response(
                    {"error": "Không thể đồng bộ lại đơn đã áp dụng voucher; hãy tạo đơn mới."},
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
                    product_id=item.get("product_id"),
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
