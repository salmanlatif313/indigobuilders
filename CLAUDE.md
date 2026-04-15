# CLAUDE.md — IndigoBuilders ERP

This file provides guidance to Claude Code when working in this repository.

---
-save all the prompts to prompt.txt
## Project Overview

IndigoBuilders ERP is an internal business portal for Indigo Builders Company,
built with a TypeScript monorepo (Node.js + React).
Same tech stack and conventions as global rules — refer to `~/.claude/CLAUDE.md` for all global rules.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (Vite, TypeScript, Tailwind CSS, RTL support) |
| Backend | Node.js + Express (TypeScript, tsx) |
| Database | MSSQL — `IndigoBuilders` DB via `mssql` package |
| Auth | JWT-based (`jsonwebtoken`), RBAC: Admin / Finance / PM / Engineer |
| Deploy | IIS + PM2 |

---

## Key Directories

| Path | Purpose |
|---|---|
| `server/src/index.ts` | Express entry point, mounts all `/api/*` routes |
| `server/src/db.ts` | DB pool manager — use `runQuery` / `runQueryResult` only |
| `server/src/routes/` | One file per domain |
| `server/src/middleware/requireAuth.ts` | JWT guard for all `/api/*` except `/api/auth/login` |
| `client/src/App.tsx` | Root component, manual client-side routing |
| `client/src/api.ts` | All API calls (native `fetch`) |
| `client/src/views/` | One component per page/route |
| `client/src/index.css` | Global stylesheet (Tailwind base) |

---

## Commands

```bash
npm install           # install all workspaces
npm run dev           # run server + client concurrently
npm run typecheck     # type-check both workspaces
npm run build         # build both workspaces
```

Before committing, always run `npm run typecheck` and `npm run build`.

---

## Environment

Copy `.env.example` to `.env`. Key variables:

- `DB_SERVER`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DATABASE` (defaults to `IndigoBuilders`)
- `PORT` — server port (default `4000`)
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `NODE_ENV=production` — enables static file serving from `client/dist`

---

## Database

- Database: `IndigoBuilders` on `172.1.10.43`
- Always use `runQuery<T>()` or `runQueryResult<T>()` from `server/src/db.ts`
- Always verify column names against `schema.sql` before writing queries
- Use parameterized `@param` placeholders — no string interpolation
- Roles: `Admin=1, Finance=2, PM=3, Engineer=4`

---

## UI / Layout Rules

- **Sidebar is fixed height**: the root layout div must use `h-screen overflow-hidden`. The sidebar never scrolls with page content — only `<main>` scrolls (`overflow-y-auto`). Do not change this to `min-h-screen`.
- **Brand colors**: Primary indigo `#0c2f5c` (`brand-900`), gold `#c19f3c` (`gold-500`). Always use Tailwind `brand-*` / `gold-*` classes; only use inline `style` when Tailwind purges the value.
- **Credentials**: default admin login is `admin` / `admin`.

---

## Compliance Modules

- **ZATCA Phase 2**: UBL 2.1 XML generation, QR code, clearance status on Invoices
- **WPS v3.1**: SIF file generation from Labor + PayrollRuns tables

---

## Server — PM2 Applications (172.1.10.51)

Three apps run on the production server, all managed by PM2:

| App | PM2 Name | Server Path | Port |
|---|---|---|---|
| IndigoBuilders ERP | `indigobuilders-api` | `C:\indigobuilders` | 4000 |
| Internal Portal | `internalportal-api` | `C:\InternalPortal` | 3001 |
| SalApp (Personal Accounting) | `salapp-api` | `C:\Sites` | 3000 |

**Unified manager** (run on the server): `server-manager.bat`
- Restart / stop / start all apps together, or individually
- Health checks per app
- Log tailing per app

Do **not** manage apps with three separate bat files — always use `server-manager.bat`.

---

## Production Deployment

Running `deploy\iis\deploy-to-share.bat` will:
1. Commit pending changes to `dev` and merge into `master`
2. Push both branches to GitHub
3. Build and deploy to IIS

---

## Git Workflow

- **Repo:** https://github.com/salmanlatif313/indigobuilders
- **Branches:** `master` (production) / `dev` (active development)
- Always work on `dev`. Never commit directly to `master`.
