
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


def item_value(item, field):
    if isinstance(item, dict):
        return item.get(field)
    return getattr(item, field, None)


def matches_product(item, product_type=None, product_id=None):
    """Match both configured product category and exact product when present."""
    item_type = item_value(item, "product_type")
    if product_type and (
        (item_type or "").casefold() != product_type.casefold()
    ):
        return False
    if product_id is not None and item_value(item, "product_id") != product_id:
        return False
    return True


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

    Sản phẩm mua được giới hạn theo cả loại và ID nếu rule có cấu hình;
    sản phẩm tặng vẫn chọn theo loại và đơn giá.
    """
    buy_quantity = int(rule.buy_quantity or 0)
    get_quantity = int(rule.get_quantity or 0)

    if buy_quantity <= 0 or get_quantity <= 0:
        return None

    # Sản phẩm dùng để xét điều kiện mua X.
    buying_items = [
        item for item in items
        if matches_product(
            item,
            rule.required_product_type,
            rule.required_product_id,
        )
    ]

    buying_count = sum(
        max(0, int(item_value(item, "quantity") or 0))
        for item in buying_items
    )

    qualifying_groups = buying_count // buy_quantity
    free_quantity = qualifying_groups * get_quantity

    if free_quantity <= 0:
        return ZERO

    # Sản phẩm được miễn phí: ưu tiên những đơn vị rẻ nhất.
    reward_items = [
        item for item in items
        if matches_product(item, rule.get_product_type)
    ]

    reward_unit_prices = []

    for item in reward_items:
        quantity = max(0, int(item_value(item, "quantity") or 0))
        unit_price = to_money(item_value(item, "unit_price"))

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
        if matches_product(
            item,
            rule.required_product_type if rule else None,
            rule.required_product_id if rule else None,
        )
    ]

    base_amount = sum(
        (
            to_money(item_value(item, "unit_price"))
            * max(0, int(item_value(item, "quantity") or 0))
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