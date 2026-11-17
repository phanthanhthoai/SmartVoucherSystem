# vouchers/apps.py
import os
from django.apps import AppConfig

class VouchersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'vouchers'

    def ready(self):
        # Local autoreload child or the single production web worker.
        # The production flag is enabled only for Gunicorn, not migrations.
        if (os.environ.get('RUN_MAIN') == 'true'
                or os.environ.get('ENABLE_VOUCHER_SCHEDULER') == 'true'):
            from . import scheduler
            scheduler.start_jobs()