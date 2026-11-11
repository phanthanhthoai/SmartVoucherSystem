# vouchers/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore, register_events
from django.utils import timezone


def start_jobs():
    scheduler = BackgroundScheduler(timezone=timezone.get_current_timezone())
    
    # 1. Thêm JobStore để lưu lịch sử vào DB
    scheduler.add_jobstore(DjangoJobStore(), "default")

    # 2. Thay vì dùng Decorator @, ní dùng hàm add_job trực tiếp như vầy:
    scheduler.add_job(
        process_due_distribution_plans,   # Tên hàm (không có ngoặc đơn)
        trigger="interval",
        seconds=60,
        id="auto_distribute_voucher",
        max_instances=1,
        replace_existing=True,            # Giờ thì nó sẽ không bị lỗi lặp tham số nữa
    )

    # 3. Đăng ký sự kiện và bắt đầu
    register_events(scheduler)
    scheduler.start()
    print("Đã bật hệ thống phát Voucher tự động thành công!")
    return scheduler

def process_due_distribution_plans():
    from .services.distribution import process_due_distribution_plans as process_plans

    return process_plans()