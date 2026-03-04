def verify_bog_webhook_signature(request) -> bool:
    """
    Placeholder for real BOG signature verification.
    Later:
    - read X-BOG-Signature header
    - compute expected HMAC from raw body + secret
    - compare securely
    """
    # TODO: implement real verification
    return True


def verify_fastoo_webhook_signature(request) -> bool:
    """
    Placeholder for real Fastoo signature verification.
    Later:
    - read X-Fastoo-Signature header (or gateway-specific header)
    - compute expected HMAC/signature with secret
    - compare securely
    """
    # TODO: implement real verification
    return True