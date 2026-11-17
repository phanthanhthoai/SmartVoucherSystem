import time

from django.core.management.base import BaseCommand

from vouchers.scheduler import start_jobs


class Command(BaseCommand):
    help = "Run the scheduled voucher distribution worker"

    def handle(self, *args, **options):
        scheduler = start_jobs()
        self.stdout.write(self.style.SUCCESS("Voucher scheduler is running."))
        try:
            while scheduler.running:
                time.sleep(1)
        except KeyboardInterrupt:
            scheduler.shutdown()
            self.stdout.write("Voucher scheduler stopped.")
