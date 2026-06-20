"""Dev-only bearer token management for the Apple Health HAE ingest endpoint."""

from __future__ import annotations

import hashlib
import hmac
import secrets


def generate_ingest_token() -> tuple[str, str, str]:
    """Return (plaintext, sha256_hex, display_prefix_12_chars)."""
    token = f"fh_ah_{secrets.token_urlsafe(32)}"
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash, token[:12]


def verify_ingest_token(bearer: str, stored_hash: str) -> bool:
    """Constant-time comparison to prevent timing attacks."""
    candidate_hash = hashlib.sha256(bearer.encode()).hexdigest()
    return hmac.compare_digest(candidate_hash, stored_hash)
