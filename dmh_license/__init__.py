"""
DMH License Module
==================
Module de validation de licence pour les applications de la Suite DMH.

Usage:
    from dmh_license import LicenseManager

    lm = LicenseManager(product="recorder", api_url="https://your-server.replit.app/api")
    result = lm.validate()

    if not result.valid:
        # Afficher fenêtre de saisie de clé
        lm.show_license_dialog()
"""

from .license import LicenseManager
from .machine_id import get_machine_id

__all__ = ["LicenseManager", "get_machine_id"]
__version__ = "1.0.0"
