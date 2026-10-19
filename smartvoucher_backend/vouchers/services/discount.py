
from decimal import Decimal, ROUND_HALF_UP

from vouchers.models import Voucher


ZERO = Decimal("0.00")
CENT = Decimal("0.01")


def to_money(value):
    """Chuẩn hóa giá trị tiền về Decimal với hai chữ số thập phân."""
    return Decimal(str(value or 0)).quantize(
        CENT,
        rounding=ROUND_HALF_UP,
    )


def matches_product_type(item, product_type):
    """Kiểm tra loại sản phẩm, không phân biệt chữ hoa/thường."""
    if not product_type:
        return True

    return (
        (item.product_type or "").casefold()
        == product_type.casefold()
    )


def cap_discount(discount, eligible_amount, voucher):
    """Giới hạn tiền giảm theo giá trị hợp lệ và mức giảm tối đa."""
    discount = min(to_money(discount), to_money(eligible_amount))

    max_discount = voucher.max_discount_amount
    if max_discount is not None:
        discount = min(discount, to_money(max_discount))

    return max(ZERO, to_money(discount))


def calculate_buy_x_get_y_discount(voucher, rule, items):
    """
    Mua X sản phẩm đủ điều kiện thì được giảm tiền tương ứng Y sản phẩm.

    Không có product_id trong OrderItem nên việc chọn sản phẩm miễn phí
    hiện dựa trên product_type và đơn giá.
    """
    buy_quantity = int(rule.buy_quantity or 0)
    get_quantity = int(rule.get_quantity or 0)

    if buy_quantity <= 0 or get_quantity <= 0:
        return None

    # Sản phẩm dùng để xét điều kiện mua X.
    buying_items = [
        item for item in items
        if matches_product_type(
            item,
            rule.required_product_type,
        )
    ]

    buying_count = sum(
        max(0, int(item.quantity))
        for item in buying_items
    )

    qualifying_groups = buying_count // buy_quantity
    free_quantity = qualifying_groups * get_quantity

    if free_quantity <= 0:
        return ZERO

    # Sản phẩm được miễn phí: ưu tiên những đơn vị rẻ nhất.
    reward_items = [
        item for item in items
        if matches_product_type(item, rule.get_product_type)
    ]

    reward_unit_prices = []

    for item in reward_items:
        quantity = max(0, int(item.quantity))
        unit_price = to_money(item.unit_price)

        reward_unit_prices.extend(
            [unit_price] * quantity
        )

    reward_unit_prices.sort()

    discount = sum(
        reward_unit_prices[:free_quantity],
        ZERO,
    )

    reward_total = sum(reward_unit_prices, ZERO)

    return cap_discount(
        discount,
        reward_total,
        voucher,
    )


def calculate_discount_amount(voucher, order):
    """
    Tính discount theo cùng một quy tắc cho Apply, Checkout và Redeem.

    Trả về Decimal, không làm thay đổi trạng thái voucher hoặc order.
    """
    items = list(order.items.all())

    if not items:
        return ZERO

    try:
        rule = voucher.rule
    except Voucher.rule.RelatedObjectDoesNotExist:
        rule = None

    # Nếu rule cấu hình Buy X Get Y thì ưu tiên loại khuyến mãi này.
    if rule is not None:
        buy_quantity = int(rule.buy_quantity or 0)
        get_quantity = int(rule.get_quantity or 0)

        if buy_quantity > 0 and get_quantity > 0:
            return calculate_buy_x_get_y_discount(
                voucher,
                rule,
                items,
            )

    # Chỉ tính trên nhóm sản phẩm hợp lệ nếu có quy định.
    eligible_items = [
        item for item in items
        if matches_product_type(
            item,
            rule.required_product_type if rule else None,
        )
    ]

    base_amount = sum(
        (
            to_money(item.unit_price)
            * max(0, int(item.quantity))
            for item in eligible_items
        ),
        ZERO,
    )

    if base_amount <= ZERO:
        return ZERO

    discount_value = to_money(voucher.discount_value)

    if voucher.discount_type == "percent":
        discount = (
            base_amount * discount_value / Decimal("100")
        )
    elif voucher.discount_type == "fixed":
        discount = min(discount_value, base_amount)
    else:
        # Không tự ý áp dụng mức giảm cho loại chưa được hỗ trợ.
        return ZERO

    return cap_discount(
        discount,
        base_amount,
        voucher,
    )