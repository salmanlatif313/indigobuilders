# IIS Deployment

This repo is set up for:

- IIS serving the built client app from `client/dist`
- IIS reverse proxying `/api/*` requests to the Node server on `http://localhost:3001`

## Prerequisites

- IIS installed
- URL Rewrite installed
- Application Request Routing (ARR) installed
- ARR proxy enabled
- Node.js installed on the server

## Publish Layout

Use this layout on the server:

- IIS site root:
  - contents of `client/dist`
  - `web.config` from [deploy/iis/web.config](C:\Projects\InternalPortal\deploy\iis\web.config:1)
- Node API app:
  - repo root or a published server folder containing:
    - `server/dist`
    - `server/package.json`
    - root `package.json`
    - production `.env`

## Build

From the repo root:

```bash
npm install
npm run build
```

## One-Time Server Setup

Run this on the server one time:

```bat
C:\InternalPortal\server-first-time-setup.bat
```

Before running it:

- make sure the app files have already been copied to `C:\InternalPortal`
- update `PM2_CMD` in [server-first-time-setup.bat](C:\Projects\InternalPortal\deploy\iis\server-first-time-setup.bat:1) if PM2 is installed in a different location

If you use the deployment batch from your dev machine, it will copy the root `.env` automatically when that file exists locally.

For a direct copy deployment to the server admin share, use:

```bat
deploy\iis\deploy-to-share.bat
```

That script:

- builds locally
- copies `client/dist` to `\\internal.deltatechcorp.com\c$\InternalPortal\client\dist`
- copies `server/dist` to `\\internal.deltatechcorp.com\c$\InternalPortal\server\dist`
- copies the root `.env` to `\\internal.deltatechcorp.com\c$\InternalPortal\.env` when it exists locally
- copies `ecosystem.config.cjs` to `\\internal.deltatechcorp.com\c$\InternalPortal`
- copies `server-apply-deployment.bat` to `\\internal.deltatechcorp.com\c$\InternalPortal`
- copies `server-restart.bat` to `\\internal.deltatechcorp.com\c$\InternalPortal`
- copies `server-manager.bat` to `\\internal.deltatechcorp.com\c$\InternalPortal`
- copies `deploy/iis/web.config` into the deployed `client/dist`
- creates a timestamped backup of the previous `server/dist` under `\\internal.deltatechcorp.com\c$\InternalPortal\backups`

After the copy step, run this on the server:

```bat
C:\InternalPortal\server-restart.bat
```

Manual equivalent:

```bat
cd C:\InternalPortal
pm2 restart internalportal-api
pm2 save
```

## IIS Site

1. Create or point an IIS site to the published `client/dist` folder.
2. Copy [deploy/iis/web.config](C:\Projects\InternalPortal\deploy\iis\web.config:1) into that site root as `web.config`.
3. Confirm ARR proxy is enabled:
   - IIS Manager
   - click the server node
   - open `Application Request Routing Cache`
   - click `Server Proxy Settings`
   - enable proxy

## Node API

Run the API separately on the same server:

```bash
cd server
npm install --omit=dev
node dist/index.js
```

Recommended: run it as a Windows service using NSSM, PM2 service, or another service manager.

For PM2, an example ecosystem file is provided at [ecosystem.config.cjs](C:\Projects\InternalPortal\ecosystem.config.cjs:1).
The server-side deployment scripts are [server-apply-deployment.bat](C:\Projects\InternalPortal\server-apply-deployment.bat:1), [server-restart.bat](C:\Projects\InternalPortal\server-restart.bat:1), and [server-manager.bat](C:\Projects\InternalPortal\server-manager.bat:1).

Example first-time PM2 setup on the server:

```powershell
cd C:\InternalPortal
server-first-time-setup.bat
```

The IIS reverse proxy assumes the API listens on:

- `http://localhost:3001`

If you use a different port, update [deploy/iis/web.config](C:\Projects\InternalPortal\deploy\iis\web.config:1).

## Required Environment Variables

Use a production `.env` for the Node server with values like:

```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://internal.deltatechcorp.com

DB_SERVER=your-sql-server
DB_DATABASE=WestendAccounts
DB_USER=your-user
DB_PASSWORD=your-password
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

WALMART_DB_SERVER=your-sql-server
WALMART_DB_DATABASE=WalmartApi
WALMART_DB_USER=your-user
WALMART_DB_PASSWORD=your-password
WALMART_DB_ENCRYPT=false
WALMART_DB_TRUST_SERVER_CERTIFICATE=true
```

## Smoke Test

After deployment verify:

- `/` loads
- `/Walmart/Payments` loads directly in a new browser tab
- `/DataIntegrity/QuantityIssues` loads directly in a new browser tab
- `/api/health` returns JSON
- Order Trace search works
- Walmart Payments loads
- Quantity Issues loads

## Notes

- The client now calls `/api`, so no client-side hostname change is needed for IIS.
- The SPA fallback rule rewrites non-file, non-API requests to `index.html`.
- The reverse proxy rule forwards only `/api/*` traffic to Node.
