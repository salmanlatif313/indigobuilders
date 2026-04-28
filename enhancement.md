# IndigoBuilders ERP — Feature Enhancement Roadmap

> This document lists proposed enhancements organized by domain. Each item includes a brief description and the business value it adds. Items marked **[Quick Win]** can be built on top of existing tables/routes with minimal schema changes. Items marked **[New Module]** require new tables and routes. Each item carries a **Source** tag identifying where the gap was identified.

---

## 1. Project Management

### 1.1 Change Order Management [New Module]
Track formal contract amendments (scope additions, price changes, timeline extensions).
- Tables: `ChangeOrders`, `ChangeOrderItems`
- Workflow: Draft → Submitted → Client Approved / Rejected
- Auto-updates `Projects.ContractValue` when approved
- Links to BOQ revision (creates a new BOQ with RevisionNumber + 1)
- Client signature/approval log with date and reference number
- **Source:** Gap in `ProjectsView` / `projects.ts` — `ContractValue` can be edited freely with no audit trail or formal amendment process

### 1.2 Project Milestone & Schedule Tracking [New Module]
Define milestones per project and track progress against planned dates.
- Tables: `ProjectMilestones`
- Fields: MilestoneName, PlannedDate, ActualDate, CompletionPct, LinkedInvoiceID (for payment-on-milestone billing)
- Dashboard widget: Gantt-style milestone timeline
- Alert when milestone is overdue with no actual date set
- **Source:** Gap in `Projects` table — has `StartDate` / `EndDate` but no intermediate milestone structure or schedule tracking

### 1.3 Project Budget vs. Actual Dashboard [Quick Win]
Enhance the existing `/api/projects/:id/financials` endpoint with budget breakdown.
- Budget by category (Materials / Labor / Equipment / Subcontractor / Other)
- Actual from `ProjectExpenses` grouped by category
- Variance column: budget minus actual, color-coded
- BOQ total can serve as the baseline budget
- **Source:** Gap in `projects.ts` `/financials` endpoint — returns total invoiced and expenses but no category-level budget vs. actual breakdown

### 1.4 Daily Site Report (DSR) [New Module]
Engineers submit daily site progress reports from the field.
- Tables: `DailySiteReports`
- Fields: ProjectID, ReportDate, SubmittedBy, WeatherCondition, WorkDescription, ManpowerCount, MachineryUsed, IssuesEncountered, ProgressPct
- Photo attachments (file path or base64)
- PM/Admin approval status
- Feeds into project progress dashboard
- **Source:** Gap in system — Engineer role exists but has no field-reporting mechanism; progress tracking is entirely manual

### 1.5 Subcontractor Management [New Module]
Dedicated module for managing subcontractors separately from material vendors.
- Tables: `Subcontractors`, `SubcontractorContracts`, `SubcontractorProgressClaims`
- Fields: SubcontractorName, Trade, ContractValue, RetentionPct, StartDate, EndDate
- Progress claim workflow: Submitted → PM Verified → Finance Approved → Paid
- Links to `ProjectExpenses` (category: Subcontractor) for cost rollup
- Retention tracking: amount held vs. amount released
- **Source:** Gap in `Vendors` module — subcontractors share the Vendors table with material suppliers; no contract value, retention, or progress claim tracking exists

### 1.6 Project Document Vault [New Module]
Central repository for project documents (contracts, drawings, permits, photos).
- Tables: `ProjectDocuments`
- Fields: ProjectID, DocumentType, FileName, FilePath, UploadedBy, UploadDate, Version, Notes
- Document types: Contract / Drawing / Permit / Photo / Certificate / Other
- Version control: supersedes older version of same document type
- Role-based access: Engineers see drawings only; Finance sees contracts + invoices
- **Source:** Gap in `Projects` table — has a `Notes` field only; no document storage, versioning, or role-filtered access

### 1.7 Retention Management [Quick Win]
Track retention on customer invoices and vendor bills separately from invoice amounts.
- Existing `Invoices.RetentionAmount` already captured
- Add `RetentionReleased` flag + `RetentionReleaseDate` to Invoices
- New report: Retention ledger (held vs. released, by project)
- Alert when retention release date approaches (e.g., 30 days before defect liability period ends)
- **Source:** Gap in `Invoices` table — `RetentionAmount` is stored but never tracked for release; no retention aging or release workflow exists

---

## 2. Procurement

### 2.1 Vendor Performance Scorecard [Quick Win]
Score vendors based on existing GRN, QC, and payment data.
- Metrics: On-time delivery rate (GRN vs. PO expected delivery), QC acceptance rate (AcceptedQty / OrderedQty), Average payment days, Number of rejected deliveries
- Aggregate into a 1–5 star score per vendor
- Shown on Vendor detail page and vendor list
- Filters: Top/bottom performers, by category
- **Source:** Gap in `Vendors` table — has a `Rating` column (1–5) that is manually set; all the raw data (GRN dates, QC decisions, payment records) already exists to compute this automatically

### 2.2 PO Price Comparison vs. BOQ Rate [Quick Win]
When creating a PO line, compare the unit price against the BOQ rate for the same item.
- Highlight variance > 10% with a warning flag
- Dashboard widget: Top 10 POs with highest BOQ variance
- Helps catch procurement overruns before approval
- **Source:** Gap in `PurchaseOrdersView` + `BOQItems` — `BOQItems.UnitRate` exists but is never cross-referenced against `PurchaseOrderItems.UnitPrice` when raising a PO

### 2.3 Blanket Purchase Orders [New Module]
Long-term agreements with a vendor for recurring supply up to a maximum value.
- Tables: `BlanketPOs`, `BlanketPOCalloffs`
- Fields: VendorID, ProjectID, MaxValue, ValidFrom, ValidTo, Description
- Call-offs are releases against the blanket — each deducts from the open balance
- Auto-alerts when blanket PO is 80% consumed
- **Source:** Gap in `PurchaseOrders` module — only supports one-off POs; no framework agreement or standing order concept

### 2.4 RFQ Email Dispatch to Vendors [Quick Win]
Send RFQ details directly to vendor email addresses when RFQ status changes to "Sent".
- Uses existing SendGrid integration from PO approval
- Email contains: RFQ number, project name, line items (description, qty, unit), due date, portal link
- Tracks sent/not-sent per vendor in `RFQVendorQuotes`
- **Source:** Gap in `rfq.ts` — status transitions to "Sent" but no email is actually dispatched; vendors must be notified manually outside the system

### 2.5 Material Return to Vendor [New Module]
Track materials returned to vendors due to rejection or over-delivery.
- Tables: `MaterialReturns`
- Fields: GRNHeaderID, VendorID, ReturnDate, Reason, ReturnedQty, DebitNoteNumber
- Automatically reduces vendor bill amount (creates a debit note against the bill)
- Adjusts StoreStock accordingly
- **Source:** Gap in QC / GRN workflow — `QCInspectionLines.RejectedQty` is recorded but rejected materials have no return-to-vendor, debit note, or stock adjustment workflow

### 2.6 Procurement KPI Dashboard [Quick Win]
Summary panel on the main dashboard for procurement metrics.
- Open RFQs past due date
- POs pending approval more than 3 days
- GRNs in "Inspecting" state more than 2 days
- Low-stock items count (already in InventoryView — surface on dashboard)
- Total spend this month vs. last month (from POs/VendorBills)
- **Source:** Gap in `DashboardView` — dashboard covers projects, labor, invoices, and PO counts but no procurement cycle metrics (RFQ aging, GRN bottlenecks, spend trend)

### 2.7 Multi-Vendor PO Splitting [Quick Win]
After awarding an RFQ, allow splitting awarded lines across multiple vendors into separate POs.
- UI: "Generate POs from RFQ" button on awarded RFQ
- Groups awarded lines by vendor, creates one draft PO per vendor
- Pre-fills unit prices from awarded quotes
- Reduces manual PO data entry
- **Source:** Gap in RFQ→PO workflow — `rfq.ts` awards quotes but has no action to auto-generate POs from awarded lines; POs must be created manually after RFQ award

---

## 3. Payment System (AP & AR)

### 3.1 Payment Schedule / Installment Plan [New Module]
Define a structured payment plan for customer invoices or vendor bills.
- Tables: `PaymentSchedules`
- Fields: InvoiceID / VendorBillID, DueDate, Amount, Status (Pending/Paid/Overdue)
- Dashboard widget: Upcoming payments due in next 30 days
- Auto-marks installment as Overdue when due date passes and not paid
- Feeds the cash flow forecast (item 3.2 below)
- **Source:** Gap in `InvoicePayments` + `VendorPayments` — payments are recorded as they happen with no forward-looking schedule or installment commitment tracking

### 3.2 Cash Flow Forecast [New Module]
Project incoming and outgoing cash based on scheduled invoices and vendor bills.
- AR side: Unpaid invoice balances + payment schedule due dates
- AP side: Unpaid vendor bills + payment schedule due dates
- WPS payroll run dates (from `WPS_PayrollRuns.PayrollMonth`)
- Output: 12-week rolling weekly cash flow table
- Chart: Stacked bar — inflows vs. outflows per week
- **Source:** Gap in `DashboardView` + `ReportsView` — all cash data exists (invoices, bills, payroll) but no forward-looking cash position or weekly inflow/outflow view

### 3.3 Customer Advance / Retention Receipt [Quick Win]
Record customer advance payments before invoice issuance.
- Tables: `CustomerAdvances`
- Fields: ProjectID, ClientName, ReceiptDate, Amount, PaymentMethod, ReferenceNo, Notes
- Advances reduce the balance due on future invoices for the same project
- Retention receipt: track when client releases retention separately from invoice payments
- **Source:** Gap in `InvoicePayments` — payments can only be recorded against an existing invoice; no mechanism to capture advance receipts or retention releases before invoicing

### 3.4 Partial Invoice Payments & Reconciliation [Quick Win]
Existing `InvoicePayments` table supports partials — enhance UI.
- Show running balance due on invoice detail page
- Reconciliation report: match payments to invoices, flag unallocated bank receipts
- Flag invoices with payments exceeding balance (data integrity alert)
- **Source:** Gap in `InvoicesView` — `View_InvoiceSummary` computes `BalanceDue` but the UI does not display a running payment history or flag over-payments

### 3.5 Vendor Credit Notes & Debit Notes [New Module]
Formal adjustments to vendor bills for returns, disputes, or pricing corrections.
- Tables: `VendorCreditNotes`
- Fields: VendorID, VendorBillID, CreditDate, Amount, Reason, ReferenceNo
- Auto-reduces outstanding bill balance
- Separate view in VendorPaymentsView with credit note history per vendor
- **Source:** Gap in `VendorPaymentsView` — `vendor-payments.ts` records payments against bills but has no adjustment mechanism for credits, returns, or price disputes

### 3.6 Cheque Management [New Module]
Track issued and received cheques with clearing status.
- Tables: `Cheques`
- Fields: ChequeType (Issued/Received), ChequeNumber, BankName, Amount, IssueDate, ClearanceDate, Status (Pending/Cleared/Bounced), LinkedPaymentID
- Alert on cheques approaching clearing date
- Bounced cheque workflow: marks linked payment as failed, reopens invoice balance
- **Source:** Gap in `InvoicePayments` + `VendorPayments` — `PaymentMethod` includes "Cheque" but no cheque number, bank, or clearance status is tracked

### 3.7 Bank Reconciliation [New Module]
Match recorded payments to bank statement entries.
- Tables: `BankStatements`, `BankReconciliationLines`
- Upload bank statement CSV → auto-match by amount + date
- Unmatched entries flagged for manual review
- Reconciliation status per statement period
- **Source:** Gap in system — payments are recorded in ERP but there is no mechanism to verify them against actual bank statements; undetected discrepancies can persist indefinitely

### 3.8 VAT Return Summary [Quick Win]
Aggregate VAT collected (output VAT from invoices) vs. VAT paid (input VAT from vendor bills) per quarter.
- Uses existing `Invoices.VATAmount` and `VendorBills.VATAmount`
- Output: VAT payable / refundable for the period
- Breakdown by project
- Exportable as CSV for submission to ZATCA
- **Source:** Regulatory gap — ZATCA requires quarterly VAT filing; `Invoices.VATAmount` and vendor bill VAT data exist but no quarterly summary or filing export is built

---

## 4. Labor & HR

### 4.1 Attendance & Time Tracking [New Module]
Record daily attendance and working hours per employee per project.
- Tables: `Attendance`
- Fields: LaborID, AttendanceDate, ProjectID, CheckIn, CheckOut, WorkingHours, OvertimeHours, Status (Present/Absent/HalfDay/Holiday), Notes
- Bulk import from Excel (site supervisor uploads daily sheet)
- Integration hook: attendance data feeds WPS payroll deductions (absent days)
- Monthly attendance summary per employee
- **Source:** Gap in `Labor` module — employee records and payroll exist but no daily attendance; WPS deductions for absent days are computed manually outside the system

### 4.2 Overtime & Allowance Management [Quick Win]
Add overtime and project-specific allowances on top of base salary.
- New columns on `Labor`: OvertimeRate, SiteAllowance, FoodAllowance
- WPS payroll lines pick up allowances automatically
- Overtime hours from attendance feed into payroll calculation
- Per-project allowance (engineer on remote site gets higher allowance)
- **Source:** Gap in `Labor` table + `WPS_PayrollLines` — only BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances are tracked; no overtime rate or project-specific allowance structure

### 4.3 Leave Management [New Module]
Track annual leave, sick leave, and other leave types.
- Tables: `LeaveRequests`
- Fields: LaborID, LeaveType (Annual/Sick/Unpaid/Emergency), FromDate, ToDate, Days, Status (Pending/Approved/Rejected), ApprovedBy, Notes
- Leave balance calculation: entitlement (21 days/year per Saudi Labor Law) minus used
- Feeds attendance (approved leave = not counted as absent)
- Alert when employee has unused leave > 30 days
- **Source:** Regulatory gap — Saudi Labor Law (Article 109) mandates 21 days paid annual leave; no leave balance or request tracking exists in the system

### 4.4 Iqama & Document Renewal Workflow [Quick Win]
Formalize the Iqama renewal process with reminders and action tracking.
- New columns on `Labor`: PassportExpiry, WorkPermitExpiry, MedicalInsuranceExpiry
- Compliance alerts extended to cover all three expiry types
- Renewal task assigned to HR user with due date
- Status: NotStarted / InProgress / Renewed — tracks which employees have been actioned
- Email alert to HR when any document enters the 60-day window
- **Source:** Gap in `ComplianceView` — Iqama expiry alerts are displayed but there is no renewal task assignment, status tracking, or follow-up workflow after the alert fires

### 4.5 Employee Self-Service (ESS) Portal [New Module]
Allow employees to view their own payslip and leave balance.
- New role: `Employee` (read-only, own records only)
- Views: Payslip (current + last 3 months), Leave balance, Attendance record
- Arabic language support (RTL already in place)
- No sensitive payroll data exposed to other employees
- **Source:** Gap in `UsersView` / Auth module — four roles exist (Admin/Finance/PM/Engineer) but no employee-facing self-service access; employees cannot view their own payslip

### 4.6 End-of-Service Benefit (EOSB) Calculator [Quick Win]
Compute EOSB as per Saudi Labor Law Article 84.
- Input: LaborID, TerminationDate, TerminationReason
- Calculation: Years of service × (1/3 BasicSalary for first 5 years, full BasicSalary after)
- Reduction for resignation under 2 years (loses full EOSB)
- Output: EOSB amount, included in final settlement report
- Exportable to PDF
- **Source:** Regulatory gap — Saudi Labor Law Article 84 mandates EOSB on termination; `Labor.BasicSalary` and start date exist but no EOSB calculation tool is provided

### 4.7 Subcontractor Labor Headcount [Quick Win]
Track headcount of subcontractor labor (not on payroll, but on-site).
- New table `SubcontractorHeadcount` or extend `DailySiteReports`
- Fields: ProjectID, Date, SubcontractorName, Trade, HeadCount
- Report: Total manpower on site per day (own + subcontractor)
- **Source:** Gap in `LaborView` — tracks company payroll employees only; subcontractor workers on-site are not counted, making manpower reports incomplete

---

## 5. Compliance & Regulatory

### 5.1 GOSI Online Filing Export [Quick Win]
Extend existing GOSI report to generate the official GOSI contribution file format.
- Current: GOSI report is display-only
- Enhancement: Export pipe-delimited or CSV in GOSI portal-compatible format
- Columns: GOSINumber, FullName, NationalityCode, BasicSalary, EmployeeShare (9%), EmployerShare (11.75%), TotalContribution
- Monthly filing reminder on Compliance dashboard
- **Source:** Gap in `ReportsView` / `reports.ts` GOSI endpoint — computes correct contributions but outputs HTML only; GOSI portal requires a specific file format for upload

### 5.2 ZATCA E-Invoice Clearance API Integration [New Module]
Automate submission to ZATCA Fatoora portal instead of manual status update.
- Use ZATCA Phase 2 API (Onboarding → Reporting → Clearance)
- Store cryptographic stamp (CSID) after onboarding
- Auto-submit invoice XML on creation → update ZatcaStatus from API response
- Retry queue for failed submissions
- Alert on Rejected invoices with ZATCA error reason
- **Source:** Regulatory gap — ZATCA Phase 2 mandate requires real-time clearance; current system generates UBL 2.1 XML and QR code correctly but `ZatcaStatus` is updated manually, not via the Fatoora API

### 5.3 Municipality & Zoning Permit Tracker [New Module]
Track government permits required per project.
- Tables: `ProjectPermits`
- Fields: ProjectID, PermitType, IssuingAuthority, PermitNumber, IssueDate, ExpiryDate, Status, RenewalCost, Notes
- Permit types: Building Permit / Municipality License / Environmental / Electrical / Plumbing
- Compliance dashboard shows permits expiring in 30 days
- **Source:** Gap in `Projects` module — construction projects legally require multiple government permits; no permit tracking exists; only Iqama expiry is tracked in `ComplianceView`

### 5.4 HSE Incident Reporting [New Module]
Health, Safety & Environment incident log per project.
- Tables: `HSEIncidents`
- Fields: ProjectID, IncidentDate, IncidentType (NearMiss/FirstAid/LostTimeInjury/Fatality), Description, InjuredPersonName, LaborID, RootCause, CorrectiveAction, Status (Open/Closed), ReportedBy
- KPI: Lost Time Injury Frequency Rate (LTIFR) per project
- Dashboard stat: Days without incident counter
- Regulatory report export for MHRSD
- **Source:** Regulatory gap — MHRSD requires HSE incident reporting for construction sites; no safety reporting module exists in the system

### 5.5 Zakat Filing Support [Quick Win]
Generate data needed for annual Zakat filing.
- Revenue: Total invoiced amounts per year (from Invoices)
- Expenses: Total vendor payments, labor costs, depreciation (from ProjectExpenses + WPS)
- Fixed assets: Equipment register value (from Equipment module if built)
- Export as CSV with GL-style categorization
- **Source:** Regulatory gap — Saudi companies must file annual Zakat with GAZT/ZATCA; all underlying financial data exists across Invoices, ProjectExpenses, and WPS tables but no aggregation or export is built

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
- **Source:** Gap in `ReportsView` — three reports exist (GOSI, invoice aging, labor-by-project) but no P&L; `View_ProjectSummary` has TotalInvoiced and TotalExpenses but no margin or net profit calculation

### 6.2 Cost-to-Complete (CTC) Forecast [New Module]
Forecast total project cost based on actual spend + estimated remaining work.
- Input: % complete per BOQ scope
- Actual cost to date: from ProjectExpenses
- Estimated cost at completion (EAC): actual / % complete
- Variance: EAC vs. original BOQ total
- Budget-at-completion (BAC): BOQ total with profit
- Alert when EAC exceeds BAC by > 5%
- **Source:** Gap in `projects.ts` financials endpoint — reports actual spend to date but no forward-looking cost-at-completion or earned value calculation

### 6.3 Vendor Spend Analytics [Quick Win]
Analyze procurement spend by vendor, category, and time period.
- Total PO value per vendor (last 12 months)
- Category breakdown (Materials / Equipment / Subcontractor)
- Month-over-month spend trend chart
- Top 10 vendors by spend, with payment performance
- Exportable to Excel
- **Source:** Gap in `ReportsView` — vendor data exists across `PurchaseOrders`, `VendorBills`, and `VendorPayments` but no spend analytics or vendor ranking report is built

### 6.4 Invoice Aging & Collection Report [Quick Win]
Extend existing invoice-aging endpoint with collection efficiency metrics.
- Days Sales Outstanding (DSO): Average days from invoice to payment
- Collection rate: % invoices fully paid within 30/60/90 days
- Per-client collection history
- Overdue invoice follow-up list with last payment date
- **Source:** Gap in `reports.ts` invoice-aging endpoint — buckets invoices by age but does not compute DSO, collection rate, or per-client payment history

### 6.5 Executive Dashboard v2 [Quick Win]
Add KPI summary cards and trend charts to the existing DashboardView.
- Revenue this month vs. last month (line chart)
- Procurement spend this month vs. budget
- Cash position: AR balance vs. AP balance
- Project health matrix: on-time / at-risk / delayed per active project
- Headcount trend (monthly)
- **Source:** Gap in `DashboardView` — dashboard shows counts and recent records but no trend charts, month-over-month comparisons, or project health status matrix

### 6.6 Custom Report Builder [New Module]
Allow Admin/Finance to define ad-hoc reports from a set of pre-built data tables.
- Select data source: Projects / Invoices / Expenses / Labor / Vendors
- Drag-and-drop column selector
- Filters: date range, project, status, category
- Group by and sum/count aggregation
- Export to Excel / CSV
- Save report definition for reuse
- **Source:** Gap in `ReportsView` — only three fixed reports exist; any non-standard analysis requires direct DB access; management frequently needs ad-hoc views

### 6.7 Project Comparison Report [Quick Win]
Side-by-side comparison of up to 5 projects across financial metrics.
- Columns: ContractValue, TotalInvoiced, TotalExpenses, GrossMargin, LaborCost, BOQVariance
- Useful for management review meetings
- Exportable to PDF
- **Source:** Gap in `ReportsView` — labor-by-project report exists but no financial comparison across projects; management currently exports data manually to Excel for comparison

---

## 7. Inventory & Equipment

### 7.1 Equipment & Asset Register [New Module]
Track company-owned and rented equipment.
- Tables: `Equipment`
- Fields: EquipmentCode, Name, Category, Make, Model, Year, SerialNumber, PurchaseDate, PurchaseValue, CurrentValue, Status (Available/Deployed/UnderMaintenance/Disposed), CurrentProjectID
- Depreciation schedule (straight-line, configurable rate)
- Assignment history: which project, from when, to when
- Rental vs. owned flag; rental cost per day
- **Source:** Gap in system — equipment is an expense category in `ProjectExpenses` but there is no asset register, utilization tracking, or depreciation calculation anywhere in the system

### 7.2 Equipment Maintenance Log [New Module]
Track preventive and corrective maintenance per equipment.
- Tables: `MaintenanceLogs`
- Fields: EquipmentID, MaintenanceType (Preventive/Corrective), MaintenanceDate, Description, Cost, PerformedBy, NextMaintenanceDue
- Alert when next maintenance due date is within 7 days
- Maintenance cost feeds ProjectExpenses (category: Equipment)
- **Source:** Gap in system — depends on Equipment Register (7.1); without an asset register, maintenance history cannot be tracked per machine

### 7.3 Equipment Utilization Report [Quick Win]
Show how efficiently each piece of equipment is being used.
- Deployed days vs. available days per month
- Cost per deployed day
- Which projects the equipment was deployed to
- Idle equipment list (not assigned to any project)
- **Source:** Gap in system — depends on Equipment Register (7.1); no utilization data exists today

### 7.4 Inventory Valuation Methods [Quick Win]
Add FIFO / Weighted Average cost tracking to StoreStock.
- Currently: single UnitCost per stock item
- Enhancement: maintain receipt batches with cost per batch
- FIFO: issues consume oldest receipt first
- Weighted average: recalculates average cost on each receipt
- Stock valuation report: total inventory value by method
- **Source:** Gap in `StoreStock` table — single `UnitCost` field per item; when multiple GRNs receive the same item at different prices, cost accuracy is lost

### 7.5 Stock Transfer Between Projects [Quick Win]
Move stock items from one project's store to another.
- Tables: `StockTransfers`
- Fields: FromProjectID, ToProjectID, StockID, TransferQty, TransferDate, TransferredBy, Notes, ApprovedBy
- Deducts from source project stock, adds to destination
- Creates expense record on destination project (inter-project cost transfer)
- **Source:** Gap in `InventoryView` / `inventory.ts` — `StoreStock` is per-project but there is no transfer action; surplus stock at one site cannot be moved to another without workarounds

### 7.6 Barcode / QR Code for Stock Items [New Module]
Generate and scan QR codes for stock items and material issues.
- Each StockItem gets a unique QR code (ItemCode or StockID)
- DC (Material Issue) sheet prints QR codes for scanning at site
- Site engineer scans QR to confirm receipt (updates DC status)
- Reduces manual data entry errors on site
- **Source:** Gap in `MaterialIssueView` — DCs are confirmed by manually updating status in the portal; no physical scanning or on-site confirmation mechanism exists

---

## 8. Client & Contract Management

### 8.1 Client Master [New Module]
Dedicated client registry beyond the per-invoice client fields.
- Tables: `Clients`
- Fields: ClientCode, ClientName, ClientNameAr, VATNumber, Address, ContactPerson, Phone, Email, PaymentTerms, CreditLimit, Rating
- Link projects and invoices to ClientID (foreign key)
- Client statement: all invoices + payments + balance
- Credit limit alert: flag invoice creation when client balance exceeds credit limit
- **Source:** Gap in `Invoices` table — ClientName, ClientVAT, ClientAddress are stored inline per invoice; same client data is re-entered on every invoice with no master record, statement, or credit limit control

### 8.2 Contract Repository [New Module]
Store and track main contracts and subcontracts per project.
- Tables: `Contracts`
- Fields: ProjectID, ContractType (Main/Sub/Consultant), ContractNumber, ClientID/VendorID, ContractValue, SignDate, StartDate, EndDate, RetentionPct, DefectLiabilityPeriod, DocumentPath
- Contract expiry alert (30 days before end date)
- Links to Change Orders (item 1.1) for value amendments
- **Source:** Gap in `Projects` module — project has ContractValue but no contract document, retention terms, defect liability period, or expiry date

### 8.3 Client Communication Log [Quick Win]
Track meetings, calls, and emails with clients per project.
- Tables: `ClientInteractions`
- Fields: ProjectID, InteractionDate, Type (Meeting/Call/Email/Site Visit), Description, ActionItems, FollowUpDate, LoggedBy
- Alert when follow-up date is reached
- PM can view full interaction history per project
- **Source:** Gap in `ProjectsView` — project detail has a Notes field only; no structured communication log, action item tracking, or follow-up reminder system

### 8.4 Tender / Bid Management [New Module]
Manage the pre-award phase: tendering, bid preparation, and submission.
- Tables: `Tenders`, `TenderItems`
- Fields: TenderName, Client, TenderNumber, SubmissionDeadline, BidValue, Status (Preparing/Submitted/Won/Lost/Withdrawn)
- BOQ import for bid preparation
- Win/loss rate tracking
- Pipeline dashboard: total bid value in preparation, submitted, won this quarter
- **Source:** Gap in system — the ERP lifecycle begins at the Projects module (post-award); the pre-award tender and bid preparation phase has no coverage

### 8.5 Variation Order Tracking [Quick Win]
Track client-instructed variations (scope changes on-site) before formal Change Order approval.
- Tables: `VariationOrders`
- Fields: ProjectID, VONumber, Description, RequestedDate, Amount (estimated), Status (Pending/Approved/Rejected), LinkedChangeOrderID
- Helps capture all variations so none are missed at final account settlement
- **Source:** Gap in `Projects` module — no mechanism to log informal variation instructions from clients before they are formalized into a Change Order; variations are frequently lost in email

---

## 9. Notifications & Integrations

### 9.1 In-App Notification Center [New Module]
Real-time alerts within the portal for all role-relevant events.
- Tables: `Notifications`
- Fields: UserID, Type, Message, RelatedModule, RelatedID, IsRead, CreatedAt
- Toast notifications on login for unread items
- Notification bell icon with unread badge count
- Types: PO pending approval, GRN awaiting QC, Iqama expiring, Invoice overdue, Low stock, Milestone overdue
- **Source:** Gap in system — compliance alerts are shown on `ComplianceView` and `DashboardView` but only when the user navigates there; no push-to-user notification mechanism exists

### 9.2 Email Digest / Daily Summary [Quick Win]
Send a daily summary email to Admin and PM users.
- Uses existing SendGrid integration
- Contents: Open approvals, overdue invoices, upcoming milestone dates, Iqama alerts, low stock items
- Configurable time (default: 8:00 AM)
- Opt-in per user
- **Source:** Gap in system — SendGrid is already integrated for PO approval emails (`email.ts`) but no scheduled digest or summary email is implemented

### 9.3 WhatsApp / SMS Alert Integration [New Module]
Send critical alerts via WhatsApp Business API or SMS gateway.
- Triggers: PO approved/rejected, Invoice overdue 30+ days, Iqama expiry critical, Payroll run submitted
- WhatsApp templates (pre-approved by Meta)
- SMS fallback via Twilio or Unifonic
- Per-user mobile number stored in `Users` table
- **Source:** Gap in `Users` table and notifications — no mobile number stored per user; all notifications are email-only via SendGrid; SMS/WhatsApp is the primary communication channel for field staff in Saudi Arabia

### 9.4 Microsoft Teams / Slack Webhook [Quick Win]
Post event notifications to a Teams or Slack channel.
- Config: webhook URL stored in server environment variables
- Events: New PO submitted, PO approved, New GRN, Invoice cleared by ZATCA, Low stock alert
- Formatted card with deep link back to the ERP module
- **Source:** Gap in system — no team collaboration platform integration; managers miss time-sensitive events (e.g., PO approvals, ZATCA rejections) unless they are actively using the portal

### 9.5 Accounting Software Export (QuickBooks / Xero / SAP) [New Module]
Export financial transactions to external accounting systems.
- Supported formats: QuickBooks IIF, Xero CSV, SAP IDOC (configurable)
- Exports: Invoices (AR), Vendor bills (AP), Payments, Journal entries for expenses
- Configurable GL account mapping per expense category
- Incremental export: only new/changed records since last export
- **Source:** Gap in system — the ERP manages operational transactions but some companies run a separate accounting system; no export bridge exists between the two

### 9.6 Bank API Integration (Direct Payment) [New Module]
Initiate vendor payments directly from the ERP via bank API.
- Supported: Saudi SAMA-compliant bank APIs (Al Rajhi, SABB, Riyad Bank)
- Workflow: Finance approves payment in ERP → ERP calls bank API → bank processes transfer
- Status callback: bank confirms transfer, updates VendorPayment status
- Audit trail: bank reference number stored on each payment
- **Source:** Gap in `VendorPaymentsView` — payments are recorded in the ERP after the bank transfer is done manually; no straight-through processing; reconciliation depends on manual data entry accuracy

---

## 10. System & UX

### 10.1 Audit Trail / Change History [Quick Win]
View full change history for any record.
- All tables already have `ChangedBy` + `ChangeDate`
- Enhancement: dedicated audit log table capturing old value → new value per field
- UI: "View History" button on any record detail page
- Filterable by user, date range, field name
- Helps resolve disputes and track unauthorized changes
- **Source:** Gap in all modules — every table stores `ChangedBy` and `ChangeDate` (last change only) but previous values are overwritten; no field-level history is retained

### 10.2 Role-Based Field Permissions [New Module]
Control which fields are visible or editable per role.
- Config table: `FieldPermissions` (Module, FieldName, RoleID, CanView, CanEdit)
- Example: Finance can see UnitCost in BOQ; Engineers cannot
- Example: PM can edit project status; Finance cannot
- Reduces accidental edits and data exposure
- **Source:** Gap in `requireAuth.ts` — RBAC controls route-level access but no field-level permission exists; sensitive fields (UnitCost, ContractValue, Salary) are visible to all roles that can access the module

### 10.3 Multi-Company / Branch Support [New Module]
Allow the ERP to serve multiple legal entities under one deployment.
- Tables: Add `CompanyID` to all core tables
- Company master: Name, VATNumber, Logo, Address, ZATCA credentials
- Users assigned to one or more companies
- Separate ZATCA e-invoicing per company
- Consolidated reports across all companies (Admin only)
- **Source:** Gap in system — single-company only; ZATCA credentials and company details are hardcoded; if Indigo Builders registers a second legal entity, the entire system must be duplicated

### 10.4 Document Template Engine [New Module]
Generate PDFs for POs, GRNs, Delivery Challans, Invoices, and Payslips.
- Library: Puppeteer or jsPDF on the server
- Templates: Company logo, brand colors, Arabic + English bilingual
- Dynamic data merge from route responses
- Existing ZATCA XML download can be complemented with a formatted PDF invoice
- **Source:** Gap in system — `invoices.ts` generates ZATCA XML for download; no other document (PO, GRN, DC, payslip) has a printable PDF; external parties (vendors, clients) receive no formatted document from the system

### 10.5 Mobile-Responsive Views [Quick Win]
Optimize existing views for tablet and mobile use by site engineers.
- Current: Tailwind classes exist but tables are not responsive on small screens
- Fix: Horizontal scrollable tables on mobile, collapsible sidebar, touch-friendly buttons
- Priority views: DashboardView, MaterialIssueView, GRNView, QCView
- **Source:** Gap in UI — Tailwind CSS is used throughout but data tables have fixed widths and the sidebar does not collapse; site engineers using tablets on-site have a poor experience

### 10.6 Dark Mode [Quick Win]
Add a dark/light mode toggle to the UI.
- Tailwind `dark:` variant already supported
- Store preference in `localStorage`
- Toggle button in the sidebar footer
- Default: follows OS preference (`prefers-color-scheme`)
- **Source:** Gap in UI — Tailwind `dark:` variant is available in the config but no dark mode toggle or `dark` class management exists in `App.tsx`

### 10.7 Keyboard Shortcuts & Power User Mode [Quick Win]
Speed up navigation for frequent users.
- `G P` → Projects, `G B` → BOQ, `G I` → Invoices, etc.
- `N` → New record in current view
- `?` → Show shortcut cheat sheet modal
- Implemented via global `keydown` listener in `App.tsx`
- **Source:** Gap in `App.tsx` — routing is manual (string-based `currentView` state); no keyboard navigation or shortcut system exists

### 10.8 Data Import / Export Center [New Module]
Centralized import/export hub for all modules.
- Download Excel templates for: Labor, BOQ Items, Vendors, Expenses
- Upload and validate before committing to DB
- Preview imported rows with error highlighting before final import
- Export any list view to Excel with current filters applied
- Currently: BOQ and Labor have import; this unifies the pattern across all modules
- **Source:** Gap in system — `BOQView` (XLSX/CSV import) and `LaborView` (CSV import) each have bespoke import logic; Vendors, Expenses, and other modules have no import; no module has a bulk export to Excel

### 10.9 API Rate Limiting & Security Hardening [Quick Win]
Production security improvements.
- Rate limiting: `express-rate-limit` on `/api/auth/login` (max 10 attempts / 15 min)
- Helmet.js: HTTP security headers (CSP, HSTS, X-Frame-Options)
- Input sanitization: strip HTML tags from all string inputs
- JWT refresh token: sliding session without re-login every 8 hours
- IP whitelist option for admin endpoints
- **Source:** Gap in `server/src/index.ts` — no rate limiting, no security headers middleware (Helmet), and no input sanitization layer; the login endpoint is vulnerable to brute-force attacks

### 10.10 Automated Backup & Restore [New Module]
Schedule and manage MSSQL database backups.
- Server-side script: `scripts/backup.ts` — runs `BACKUP DATABASE` to a network share
- Schedule: Daily full backup, hourly differential
- Backup manifest: list of backups with size, date, location
- Restore UI: Admin can trigger restore from a listed backup (with confirmation)
- Alert on backup failure via email
- **Source:** Gap in system — no automated backup script or schedule exists; the production DB at `172.1.10.43` has no documented backup process in the codebase

---

## 11. Approval Matrix & Authorization Controls

The current system has a single flat approval mechanism: PO approval emails every active Admin and Finance user. A proper approval matrix defines **who must approve what, at what value threshold, in what sequence**.

### 11.1 Configurable Approval Matrix [New Module]
Allow Admin to define approval rules per document type and value band.
- Tables: `ApprovalMatrix`, `ApprovalSteps`
- `ApprovalMatrix` fields: DocumentType (PO / Expense / ChangeOrder / VendorBill / MaterialIssue / Invoice), MinAmount, MaxAmount, IsActive
- `ApprovalSteps` fields: MatrixID, StepOrder, ApproverRoleID, ApproverUserID (optional — specific user override), RequiredAll (all users of that role must approve vs. any one)
- Example rules:
  - PO < SAR 10,000 → PM approves only
  - PO SAR 10,000–100,000 → Finance Manager then GM
  - PO > SAR 100,000 → Finance Manager → GM → CEO (sequential)
  - Expense any amount → PM approves
  - Change Order any amount → PM → Finance → CEO (all three)
- **Source:** Gap in `purchase-orders.ts` `submit-approval` endpoint — emails every active Admin+Finance user regardless of PO value; no threshold-based routing, no sequential steps, no role hierarchy

### 11.2 Approval Workflow Engine [New Module]
Generic engine that processes any document through its matrix-defined steps.
- Tables: `ApprovalInstances`, `ApprovalInstanceSteps`
- `ApprovalInstances`: DocumentType, DocumentID, CurrentStep, Status (Pending/Approved/Rejected/Cancelled), CreatedAt
- `ApprovalInstanceSteps`: InstanceID, StepOrder, ApproverUserID, Decision (Pending/Approved/Rejected), DecisionDate, Comments
- On submit: engine looks up matching matrix row, creates instance + steps
- Sequential mode: next step only activates after previous is approved
- Parallel mode: all approvers in step notified simultaneously; majority or all must approve
- Rejection at any step → whole instance rejected, document returned to Draft
- Escalation: if no decision within N days, auto-escalate to next role up
- **Source:** Gap in system — approval logic is duplicated and hard-coded per module; a shared engine enables approvals across POs, Expenses, Change Orders, and Invoices without re-implementing each time

### 11.3 Multi-Level PO Approval (Replaces Current Flat Approval) [Quick Win]
Replace the current "email all Admin+Finance" approach with matrix-driven approval.
- Same email token mechanism — but now only the correct approver for the current step receives the email
- Approver sees: PO summary, current step number, total steps, previous approvals already given
- After each approval, next approver is notified
- PO status shows: `PendingApproval (Step 2 of 3 — awaiting GM)` instead of just `PendingApproval`
- **Source:** Gap in `purchase-orders.ts` — `PurchaseOrderApprovals` table stores tokens but has no step ordering, value thresholds, or sequential routing; all approvers receive the same email simultaneously

### 11.4 Delegation / Out-of-Office [Quick Win]
Allow an approver to delegate their approval authority to another user for a date range.
- Tables: `ApprovalDelegations`
- Fields: DelegatorUserID, DelegateUserID, FromDate, ToDate, DocumentTypes (comma-separated or all), Reason
- When delegation is active: workflow engine routes approvals to delegate instead of delegator
- Audit trail records both the original approver and the delegate
- **Source:** Gap in Approval system — if a required approver is on leave, their POs become stuck with no escalation or delegation mechanism

### 11.5 Approval Dashboard [Quick Win]
Dedicated view for each user to see all documents pending their approval action.
- Table-driven: queries `ApprovalInstanceSteps` where ApproverUserID = current user AND Decision = Pending
- Columns: Document type, Document number, Project, Amount, Submitted by, Waiting since, Days pending
- One-click Approve / Reject with optional comment
- Filter by: document type, project, date range
- Badge count shown in sidebar navigation
- **Source:** Gap in system — approvers currently receive an email with a one-time link; if the email is missed or the token expires, there is no portal view showing what is pending their action

### 11.6 Approval History & Audit Log [Quick Win]
Every document detail page shows the full approval chain.
- Who approved / rejected, at what time, with what comment
- Visible to Admin, Finance, and the document creator
- Exportable as PDF (useful for audit and compliance)
- Immutable: completed steps cannot be edited or deleted
- **Source:** Gap in `PurchaseOrderApprovals` — `ActedAt` and `Action` are stored per token but not surfaced on the PO detail UI; no other document type has any approval history at all

### 11.7 Budget-Based Auto-Approval [Quick Win]
Skip manual approval when a PO or expense is within an approved budget line.
- If the BOQ/budget for the project already covers the item and amount, auto-approve up to a configured threshold
- Config: `AutoApproveIfInBudget = true/false` per document type
- Still creates an approval instance with Decision = AutoApproved for audit trail
- Flag any auto-approved document clearly in reports
- **Source:** Gap in BOQ → PO workflow — a PO raised against a BOQ line that was already approved by management is effectively double-approved; no intelligence links BOQ approval to PO approval to reduce redundant steps

---

## Priority Recommendation

| Priority | Enhancement | Reason |
|----------|------------|--------|
| High | 11.1 Configurable Approval Matrix | Current flat approval is not production-grade |
| High | 11.2 Approval Workflow Engine | Foundation all other approvals depend on |
| High | 11.3 Multi-Level PO Approval | POs above SAR 100K need CEO sign-off |
| High | 11.5 Approval Dashboard | Approvers have no single place to act |
| High | 1.2 Project Milestone Tracking | Core PM gap — projects have no schedule |
| High | 1.1 Change Order Management | Contract value changes are inevitable |
| High | 3.2 Cash Flow Forecast | Financial planning critical for construction |
| High | 4.1 Attendance & Time Tracking | Ties labor to actual project hours |
| High | 5.2 ZATCA API Clearance | Phase 2 mandate — automates compliance |
| High | 8.1 Client Master | Invoices currently store client data inline |
| Medium | 11.4 Delegation / Out-of-Office | Prevents approval bottlenecks |
| Medium | 11.7 Budget-Based Auto-Approval | Reduces approval overhead for routine spend |
| Medium | 6.1 P&L Statement | Management needs consolidated financials |
| Medium | 7.1 Equipment Register | Assets have no tracking today |
| Medium | 9.1 In-App Notifications | Reduces missed approvals and alerts |
| Medium | 10.4 PDF Template Engine | POs and invoices need professional PDFs |
| Low | 10.3 Multi-Company Support | Future growth when second entity is added |
| Low | 10.6 Dark Mode | User experience improvement |
