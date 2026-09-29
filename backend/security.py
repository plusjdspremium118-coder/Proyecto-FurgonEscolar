"""
security.py — Módulo de seguridad centralizado para RutaSegura.
- Hashing PBKDF2-HMAC-SHA256 con sal única por usuario (NIST SP 800-132).
- Tokens anti-CSRF criptográficamente seguros.
- Comparación en tiempo constante para prevenir timing attacks.
"""

import hashlib
import secrets


def hash_password(password: str) -> tuple[str, str]:
    """
    Genera un hash PBKDF2-SHA256 y una sal criptográfica única.
    Retorna: (hash_hex, salt_hex)
    """
    salt = secrets.token_hex(32)
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100_000
    ).hex()
    return pwd_hash, salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """
    Verifica una contraseña contra su hash almacenado usando comparación en tiempo constante.
    Previene timing attacks.
    """
    computed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100_000
    ).hex()
    return secrets.compare_digest(computed, stored_hash)


def generate_csrf_token() -> str:
    """Genera un token anti-CSRF criptográficamente seguro."""
    return secrets.token_urlsafe(32)
