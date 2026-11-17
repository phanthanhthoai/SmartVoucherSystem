from contextlib import contextmanager

from django.conf import settings
from redis import Redis
from redis.exceptions import LockError, RedisError


class VoucherRedemptionLockUnavailable(Exception):
    """Raised when the shared Redis lock cannot protect a voucher redemption."""


@contextmanager
def voucher_redemption_lock(voucher_id):
    cache_config = settings.CACHES["default"]
    redis_url = cache_config.get("LOCATION")
    if not redis_url:
        raise VoucherRedemptionLockUnavailable(
            "Redis URL is required for voucher redemption."
        )

    client = Redis.from_url(
        redis_url,
        socket_connect_timeout=1,
        socket_timeout=5,
    )
    lock = client.lock(
        f"voucher:redemption:lock:{voucher_id}",
        timeout=settings.VOUCHER_REDEMPTION_LOCK_TIMEOUT_SECONDS,
        blocking_timeout=settings.VOUCHER_REDEMPTION_LOCK_WAIT_SECONDS,
    )

    try:
        acquired = lock.acquire(blocking=True)
    except RedisError as exc:
        client.close()
        raise VoucherRedemptionLockUnavailable(
            "Redis lock is unavailable."
        ) from exc

    if not acquired:
        client.close()
        raise VoucherRedemptionLockUnavailable(
            "Timed out waiting for the voucher redemption lock."
        )

    try:
        yield
    finally:
        try:
            lock.release()
        except (LockError, RedisError) as exc:
            raise VoucherRedemptionLockUnavailable(
                "Could not safely release the voucher redemption lock."
            ) from exc
        finally:
            client.close()
