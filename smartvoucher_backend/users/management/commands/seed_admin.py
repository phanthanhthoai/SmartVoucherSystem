from django.core.management.base import BaseCommand
from users.models import User  # Thay 'users' bằng tên app chính xác của bạn


class Command(BaseCommand):
    help = "Seed an admin account into the database"

    def handle(self, *args, **kwargs):
        admin_username = "thoai"
        admin_email = "thoai@smartvoucher.com"
        admin_password = "123456"  # Hãy đổi mật khẩu này bảo mật hơn

        if User.objects.filter(username=admin_username).exists():
            self.stdout.write(
                self.style.WARNING(f"User '{admin_username}' đã tồn tại!")
            )
            return

        # Tạo tài khoản Admin với các trường tùy chỉnh (Custom fields) của bạn
        admin_user = User.objects.create_superuser(
            username=admin_username,
            email=admin_email,
            password=admin_password,
            role=User.ROLE_ADMIN,
            customer_group=User.CUSTOMER_GROUP_ALL,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Tạo thành công Admin: {admin_username} | Mật khẩu: {admin_password}"
            )
        )
