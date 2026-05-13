import base64
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings
from django.template.loader import render_to_string


def _photo_url_to_data_url(photo_url):
    """
    Convert a photo URL (relative /media/..., absolute http(s)://..., or already a data URL)
    into a base64 data URL that WeasyPrint can embed reliably.

    Returns None if the photo can't be resolved/read — the template should handle that gracefully.
    """
    if not photo_url:
        return None

    # Already a data URL — pass through
    if isinstance(photo_url, str) and photo_url.startswith("data:"):
        return photo_url

    try:
        # Case 1: Absolute URL (http/https)
        if isinstance(photo_url, str) and photo_url.startswith(("http://", "https://")):
            # Try to resolve to a local file under MEDIA_ROOT first
            # (avoids an outbound HTTP call for our own uploads).
            parsed = urlparse(photo_url)
            media_url = getattr(settings, "MEDIA_URL", "/media/")
            if parsed.path.startswith(media_url):
                relative = parsed.path[len(media_url):]
                local_path = Path(settings.MEDIA_ROOT) / relative
                if local_path.exists():
                    return _file_to_data_url(local_path)

            # External URL — fetch with a short timeout
            try:
                import requests
                r = requests.get(photo_url, timeout=5)
                if r.status_code == 200:
                    mime = r.headers.get("Content-Type", "image/png").split(";")[0].strip()
                    b64 = base64.b64encode(r.content).decode("ascii")
                    return f"data:{mime};base64,{b64}"
            except Exception:
                return None
            return None

        # Case 2: Relative path
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        path_str = photo_url.lstrip("/")
        media_url_clean = media_url.strip("/")
        if media_url_clean and path_str.startswith(media_url_clean + "/"):
            path_str = path_str[len(media_url_clean) + 1:]

        local_path = Path(settings.MEDIA_ROOT) / path_str
        if local_path.exists():
            return _file_to_data_url(local_path)
    except Exception:
        return None

    return None


def _file_to_data_url(path: Path):
    """Read a local file and return a base64 data URL."""
    mime, _ = mimetypes.guess_type(str(path))
    if not mime:
        mime = "image/png"
    data = path.read_bytes()
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _pdf_date_labels(language_code):
    """Short 'Present' vs long 'Currently working here' (matches frontend previews)."""
    lang = (language_code or "en").lower()
    if lang.startswith("ka"):
        return "დღემდე", "ახლა აქ ვმუშაობ"
    return "Present", "Currently working here"


def render_cv_pdf(*, cv, watermark=False, template="classic"):
    from weasyprint import HTML

    europass_templates = ["europass", "modern"]
    is_europass = template in europass_templates
    template_name = "cvs/pdf_europass.html" if is_europass else "cvs/pdf.html"

    present_short, present_long = _pdf_date_labels(getattr(cv, "language", None))
    context = {
        "cv": cv,
        "watermark": watermark,
        "pdf_present": present_short,
        "pdf_currently_working": present_long,
    }

    # Photo is only used in europass-family templates.
    if is_europass:
        personal_info = {}
        if isinstance(cv.cv_data, dict):
            # Support both personalInfo (camelCase, used by frontend preview)
            # and personal_info (snake_case, legacy)
            personal_info = (
                cv.cv_data.get("personalInfo")
                or cv.cv_data.get("personal_info")
                or {}
            )

        # Try `photo` first (matches frontend preview), fall back to `photo_url` (legacy)
        raw_photo = personal_info.get("photo") or personal_info.get("photo_url")
        context["photo_data_url"] = _photo_url_to_data_url(raw_photo)

        # photoShape: 'rounded-full' (circle) or anything else (rounded square — default)
        context["photo_shape"] = personal_info.get("photoShape") or "rounded-2xl"

    html_string = render_to_string(template_name, context)
    return HTML(string=html_string).write_pdf()


def check_pdf_engine():
    try:
        from weasyprint import HTML
        HTML(string="<html><body><p>PDF engine check</p></body></html>").write_pdf()
        return True, ""
    except Exception as exc:
        return False, str(exc)