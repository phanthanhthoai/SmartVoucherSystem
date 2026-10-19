"""Small, dependency-free anti-abuse controls for voucher redemption."""

import hashlib
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count
from django.utils import timezone

from vouchers.models import VoucherFraudEvent


class VoucherFraudBlocked(Exception):
    """Raised when a redemption attempt exceeds the configured safety limit."""


def get_client_ip(request):
    # Only trust X-Forwarded-For when the deployment terminates traffic at a
    # trusted proxy. For local development REMOTE_ADDR remains the source.
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip() or None
    return request.META.get("REMOTE_ADDR") or None


def get_device_fingerprint_hash(request):
    fingerprint = (request.headers.get("X-Device-Fingerprint") or "").strip()
    if not fingerprint:
        return ""
    # Do not persist the raw browser identifier.
    value = f"{settings.SECRET_KEY}:{fingerprint}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()


def _increment_counter(key, timeout):
    if cache.add(key, 1, timeout=timeout):
        return 1
    try:
        return cache.incr(key)
    except ValueError:
        # A cache eviction between add and incr is harmless; restart window.
        cache.set(key, 1, timeout=timeout)
        return 1


def _is_rate_limited(voucher_id, ip_address, device_hash):
    timeout = settings.VOUCHER_REDEMPTION_WINDOW_SECONDS
    maximum = settings.VOUCHER_REDEMPTION_MAX_ATTEMPTS
    keys = []
    if ip_address:
        keys.append(f"voucher:redemption:ip:{voucher_id}:{ip_address}")
    if device_hash:
        keys.append(f"voucher:redemption:device:{voucher_id}:{device_hash}")

    for key in keys:
        if _increment_counter(key, timeout) > maximum:
            return True
    return False


def evaluate_redemption_request(request, *, user, voucher, order):
    """Rate-limit an attempt and detect many accounts sharing one device.

    The result is written for both allowed and blocked requests so staff can
    investigate suspicious patterns from the database instead of relying only
    on ephemeral cache counters.
    """
    ip_address = get_client_ip(request)
    device_hash = get_device_fingerprint_hash(request)
    blocked_reason = ""

    if _is_rate_limited(voucher.pk, ip_address, device_hash):
        blocked_reason = "rate_limit"

    if not blocked_reason and device_hash:
        since = timezone.now() - timedelta(days=1)
        distinct_users = (
            VoucherFraudEvent.objects.filter(
                device_fingerprint_hash=device_hash,
                created_at__gte=since,
            )
            .exclude(user_id=user.pk)
            .values("user_id")
            .annotate(total=Count("user_id"))
            .count()
        )
        if distinct_users >= settings.VOUCHER_MAX_USERS_PER_DEVICE:
            blocked_reason = "device_used_by_many_accounts"

    VoucherFraudEvent.objects.create(
        user=user,
        voucher=voucher,
        order=order,
        ip_address=ip_address,
        device_fingerprint_hash=device_hash,
        status=(
            VoucherFraudEvent.STATUS_BLOCKED
            if blocked_reason
            else VoucherFraudEvent.STATUS_ALLOWED
        ),
        reason=blocked_reason,
    )

    if blocked_reason:
        raise VoucherFraudBlocked(
            "Yêu cầu sử dụng voucher bị chặn để bảo vệ chương trình khuyến mãi."
        )
