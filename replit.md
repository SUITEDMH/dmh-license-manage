# DMH License Manager

Application d'administration pour la gestion des licences de la Suite DMH (Recorder, Cash Sheeter, Inventory).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/license-admin run dev` — run the admin frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind + shadcn/ui

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/db/src/schema/licenses.ts` — Licenses table schema (Drizzle ORM)
- `artifacts/api-server/src/routes/licenses.ts` — License CRUD + validate routes
- `artifacts/api-server/src/lib/licenseKey.ts` — Key generation utilities
- `artifacts/license-admin/src/` — Admin web frontend (React + Vite)
- `dmh_license/` — Python module for integration into desktop apps

## Architecture decisions

- License keys are random hex strings (not structured/signed) — validation is always online via the API. Offline validation can be added later with asymmetric crypto.
- Machine binding is enforced at the DB level: each license stores the `machineId` it was issued for. Validation rejects keys used on a different machine.
- Trial: 7 days (configurable per key), Subscription: 30 days renewable, Perpetual: no expiry.
- French-language UI (the target user is the DMH founder managing francophone clients).

## Product

- Admin web app: dashboard (stats), license list (search/filter), generate license form, license detail (revoke/renew)
- Python module (`dmh_license/`): integrate into Recorder, Cash Sheeter, Inventory apps — validates license on startup, shows activation dialog if needed

## User preferences

- Applications are Python (PyQt/Tkinter) desktop apps running on Windows only
- The user is the sole admin (no multi-user auth needed for now)
- French-language UI preferred
- Products: Recorder, Cash Sheeter, Inventory, Suite DMH

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, always run codegen before implementing routes
- `dmh_license/` Python module requires Windows (uses WMIC for machine ID)
- The Python module needs Internet access to validate licenses (calls the API)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Python integration docs: `dmh_license/README.md`
