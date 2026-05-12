import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def env_int(name, default):
    return int(os.getenv(name, str(default)))


APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
DEBUG = env_bool("DEBUG", APP_ENV != "production")

SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "dev-secret-key-change-before-production"
    else:
        raise ImproperlyConfigured("SECRET_KEY must be set when DEBUG is disabled.")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
PAYMENT_STUB_MODE = env_bool("PAYMENT_STUB_MODE", True)
PDF_ENGINE_STRICT = env_bool("PDF_ENGINE_STRICT", not DEBUG)

default_allowed_hosts = "127.0.0.1,localhost" if DEBUG else ""
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", default_allowed_hosts)
if not ALLOWED_HOSTS and not DEBUG:
    raise ImproperlyConfigured("ALLOWED_HOSTS must be set when DEBUG is disabled.")

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    f"{FRONTEND_URL},http://127.0.0.1:5173,http://localhost:5173",
)
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    f"{FRONTEND_URL},http://127.0.0.1:8000,http://localhost:8000",
)
CORS_ALLOW_CREDENTIALS = env_bool("CORS_ALLOW_CREDENTIALS", True)


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "apps.users",
    "apps.cvs",
    "apps.labels",
    "apps.cv_versions",
    "apps.ai",
    "apps.subscriptions",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "CV_Builder_Back_v2.urls"
WSGI_APPLICATION = "CV_Builder_Back_v2.wsgi.application"
AUTH_USER_MODEL = "users.User"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


db_engine = os.getenv("DB_ENGINE", "django.db.backends.sqlite3").strip()
if db_engine == "django.db.backends.sqlite3":
    db_name = os.getenv("DB_NAME", str(BASE_DIR / "db.sqlite3"))
    DATABASES = {
        "default": {
            "ENGINE": db_engine,
            "NAME": db_name,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": db_engine,
            "NAME": os.getenv("DB_NAME", ""),
            "USER": os.getenv("DB_USER", ""),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": env_int("DB_CONN_MAX_AGE", 60),
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env_int("JWT_ACCESS_MINUTES", 60)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int("JWT_REFRESH_DAYS", 7)),
    "ROTATE_REFRESH_TOKENS": env_bool("JWT_ROTATE_REFRESH_TOKENS", False),
    "BLACKLIST_AFTER_ROTATION": env_bool("JWT_BLACKLIST_AFTER_ROTATION", True),
}


EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@nebula.local")
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = env_int("EMAIL_PORT", 587)
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")


DEFAULT_PAYMENT_GATEWAY = os.getenv("DEFAULT_PAYMENT_GATEWAY", "bog")
FASTOO_WEBHOOK_SECRET = os.getenv("FASTOO_WEBHOOK_SECRET", "")
FASTOO_API_URL = os.getenv("FASTOO_API_URL", "https://api.fastoo.ge")
FASTOO_PROJECT_ID = os.getenv("FASTOO_PROJECT_ID", "")
FASTOO_API_PASSWORD = os.getenv("FASTOO_API_PASSWORD", "")
FASTOO_TERMINAL = os.getenv("FASTOO_TERMINAL", "")

PAYMENT_SUCCESS_URL = os.getenv(
    "PAYMENT_SUCCESS_URL",
    "http://127.0.0.1:8000/api/subscriptions/payment-success/",
)
PAYMENT_CANCEL_URL = os.getenv(
    "PAYMENT_CANCEL_URL",
    "http://127.0.0.1:8000/api/subscriptions/payment-cancel/",
)

BOG_OAUTH_URL = os.getenv(
    "BOG_OAUTH_URL",
    "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token",
)
BOG_API_URL = os.getenv("BOG_API_URL", "https://api.bog.ge")
BOG_CLIENT_ID = os.getenv("BOG_CLIENT_ID", "")
BOG_CLIENT_SECRET = os.getenv("BOG_CLIENT_SECRET", "")
BOG_CALLBACK_PUBLIC_KEY = os.getenv("BOG_CALLBACK_PUBLIC_KEY", "")


LANGUAGE_CODE = os.getenv("LANGUAGE_CODE", "en-us")
TIME_ZONE = os.getenv("TIME_ZONE", "UTC")
USE_I18N = True
USE_TZ = True


STATIC_URL = "/static/"
STATIC_ROOT = os.getenv("STATIC_ROOT", str(BASE_DIR / "staticfiles"))

MEDIA_URL = "/media/"
MEDIA_ROOT = os.getenv("MEDIA_ROOT", str(BASE_DIR / "media"))


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
