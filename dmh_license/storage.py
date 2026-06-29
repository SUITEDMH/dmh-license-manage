"""
Local storage for DMH license information.
Stores the license key securely in the Windows registry.
"""
import json
import os
from pathlib import Path
from typing import Optional


def _get_storage_path(product: str) -> Path:
    """Get the path to the local license storage file."""
    app_data = os.environ.get("APPDATA", os.path.expanduser("~"))
    storage_dir = Path(app_data) / "DMH Suite" / "licenses"
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir / f"{product}.lic"


def save_license_key(product: str, license_key: str) -> None:
    """
    Save a license key to local storage.

    Args:
        product: The product code.
        license_key: The license key to save.
    """
    path = _get_storage_path(product)
    data = {"licenseKey": license_key, "product": product}
    path.write_text(json.dumps(data), encoding="utf-8")


def load_license_key(product: str) -> Optional[str]:
    """
    Load a saved license key from local storage.

    Args:
        product: The product code.

    Returns:
        The saved license key, or None if not found.
    """
    path = _get_storage_path(product)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("licenseKey")
    except Exception:
        return None


def clear_license_key(product: str) -> None:
    """Remove the stored license key for a product."""
    path = _get_storage_path(product)
    if path.exists():
        path.unlink()
