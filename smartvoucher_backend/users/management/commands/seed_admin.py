import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create an admin account from SMARTVOUCHER_ADMIN_* environment variables"

    def handle(self, *args, **kwargs):
        admin_username = os.environ.get("SMARTVOUCHER_ADMIN_USERNAME", "").strip()
        admin_email = os.environ.get("SMARTVOUCHER_ADMIN_EMAIL", "").strip()
        admin_password = os.environ.get("SMARTVOUCHER_ADMIN_PASSWORD", "")
        if not admin_username or not admin_email or not admin_password:
            raise CommandError(
                "Set SMARTVOUCHER_ADMIN_USERNAME, SMARTVOUCHER_ADMIN_EMAIL, "
                "and SMARTVOUCHER_ADMIN_PASSWORD before creating an admin."
            )

        User = get_user_model()
        if User.objects.filter(username=admin_username).exists():
            self.stdout.write(
                self.style.WARNING(f"User '{admin_username}' already exists.")
            )
            return

        candidate = User(username=admin_username, email=admin_email)
        try:
            validate_password(admin_password, user=candidate)
        except ValidationError as exc:
            raise CommandError("; ".join(exc.messages)) from exc

        User.objects.create_superuser(
            username=admin_username,
            email=admin_email,
            password=admin_password,
            role=User.ROLE_ADMIN,
            customer_group=User.CUSTOMER_GROUP_ALL,
        )
        self.stdout.write(self.style.SUCCESS(f"Created admin account: {admin_username}"))
