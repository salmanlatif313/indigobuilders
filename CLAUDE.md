# CLAUDE.md — IndigoBuilders

This file provides guidance to Claude Code when working in this repository.

---

## Project Overview

IndigoBuilders is an internal business portal built with a TypeScript monorepo (Node.js + React).
Same tech stack and conventions as InternalPortal — refer to `~/.claude/CLAUDE.md` for all global rules.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite, TypeScript, no React Router) |
| Backend | Node.js + Express (TypeScript, tsx) |
| Database | MSSQL — `WestendAccounts` via `mssql` package |
| Auth | Session-based (`express-session`) |
| Deploy | IIS + PM2 |

---

## Key Directories

| Path | Purpose |
|---|---|
| `server/src/index.ts` | Express entry point, mounts all `/api/*` routes |
| `server/src/db.ts` | DB pool manager — use `runQuery` / `runQueryResult` only |
| `server/src/routes/` | One file per domain |
| `server/src/middleware/requireAuth.ts` | Guards all `/api/*` except `/api/auth/*` |
| `client/src/App.tsx` | Root component, manual client-side routing |
| `client/src/api.ts` | All API calls (native `fetch`, no axios) |
| `client/src/views/` | One component per page/route |
| `client/src/styles.css` | Single global stylesheet (no CSS modules) |

---

## Commands

```bash
npm install           # install all workspaces
npm run dev           # run server + client concurrently
npm run typecheck     # type-check both workspaces
npm run build         # build both workspaces (bumps version first)
```

Before committing, always run `npm run typecheck` and `npm run build`.

---

## Environment

Copy `.env.example` to `.env`. Key variables:

- `DB_SERVER`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` (defaults to `WestendAccounts`)
- `PORT` — server port (default `4000`)
- `NODE_ENV=production` — enables static file serving from `client/dist`

---

## Database

- Database: `WestendAccounts` on `172.1.10.43`
- Always use `runQuery<T>()` or `runQueryResult<T>()` from `server/src/db.ts`
- Always verify column names against the schema before writing queries
- Use parameterized `@param` placeholders — no string interpolation
- Always JOIN `dbo.Lists` for status/stage labels (ListID `4 = Active`, `5 = Inactive`)
- `AspNetUsers.UserStatus`: `0 = active`, `1 = disabled` (reversed from other tables)

---

## Production Deployment

Running `deploy\iis\deploy-to-share.bat` will:
1. Commit pending changes to `dev` and merge into `master`
2. Push both branches to GitHub
3. Build and deploy to `\\internal.deltatechcorp.com\c$\IndigoBuilders`

---

## Git Workflow

- **Repo:** https://github.com/salmanlatif313/indigobuilders
- **Branches:** `master` (production) / `dev` (active development)
- Always work on `dev`. Never commit directly to `master`.

```bash
git add .
git commit -m "Describe what changed"
git push
```
