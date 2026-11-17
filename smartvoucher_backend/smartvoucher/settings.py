import json
import os
from pathlib import Path
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

def load_dotenv(env_path):
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        os.environ.setdefault(key, value)

def env(name, default=None):
    return os.environ.get(name, default)

def env_bool(name, default=False):
    value = env(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}

def env_list(name, default=None):
    value = env(name)
    if value is None:
        return default or []
    return [item.strip() for item in value.split(",") if item.strip()]

load_dotenv(BASE_DIR / ".env")
IS_PRODUCTION = env("DJANGO_ENV", "development") == "production"

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env("DJANGO_SECRET_KEY", "django-insecure-change-me-before-production")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = not IS_PRODUCTION and env_bool("DJANGO_DEBUG", True)

ALLOWED_HOSTS = env_list(
    "DJANGO_ALLOWED_HOSTS", [] if IS_PRODUCTION else ["127.0.0.1", "localhost"]
)
SESSION_COOKIE_SECURE = IS_PRODUCTION
CSRF_COOKIE_SECURE = IS_PRODUCTION
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")

if IS_PRODUCTION:
    if not SECRET_KEY or SECRET_KEY in {
        "django-insecure-change-me-before-production",
        "replace-with-a-long-random-secret",
    }:
        raise ImproperlyConfigured("Set DJANGO_SECRET_KEY for production")
    if not ALLOWED_HOSTS:
        raise ImproperlyConfigured("Set DJANGO_ALLOWED_HOSTS for production")
    # Only trust this header behind a proxy that overwrites it. Production
    # Compose binds the backend port to loopback for the host reverse proxy.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_apscheduler',
    'django.contrib.humanize',

    # Thư viện bên thứ 3
    'rest_framework',
    'rest_framework_simplejwt', 
    'django_extensions',
    'corsheaders',

    # Apps của bạn
    'users.apps.UsersConfig',
    'orders.apps.OrdersConfig',
    'vouchers.apps.VouchersConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CORS Settings
CORS_ALLOW_ALL_ORIGINS = not IS_PRODUCTION and env_bool("CORS_ALLOW_ALL_ORIGINS", True)
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    [] if IS_PRODUCTION else [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
)

# Database Settings -> Đã sửa để đọc động từ file .env của bạn
DATABASES = {
    'default': {
        'ENGINE': env('DB_ENGINE', 'django.db.backends.mysql'),
        'NAME': env('DB_NAME', 'smartvoucher'),
        'USER': env('DB_USER', 'root'),
        'PASSWORD': env('DB_PASSWORD', '123456'),
        'HOST': env('DB_HOST', 'db'),  # 'db' là tên container MySQL khi chạy Docker
        'PORT': env('DB_PORT', '3306'),
    }
}

# Shared cache and locks used by voucher redemption and fraud checks.
CACHES = {
    "default": {
        "BACKEND": env("CACHE_BACKEND", "django.core.cache.backends.redis.RedisCache"),
        "LOCATION": env("CACHE_LOCATION", "redis://127.0.0.1:6379/1"),
        "TIMEOUT": int(env("CACHE_TIMEOUT", "300")),
    }
}

VOUCHER_REDEMPTION_WINDOW_SECONDS = int(env("VOUCHER_REDEMPTION_WINDOW_SECONDS", "60"))
VOUCHER_REDEMPTION_MAX_ATTEMPTS = int(env("VOUCHER_REDEMPTION_MAX_ATTEMPTS", "5"))
VOUCHER_MAX_USERS_PER_DEVICE = int(env("VOUCHER_MAX_USERS_PER_DEVICE", "3"))
VOUCHER_REDEMPTION_LOCK_TIMEOUT_SECONDS = int(env("VOUCHER_REDEMPTION_LOCK_TIMEOUT_SECONDS", "120"))
VOUCHER_REDEMPTION_LOCK_WAIT_SECONDS = int(env("VOUCHER_REDEMPTION_LOCK_WAIT_SECONDS", "120"))

# Used by the initial product-catalog data migration. Empty means no seed data.
try:
    PRODUCT_CATALOG = json.loads(env("PRODUCT_CATALOG_JSON", "{}"))
except json.JSONDecodeError as exc:
    raise ImproperlyConfigured("PRODUCT_CATALOG_JSON must contain valid JSON") from exc
if not isinstance(PRODUCT_CATALOG, dict):
    raise ImproperlyConfigured("PRODUCT_CATALOG_JSON must be a JSON object")

# REST Framework & JWT Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
}

AUTH_USER_MODEL = "users.User"

# Email Settings
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(env("EMAIL_PORT", "587"))
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)
EMAIL_TIMEOUT = 30

ROOT_URLCONF = 'smartvoucher.urls'

TEMPLATES = [
{
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'smartvoucher.wsgi.application'

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_I18N = True
USE_TZ = False

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
