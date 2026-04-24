# IndigoBuilders ERP — Master System Requirements Specification (SRS)

**Company:** Indigo Builders Company  
**System:** IndigoBuilders ERP (formerly "BenaaConnect ERP" in draft PDF)  
**Classification:** Proprietary & Confidential  
**Compliance:** ZATCA Phase 2 | MHRSD WPS v3.1 | GOSI | PDPL  

---

## Document Evolution Log

| Version | Date       | Author        | Changes |
|---------|------------|---------------|---------|
| v3.0    | 2026-04-01 | S. Latif      | Original PDF — initial SRS (BenaaConnect branding) |
| v3.1    | 2026-04-14 | S. Latif + AI | Converted to Markdown. Rebranded to IndigoBuilders ERP. Gap analysis added. Status column added to all requirements. |
| v3.2    | 2026-04-14 | S. Latif + AI | Implemented: PWA (vite-plugin-pwa + Workbox), TanStack Virtual (LaborView), full ZATCA UBL 2.1 XML + TLV QR generation, Engineer role read-only access. XML download endpoint added to InvoicesView. |
| v3.3    | 2026-04-14 | S. Latif + AI | Smart chip filters added to all data views (ChipFilter component). Dashboard alerts panel made inner-scrollable. 1,460 seed records loaded. |
| v3.4    | 2026-04-24 | S. Latif + AI | Blank screen fix (Vite 8 `define` → import pkg from package.json). Purchase Orders module added: full CRUD, email-based approval via SendGrid, status workflow (Draft→PendingApproval→Approved→Delivered), `PurchaseOrders` + `PurchaseOrderItems` + `PurchaseOrderApprovals` tables. |

---

## 1. Project Intent

This document defines the technical and regulatory requirements for the **Indigo Builders Company**
Enterprise Resource Planning (ERP) system. The solution is architected to streamline Saudi construction
operations while maintaining strict legal compliance with the Kingdom's digital transformation mandates.

**Primary Goals:**
- Centralize project, labor, and financial management for construction operations
- Achieve full compliance with ZATCA Phase 2 e-invoicing mandates
- Deliver MHRSD WPS v3.1-compliant payroll SIF file generation
- Calculate and report GOSI contributions for Saudi nationals
- Enforce RBAC (Admin / Finance / PM / Engineer) across all modules
- Support bilingual operation (Arabic RTL + English LTR)

---

## 2. Architectural Strategy

### 2.1 Frontend Stack

| Requirement | Specification | Status |
|---|---|---|
| Framework | React 19 + TypeScript | ✅ Implemented |
| Styling | Tailwind CSS with Logical Properties (RTL) | ✅ Implemented |
| Build Tool | Vite | ✅ Implemented |
| Language Support | Arabic (RTL) + English — persisted to localStorage | ✅ Implemented |
| Font | IBM Plex Sans Arabic | ✅ Configured in index.css |
| Mobile Layouts | Table-to-Card adaptive for phones/tablets | ✅ All views have mobile card fallback |
| Virtual Scrolling | TanStack Virtual for lists >100 rows | ✅ Implemented in LaborView |
| Offline / PWA | Service Worker + asset caching for remote site access | ✅ vite-plugin-pwa with Workbox NetworkFirst strategy |
| Native Wrapper | Capacitor-ready: all browser APIs abstracted into services | ✅ Implemented — `storage`, `browser`, `files` service layer wraps all browser APIs |

### 2.2 Backend Stack

| Requirement | Specification | Status |
|---|---|---|
| Runtime | Node.js + Express + TypeScript (tsx dev, tsc build) | ✅ Implemented |
| Auth | JWT (jsonwebtoken) — HS256, configurable expiry | ✅ Implemented |
| Compression | Gzip (compression middleware) | ✅ Implemented |
| Brotli Compression | IIS httpCompression (static files) + Gzip for API responses | ✅ IIS web.config handles static Brotli; API uses Gzip (custom zlib middleware removed — conflicted with compression package) |
| File Upload | multer (memory storage, 5MB limit) | ✅ Implemented (CSV import) |

### 2.3 Database

| Requirement | Specification | Status |
|---|---|---|
| Platform | MSSQL (SQL Server) | ✅ |
| Instance | 172.1.10.43 | ✅ |
| Database | IndigoBuilders (dedicated, no shared tables) | ✅ |
| ORM/Query | mssql package — parameterized queries only | ✅ |
| N+1 Prevention | All data fetched via JOINs / Views | ✅ Views used for all summary queries |

### 2.4 Infrastructure & Compliance

| Requirement | Specification | Status |
|---|---|---|
| Data Residency | AWS Middle East — Riyadh (PDPL mandatory) | ❌ Currently on-premise — migration planned |
| Deployment | IIS + PM2 | ✅ deploy-to-share.bat exists |
| PDPL Compliance | Personal data must stay within KSA | ⚠️ On-prem KSA server — acceptable short-term |

---

## 3. Database Schema

### 3.1 Core Tables

| Table | Purpose | Status |
|---|---|---|
| `Roles` | Admin(1), Finance(2), PM(3), Engineer(4) | ✅ |
| `Users` | Auth + RBAC | ✅ |
| `Projects` | Project registry with contract values | ✅ |
| `Labor` | WPS-compliant employee records | ✅ |
| `WPS_PayrollRuns` | Monthly payroll run header | ✅ |
| `WPS_PayrollLines` | Per-employee payroll line items | ✅ |
| `Invoices` | ZATCA Phase 2 invoice header | ✅ |
| `InvoiceItems` | Line items per invoice | ✅ |
| `InvoicePayments` | Payment receipts against invoices | ✅ |
| `ProjectExpenses` | Project cost tracking | ✅ |
| `PurchaseOrders` | PO header — vendor, amounts, status, approval tracking | ✅ |
| `PurchaseOrderItems` | Line items per PO — qty, price, discount, VAT | ✅ |
| `PurchaseOrderApprovals` | Email approval tokens (UUID, expiry, acted-at) | ✅ |

### 3.2 Views

| View | Purpose | Status |
|---|---|---|
| `View_LaborSummary` | Labor + project join, GrossSalary computed | ✅ |
| `View_InvoiceSummary` | Invoice + project + TotalPaid + BalanceDue | ✅ |
| `View_ProjectSummary` | Project KPIs — labor, invoiced, expenses | ✅ |

### 3.3 Key Schema Fields (PRD Reference)

```sql
-- Users
UserID, Username, PasswordHash, RoleID, IsActive, FullName, Email

-- Labor (MHRSD compliant)
LaborID, IqamaNumber (UNIQUE), IBAN, BasicSalary, HousingAllowance,
TransportAllowance, OtherAllowances, GOSINumber, NationalityCode (SAU/OTH),
JobTitle, ProjectID, IqamaExpiry, IsActive

-- Invoices (ZATCA Phase 2)
InvoiceID, InvoiceNumber (UNIQUE), ZatcaStatus, ZatcaQRCode, ZatcaXML (XML type),
ZatcaUUID, RetentionAmount, RetentionRate, SubTotal, VATAmount, TotalAmount

-- InvoicePayments
PaymentID, InvoiceID (FK), PaymentDate, Amount, PaymentMethod, Reference
```

---

## 4. Functional Modules

### 4.1 Authentication & RBAC

| Feature | Detail | Status |
|---|---|---|
| JWT login | POST /api/auth/login | ✅ |
| Role guard middleware | requireRole(...roles) | ✅ |
| Change own password | PUT /api/auth/me/password | ✅ |
| Admin reset password | PUT /api/auth/users/:id/reset-password | ✅ |
| User management | CRUD + enable/disable | ✅ |

**Role permissions matrix:**

| Module | Admin | Finance | PM | Engineer |
|---|---|---|---|---|
| Users | CRUD | — | — | — |
| Projects | CRUD | Read | CRUD | Read |
| Labor | CRUD | CRUD | CRUD | Read |
| Invoices | CRUD | CRUD | Read | — |
| Payments | CRUD | CRUD | — | — |
| Expenses | CRUD | CRUD | CRUD | — |
| WPS | CRUD | CRUD | — | — |
| Purchase Orders | CRUD + approve | CRUD + approve | Create/Edit | — |
| Reports | Read | Read | Read | — |
| Compliance | Read | Read | Read | — |

### 4.2 Project Management

| Feature | Detail | Status |
|---|---|---|
| Project CRUD | Code, Name, Client, Contract Value, Dates, Status | ✅ |
| Project Manager assignment | Dropdown from active Users | ✅ |
| Project P&L summary | Contract vs Invoiced vs Collected vs Expenses | ✅ |
| Expense breakdown by category | Per project | ✅ |
| Progress percentage | Invoiced % of contract value | ✅ |

### 4.3 Labor Management (MHRSD)

| Feature | Detail | Status |
|---|---|---|
| Employee CRUD | All WPS-required fields | ✅ |
| Iqama expiry tracking | Alerts at 60 days + expired | ✅ |
| GOSI tracking | Saudi employees flagged | ✅ |
| Project assignment | Per employee | ✅ |
| CSV bulk import | With per-row error reporting + template download | ✅ |
| WPS SIF download | Pipe-delimited v3.1 format from Labor table | ✅ |

### 4.4 WPS Payroll

| Feature | Detail | Status |
|---|---|---|
| Payroll run generation | Snapshot of all active labor | ✅ |
| Per-line deductions edit | Adjustable before submission | ✅ |
| Status workflow | Draft → Submitted → Accepted | ✅ |
| SIF file download | Auth-gated, correct filename | ✅ |
| CSV export of lines | Client-side blob | ✅ |

### 4.5 ZATCA Invoicing (Phase 2)

| Feature | Detail | Status |
|---|---|---|
| Invoice CRUD | Full header + line items | ✅ |
| ZATCA status workflow | Draft → Reported → Cleared / Rejected | ✅ |
| UUID generation | Per invoice on creation | ✅ |
| QR Code (TLV) | ZATCA-compliant TLV Base64 — 5 fields (seller, VAT, timestamp, total, VAT amount) | ✅ Full ZATCA spec |
| UBL 2.1 XML generation | Stored in ZatcaXML (XML column) | ✅ Full UBL 2.1 with UBLExtensions, ICV, PIH, seller/buyer, TaxTotal, lines |
| XML download | GET /api/invoices/:id/xml — downloads .xml file | ✅ |
| VAT 15% calculation | Auto-computed | ✅ |
| Retention deduction | Configurable rate | ✅ |
| Invoice print | Browser print dialog | ✅ |
| Project linkage | Dropdown in new invoice form | ✅ |
| Balance due tracking | Via InvoicePayments | ✅ |

### 4.6 Payment Tracking

| Feature | Detail | Status |
|---|---|---|
| Record payment | POST /api/payments with balance validation | ✅ |
| Payment history per invoice | In detail modal | ✅ |
| Methods | BankTransfer, Cheque, Cash, Online | ✅ |
| Delete payment | Admin/Finance only | ✅ |
| Balance due column | In invoice list | ✅ |

### 4.7 Purchase Orders

| Feature | Detail | Status |
|---|---|---|
| PO CRUD | Create / edit / delete — Draft only editable | ✅ |
| Line items | Description, Qty, Unit Price, Discount, VAT rate per line | ✅ |
| Totals | Auto-computed Subtotal + VAT + Shipping = Total | ✅ |
| Status workflow | Draft → PendingApproval → Approved → Delivered / Cancelled / Rejected | ✅ |
| Email-based approval | Submit PO → SendGrid emails all Admin+Finance users with Approve/Reject links | ✅ |
| Approval tokens | UUID tokens stored in `PurchaseOrderApprovals`, valid 7 days | ✅ |
| Token click | GET `/api/purchase-orders/action/:token` — validates, updates status, returns HTML confirmation | ✅ |
| Submitter notification | On approval/rejection, SendGrid notifies the submitter | ✅ |
| Project linkage | Optional link to project | ✅ |
| Chip filters | Status chips (Draft / PendingApproval / Approved / Delivered / Cancelled / Rejected) | ✅ |
| CSV export | Client-side blob download | ✅ |
| Detail modal | View full PO with line items and totals | ✅ |
| Role permissions | Create/Edit: Admin, Finance, PM. Delete: Admin, Finance. Admin override status | ✅ |

**Role permissions — Purchase Orders:**

| Action | Admin | Finance | PM | Engineer |
|---|---|---|---|---|
| View | ✅ | ✅ | ✅ | — |
| Create / Edit Draft | ✅ | ✅ | ✅ | — |
| Submit for Approval | ✅ | ✅ | ✅ | — |
| Delete (Draft/Rejected/Cancelled) | ✅ | ✅ | — | — |
| Mark Delivered / Cancel | ✅ | — | — | — |
| Approve via email link | any Admin/Finance email recipient | | | |

**Email env vars required:**
```
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=erp@indigobuilders.sa
SENDGRID_FROM_NAME=IndigoBuilders ERP
APP_URL=https://indigobuilders.deltatechcorp.com
```

### 4.8 Expenses

| Feature | Detail | Status |
|---|---|---|
| Expense CRUD | Date, Category, Amount, VAT, Vendor, Ref | ✅ |
| Categories | Materials, Equipment, Subcontractor, Labor, Transport, Other | ✅ |
| Filters | Project / Category / Date range | ✅ |
| CSV export | Client-side | ✅ |
| Project linkage | Optional | ✅ |

### 4.9 Compliance & Alerts

| Alert Type | Detail | Status |
|---|---|---|
| Iqama expired | Red — already expired | ✅ |
| Iqama expiring | Orange — within 60 days | ✅ |
| Missing IBAN | Employees without IBAN | ✅ |
| Missing GOSI | Saudi employees without GOSI number | ✅ |
| WPS Draft past months | Unreleased payrolls | ✅ |
| Overdue invoices | > 30 days past due date | ✅ |
| Alert badge in sidebar | Red count bubble | ✅ |

### 4.10 Reports

| Report | Detail | Status |
|---|---|---|
| GOSI contributions | 9% employee + 11.75% employer for Saudi nationals | ✅ |
| Invoice aging | Current / 1-30 / 31-60 / 61-90 / 90+ days | ✅ |
| Labor by project | Headcount, Saudi/Non-Saudi split, salary totals | ✅ |

### 4.11 Dashboard

| Feature | Detail | Status |
|---|---|---|
| KPI cards | Projects, Labor, Invoices, Invoice Value | ✅ |
| Iqama expiry alerts panel | Amber — top of dashboard | ✅ |
| Recent invoices | Last 5 | ✅ |
| Recent projects | Last 5 | ✅ |
| Activity feed | Last 15 changes across all modules | ✅ |

---

## 5. Performance & Mobile Rules

| Rule | Requirement | Status |
|---|---|---|
| N+1 Prevention | All queries use JOINs or Views (Eager Loading) | ✅ All routes use Views |
| Mobile Adaptive | Table-to-Card for all data tables | ✅ Every view has mobile card layout |
| Smart Chip Filters | Instant client-side filtering with live count badges | ✅ ChipFilter component — Invoices, Projects, Labor, Expenses |
| Offline / PWA | Service Worker caches assets for remote site access | ✅ vite-plugin-pwa + Workbox NetworkFirst |
| Virtual Scrolling | TanStack Virtual for lists > 100 rows | ✅ Implemented in LaborView |
| Brotli Compression | IIS static Brotli + Gzip for API | ✅ IIS web.config httpCompression for static assets; API responses use Gzip |

---

## 6. Security Requirements

| Requirement | Detail | Status |
|---|---|---|
| JWT Auth | HS256, configurable expiry via JWT_EXPIRES_IN | ✅ |
| RBAC | requireRole middleware on all write endpoints | ✅ |
| Parameterized queries | No string interpolation in SQL | ✅ |
| Password hashing | bcrypt cost 12 | ✅ |
| Input size limit | express.json limit 5MB | ✅ |
| CORS | Configurable origin via CORS_ORIGIN env var | ✅ |
| PDPL data residency | AWS Riyadh — personal data within KSA | ❌ Planned — currently on-prem |

---

## 7. Gap Analysis — PRD vs Current Build

### 7.1 Gaps to Close (Prioritized)

| Priority | Gap | Effort | Status |
|---|---|---|---|
| ~~HIGH~~ | ~~**ZATCA UBL 2.1 XML**~~ | ~~Medium~~ | ✅ **Done** — full UBL 2.1 + TLV QR, XML download endpoint |
| ~~HIGH~~ | ~~**PWA / Service Worker**~~ | ~~Medium~~ | ✅ **Done** — vite-plugin-pwa, Workbox NetworkFirst, 4 MiB cache limit |
| ~~MEDIUM~~ | ~~**TanStack Virtual**~~ | ~~Low~~ | ✅ **Done** — LaborView desktop table virtualised |
| ~~LOW~~ | ~~**Engineer role views**~~ | ~~Low~~ | ✅ **Done** — Engineers see Dashboard + Projects (read-only) |
| ~~MEDIUM~~ | ~~**Brotli compression**~~ | ~~Low~~ | ✅ **Done** — IIS web.config httpCompression for static assets; API uses Gzip (zlib middleware removed — conflicted with compression package) |
| ~~MEDIUM~~ | ~~**Capacitor abstraction layer**~~ | ~~High~~ | ✅ **Done** — `storage`, `browser`, `files` services wrap all browser APIs across 7 files |
| LOW | **AWS Riyadh migration** | High | ❌ Infrastructure change — PDPL long-term requirement |

### 7.2 Built Beyond PRD (Additions)

| Feature | Description |
|---|---|
| **Purchase Orders** | Full PO module — CRUD, line items, email-based approval via SendGrid, status workflow, chip filters |
| **Blank screen fix** | Vite 8 broke `define` replacement in dev mode; fixed by importing version from package.json |

### 7.3 Original Beyond-PRD Features

These features were designed and implemented during development, not in the original SRS:

| Feature | Description |
|---|---|
| **Expenses module** | Full project cost tracking (Materials, Equipment, Subcontractor, etc.) |
| **Project P&L financials** | Contract vs Invoiced vs Collected vs Expenses modal |
| **Invoice payment tracking** | InvoicePayments table with balance validation |
| **Compliance alerts dashboard** | Consolidated alert view with severity color coding |
| **GOSI report** | Contribution calculations for Saudi nationals |
| **Invoice aging report** | Outstanding invoice buckets |
| **Labor by project report** | Headcount and salary distribution |
| **Labor CSV bulk import** | Multer upload with per-row error reporting |
| **Activity feed on dashboard** | Recent changes timeline across all modules |
| **Bilingual (AR/EN) UI** | Full translation layer via LangContext + translations.ts |
| **Password change / admin reset** | Self-service + admin override |
| **WPS per-line deductions** | Adjustable before SIF submission |

---

## 8. Next Priorities

All priority items are now complete. The only remaining infrastructure item is:

1. ~~**Brotli compression**~~ — ✅ Done (Node zlib middleware + IIS web.config)
2. ~~**Capacitor abstraction**~~ — ✅ Done (`storage`, `browser`, `files` service layer)
3. **AWS Riyadh migration** — PDPL long-term compliance; infrastructure decision (future)

---

## 9. Environment Variables Reference

```env
DB_SERVER=172.1.10.43
SQL_USER=<user>
SQL_PASSWORD=<password>
SQL_DATABASE=IndigoBuilders
PORT=4000
JWT_SECRET=<secret>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
NODE_ENV=production
```

---

## 10. Branch & Deployment

| Branch | Purpose |
|---|---|
| `master` | Production-ready — never commit directly |
| `dev` | All daily development |

Deployment: `deploy\iis\deploy-to-share.bat` — commits dev, merges to master, builds, deploys to IIS.

GitHub: https://github.com/salmanlatif313/indigobuilders
