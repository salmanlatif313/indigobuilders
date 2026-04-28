# IndigoBuilders ERP — Feature Enhancement Roadmap

> This document lists proposed enhancements organized by domain. Each item includes a brief description and the business value it adds. Items marked **[Quick Win]** can be built on top of existing tables/routes with minimal schema changes. Items marked **[New Module]** require new tables and routes.

---

## 1. Project Management

### 1.1 Change Order Management [New Module]
Track formal contract amendments (scope additions, price changes, timeline extensions).
- Tables: `ChangeOrders`, `ChangeOrderItems`
- Workflow: Draft → Submitted → Client Approved / Rejected
- Auto-updates `Projects.ContractValue` when approved
- Links to BOQ revision (creates a new BOQ with RevisionNumber + 1)
- Client signature/approval log with date and reference number

### 1.2 Project Milestone & Schedule Tracking [New Module]
Define milestones per project and track progress against planned dates.
- Tables: `ProjectMilestones`
- Fields: MilestoneName, PlannedDate, ActualDate, CompletionPct, LinkedInvoiceID (for payment-on-milestone billing)
- Dashboard widget: Gantt-style milestone timeline
- Alert when milestone is overdue with no actual date set

### 1.3 Project Budget vs. Actual Dashboard [Quick Win]
Enhance the existing `/api/projects/:id/financials` endpoint with budget breakdown.
- Budget by category (Materials / Labor / Equipment / Subcontractor / Other)
- Actual from `ProjectExpenses` grouped by category
- Variance column: budget minus actual, color-coded
- BOQ total can serve as the baseline budget

### 1.4 Daily Site Report (DSR) [New Module]
Engineers submit daily site progress reports from the field.
- Tables: `DailySiteReports`
- Fields: ProjectID, ReportDate, SubmittedBy, WeatherCondition, WorkDescription, ManpowerCount, MachineryUsed, IssuesEncountered, ProgressPct
- Photo attachments (file path or base64)
- PM/Admin approval status
- Feeds into project progress dashboard

### 1.5 Subcontractor Management [New Module]
Dedicated module for managing subcontractors separately from material vendors.
- Tables: `Subcontractors`, `SubcontractorContracts`, `SubcontractorProgressClaims`
- Fields: SubcontractorName, Trade, ContractValue, RetentionPct, StartDate, EndDate
- Progress claim workflow: Submitted → PM Verified → Finance Approved → Paid
- Links to `ProjectExpenses` (category: Subcontractor) for cost rollup
- Retention tracking: amount held vs. amount released

### 1.6 Project Document Vault [New Module]
Central repository for project documents (contracts, drawings, permits, photos).
- Tables: `ProjectDocuments`
- Fields: ProjectID, DocumentType, FileName, FilePath, UploadedBy, UploadDate, Version, Notes
- Document types: Contract / Drawing / Permit / Photo / Certificate / Other
- Version control: supersedes older version of same document type
- Role-based access: Engineers see drawings only; Finance sees contracts + invoices

### 1.7 Retention Management [Quick Win]
Track retention on customer invoices and vendor bills separately from invoice amounts.
- Existing `Invoices.RetentionAmount` already captured
- Add `RetentionReleased` flag + `RetentionReleaseDate` to Invoices
- New report: Retention ledger (held vs. released, by project)
- Alert when retention release date approaches (e.g., 30 days before defect liability period ends)

---

## 2. Procurement

### 2.1 Vendor Performance Scorecard [Quick Win]
Score vendors based on existing GRN, QC, and payment data.
- Metrics: On-time delivery rate (GRN vs. PO expected delivery), QC acceptance rate (AcceptedQty / OrderedQty), Average payment days, Number of rejected deliveries
- Aggregate into a 1–5 star score per vendor
- Shown on Vendor detail page and vendor list
- Filters: Top/bottom performers, by category

### 2.2 PO Price Comparison vs. BOQ Rate [Quick Win]
When creating a PO line, compare the unit price against the BOQ rate for the same item.
- Highlight variance > 10% with a warning flag
- Dashboard widget: Top 10 POs with highest BOQ variance
- Helps catch procurement overruns before approval

### 2.3 Blanket Purchase Orders [New Module]
Long-term agreements with a vendor for recurring supply up to a maximum value.
- Tables: `BlanketPOs`, `BlanketPOCalloffs`
- Fields: VendorID, ProjectID, MaxValue, ValidFrom, ValidTo, Description
- Call-offs are releases against the blanket — each deducts from the open balance
- Auto-alerts when blanket PO is 80% consumed

### 2.4 RFQ Email Dispatch to Vendors [Quick Win]
Send RFQ details directly to vendor email addresses when RFQ status changes to "Sent".
- Uses existing SendGrid integration from PO approval
- Email contains: RFQ number, project name, line items (description, qty, unit), due date, portal link
- Tracks sent/not-sent per vendor in `RFQVendorQuotes`

### 2.5 Material Return to Vendor [New Module]
Track materials returned to vendors due to rejection or over-delivery.
- Tables: `MaterialReturns`
- Fields: GRNHeaderID, VendorID, ReturnDate, Reason, ReturnedQty, DebitNoteNumber
- Automatically reduces vendor bill amount (creates a debit note against the bill)
- Adjusts StoreStock accordingly

### 2.6 Procurement KPI Dashboard [Quick Win]
Summary panel on the main dashboard for procurement metrics.
- Open RFQs past due date
- POs pending approval more than 3 days
- GRNs in "Inspecting" state more than 2 days
- Low-stock items count (already in InventoryView — surface on dashboard)
- Total spend this month vs. last month (from POs/VendorBills)

### 2.7 Multi-Vendor PO Splitting [Quick Win]
After awarding an RFQ, allow splitting awarded lines across multiple vendors into separate POs.
- UI: "Generate POs from RFQ" button on awarded RFQ
- Groups awarded lines by vendor, creates one draft PO per vendor
- Pre-fills unit prices from awarded quotes
- Reduces manual PO data entry

---

## 3. Payment System (AP & AR)

### 3.1 Payment Schedule / Installment Plan [New Module]
Define a structured payment plan for customer invoices or vendor bills.
- Tables: `PaymentSchedules`
- Fields: InvoiceID / VendorBillID, DueDate, Amount, Status (Pending/Paid/Overdue)
- Dashboard widget: Upcoming payments due in next 30 days
- Auto-marks installment as Overdue when due date passes and not paid
- Feeds the cash flow forecast (item 3.2 below)

### 3.2 Cash Flow Forecast [New Module]
Project incoming and outgoing cash based on scheduled invoices and vendor bills.
- AR side: Unpaid invoice balances + payment schedule due dates
- AP side: Unpaid vendor bills + payment schedule due dates
- WPS payroll run dates (from `WPS_PayrollRuns.PayrollMonth`)
- Output: 12-week rolling weekly cash flow table
- Chart: Stacked bar — inflows vs. outflows per week

### 3.3 Customer Advance / Retention Receipt [Quick Win]
Record customer advance payments before invoice issuance.
- Tables: `CustomerAdvances`
- Fields: ProjectID, ClientName, ReceiptDate, Amount, PaymentMethod, ReferenceNo, Notes
- Advances reduce the balance due on future invoices for the same project
- Retention receipt: track when client releases retention separately from invoice payments

### 3.4 Partial Invoice Payments & Reconciliation [Quick Win]
Existing `InvoicePayments` table supports partials — enhance UI.
- Show running balance due on invoice detail page
- Reconciliation report: match payments to invoices, flag unallocated bank receipts
- Flag invoices with payments exceeding balance (data integrity alert)

### 3.5 Vendor Credit Notes & Debit Notes [New Module]
Formal adjustments to vendor bills for returns, disputes, or pricing corrections.
- Tables: `VendorCreditNotes`
- Fields: VendorID, VendorBillID, CreditDate, Amount, Reason, ReferenceNo
- Auto-reduces outstanding bill balance
- Separate view in VendorPaymentsView with credit note history per vendor

### 3.6 Cheque Management [New Module]
Track issued and received cheques with clearing status.
- Tables: `Cheques`
- Fields: ChequeType (Issued/Received), ChequeNumber, BankName, Amount, IssueDate, ClearanceDate, Status (Pending/Cleared/Bounced), LinkedPaymentID
- Alert on cheques approaching clearing date
- Bounced cheque workflow: marks linked payment as failed, reopens invoice balance

### 3.7 Bank Reconciliation [New Module]
Match recorded payments to bank statement entries.
- Tables: `BankStatements`, `BankReconciliationLines`
- Upload bank statement CSV → auto-match by amount + date
- Unmatched entries flagged for manual review
- Reconciliation status per statement period

### 3.8 VAT Return Summary [Quick Win]
Aggregate VAT collected (output VAT from invoices) vs. VAT paid (input VAT from vendor bills) per quarter.
- Uses existing `Invoices.VATAmount` and `VendorBills.VATAmount`
- Output: VAT payable / refundable for the period
- Breakdown by project
- Exportable as CSV for submission to ZATCA

---

## 4. Labor & HR

### 4.1 Attendance & Time Tracking [New Module]
Record daily attendance and working hours per employee per project.
- Tables: `Attendance`
- Fields: LaborID, AttendanceDate, ProjectID, CheckIn, CheckOut, WorkingHours, OvertimeHours, Status (Present/Absent/HalfDay/Holiday), Notes
- Bulk import from Excel (site supervisor uploads daily sheet)
- Integration hook: attendance data feeds WPS payroll deductions (absent days)
- Monthly attendance summary per employee

### 4.2 Overtime & Allowance Management [Quick Win]
Add overtime and project-specific allowances on top of base salary.
- New columns on `Labor`: OvertimeRate, SiteAllowance, FoodAllowance
- WPS payroll lines pick up allowances automatically
- Overtime hours from attendance feed into payroll calculation
- Per-project allowance (engineer on remote site gets higher allowance)

### 4.3 Leave Management [New Module]
Track annual leave, sick leave, and other leave types.
- Tables: `LeaveRequests`
- Fields: LaborID, LeaveType (Annual/Sick/Unpaid/Emergency), FromDate, ToDate, Days, Status (Pending/Approved/Rejected), ApprovedBy, Notes
- Leave balance calculation: entitlement (21 days/year per Saudi Labor Law) minus used
- Feeds attendance (approved leave = not counted as absent)
- Alert when employee has unused leave > 30 days

### 4.4 Iqama & Document Renewal Workflow [Quick Win]
Formalize the Iqama renewal process with reminders and action tracking.
- New columns on `Labor`: PassportExpiry, WorkPermitExpiry, MedicalInsuranceExpiry
- Compliance alerts extended to cover all three expiry types
- Renewal task assigned to HR user with due date
- Status: NotStarted / InProgress / Renewed — tracks which employees have been actioned
- Email alert to HR when any document enters the 60-day window

### 4.5 Employee Self-Service (ESS) Portal [New Module]
Allow employees to view their own payslip and leave balance.
- New role: `Employee` (read-only, own records only)
- Views: Payslip (current + last 3 months), Leave balance, Attendance record
- Arabic language support (RTL already in place)
- No sensitive payroll data exposed to other employees

### 4.6 End-of-Service Benefit (EOSB) Calculator [Quick Win]
Compute EOSP as per Saudi Labor Law Article 84.
- Input: LaborID, TeminationDate, TerminationReason
- Calculation: Years of service × (1/3 BasicSalary for first 5 years, full BasicSalary after)
- Reduction for resignation under 2 years (loses full EOSB)
- Output: EOSB amount, included in final settlement report
- Exportable to PDF

### 4.7 Subcontractor Labor Headcount [Quick Win]
Track headcount of subcontractor labor (not on payroll, but on-site).
- New table `SubcontractorHeadcount` or extend `DailySiteReports`
- Fields: ProjectID, Date, SubcontractorName, Trade, HeadCount
- Report: Total manpower on site per day (own + subcontractor)

---

## 5. Compliance & Regulatory

### 5.1 GOSI Online Filing Export [Quick Win]
Extend existing GOSI report to generate the official GOSI contribution file format.
- Current: GOSI report is display-only
- Enhancement: Export pipe-delimited or CSV in GOSI portal-compatible format
- Columns: GOSINumber, FullName, NationalityCode, BasicSalary, EmployeeShare (9%), EmployerShare (11.75%), TotalContribution
- Monthly filing reminder on Compliance dashboard

### 5.2 ZATCA E-Invoice Clearance API Integration [New Module]
Automate submission to ZATCA Fatoora portal instead of manual status update.
- Use ZATCA Phase 2 API (Onboarding → Reporting → Clearance)
- Store cryptographic stamp (CSID) after onboarding
- Auto-submit invoice XML on creation → update ZatcaStatus from API response
- Retry queue for failed submissions
- Alert on Rejected invoices with ZATCA error reason

### 5.3 Municipality & Zoning Permit Tracker [New Module]
Track government permits required per project.
- Tables: `ProjectPermits`
- Fields: ProjectID, PermitType, IssuingAuthority, PermitNumber, IssueDate, ExpiryDate, Status, RenewalCost, Notes
- Permit types: Building Permit / Municipality License / Environmental / Electrical / Plumbing
- Compliance dashboard shows permits expiring in 30 days

### 5.4 HSE Incident Reporting [New Module]
Health, Safety & Environment incident log per project.
- Tables: `HSEIncidents`
- Fields: ProjectID, IncidentDate, IncidentType (NearMiss/FirstAid/LostTimeInjury/Fatality), Description, InjuredPersonName, LaborID, RootCause, CorrectiveAction, Status (Open/Closed), ReportedBy
- KPI: Lost Time Injury Frequency Rate (LTIFR) per project
- Dashboard stat: Days without incident counter
- Regulatory report export for MHRSD

### 5.5 Zakat Filing Support [Quick Win]
Generate data needed for annual Zakat filing.
- Revenue: Total invoiced amounts per year (from Invoices)
- Expenses: Total vendor payments, labor costs, depreciation (from ProjectExpenses + WPS)
- Fixed assets: Equipment register value (from Equipment module if built)
- Export as CSV with GL-style categorization

---

## 6. Reporting & Analytics

### 6.1 Profit & Loss Statement [New Module]
Full P&L per project or consolidated across all active projects.
- Revenue: From `Invoices` (cleared + reported)
- Direct costs: From `ProjectExpenses` (materials, labor, subcontractor, equipment)
- Labor cost: From `WPS_PayrollLines` allocated per project
- Gross margin: Revenue minus direct costs
- Overhead allocation (configurable % of revenue)
- Net profit per project + consolidated

### 6.2 Cost-to-Complete (CTC) Forecast [New Module]
Forecast total project cost based on actual spend + estimated remaining work.
- Input: % complete per BOQ scope
- Actual cost to date: from ProjectExpenses
- Estimated cost at completion (EAC): actual / % complete
- Variance: EAC vs. original BOQ total
- Budget-at-completion (BAC): BOQ total with profit
- Alert when EAC exceeds BAC by > 5%

### 6.3 Vendor Spend Analytics [Quick Win]
Analyze procurement spend by vendor, category, and time period.
- Total PO value per vendor (last 12 months)
- Category breakdown (Materials / Equipment / Subcontractor)
- Month-over-month spend trend chart
- Top 10 vendors by spend, with payment performance
- Exportable to Excel

### 6.4 Invoice Aging & Collection Report [Quick Win]
Extend existing invoice-aging endpoint with collection efficiency metrics.
- Days Sales Outstanding (DSO): Average days from invoice to payment
- Collection rate: % invoices fully paid within 30/60/90 days
- Per-client collection history
- Overdue invoice follow-up list with last payment date

### 6.5 Executive Dashboard v2 [Quick Win]
Add KPI summary cards and trend charts to the existing DashboardView.
- Revenue this month vs. last month (line chart)
- Procurement spend this month vs. budget
- Cash position: AR balance vs. AP balance
- Project health matrix: on-time / at-risk / delayed per active project
- Headcount trend (monthly)

### 6.6 Custom Report Builder [New Module]
Allow Admin/Finance to define ad-hoc reports from a set of pre-built data tables.
- Select data source: Projects / Invoices / Expenses / Labor / Vendors
- Drag-and-drop column selector
- Filters: date range, project, status, category
- Group by and sum/count aggregation
- Export to Excel / CSV
- Save report definition for reuse

### 6.7 Project Comparison Report [Quick Win]
Side-by-side comparison of up to 5 projects across financial metrics.
- Columns: ContractValue, TotalInvoiced, TotalExpenses, GrossMargin, LaborCost, BOQVariance
- Useful for management review meetings
- Exportable to PDF

---

## 7. Inventory & Equipment

### 7.1 Equipment & Asset Register [New Module]
Track company-owned and rented equipment.
- Tables: `Equipment`
- Fields: EquipmentCode, Name, Category, Make, Model, Year, SerialNumber, PurchaseDate, PurchaseValue, CurrentValue, Status (Available/Deployed/UnderMaintenance/Disposed), CurrentProjectID
- Depreciation schedule (straight-line, configurable rate)
- Assignment history: which project, from when, to when
- Rental vs. owned flag; rental cost per day

### 7.2 Equipment Maintenance Log [New Module]
Track preventive and corrective maintenance per equipment.
- Tables: `MaintenanceLogs`
- Fields: EquipmentID, MaintenanceType (Preventive/Corrective), MaintenanceDate, Description, Cost, PerformedBy, NextMaintenanceDue
- Alert when next maintenance due date is within 7 days
- Maintenance cost feeds ProjectExpenses (category: Equipment)

### 7.3 Equipment Utilization Report [Quick Win]
Show how efficiently each piece of equipment is being used.
- Deployed days vs. available days per month
- Cost per deployed day
- Which projects the equipment was deployed to
- Idle equipment list (not assigned to any project)

### 7.4 Inventory Valuation Methods [Quick Win]
Add FIFO / Weighted Average cost tracking to StoreStock.
- Currently: single UnitCost per stock item
- Enhancement: maintain receipt batches with cost per batch
- FIFO: issues consume oldest receipt first
- Weighted average: recalculates average cost on each receipt
- Stock valuation report: total inventory value by method

### 7.5 Stock Transfer Between Projects [Quick Win]
Move stock items from one project's store to another.
- Tables: `StockTransfers`
- Fields: FromProjectID, ToProjectID, StockID, TransferQty, TransferDate, TransferredBy, Notes, ApprovedBy
- Deducts from source project stock, adds to destination
- Creates expense record on destination project (inter-project cost transfer)

### 7.6 Barcode / QR Code for Stock Items [New Module]
Generate and scan QR codes for stock items and material issues.
- Each StockItem gets a unique QR code (ItemCode or StockID)
- DC (Material Issue) sheet prints QR codes for scanning at site
- Site engineer scans QR to confirm receipt (updates DC status)
- Reduces manual data entry errors on site

---

## 8. Client & Contract Management

### 8.1 Client Master [New Module]
Dedicated client registry beyond the per-invoice client fields.
- Tables: `Clients`
- Fields: ClientCode, ClientName, ClientNameAr, VATNumber, Address, ContactPerson, Phone, Email, PaymentTerms, CreditLimit, Rating
- Link projects and invoices to ClientID (foreign key)
- Client statement: all invoices + payments + balance
- Credit limit alert: flag invoice creation when client balance exceeds credit limit

### 8.2 Contract Repository [New Module]
Store and track main contracts and subcontracts per project.
- Tables: `Contracts`
- Fields: ProjectID, ContractType (Main/Sub/Consultant), ContractNumber, ClientID/VendorID, ContractValue, SignDate, StartDate, EndDate, RetentionPct, DefectLiabilityPeriod, DocumentPath
- Contract expiry alert (30 days before end date)
- Links to Change Orders (item 1.1) for value amendments

### 8.3 Client Communication Log [Quick Win]
Track meetings, calls, and emails with clients per project.
- Tables: `ClientInteractions`
- Fields: ProjectID, InteractionDate, Type (Meeting/Call/Email/Site Visit), Description, ActionItems, FollowUpDate, LoggedBy
- Alert when follow-up date is reached
- PM can view full interaction history per project

### 8.4 Tender / Bid Management [New Module]
Manage the pre-award phase: tendering, bid preparation, and submission.
- Tables: `Tenders`, `TenderItems`
- Fields: TenderName, Client, TenderNumber, SubmissionDeadline, BidValue, Status (Preparing/Submitted/Won/Lost/Withdrawn)
- BOQ import for bid preparation
- Win/loss rate tracking
- Pipeline dashboard: total bid value in preparation, submitted, won this quarter

### 8.5 Variation Order Tracking [Quick Win]
Track client-instructed variations (scope changes on-site) before formal Change Order approval.
- Tables: `VariationOrders`
- Fields: ProjectID, VONumber, Description, RequestedDate, Amount (estimated), Status (Pending/Approved/Rejected), LinkedChangeOrderID
- Helps capture all variations so none are missed at final account settlement

---

## 9. Notifications & Integrations

### 9.1 In-App Notification Center [New Module]
Real-time alerts within the portal for all role-relevant events.
- Tables: `Notifications`
- Fields: UserID, Type, Message, RelatedModule, RelatedID, IsRead, CreatedAt
- Toast notifications on login for unread items
- Notification bell icon with unread badge count
- Types: PO pending approval, GRN awaiting QC, Iqama expiring, Invoice overdue, Low stock, Milestone overdue

### 9.2 Email Digest / Daily Summary [Quick Win]
Send a daily summary email to Admin and PM users.
- Uses existing SendGrid integration
- Contents: Open approvals, overdue invoices, upcoming milestone dates, Iqama alerts, low stock items
- Configurable time (default: 8:00 AM)
- Opt-in per user

### 9.3 WhatsApp / SMS Alert Integration [New Module]
Send critical alerts via WhatsApp Business API or SMS gateway.
- Triggers: PO approved/rejected, Invoice overdue 30+ days, Iqama expiry critical, Payroll run submitted
- WhatsApp templates (pre-approved by Meta)
- SMS fallback via Twilio or Unifonic
- Per-user mobile number stored in `Users` table

### 9.4 Microsoft Teams / Slack Webhook [Quick Win]
Post event notifications to a Teams or Slack channel.
- Config: webhook URL stored in server environment variables
- Events: New PO submitted, PO approved, New GRN, Invoice cleared by ZATCA, Low stock alert
- Formatted card with deep link back to the ERP module

### 9.5 Accounting Software Export (QuickBooks / Xero / SAP) [New Module]
Export financial transactions to external accounting systems.
- Supported formats: QuickBooks IIF, Xero CSV, SAP IDOC (configurable)
- Exports: Invoices (AR), Vendor bills (AP), Payments, Journal entries for expenses
- Configurable GL account mapping per expense category
- Incremental export: only new/changed records since last export

### 9.6 Bank API Integration (Direct Payment) [New Module]
Initiate vendor payments directly from the ERP via bank API.
- Supported: Saudi SAMA-compliant bank APIs (Al Rajhi, SABB, Riyad Bank)
- Workflow: Finance approves payment in ERP → ERP calls bank API → bank processes transfer
- Status callback: bank confirms transfer, updates VendorPayment status
- Audit trail: bank reference number stored on each payment

---

## 10. System & UX

### 10.1 Audit Trail / Change History [Quick Win]
View full change history for any record.
- All tables already have `ChangedBy` + `ChangeDate`
- Enhancement: dedicated audit log table capturing old value → new value per field
- UI: "View History" button on any record detail page
- Filterable by user, date range, field name
- Helps resolve disputes and track unauthorized changes

### 10.2 Role-Based Field Permissions [New Module]
Control which fields are visible or editable per role.
- Config table: `FieldPermissions` (Module, FieldName, RoleID, CanView, CanEdit)
- Example: Finance can see UnitCost in BOQ; Engineers cannot
- Example: PM can edit project status; Finance cannot
- Reduces accidental edits and data exposure

### 10.3 Multi-Company / Branch Support [New Module]
Allow the ERP to serve multiple legal entities under one deployment.
- Tables: Add `CompanyID` to all core tables
- Company master: Name, VATNumber, Logo, Address, ZATCA credentials
- Users assigned to one or more companies
- Separate ZATCA e-invoicing per company
- Consolidated reports across all companies (Admin only)

### 10.4 Document Template Engine [New Module]
Generate PDFs for POs, GRNs, Delivery Challans, Invoices, and Payslips.
- Library: Puppeteer or jsPDF on the server
- Templates: Company logo, brand colors, Arabic + English bilingual
- Dynamic data merge from route responses
- Existing ZATCA XML download can be complemented with a formatted PDF invoice

### 10.5 Mobile-Responsive Views [Quick Win]
Optimize existing views for tablet and mobile use by site engineers.
- Current: Tailwind classes exist but tables are not responsive on small screens
- Fix: Horizontal scrollable tables on mobile, collapsible sidebar, touch-friendly buttons
- Priority views: DashboardView, MaterialIssueView, GRNView, QCView

### 10.6 Dark Mode [Quick Win]
Add a dark/light mode toggle to the UI.
- Tailwind `dark:` variant already supported
- Store preference in `localStorage`
- Toggle button in the sidebar footer
- Default: follows OS preference (`prefers-color-scheme`)

### 10.7 Keyboard Shortcuts & Power User Mode [Quick Win]
Speed up navigation for frequent users.
- `G P` → Projects, `G B` → BOQ, `G I` → Invoices, etc.
- `N` → New record in current view
- `?` → Show shortcut cheat sheet modal
- Implemented via global `keydown` listener in `App.tsx`

### 10.8 Data Import / Export Center [New Module]
Centralized import/export hub for all modules.
- Download Excel templates for: Labor, BOQ Items, Vendors, Expenses
- Upload and validate before committing to DB
- Preview imported rows with error highlighting before final import
- Export any list view to Excel with current filters applied
- Currently: BOQ and Labor have import; this unifies the pattern across all modules

### 10.9 API Rate Limiting & Security Hardening [Quick Win]
Production security improvements.
- Rate limiting: `express-rate-limit` on `/api/auth/login` (max 10 attempts / 15 min)
- Helmet.js: HTTP security headers (CSP, HSTS, X-Frame-Options)
- Input sanitization: strip HTML tags from all string inputs
- JWT refresh token: sliding session without re-login every 8 hours
- IP whitelist option for admin endpoints

### 10.10 Automated Backup & Restore [New Module]
Schedule and manage MSSQL database backups.
- Server-side script: `scripts/backup.ts` — runs `BACKUP DATABASE` to a network share
- Schedule: Daily full backup, hourly differential
- Backup manifest: list of backups with size, date, location
- Restore UI: Admin can trigger restore from a listed backup (with confirmation)
- Alert on backup failure via email

---

## Priority Recommendation

| Priority | Enhancement | Reason |
|----------|------------|--------|
| High | 1.2 Project Milestone Tracking | Core PM gap — projects have no schedule |
| High | 1.1 Change Order Management | Contract value changes are inevitable |
| High | 3.2 Cash Flow Forecast | Financial planning critical for construction |
| High | 4.1 Attendance & Time Tracking | Ties labor to actual project hours |
| High | 5.2 ZATCA API Clearance | Phase 2 mandate — automates compliance |
| High | 8.1 Client Master | Invoices currently store client data inline |
| Medium | 6.1 P&L Statement | Management needs consolidated financials |
| Medium | 7.1 Equipment Register | Assets have no tracking today |
| Medium | 9.1 In-App Notifications | Reduces missed approvals and alerts |
| Medium | 10.4 PDF Template Engine | POs and invoices need professional PDFs |
| Low | 10.3 Multi-Company Support | Future growth when second entity is added |
| Low | 10.6 Dark Mode | User experience improvement |
