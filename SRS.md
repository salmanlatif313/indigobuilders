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
| v3.5    | 2026-04-26 | S. Latif + AI | Periodic documentation review. Verified all module statuses current. Users Management module explicitly documented. No new features since v3.4. |
| v3.6    | 2026-04-26 | S. Latif + AI | Full procurement-to-payment lifecycle added: BOQ Management, Vendor Registry (AVL), RFQ, GRN/IGP, QC Inspection, Inventory/Store Ledger, Material Issue/DC, Vendor Payments (AP), Customer Invoice minimum amount. 15 new DB tables. Role permissions matrix expanded. |
| v3.7    | 2026-04-28 | S. Latif + AI | All v3.6 procurement modules **built and live**. Bug fixes: Project create/edit PascalCase mismatch, BOQ import CSV parser (RFC 4180), BOQ import server PascalCase mismatch, BOQ XLSX import (SheetJS lazy-loaded), blank screen (SW skipWaiting + clientsClaim), build validator added. NADRA CEO BOQ imported (691 items, SAR 1.32B). Full procurement cycle end-to-end tested with 9 vendors, 6 RFQs, 7 POs, 6 GRNs, 6 QC inspections. |

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
| `Vendors` | Approved Vendor List — master vendor registry with payment terms & rating | 📋 v3.6 |
| `BOQ` | Bill of Quantities header per project — revision-tracked | 📋 v3.6 |
| `BOQItems` | BOQ line items: scope, category, description, unit, qty, rate, profit% | 📋 v3.6 |
| `RFQHeaders` | RFQ header per procurement event linked to project | 📋 v3.6 |
| `RFQLines` | Material/service items requested per RFQ | 📋 v3.6 |
| `RFQVendorQuotes` | Vendor quote per RFQ line — comparison matrix source | 📋 v3.6 |
| `GRNHeaders` | Inward Gate Pass / Goods Receipt header — linked to PO | 📋 v3.6 |
| `GRNLines` | Per-item received qty against PO line (supports partial receipt) | 📋 v3.6 |
| `VendorBills` | Vendor invoices attached to GRN — AP liability source | 📋 v3.6 |
| `QCInspections` | QC inspection header triggered by GRN acceptance | 📋 v3.6 |
| `QCInspectionLines` | Per-item QC decision: Accept / Reject / Accept with Deviation | 📋 v3.6 |
| `StoreStock` | Running stock ledger per project store (receipts, issues, balance) | 📋 v3.6 |
| `MaterialIssueHeaders` | Delivery Challan header — stock release from store to construction site | 📋 v3.6 |
| `MaterialIssueLines` | DC line items: item, qty, unit cost, total cost auto-expensed to project | 📋 v3.6 |
| `VendorPayments` | AP payments against vendor bills — advance, COD, net terms | 📋 v3.6 |

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

-- Projects (v3.6: add client billing threshold)
ProjectID, ProjectCode, ProjectName, ClientName, ClientVAT,
ContractValue, StartDate, EndDate, Status, Location, ManagerUserID,
MinInvoiceAmount DECIMAL(18,2) NULL   -- customer minimum billing threshold

-- Invoices (ZATCA Phase 2)
InvoiceID, InvoiceNumber (UNIQUE), ZatcaStatus, ZatcaQRCode, ZatcaXML (XML type),
ZatcaUUID, RetentionAmount, RetentionRate, SubTotal, VATAmount, TotalAmount

-- InvoicePayments
PaymentID, InvoiceID (FK), PaymentDate, Amount, PaymentMethod, Reference

-- Vendors (AVL)
VendorID, VendorCode, VendorName, VendorNameAr, Category, ContactPerson,
Phone, Email, VATNumber, IBAN, BankCode,
PaymentTerms NVARCHAR(20),  -- Advance | COD | Net30 | Net60 | Net90
ApprovalStatus NVARCHAR(20), -- Pending | Approved | Blacklisted
Rating TINYINT, Address NVARCHAR(MAX), IsActive BIT,
Notes NVARCHAR(MAX), ChangedBy NVARCHAR(128), ChangeDate DATETIME

-- BOQ (header per project)
BOQHeaderID, ProjectID (FK), BOQNumber, Title, RevisionNumber TINYINT,
BOQDate, Status NVARCHAR(20),  -- Active | Revised | Superseded
TotalAmount, Notes NVARCHAR(MAX), ChangedBy NVARCHAR(128), ChangeDate DATETIME

-- BOQItems
BOQItemID, BOQHeaderID (FK), SerialNo, MainScope, Category,
Description NVARCHAR(MAX), Unit, Quantity, UnitRate, Amount,
ProfitPct DECIMAL(5,2), ProfitAmount, TotalWithProfit,
ProcurementStatus NVARCHAR(20)  -- NotStarted | InProgress | Completed

-- RFQHeaders
RFQHeaderID, RFQNumber, ProjectID (FK), Title, RFQDate, DueDate,
Status NVARCHAR(20),  -- Draft | Sent | QuotesReceived | Awarded | Cancelled
Notes NVARCHAR(MAX), ChangedBy NVARCHAR(128), ChangeDate DATETIME

-- RFQLines
RFQLineID, RFQHeaderID (FK), BOQItemID (FK nullable),
Description NVARCHAR(MAX), Unit, Quantity, Notes NVARCHAR(MAX)

-- RFQVendorQuotes
QuoteID, RFQHeaderID (FK), RFQLineID (FK), VendorID (FK),
QuoteDate, UnitPrice, TotalAmount, DeliveryDays INT,
Notes NVARCHAR(MAX), IsAwarded BIT DEFAULT 0,
ChangedBy NVARCHAR(128), ChangeDate DATETIME

-- GRNHeaders (IGP — Inward Gate Pass)
GRNHeaderID, GRNNumber, POHeaderID (FK to PurchaseOrders),
ProjectID (FK), GRNDate, VehicleNo, DriverName, DeliveryNoteNo,
StoreLocation, ReceivedBy,
Status NVARCHAR(20),  -- Draft | Inspecting | Accepted | PartialAccepted | Rejected
Notes NVARCHAR(MAX), ChangedBy NVARCHAR(128), ChangeDate DATETIME

-- GRNLines
GRNLineID, GRNHeaderID (FK), POLineID (FK to PurchaseOrderItems),
Description NVARCHAR(MAX), Unit,
OrderedQty, PreviouslyReceivedQty, ThisReceiptQty, Notes NVARCHAR(MAX)

-- VendorBills (AP liability)
VendorBillID, GRNHeaderID (FK), VendorID (FK),
BillNumber, BillDate, DueDate,
Amount, VATAmount, TotalAmount,
Status NVARCHAR(20),  -- Pending | Approved | Paid | PartiallyPaid
Notes NVARCHAR(MAX), ChangedBy NVARCHAR(128), ChangeDate DATETIME

-- QCInspections
QCInspectionID, GRNHeaderID (FK), InspectionDate, InspectedBy,
Status NVARCHAR(20),  -- Pending | Completed
Notes NVARCHAR(MAX), ChangedBy NVARCHAR(128), ChangeDate DATETIME

-- QCInspectionLines
QCLineID, QCInspectionID (FK), GRNLineID (FK),
InspectedQty, AcceptedQty, RejectedQty,
Decision NVARCHAR(30),  -- Accepted | Rejected | AcceptedWithDeviation
RejectionReason NVARCHAR(MAX), Notes NVARCHAR(MAX)

-- StoreStock
StockID, ProjectID (FK), ItemCode, ItemDescription, Unit,
CurrentQty DECIMAL(18,4), MinStockLevel DECIMAL(18,4),
UnitCost, TotalValue, LastReceiptDate, LastIssueDate,
ChangedBy NVARCHAR(128), ChangeDate DATETIME

-- MaterialIssueHeaders (Delivery Challan)
IssueHeaderID, DCNumber, ProjectID (FK), FromStore, ToSite,
IssueDate, RequestedBy, IssuedBy, AuthorizedBy,
Status NVARCHAR(20),  -- Draft | Approved | Issued
Notes NVARCHAR(MAX), ChangedBy NVARCHAR(128), ChangeDate DATETIME

-- MaterialIssueLines
IssueLineID, IssueHeaderID (FK), StockID (FK),
Description NVARCHAR(MAX), Unit,
RequestedQty, IssuedQty, UnitCost, TotalCost

-- VendorPayments
VendorPaymentID, VendorID (FK), VendorBillID (FK nullable),
POHeaderID (FK to PurchaseOrders, nullable),
PaymentDate, PaymentType NVARCHAR(20),  -- Advance | COD | PartialPayment | FinalPayment
Amount, PaymentMethod NVARCHAR(20),     -- BankTransfer | Cheque | Cash | Online
ReferenceNo, Notes NVARCHAR(MAX), ChangedBy NVARCHAR(128), ChangeDate DATETIME

-- PurchaseOrders (v3.6 additions — backward compatible)
-- Add columns: VendorID (FK to Vendors, nullable), RFQHeaderID (FK to RFQHeaders, nullable)
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
| BOQ | CRUD | Read | CRUD | Read |
| Vendor Registry | CRUD | Read | Read | — |
| RFQ | CRUD | CRUD | Create/Read | — |
| GRN / IGP | CRUD | Read | CRUD | Read |
| QC Inspection | CRUD | — | CRUD | CRUD |
| Inventory / Stock | CRUD | Read | Read | Read |
| Material Issue / DC | CRUD | — | CRUD | CRUD |
| Vendor Payments | CRUD | CRUD | — | — |

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

### 4.12 BOQ Management

Bill of Quantities is the financial backbone of each project — every procurement, expense, and invoice traces back to a BOQ line.

| Feature | Detail | Status |
|---|---|---|
| BOQ per project | One active BOQ header per project; revision-tracked | 📋 |
| Excel/CSV import | Upload XLSX matching NADRA CEO format: Serial, Scope, Category, Description, Unit, Qty, Rate, Amount, Profit% | 📋 |
| Manual line entry | Add/edit BOQ items inline | 📋 |
| BOQ versioning | Rev 0, Rev 1… with superseded status; prior revisions read-only | 📋 |
| Scope & category grouping | Group by Main Scope (Civil, Electrical, HVAC…) and Category | 📋 |
| Procurement status per line | NotStarted / InProgress / Completed — auto-updated from PO/GRN | 📋 |
| BOQ vs actual variance | Compare BOQ amount vs PO amounts raised — budget control | 📋 |
| Chip filters | Filter by Scope, Category, ProcurementStatus | 📋 |
| CSV export | Client-side blob download | 📋 |

### 4.13 Vendor Registry (Approved Vendor List)

Replaces the current inline vendor fields on POs with a proper master list.

| Feature | Detail | Status |
|---|---|---|
| Vendor CRUD | Code, Name (bilingual), Category, Contact, Phone, Email | 📋 |
| Compliance fields | VAT Number, IBAN, Bank Code | 📋 |
| Payment terms | Advance / COD / Net30 / Net60 / Net90 — default per vendor | 📋 |
| Approval status | Pending → Approved → Blacklisted workflow | 📋 |
| Performance rating | 1–5 stars, updated after PO completion | 📋 |
| Vendor category | Civil / Electrical / HVAC / Mechanical / Supply / Services / Other | 📋 |
| Link to POs | All POs reference VendorID from master | 📋 |
| Chip filters | Status chips (Approved / Pending / Blacklisted) + category chips | 📋 |

### 4.14 RFQ (Request for Quotation)

| Feature | Detail | Status |
|---|---|---|
| RFQ creation | Link to project and optionally to BOQ items | 📋 |
| RFQ line items | Description, Unit, Qty — can be pulled from BOQ or entered manually | 📋 |
| Send to vendors | Email via SendGrid to selected approved vendors (same token pattern as PO approval) | 📋 |
| Quote entry | Enter vendor responses per line: Unit Price, Delivery Days, Notes | 📋 |
| Quote comparison matrix | Side-by-side view of all vendor quotes per line item | 📋 |
| Award RFQ | Mark winning vendor per line → auto-generate PO from awarded lines | 📋 |
| Status workflow | Draft → Sent → QuotesReceived → Awarded / Cancelled | 📋 |
| PO linkage | Awarded RFQ creates PO with `RFQHeaderID` reference | 📋 |

### 4.15 GRN / Inward Gate Pass (IGP)

Records material received at the project store against an open PO. Supports partial deliveries.

| Feature | Detail | Status |
|---|---|---|
| GRN against PO | Select open/partial PO; shows PO lines with ordered qty and previously received qty | 📋 |
| Partial receipt | Enter `ThisReceiptQty` per line — system tracks cumulative received vs ordered | 📋 |
| Gate pass fields | GRN Number (auto), Date, Vehicle No, Driver Name, Delivery Note No, Store Location | 📋 |
| Vendor bill attachment | Upload vendor invoice PDF/image; stored against GRN | 📋 |
| Auto-create VendorBill | GRN submission creates a pending VendorBill record for AP | 📋 |
| Trigger QC | On save, auto-creates a `QCInspection` record linked to this GRN | 📋 |
| Status workflow | Draft → Inspecting → Accepted / PartialAccepted / Rejected | 📋 |
| PO auto-close | PO marked Delivered when all lines fully received | 📋 |
| Chip filters | Status chips; project filter | 📋 |

### 4.16 Quality Inspection (QC)

| Feature | Detail | Status |
|---|---|---|
| Inspection per GRN | Auto-created on GRN submission; assigned to store/QC team | 📋 |
| Per-item decision | Accept / Reject / Accept with Deviation for each GRN line | 📋 |
| Qty split | Enter AcceptedQty and RejectedQty per line | 📋 |
| Rejection reason | Free text + reason code (Damaged / Wrong Spec / Short Qty / Other) | 📋 |
| Accept action | Accepted qty → moves to StoreStock (increments stock ledger) | 📋 |
| Reject action | Rejected qty → creates Return-to-Vendor (RTV) flag on GRN line | 📋 |
| GRN status update | QC completion updates GRN to Accepted / PartialAccepted / Rejected | 📋 |

### 4.17 Inventory / Store Ledger

| Feature | Detail | Status |
|---|---|---|
| Stock ledger per project | Running balance: Opening + Receipts − Issues = Closing | 📋 |
| Auto stock-in | Accepted QC qty automatically posts to StoreStock | 📋 |
| Auto stock-out | Issued qty on approved DC automatically deducts from StoreStock | 📋 |
| Minimum stock alert | Alert badge when CurrentQty ≤ MinStockLevel | 📋 |
| Stock valuation | Weighted average cost per item | 📋 |
| Stock report | Current stock list with value; filter by project | 📋 |
| Item search | Search by item code or description | 📋 |

### 4.18 Material Issue / Delivery Challan (DC)

| Feature | Detail | Status |
|---|---|---|
| DC creation | Select project store, destination site, items and qty | 📋 |
| Quantity validation | Cannot issue more than available stock; system warns | 📋 |
| Authorization | PM or Admin must approve DC before issuance | 📋 |
| DC fields | DC Number (auto), Date, From Store, To Site, Requested By, Issued By | 📋 |
| Status workflow | Draft → Approved → Issued | 📋 |
| Auto project expense | On issue, TotalCost (IssuedQty × UnitCost) posted to ProjectExpenses with Category=Materials | 📋 |
| Stock deduction | Issued qty deducted from StoreStock on status = Issued | 📋 |
| Print DC | Printable delivery challan document with project header and logo | 📋 |

### 4.19 Vendor Payments (AP)

| Feature | Detail | Status |
|---|---|---|
| Payment types | Advance / COD / PartialPayment / FinalPayment | 📋 |
| Advance request | Create advance payment before GRN — linked to PO | 📋 |
| Bill matching | Match payment to VendorBill (GRN-based); outstanding balance tracked | 📋 |
| Payment methods | BankTransfer / Cheque / Cash / Online | 📋 |
| Outstanding balance | VendorBill total − paid amount = balance due | 📋 |
| Vendor statement | Full AP ledger per vendor: bills, payments, running balance | 📋 |
| Admin/Finance only | No PM or Engineer access | 📋 |

### 4.20 Customer Invoicing Enhancements

Extends the existing ZATCA invoicing module.

| Feature | Detail | Status |
|---|---|---|
| Minimum invoice amount | `MinInvoiceAmount` per project (customer threshold, e.g. PKR 3,000,000) | 📋 |
| Threshold enforcement | Warning shown when invoice total < MinInvoiceAmount; Admin can override | 📋 |
| BOQ-linked milestones | Optional link from invoice to BOQ scope/milestone for progress billing | 📋 |

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

### 7.2 v3.6 Procurement-to-Payment Lifecycle — All Complete

| Priority | Module | Status | Notes |
|---|---|---|---|
| 1 | **BOQ Management** | ✅ | XLSX import (SheetJS lazy-loaded), CSV import, RFC 4180 parser, revision tracking |
| 2 | **Vendor Registry (AVL)** | ✅ | CRUD, Approved/Pending/Blacklisted workflow, payment terms, rating |
| 3 | **RFQ Management** | ✅ | Multi-vendor quote comparison matrix, award → auto PO, email flow |
| 4 | **GRN / Inward Gate Pass** | ✅ | Partial receipts, auto QC trigger, PO auto-close on full receipt |
| 5 | **Inventory / Store Ledger** | ✅ | Auto stock-in from QC, low-stock alerts, weighted avg cost |
| 6 | **Material Issue / DC** | ✅ | Stock validation, PM/Admin auth, auto-posts to ProjectExpenses on issue |
| 7 | **Vendor Payments (AP)** | ✅ | Advance/COD/Net terms, bill matching, vendor statement ledger |
| 8 | **QC Inspection** | ✅ | Accept/Reject/AcceptWithDeviation, accepted qty → StoreStock |
| 9 | **Customer Invoice Min Amount** | ✅ | `MinInvoiceAmount` on Projects, threshold warning on invoice |

### 7.3 Built Beyond PRD (Additions)

| Feature | Description |
|---|---|
| **Purchase Orders** | Full PO module — CRUD, line items, email-based approval via SendGrid, status workflow, chip filters |
| **Blank screen fix (v3.4)** | Vite 8 `define` bug fixed by importing version from package.json |
| **Blank screen fix (v3.7)** | PWA service worker `skipWaiting + clientsClaim` — new SW activates immediately after deploy, no stale-cache blank screens |
| **Build validator** | `scripts/validate-build.js` — post-build smoke test; blocks deploy if `index.html` assets missing, banned tokens present, or SW lacks `skipWaiting`. Integrated into `npm run build:safe` and `deploy-to-share.bat` step [2b] |
| **BOQ XLSX import** | SheetJS lazy-loaded (separate 415 KB chunk); auto-detects header row and column mapping; sheet selector for multi-sheet workbooks; tested with NADRA CEO.xlsx (691 items, SAR 1.32B) |
| **Procurement seed data** | `scripts/seed_procurement.py` — creates vendors, RFQs, quotes, POs, GRNs, QC, stock, DCs and AP payments programmatically via API |

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

### 8.1 v3.6 / v3.7 Build Queue — All Complete ✅

| # | Module | Status |
|---|---|---|
| 1 | BOQ Management | ✅ Built — XLSX import, CSV import, revision tracking |
| 2 | Vendor Registry | ✅ Built — CRUD, AVL workflow, chip filters |
| 3 | RFQ | ✅ Built — quote matrix, award, status workflow |
| 4 | GRN / IGP | ✅ Built — partial receipts, auto QC trigger |
| 5 | Inventory | ✅ Built — auto stock-in, low-stock alerts |
| 6 | Material Issue / DC | ✅ Built — auth workflow, auto-expense to project |
| 7 | Vendor Payments | ✅ Built — advance/COD/net terms, vendor statement |
| 8 | QC Inspection | ✅ Built — per-item decisions, accepted qty → stock |
| 9 | Invoice Min Amount | ✅ Built — threshold on Projects, warning on save |

### 8.2 Next Candidates (v3.8)

| # | Feature | Priority | Notes |
|---|---|---|---|
| 1 | **Vendor Bill attachment upload** | HIGH | Attach PDF/image to GRN/VendorBill — multer endpoint, served via API |
| 2 | **RFQ → PO auto-generation** | HIGH | Create PO directly from awarded RFQ lines with one click |
| 3 | **BOQ procurement status auto-update** | MEDIUM | When PO/GRN/DC is linked to a BOQ item, update `ProcurementStatus` automatically |
| 4 | **DC print (Delivery Challan PDF)** | MEDIUM | Print-formatted DC with site header, logo, line items |
| 5 | **Vendor performance rating on PO close** | LOW | Prompt to rate vendor when PO marked Delivered |

### 8.3 Infrastructure (Ongoing)

1. ~~**Brotli compression**~~ — ✅ Done
2. ~~**Capacitor abstraction**~~ — ✅ Done
3. ~~**Build validator + SW skipWaiting**~~ — ✅ Done (v3.7)
4. **AWS Riyadh migration** — PDPL long-term compliance; infrastructure decision (future)

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
