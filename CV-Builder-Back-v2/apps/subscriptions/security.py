import hashlib
import hmac

from django.conf import settings
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


def _verify_signature(request, *, secret: str, header_name: str) -> bool:
    signature = request.headers.get(header_name, "")
    if not signature:
        return False
    expected = hmac.new(
        secret.encode("utf-8"),
        request.body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_bog_webhook_signature(request) -> bool:
    public_key_pem = getattr(settings, "BOG_CALLBACK_PUBLIC_KEY", "")
    signature = request.headers.get("Callback-Signature", "")
    if getattr(settings, "PAYMENT_STUB_MODE", False) and not public_key_pem and not signature:
        return True
    if not public_key_pem or not signature:
        return False
    try:
        public_key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
        public_key.verify(
            bytes.fromhex(signature),
            request.body,
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except (ValueError, InvalidSignature):
        return False


def verify_fastoo_webhook_signature(request) -> bool:
    secret = getattr(settings, "FASTOO_WEBHOOK_SECRET", "")
    if getattr(settings, "PAYMENT_STUB_MODE", False) and not secret:
        return True
    if not secret:
        return False
    return _verify_signature(request, secret=secret, header_name="X-Fastoo-Signature")
