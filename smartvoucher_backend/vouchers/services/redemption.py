# from django.utils import timezone

# from vouchers.models import UserVoucher, VoucherUsage


# def get_discount_base_amount(voucher, order):
#     rule = voucher.rule

#     if not rule.required_product_type:
#         return order.total_amount

#     matching_items = order.items.filter(
#         product_type__iexact=rule.required_product_type
#     )
#     return sum(item.line_total for item in matching_items)


# def calculate_discount_amount(voucher, order):
#     base_amount = get_discount_base_amount(voucher, order)

#     if base_amount <= 0:
#         return 0

#     if voucher.discount_type == "percent":
#         return round(base_amount * (voucher.discount_value / 100), 2)

#     # Fixed voucher cannot discount more than eligible subtotal.
#     return min(voucher.discount_value, base_amount)


# def redeem_voucher(user, voucher, order):
#     user_voucher = UserVoucher.objects.get(
#         user=user,
#         voucher=voucher
#     )

#     if user_voucher.is_used:
#         return False, "Voucher da duoc su dung"

#     user_voucher.is_used = True
#     user_voucher.used_at = timezone.now()
#     user_voucher.save()

#     voucher.used_count += 1
#     voucher.save()

#     discount_amount = calculate_discount_amount(voucher, order)

#     VoucherUsage.objects.create(
#         user_voucher=user_voucher,
#         order=order,
#         discount_amount=discount_amount
#     )

#     return True, discount_amount

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from orders.models import Order
from vouchers.models import Voucher, UserVoucher, VoucherUsage
from vouchers.services.discount import calculate_discount_amount
from vouchers.services.locks import voucher_redemption_lock
from vouchers.services.rule_engine import is_voucher_eligible


ZERO = Decimal("0.00")


def _failure(message):
    return False, message


@transaction.atomic
def redeem_voucher(user, voucher, order):
    """
    Redeem voucher cho một đơn hàng đã thanh toán.

    - Khóa voucher, đơn hàng và bản ghi UserVoucher.
    - Kiểm tra tính hợp lệ trước khi thay đổi dữ liệu.
    - Không ghi nhận sử dụng trùng cho cùng đơn hàng.
    - Tất cả thay đổi được thực hiện trong một transaction.

    Return:
        (True, Decimal discount_amount) nếu thành công.
        (False, message) nếu không thể redeem.
    """

    voucher_id = getattr(voucher, "pk", voucher)
    order_id = getattr(order, "pk", order)

    if not user or not user.pk:
        return _failure("Người dùng không hợp lệ.")

    if not voucher_id or not order_id:
        return _failure("Voucher hoặc đơn hàng không hợp lệ.")

    # Dùng thứ tự khóa nhất quán: Voucher -> Order -> UserVoucher.
    locked_voucher = (
        Voucher.objects.select_for_update()
        .filter(pk=voucher_id)
        .first()
    )

    if locked_voucher is None:
        return _failure("Không tìm thấy voucher.")

    with voucher_redemption_lock(locked_voucher.pk):
        return _redeem_locked_voucher(
            user=user,
            voucher=locked_voucher,
            order_id=order_id,
        )


def _redeem_locked_voucher(*, user, voucher, order_id):
    locked_order = (
        Order.objects.select_for_update()
        .filter(pk=order_id, user_id=user.pk)
        .first()
    )

    if locked_order is None:
        return _failure("Không tìm thấy đơn hàng của người dùng.")

    if locked_order.applied_voucher_id != voucher.pk:
        return _failure("Voucher không khớp với đơn hàng.")

    user_voucher = (
        UserVoucher.objects.select_for_update()
        .filter(
            user_id=user.pk,
            voucher_id=voucher.pk,
        )
        .first()
    )

    if user_voucher is None:
        return _failure("Người dùng chưa được cấp voucher này.")

    # Idempotency: request lặp lại cho cùng đơn hàng trả về kết quả cũ.
    existing_usage = VoucherUsage.objects.filter(
        user_voucher_id=user_voucher.pk,
        order_id=locked_order.pk,
    ).first()

    if existing_usage is not None:
        return True, existing_usage.discount_amount

    if user_voucher.is_used:
        return _failure("Voucher đã được sử dụng cho đơn hàng khác.")

    # Chỉ redeem sau khi đơn hàng đã thanh toán thành công.
    if locked_order.status != "paid":
        return _failure(
            "Chỉ có thể redeem voucher sau khi đơn hàng thanh toán thành công."
        )

    now = timezone.now()

    if not voucher.is_active or voucher.is_deleted:
        return _failure("Voucher hiện không hoạt động.")

    if (
        voucher.release_date
        and now < voucher.release_date
    ):
        return _failure("Voucher chưa đến thời gian phát hành.")

    if (
        voucher.expiry_date
        and now > voucher.expiry_date
    ):
        return _failure("Voucher đã hết hạn.")

    if voucher.used_count >= voucher.quantity:
        return _failure("Voucher đã hết số lượng sử dụng.")

    # Rule Engine kiểm tra phân khúc, đơn hàng, thời gian và
    # lịch sử chi tiêu. Hàm này không thay đổi dữ liệu.
    eligible = is_voucher_eligible(
        user,
        voucher,
        locked_order,
        Order,
    )

    if not eligible:
        return _failure("Đơn hàng hoặc người dùng không đủ điều kiện.")

    discount_amount = calculate_discount_amount(
        voucher,
        locked_order,
    )

    discount_amount = Decimal(str(discount_amount or 0)).quantize(
        Decimal("0.01")
    )

    if discount_amount <= ZERO:
        return _failure("Voucher không tạo ra khoản giảm giá hợp lệ.")

    # Ghi nhận sử dụng và cập nhật bộ đếm trong cùng transaction.
    VoucherUsage.objects.create(
        user_voucher=user_voucher,
        order=locked_order,
        discount_amount=discount_amount,
    )

    user_voucher.is_used = True
    user_voucher.used_at = now
    user_voucher.save(update_fields=["is_used", "used_at"])

    voucher.used_count += 1
    voucher.save(update_fields=["used_count"])

    locked_order.discount_amount = discount_amount
    locked_order.save(update_fields=["discount_amount"])

    return True, discount_amount