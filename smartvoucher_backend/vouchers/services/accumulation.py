from datetime import timedelta

from django.db.models import Count, F, Sum
from django.utils import timezone


def paid_order_net_spend():
    return F("total_amount") - F("discount_amount")


def paid_orders_for_accumulation(
    user,
    Order,
    rule=None,
    current_order=None,
    include_current_order=False,
):
    orders = Order.objects.filter(status="paid")
    if user is not None:
        orders = orders.filter(user=user)

    if (
        not include_current_order
        and current_order is not None
        and current_order.pk
    ):
        orders = orders.exclude(pk=current_order.pk)

    if rule is not None:
        now = timezone.now()

        if rule.lookback_days and rule.lookback_days > 0:
            orders = orders.filter(
                created_at__gte=now - timedelta(days=rule.lookback_days)
            )

        if rule.target_year is not None:
            orders = orders.filter(created_at__year=rule.target_year)

        if rule.target_month is not None:
            orders = orders.filter(created_at__month=rule.target_month)

    return orders


def summarize_paid_orders(orders):
    stats = orders.aggregate(
        total_spent=Sum(paid_order_net_spend()),
        total_orders=Count("id"),
    )
    return {
        "total_spent": stats["total_spent"] or 0,
        "total_orders": stats["total_orders"] or 0,
    }
