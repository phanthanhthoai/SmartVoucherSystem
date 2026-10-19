import json
import logging
from urllib import error, request as urlrequest
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from vouchers.models import VoucherDeliveryLog

logger = logging.getLogger(__name__)

def send_voucher_email(user, voucher):
    recipient = user.email

    if not recipient:
        VoucherDeliveryLog.objects.create(
            user=user,
            voucher=voucher,
            channel=VoucherDeliveryLog.CHANNEL_EMAIL,
            status=VoucherDeliveryLog.STATUS_SKIPPED_NO_EMAIL,
            recipient="",
            error_message="User has no email",
        )
        return False

    subject = f"[SmartVoucher] Bạn nhận được voucher mới {voucher.code}"
    
    # Prepare context for template
    context = {
        'user': user,
        'voucher': voucher,
    }
    
    # Render HTML and plain text version
    html_message = render_to_string('vouchers/email/voucher_email.html', context)
    plain_message = strip_tags(html_message)

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(settings, "EMAIL_HOST_USER", "")

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[recipient],
            html_message=html_message,
            fail_silently=False,
        )
        VoucherDeliveryLog.objects.create(
            user=user,
            voucher=voucher,
            channel=VoucherDeliveryLog.CHANNEL_EMAIL,
            status=VoucherDeliveryLog.STATUS_SENT,
            recipient=recipient,
        )
        return True
    except Exception as exc:
        VoucherDeliveryLog.objects.create(
            user=user,
            voucher=voucher,
            channel=VoucherDeliveryLog.CHANNEL_EMAIL,
            status=VoucherDeliveryLog.STATUS_FAILED,
            recipient=recipient,
            error_message=str(exc),
        )
        return False


def send_voucher_webhook(user, voucher):
    """Notify an optional marketing webhook after a voucher is assigned."""
    webhook_url = getattr(settings, "VOUCHER_WEBHOOK_URL", "")
    if not webhook_url:
        return False

    payload = json.dumps({
        "event": "voucher.assigned",
        "user_id": user.id,
        "email": user.email,
        "voucher": {
            "id": voucher.id,
            "code": voucher.code,
            "title": voucher.title,
            "expiry_date": voucher.expiry_date.isoformat(),
        },
    }, default=str).encode("utf-8")
    webhook_request = urlrequest.Request(
        webhook_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    recipient = webhook_url[:255]

    try:
        with urlrequest.urlopen(
            webhook_request,
            timeout=getattr(settings, "VOUCHER_WEBHOOK_TIMEOUT_SECONDS", 5),
        ) as response:
            if 200 <= response.status < 300:
                VoucherDeliveryLog.objects.create(
                    user=user,
                    voucher=voucher,
                    channel=VoucherDeliveryLog.CHANNEL_WEBHOOK,
                    status=VoucherDeliveryLog.STATUS_SENT,
                    recipient=recipient,
                )
                return True
            raise RuntimeError(f"Webhook returned HTTP {response.status}")
    except (error.URLError, OSError, RuntimeError) as exc:
        logger.warning("Voucher webhook delivery failed: %s", exc)
        VoucherDeliveryLog.objects.create(
            user=user,
            voucher=voucher,
            channel=VoucherDeliveryLog.CHANNEL_WEBHOOK,
            status=VoucherDeliveryLog.STATUS_FAILED,
            recipient=recipient,
            error_message=str(exc),
        )
        return False

