# DMH License Module

Module Python de gestion de licences pour la Suite DMH.

## Installation

Copiez le dossier `dmh_license/` dans votre projet Python.

## Utilisation rapide

```python
from dmh_license import LicenseManager

# Initialisation (à faire une seule fois au démarrage)
lm = LicenseManager(
    product="recorder",           # recorder | cash_sheeter | inventory | suite
    api_url="https://your-server.replit.app/api"
)

# Vérification au démarrage de l'application
if not lm.check_and_prompt():
    # L'utilisateur n'a pas de licence valide ou a fermé la boîte de dialogue
    sys.exit(0)

# L'application démarre normalement...
```

## Intégration PyQt5

```python
from dmh_license import LicenseManager

class MyApp(QApplication):
    def __init__(self):
        super().__init__(sys.argv)
        
        lm = LicenseManager(
            product="recorder",
            api_url="https://your-server.replit.app/api"
        )
        
        if not lm.check_and_prompt(parent_window=None):
            sys.exit(0)
        
        # Créer la fenêtre principale...
```

## Produits disponibles

| Code | Nom affiché |
|------|-------------|
| `recorder` | Recorder |
| `cash_sheeter` | Cash Sheeter |
| `inventory` | Inventory |
| `suite` | Suite DMH |

## Types de licences

| Type | Durée | Description |
|------|-------|-------------|
| `trial` | 7 jours | Période d'essai gratuite |
| `subscription` | 30 jours | Abonnement mensuel renouvelable |
| `perpetual` | Illimitée | Achat perpétuel |

## Obtenir l'identifiant machine

```python
from dmh_license import get_machine_id

machine_id = get_machine_id()
print(f"ID Machine: {machine_id}")
# Exemple: a3f1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

L'utilisateur doit communiquer cet identifiant pour que vous puissiez générer sa clé de licence dans l'application admin.

## Validation manuelle

```python
result = lm.validate()

if result.valid:
    print(f"Licence valide: {result.message}")
    print(f"Type: {result.license_type}")
    print(f"Expire le: {result.expires_at}")
    print(f"Jours restants: {result.days_remaining}")
else:
    print(f"Licence invalide: {result.message}")
```

## Activation manuelle

```python
result = lm.activate("AAAAAA-BBBBBB-CCCCCC-DDDDDD-EEEEEE")

if result.valid:
    print("Licence activée avec succès!")
else:
    print(f"Erreur: {result.message}")
```

## Dépendances

- Python 3.8+
- Windows uniquement (utilise WMIC pour l'identifiant machine)
- Connexion Internet requise pour la validation
- `tkinter` (inclus avec Python) pour la boîte de dialogue

## Configuration requise

L'URL de l'API doit pointer vers votre serveur DMH License Manager hébergé sur Replit.
