# from django.utils import timezone
# from datetime import timedelta
# from django.db.models import Sum, Count


# def check_user_condition(user, rule):
#     if rule.required_role and user.role != rule.required_role:
#         return False

#     if rule.birthday_only:
#         if not user.birthday:
#             return False
#         if user.birthday.day != timezone.now().day or user.birthday.month != timezone.now().month:
#             return False

#     return True


# def check_order_condition(order, rule):
#     if order.total_amount < rule.min_order_amount:
#         return False

#     total_items = sum(item.quantity for item in order.items.all())
#     if total_items < rule.min_items:
#         return False

#     if rule.required_product_type:
#         has_required_product_type = order.items.filter(
#             product_type__iexact=rule.required_product_type
#         ).exists()
#         if not has_required_product_type:
#             return False

#     return True


# def check_time_condition(user, rule, Order):
#     if not rule.period_type:
#         return True

#     now = timezone.now()

#     if rule.period_type == "day":
#         start = now.replace(hour=0, minute=0, second=0)
#     elif rule.period_type == "week":
#         start = now - timedelta(days=now.weekday())
#     elif rule.period_type == "month":
#         start = now.replace(day=1)
#     else:
#         return True

#     return Order.objects.filter(
#         user=user,
#         created_at__gte=start
#     ).exists()

# from django.db.models import Sum, Count
# from django.utils import timezone
# from datetime import timedelta

# def check_accumulated_condition(user, rule, Order):
#     # --- 1. LẤY YÊU CẦU TỪ RULE (Mặc giáp 'or 0' chống lỗi None) ---
#     req_spent = rule.min_accumulated_spent or 0
#     req_orders = rule.min_accumulated_orders or 0

#     # Nếu không có yêu cầu gì cả -> Auto pass (Mở cổng cho qua)
#     if req_spent <= 0 and req_orders <= 0:
#         return True

#     # --- 2. LẤY ĐƠN HÀNG CƠ BẢN ---
#     orders = Order.objects.filter(user=user, status='paid')

#     # --- 3. LỌC THEO THỜI GIAN (Tách biệt hoàn toàn để không đá nhau) ---
#     target_year = getattr(rule, 'target_year', 0) or 0
#     target_month = getattr(rule, 'target_month', 0) or 0
#     lookback = getattr(rule, 'lookback_days', 0) or 0

#     if target_year > 0:
#         orders = orders.filter(created_at__year=target_year)
    
#     if target_month > 0:
#         orders = orders.filter(created_at__month=target_month)
    
#     # Chỉ áp dụng Lookback nếu người ta KHÔNG set Năm và KHÔNG set Tháng
#     if lookback > 0 and target_year == 0 and target_month == 0:
#         start = timezone.now() - timedelta(days=lookback)
#         orders = orders.filter(created_at__gte=start)

#     # --- 4. TÍNH TOÁN THỰC TẾ ---
#     stats = orders.aggregate(
#         total_spent=Sum('total_amount'),
#         total_count=Count('id')
#     )

#     actual_spent = stats['total_spent'] or 0
#     actual_count = stats['total_count'] or 0

#     # --- 5. CHỐT HẠ (So sánh an toàn) ---
#     if actual_spent < req_spent:
#         return False
        
#     if actual_count < req_orders:
#         return False

#     return True

# # HÀM NÀY BẮT BUỘC PHẢI CÓ
# def is_voucher_eligible(user, voucher, order, Order):
#     rule = voucher.rule
#     return (
#         check_user_condition(user, rule)
#         and check_order_condition(order, rule)
#         and check_time_condition(user, rule, Order)
#     )


from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Sum, Count
from django.utils import timezone


ZERO = Decimal("0")


def get_current_datetime():
    return timezone.now()


def get_current_date():
    now = get_current_datetime()

    if timezone.is_aware(now):
        return timezone.localdate(now)

    return now.date()


def check_user_condition(user, rule):
    """Kiểm tra phân khúc khách hàng và điều kiện sinh nhật."""

    required_group = getattr(rule, "customer_group", None)

    if required_group and required_group != "all":
        if getattr(user, "customer_group", None) != required_group:
            return False

    if rule.birthday_only:
        if not user.birthday:
            return False

        today = get_current_date()

        if (
            user.birthday.month != today.month
            or user.birthday.day != today.day
        ):
            return False

    return True


def check_order_condition(order, rule):
    """Kiểm tra giá trị đơn hàng, số lượng và loại sản phẩm."""

    total_amount = Decimal(str(order.total_amount or 0))
    min_order_amount = Decimal(
        str(rule.min_order_amount or 0)
    )

    if total_amount < min_order_amount:
        return False

    total_items = sum(
        max(0, int(item.quantity))
        for item in order.items.all()
    )

    if total_items < int(rule.min_items or 0):
        return False

    required_product_type = rule.required_product_type

    if required_product_type:
        has_matching_item = order.items.filter(
            product_type__iexact=required_product_type
        ).exists()

        if not has_matching_item:
            return False

    return True


def check_time_condition(user, rule, Order, current_order=None):
    """Kiểm tra khung giờ ưu đãi và chu kỳ mua hàng nếu được cấu hình."""

    now = get_current_datetime()

    if timezone.is_aware(now):
        current_time = timezone.localtime(now).time().replace(
            tzinfo=None
        )
    else:
        current_time = now.time()

    start_time = rule.start_time
    end_time = rule.end_time

    # Kiểm tra khung giờ, ví dụ 18:00–21:00.
    if start_time is not None and end_time is not None:
        if start_time <= end_time:
            within_window = start_time <= current_time <= end_time
        else:
            # Hỗ trợ khung giờ qua nửa đêm, ví dụ 22:00–02:00.
            within_window = (
                current_time >= start_time
                or current_time <= end_time
            )

        if not within_window:
            return False

    elif start_time is not None:
        if current_time < start_time:
            return False

    elif end_time is not None:
        if current_time > end_time:
            return False

    # Giữ hành vi chu kỳ của model hiện tại:
    # nếu period_type được cấu hình thì yêu cầu có ít nhất
    # một đơn đã thanh toán trong chu kỳ đó.
    period_type = rule.period_type

    if not period_type:
        return True

    if timezone.is_aware(now):
        start_of_day = timezone.localtime(now).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    else:
        start_of_day = now.replace(
            hour=0, minute=0, second=0, microsecond=0
        )

    if period_type == "day":
        period_start = start_of_day

    elif period_type == "week":
        period_start = start_of_day - timedelta(
            days=start_of_day.weekday()
        )

    elif period_type == "month":
        period_start = start_of_day.replace(day=1)

    else:
        return False

    return Order.objects.filter(
        user=user,
        status="paid",
        created_at__gte=period_start,
    ).exists()


def check_accumulated_condition(
    user,
    rule,
    Order,
    current_order=None,
):
    """Kiểm tra tổng chi tiêu và số đơn đã thanh toán."""

    min_spent = Decimal(
        str(rule.min_accumulated_spent or 0)
    )
    min_orders = int(rule.min_accumulated_orders or 0)

    orders = Order.objects.filter(
        user=user,
        status="paid",
    )

    # Không tính đơn hiện tại vào lịch sử mua hàng.
    if current_order is not None and current_order.pk:
        orders = orders.exclude(pk=current_order.pk)

    now = get_current_datetime()

    if rule.lookback_days and rule.lookback_days > 0:
        orders = orders.filter(
            created_at__gte=now - timedelta(
                days=rule.lookback_days
            )
        )

    if rule.target_year is not None:
        orders = orders.filter(
            created_at__year=rule.target_year
        )

    if rule.target_month is not None:
        orders = orders.filter(
            created_at__month=rule.target_month
        )

    stats = orders.aggregate(
        total_spent=Sum("total_amount"),
        total_count=Count("id"),
    )

    total_spent = Decimal(
        str(stats["total_spent"] or 0)
    )
    total_count = stats["total_count"] or 0

    if total_spent < min_spent:
        return False

    if total_count < min_orders:
        return False

    return True


def is_voucher_eligible(user, voucher, order, Order):
    """
    Kiểm tra toàn bộ điều kiện nghiệp vụ.

    Hàm chỉ kiểm tra điều kiện. Trạng thái hoạt động, ngày phát hành,
    hạn dùng, tồn kho và quyền sở hữu voucher phải được kiểm tra ở
    service/use case áp dụng voucher tương ứng.
    """

    try:
        rule = voucher.rule
    except voucher.__class__.rule.RelatedObjectDoesNotExist:
        return True

    return (
        check_user_condition(user, rule)
        and check_order_condition(order, rule)
        and check_time_condition(user, rule, Order, current_order=order)
        and check_accumulated_condition(
            user,
            rule,
            Order,
            current_order=order,
        )
    )
