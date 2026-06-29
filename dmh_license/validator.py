"""
Online license validator for DMH License System.
Communicates with the DMH License API to validate licenses.
"""
import json
import urllib.request
import urllib.error
from dataclasses import dataclass
from typing import Optional


@dataclass
class ValidationResult:
    """Result of a license validation attempt."""
    valid: bool
    message: str
    license_type: Optional[str] = None
    expires_at: Optional[str] = None
    days_remaining: Optional[int] = None


def validate_online(
    api_url: str,
    license_key: str,
    machine_id: str,
    product: str,
    timeout: int = 10,
) -> ValidationResult:
    """
    Validate a license key against the DMH License API.

    Args:
        api_url: Base URL of the DMH License API (e.g. "https://your-app.replit.app/api")
        license_key: The license key to validate.
        machine_id: The machine's unique hardware fingerprint.
        product: The product code (recorder | cash_sheeter | inventory | suite).
        timeout: Request timeout in seconds.

    Returns:
        ValidationResult with validation status and details.
    """
    url = f"{api_url.rstrip('/')}/licenses/validate"
    payload = json.dumps({
        "licenseKey": license_key,
        "machineId": machine_id,
        "product": product,
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8"))
            return ValidationResult(
                valid=data.get("valid", False),
                message=data.get("message", ""),
                license_type=data.get("licenseType"),
                expires_at=data.get("expiresAt"),
                days_remaining=data.get("daysRemaining"),
            )
    except urllib.error.HTTPError as e:
        return ValidationResult(
            valid=False,
            message=f"Erreur de validation (HTTP {e.code}).",
        )
    except (urllib.error.URLError, OSError, TimeoutError):
        return ValidationResult(
            valid=False,
            message="Impossible de contacter le serveur de licence. Vérifiez votre connexion Internet.",
        )
    except Exception as e:
        return ValidationResult(
            valid=False,
            message=f"Erreur inattendue: {e}",
        )
