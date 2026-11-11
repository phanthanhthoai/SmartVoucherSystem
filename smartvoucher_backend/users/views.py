from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import (
    RegisterSerializer,
    CreateGroupSerializer,
    AssignGroupSerializer,
    UpdateUserPermissionsSerializer,
    UpdateUserRoleSerializer,
    UserSummarySerializer,
    UserUpdateSerializer,
)
from .services import register_user, vouchers_for_user
from .services import staff_user
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import Permission, Group
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from orders.models import Order
from vouchers.services.accumulation import (
    paid_order_net_spend,
    paid_orders_for_accumulation,
    summarize_paid_orders,
)
from .permissions import IsAdminRole, IsStaffOrAdmin


class VoucherForUserAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Gọi hàm lấy danh sách UserVoucher của ní
        user_vouchers = vouchers_for_user(user)
        
        data = [
            {
                "id": uv.voucher.id,
                "code": uv.voucher.code,
                "title": uv.voucher.title,
                "type": uv.voucher.discount_type,
                "value": uv.voucher.discount_value,
                "max_discount_amount": uv.voucher.max_discount_amount,
                "min_spend": (
                    uv.voucher.rule.min_order_amount
                    if hasattr(uv.voucher, "rule")
                    else 0
                ),
                "is_used": uv.is_used,
                "start_date": uv.voucher.release_date,
                "expiry_date": uv.voucher.expiry_date,
                
                # 🚨 ĐÂY LÀ CHỖ ĐÃ FIX: Đi xuyên qua bảng Rule an toàn
                "product_type": uv.voucher.rule.required_product_type if hasattr(uv.voucher, 'rule') else "All",
                "product_id": uv.voucher.rule.required_product_id if hasattr(uv.voucher, 'rule') else None,
                
                "is_active": uv.voucher.is_active,
            }
            for uv in user_vouchers
        ]
        
        return Response(data)

class RegisterAPI(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        user, error = register_user(
            data["username"],
            data["email"],
            data["password"]
        )

        if error:
            return Response({"message": error}, status=400)

        return Response({"message": "User created"}, status=201)
    
class StaffRegisterAPI(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        user, error = staff_user(
            data["username"],
            data["email"],
            data["password"]
        )

        if error:
            return Response({"message": error}, status=400)

        return Response({"message": "User created"}, status=201)


class MeAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "is_staff": user.is_staff
        })


class PermissionListAPI(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        perms = Permission.objects.select_related("content_type").all()

        data = [
            {
                "id": p.id,
                "name": p.name,
                "codename": f"{p.content_type.app_label}.{p.codename}",
                "app": p.content_type.app_label,
                "model": p.content_type.model
            }
            for p in perms
        ]

        return Response(data)


class CreateGroupAPI(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        serializer = CreateGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group_name = serializer.validated_data["group_name"]
        perm_codes = serializer.validated_data["permissions"]

        group, _ = Group.objects.get_or_create(name=group_name)

        permissions = []
        for code in perm_codes:
            parts = code.split(".")
            if len(parts) != 2:
                return Response({"error": f"Mã quyền không hợp lệ: {code}"}, status=400)
            app_label, codename = parts
            perm = Permission.objects.filter(
                content_type__app_label=app_label,
                codename=codename
            ).first()
            if perm is None:
                return Response({"error": f"Không tìm thấy quyền: {code}"}, status=400)
            permissions.append(perm)

        group.permissions.set(permissions)
        group.save()

        return Response(
            {"message": "Group created and permissions assigned"},
            status=status.HTTP_201_CREATED
        )


class AssignGroupToUserAPI(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        serializer = AssignGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        group_name = serializer.validated_data["group_name"]

        User = get_user_model()
        user = get_object_or_404(User, username=username)
        group = get_object_or_404(Group, name=group_name)

        user.groups.add(group)

        return Response({"message": "Group assigned to user"})


class CustomerListAPI(APIView):
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        from django.db.models import Q
        from django.core.paginator import Paginator

        search_query = request.query_params.get("search", "").strip()
        page_num = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 10)

        User = get_user_model()
        users_qs = User.objects.filter(role="customer", is_active=True).order_by("-id")

        if search_query:
            users_qs = users_qs.filter(
                Q(username__icontains=search_query) | Q(email__icontains=search_query)
            )

        paginator = Paginator(users_qs, page_size)
        try:
            page_obj = paginator.page(page_num)
        except Exception:
            page_obj = paginator.page(1)

        totals = users_qs.aggregate(total_points=Sum("points"))
        paid_orders = paid_orders_for_accumulation(None, Order).filter(
            user_id__in=users_qs.values("pk")
        )
        paid_totals = summarize_paid_orders(paid_orders)

        page_users = list(page_obj.object_list)
        serializer = UserSummarySerializer(page_users, many=True)
        paid_stats_by_user = {
            row["user_id"]: row
            for row in paid_orders.filter(
                user_id__in=[user.pk for user in page_users]
            )
            .values("user_id")
            .annotate(
                total_spent=Sum(paid_order_net_spend()),
                paid_order_count=Count("id"),
            )
        }
        results = serializer.data
        for user, result in zip(page_users, results):
            user_stats = paid_stats_by_user.get(user.pk, {})
            result["total_spent"] = str(user_stats.get("total_spent") or 0)
            result["paid_order_count"] = user_stats.get("paid_order_count", 0)

        return Response({
            "count": paginator.count,
            "results": results,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "total_points": totals["total_points"] or 0,
            "total_spent": paid_totals["total_spent"],
            "paid_order_count": paid_totals["total_orders"],
        })


class ToggleUserActiveAPI(APIView):
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def patch(self, request, user_id):
        User = get_user_model()
        user = get_object_or_404(User, id=user_id)
        
        if user.role == "admin":
            return Response({"error": "Khong the thay doi trang thai admin"}, status=400)
            
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        
        return Response({
            "message": f"Da {'kich hoat' if user.is_active else 'vo hieu hoa'} tai khoan",
            "is_active": user.is_active
        })


class StaffListAPI(APIView):
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        User = get_user_model()
        users = User.objects.filter(
            role__in=["staff", "admin"],
            is_active=True,
        ).order_by("id")
        serializer = UserSummarySerializer(users, many=True)
        return Response(serializer.data)


class UpdateUserRoleAPI(APIView):
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def patch(self, request, user_id):
        serializer = UpdateUserRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User khong ton tai"}, status=404)

        new_role = serializer.validated_data["role"]
        is_admin = request.user.is_superuser or request.user.role == "admin"
        if (new_role == "admin" or user.role == "admin") and not is_admin:
            return Response(
                {"error": "Chỉ quản trị viên mới được cấp hoặc thay đổi vai trò admin."},
                status=403,
            )
        if request.user.id == user.id and new_role != "admin" and is_admin:
            return Response(
                {"error": "Không thể tự hạ vai trò quản trị viên của chính mình."},
                status=400,
            )

        user.role = new_role
        user.is_staff = user.role in {"staff", "admin"}
        user.save(update_fields=["role", "is_staff"])

        return Response(
            {
                "message": "Cap nhat role thanh cong",
                "user": UserSummarySerializer(user).data,
            }
        )


class UpdateUserPermissionsAPI(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, user_id):
        serializer = UpdateUserPermissionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User khong ton tai"}, status=404)

        perm_codes = serializer.validated_data["permissions"]
        group_names = serializer.validated_data["groups"]

        permissions = []
        for code in perm_codes:
            parts = code.split(".")
            if len(parts) != 2:
                return Response({"error": f"Mã quyền không hợp lệ: {code}"}, status=400)
            app_label, codename = parts
            perm = Permission.objects.filter(
                content_type__app_label=app_label,
                codename=codename,
            ).first()
            if perm is None:
                return Response({"error": f"Không tìm thấy quyền: {code}"}, status=400)
            permissions.append(perm)

        groups = list(Group.objects.filter(name__in=group_names))
        if len(groups) != len(set(group_names)):
            return Response({"error": "Co group khong ton tai"}, status=400)

        user.user_permissions.set(permissions)
        user.groups.set(groups)

        return Response(
            {
                "message": "Cap nhat quyen thanh cong",
                "user_id": user.id,
                "permissions": perm_codes,
                "groups": [group.name for group in groups],
            }
        )


class UserUpdateAPI(APIView):
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def patch(self, request, user_id):
        User = get_user_model()
        user = get_object_or_404(User, id=user_id)

        is_admin = request.user.is_superuser or request.user.role == "admin"
        if user.role == "admin" and not is_admin:
            return Response({"error": "Khong co quyen chinh sua admin"}, status=403)
        if "total_spent" in request.data:
            return Response(
                {"error": "Tổng chi tiêu được tự tính từ các đơn đã thanh toán."},
                status=400,
            )
        protected_fields = {"points"}.intersection(request.data)
        if protected_fields and not is_admin:
            return Response(
                {"error": "Chỉ quản trị viên mới được điều chỉnh điểm và tổng chi tiêu."},
                status=403,
            )

        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "message": "Cap nhat thong tin thanh cong",
            "user": UserSummarySerializer(user).data
        })


class DeleteUserAPI(APIView):
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def delete(self, request, user_id):
        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User khong ton tai"}, status=404)

        if user.role == "admin":
            return Response({"error": "Khong duoc xoa tai khoan admin"}, status=400)

        if request.user.id == user.id:
            return Response({"error": "Khong duoc tu xoa tai khoan cua minh"}, status=400)

        user.is_active = False
        user.save(update_fields=["is_active"])

        return Response(
            {
                "message": "Xoa user thanh cong",
                "user": UserSummarySerializer(user).data,
            }
        )
