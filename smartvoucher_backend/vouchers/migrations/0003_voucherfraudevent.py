# Generated manually for the voucher anti-abuse audit trail.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_initial"),
        ("vouchers", "0002_voucherusage_uniq_voucher_usage_per_order"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="VoucherFraudEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("device_fingerprint_hash", models.CharField(blank=True, max_length=64)),
                ("status", models.CharField(choices=[("allowed", "Allowed"), ("blocked", "Blocked")], max_length=10)),
                ("reason", models.CharField(blank=True, max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("order", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="voucher_fraud_events", to="orders.order")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="voucher_fraud_events", to=settings.AUTH_USER_MODEL)),
                ("voucher", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="fraud_events", to="vouchers.voucher")),
            ],
        ),
        migrations.AddIndex(
            model_name="voucherfraudevent",
            index=models.Index(fields=["device_fingerprint_hash", "created_at"], name="voucher_fra_device__0d3576_idx"),
        ),
        migrations.AddIndex(
            model_name="voucherfraudevent",
            index=models.Index(fields=["ip_address", "created_at"], name="voucher_fra_ip_addr_1a8985_idx"),
        ),
    ]
