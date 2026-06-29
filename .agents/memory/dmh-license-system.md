---
name: DMH License System
description: Architecture decisions and integration details for the DMH Suite licensing module.
---

## Context

The DMH Suite is an accounting software suite with 3 apps: Recorder (main), Cash Sheeter (cash register), Inventory (stock). All are Python desktop apps (PyQt/Tkinter) running on Windows only.

## License Types

- trial: 7 days default (configurable per key)
- subscription: 30 days, renewable (+30 days from expiry or now)
- perpetual: no expiry

## Products

- recorder, cash_sheeter, inventory, suite

## Key Architecture Decision

Keys are random hex strings (NOT structured/cryptographically signed). Validation is **online only** via API call. Machine binding is enforced at DB level — each license record stores the machineId it was issued for.

**Why:** Simpler to implement and maintain. Offline validation with asymmetric crypto (RSA/Ed25519) can be added later as an upgrade.

## Machine ID (Python, Windows only)

Uses WMIC commands to fingerprint: CPU ProcessorId + Disk SerialNumber + BIOS SerialNumber + Motherboard SerialNumber. Combined and SHA-256 hashed. Falls back to network MAC + hostname if WMIC fails.

## Python Module Integration

```python
from dmh_license import LicenseManager

lm = LicenseManager(product="recorder", api_url="https://your-app.replit.app/api")
if not lm.check_and_prompt():
    sys.exit(0)
```

The module is in `dmh_license/` at the workspace root. Copy this folder into the Python app project.

## API Endpoints

- POST /api/licenses — generate key (stored in DB)
- GET /api/licenses — list with filters
- POST /api/licenses/validate — validate key + machineId + product
- GET /api/licenses/stats — dashboard stats
- GET /api/licenses/:id — single license
- PATCH /api/licenses/:id — update (notes, clientName, isActive)
- DELETE /api/licenses/:id — delete
- POST /api/licenses/:id/revoke — deactivate
- POST /api/licenses/:id/renew — extend subscription by 30 days

## DB Schema

Table: `licenses` — id, licenseKey (unique), machineId, product, licenseType, isActive, expiresAt (nullable), clientName (nullable), notes (nullable), createdAt, updatedAt

**Why:** expiresAt is null for perpetual licenses. isActive=false means revoked (regardless of expiry).
