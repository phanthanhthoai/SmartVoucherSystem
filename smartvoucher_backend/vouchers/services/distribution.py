from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import F, Q
from django.utils import timezone

from orders.models import Order
from vouchers.models import UserVoucher, Voucher, VoucherDeliveryLog, VoucherDistributionPlan
from vouchers.services.notification import send_voucher_email, send_voucher_webhook
from vouchers.services.rule_engine import (
    check_user_condition,
    check_accumulated_condition,
    is_voucher_eligible,
)


def _filter_users_by_rule(users, rule):
    eligible = []
    for user in users:
        if check_user_condition(user, rule) and check_accumulated_condition(user, rule, Order):
            eligible.append(user)
    return eligible


def assign_voucher_to_user(user, voucher, channels=None):
    """Assign a voucher once, then deliver it through requested channels."""
    channels = set(channels or [VoucherDeliveryLog.CHANNEL_EMAIL])
    _, created = UserVoucher.objects.get_or_create(user=user, voucher=voucher)
    if created:
        if VoucherDeliveryLog.CHANNEL_EMAIL in channels:
            send_voucher_email(user, voucher)
        if VoucherDeliveryLog.CHANNEL_WEBHOOK in channels:
            send_voucher_webhook(user, voucher)
    return created


def assign_order_success_vouchers(order):
    """Assign eligible order-success vouchers after an order is marked paid."""
    if order.status != Order.STATUS_PAID:
        return []

    now = timezone.now()
    vouchers = Voucher.objects.filter(
        event_type="order_success",
        is_active=True,
        is_deleted=False,
        release_date__lte=now,
        expiry_date__gte=now,
    ).exclude(used_count__gte=F("quantity"))

    assigned_codes = []
    for voucher in vouchers:
        if not is_voucher_eligible(
            order.user,
            voucher,
            order,
            Order,
            include_current_order=True,
        ):
            continue
        if assign_voucher_to_user(order.user, voucher):
            assigned_codes.append(voucher.code)
    return assigned_codes


def distribute_voucher(voucher, users, channels=None):
    try:
        rule = voucher.rule
    except ObjectDoesNotExist:
        rule = None
    eligible_users = _filter_users_by_rule(users, rule) if rule else list(users)

    created = 0
    skipped = 0
    for user in eligible_users:
        was_created = assign_voucher_to_user(user, voucher, channels=channels)
        if was_created:
            created += 1
        else:
            skipped += 1

    return created, skipped, len(eligible_users)


def get_target_users(user_ids=None):
    User = get_user_model()
    users = User.objects.filter(is_active=True, role="customer")
    if user_ids is not None:
        return users.filter(id__in=user_ids)
    return users


def assign_welcome_vouchers_to_user(user):
    """
    Assign active welcome vouchers to a newly registered user if eligible.
    """
    vouchers = Voucher.objects.filter(
        event_type="welcome",
        is_active=True,
        release_date__lte=timezone.now(),
        expiry_date__gte=timezone.now()
    ).order_by("id")

    assigned = 0
    skipped = 0

    for voucher in vouchers:
        try:
            rule = voucher.rule
        except ObjectDoesNotExist:
            skipped += 1
            continue

        if not check_user_condition(user, rule):
            skipped += 1
            continue

        created = assign_voucher_to_user(user, voucher)
        if created:
            assigned += 1
        else:
            skipped += 1

    return assigned, skipped


def create_distribution_plan(voucher, user_ids=None):
    return VoucherDistributionPlan.objects.create(
        voucher=voucher,
        user_ids=user_ids,
    )


def execute_distribution_plan(plan):
    voucher = plan.voucher
    now = timezone.now()

    if voucher.expiry_date <= now:
        plan.status = VoucherDistributionPlan.STATUS_SKIPPED_EXPIRED
        plan.distributed_at = now
        plan.save(update_fields=["status", "distributed_at"])
        return 0, 0, 0

    if not voucher.is_active:
        return 0, 0, 0
    if voucher.used_count >= voucher.quantity:
        plan.status = VoucherDistributionPlan.STATUS_COMPLETED
        plan.distributed_at = now
        plan.save(update_fields=["status", "distributed_at"])
        return 0, 0, 0

    users = get_target_users(user_ids=plan.user_ids)
    created, skipped, eligible = distribute_voucher(voucher, users)

    plan.status = VoucherDistributionPlan.STATUS_COMPLETED
    plan.distributed_at = now
    plan.save(update_fields=["status", "distributed_at"])
    return created, skipped, eligible


def process_due_distribution_plans():
    now = timezone.now()
    plans = VoucherDistributionPlan.objects.select_related("voucher").filter(
        status=VoucherDistributionPlan.STATUS_PENDING,
        voucher__release_date__lte=now,
    ).filter(
        Q(voucher__is_active=True)
        | Q(voucher__expiry_date__lt=now)
    )

    processed = 0
    for plan in plans:
        execute_distribution_plan(plan)
        processed += 1

    return processed
