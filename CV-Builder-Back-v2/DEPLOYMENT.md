# Deployment Handoff

## Runtime

- Recommended runtime: Linux
- Verified PDF rendering runtime: Docker image built from this repository
- Local Windows environment does not provide the native libraries required by WeasyPrint

## Verified Commands

### Local checks

```powershell
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py test
.\venv\Scripts\python.exe manage.py check_pdf_engine
```

### Docker

```powershell
docker compose build backend
docker compose run --rm backend python manage.py check_pdf_engine
docker compose run --rm backend python manage.py test apps.cvs.tests
```

## Required Environment Variables

### Core app

- `APP_ENV`
- `DEBUG`
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `FRONTEND_URL`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`

### Database

- `DB_ENGINE`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`
- `DB_CONN_MAX_AGE`

### Auth

- `JWT_ACCESS_MINUTES`
- `JWT_REFRESH_DAYS`
- `JWT_ROTATE_REFRESH_TOKENS`
- `JWT_BLACKLIST_AFTER_ROTATION`

### Email

- `EMAIL_BACKEND`
- `DEFAULT_FROM_EMAIL`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USE_TLS`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`

### PDF and static

- `PDF_ENGINE_STRICT`
- `STATIC_ROOT`

### AI/OpenAI

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

### Google sign-in

- `GOOGLE_CLIENT_ID`

### Payments

- `DEFAULT_PAYMENT_GATEWAY`
- `PAYMENT_STUB_MODE`
- `PAYMENT_SUCCESS_URL`
- `PAYMENT_CANCEL_URL`

### Fastoo

- `FASTOO_API_URL`
- `FASTOO_PROJECT_ID`
- `FASTOO_API_PASSWORD`
- `FASTOO_TERMINAL`
- `FASTOO_WEBHOOK_SECRET`

### BOG

- `BOG_OAUTH_URL`
- `BOG_API_URL`
- `BOG_CLIENT_ID`
- `BOG_CLIENT_SECRET`
- `BOG_CALLBACK_PUBLIC_KEY`

## Production Notes

- `DEBUG` must be disabled in production
- `SECRET_KEY` must be provided in production
- `ALLOWED_HOSTS` must be set in production
- Run the backend in Linux or a Linux container for real PDF generation
- Use `PAYMENT_STUB_MODE=0` only after real gateway credentials are available
- Payment return and webhook URLs must match the deployed backend domain

## Current Status

### Complete

- Auth and onboarding flow aligned to the documented API contract
- CV CRUD, versioning, labels, translation, and export endpoint covered by tests
- Subscription checkout, success, cancel, webhook, trial expiry, renewal, downgrade, and period-end flows covered by tests
- PDF generation path validated in Linux via Docker

### Waiting on credentials

- OpenAI live key
- Google client ID
- Fastoo live or sandbox credentials
- BOG live or sandbox credentials
- Production email provider credentials

## Operational Commands

### Trial expiry

```powershell
python manage.py expire_trials
```

### Paid subscription expiry

```powershell
python manage.py expire_paid_subscriptions
```

### PDF readiness

```powershell
python manage.py check_pdf_engine
```
