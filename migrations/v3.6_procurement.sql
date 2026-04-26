-- IndigoBuilders ERP v3.6 — Procurement-to-Payment Schema Migration
-- Run once on IndigoBuilders database

USE IndigoBuilders;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Alter existing tables
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Projects') AND name = 'MinInvoiceAmount')
  ALTER TABLE Projects ADD MinInvoiceAmount DECIMAL(18,2) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrders') AND name = 'VendorID')
  ALTER TABLE PurchaseOrders ADD VendorID INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrders') AND name = 'RFQHeaderID')
  ALTER TABLE PurchaseOrders ADD RFQHeaderID INT NULL;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Vendors (Approved Vendor List)
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'Vendors' AND type = 'U')
BEGIN
  CREATE TABLE Vendors (
    VendorID        INT IDENTITY(1,1) PRIMARY KEY,
    VendorCode      NVARCHAR(50)  NOT NULL UNIQUE,
    VendorName      NVARCHAR(255) NOT NULL,
    VendorNameAr    NVARCHAR(255) NULL,
    Category        NVARCHAR(100) NULL,
    ContactPerson   NVARCHAR(255) NULL,
    Phone           NVARCHAR(50)  NULL,
    Email           NVARCHAR(255) NULL,
    VATNumber       NVARCHAR(50)  NULL,
    IBAN            NVARCHAR(50)  NULL,
    BankCode        NVARCHAR(50)  NULL,
    PaymentTerms    NVARCHAR(20)  NOT NULL DEFAULT 'Net30',
    ApprovalStatus  NVARCHAR(20)  NOT NULL DEFAULT 'Pending',
    Rating          TINYINT       NULL     DEFAULT 3,
    Address         NVARCHAR(MAX) NULL,
    IsActive        BIT           NOT NULL DEFAULT 1,
    Notes           NVARCHAR(MAX) NULL,
    ChangedBy       NVARCHAR(128) NULL,
    ChangeDate      DATETIME      NULL
  );
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BOQ
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'BOQ' AND type = 'U')
BEGIN
  CREATE TABLE BOQ (
    BOQHeaderID    INT IDENTITY(1,1) PRIMARY KEY,
    ProjectID      INT           NOT NULL REFERENCES Projects(ProjectID),
    BOQNumber      NVARCHAR(50)  NOT NULL,
    Title          NVARCHAR(255) NOT NULL,
    RevisionNumber TINYINT       NOT NULL DEFAULT 0,
    BOQDate        DATE          NOT NULL,
    Status         NVARCHAR(20)  NOT NULL DEFAULT 'Active',
    TotalAmount    DECIMAL(18,2) NOT NULL DEFAULT 0,
    Notes          NVARCHAR(MAX) NULL,
    ChangedBy      NVARCHAR(128) NULL,
    ChangeDate     DATETIME      NULL
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'BOQItems' AND type = 'U')
BEGIN
  CREATE TABLE BOQItems (
    BOQItemID          INT IDENTITY(1,1) PRIMARY KEY,
    BOQHeaderID        INT           NOT NULL REFERENCES BOQ(BOQHeaderID) ON DELETE CASCADE,
    SerialNo           NVARCHAR(50)  NULL,
    MainScope          NVARCHAR(100) NULL,
    Category           NVARCHAR(100) NULL,
    Description        NVARCHAR(MAX) NOT NULL,
    Unit               NVARCHAR(50)  NULL,
    Quantity           DECIMAL(18,4) NOT NULL DEFAULT 1,
    UnitRate           DECIMAL(18,4) NOT NULL DEFAULT 0,
    Amount             DECIMAL(18,2) NOT NULL DEFAULT 0,
    ProfitPct          DECIMAL(5,2)  NOT NULL DEFAULT 0,
    ProfitAmount       DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalWithProfit    DECIMAL(18,2) NOT NULL DEFAULT 0,
    ProcurementStatus  NVARCHAR(20)  NOT NULL DEFAULT 'NotStarted',
    ChangedBy          NVARCHAR(128) NULL,
    ChangeDate         DATETIME      NULL
  );
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RFQ
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'RFQHeaders' AND type = 'U')
BEGIN
  CREATE TABLE RFQHeaders (
    RFQHeaderID INT IDENTITY(1,1) PRIMARY KEY,
    RFQNumber   NVARCHAR(50)  NOT NULL UNIQUE,
    ProjectID   INT           NOT NULL REFERENCES Projects(ProjectID),
    Title       NVARCHAR(255) NOT NULL,
    RFQDate     DATE          NOT NULL,
    DueDate     DATE          NULL,
    Status      NVARCHAR(20)  NOT NULL DEFAULT 'Draft',
    Notes       NVARCHAR(MAX) NULL,
    ChangedBy   NVARCHAR(128) NULL,
    ChangeDate  DATETIME      NULL
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'RFQLines' AND type = 'U')
BEGIN
  CREATE TABLE RFQLines (
    RFQLineID   INT IDENTITY(1,1) PRIMARY KEY,
    RFQHeaderID INT           NOT NULL REFERENCES RFQHeaders(RFQHeaderID) ON DELETE CASCADE,
    BOQItemID   INT           NULL REFERENCES BOQItems(BOQItemID),
    Description NVARCHAR(MAX) NOT NULL,
    Unit        NVARCHAR(50)  NULL,
    Quantity    DECIMAL(18,4) NOT NULL DEFAULT 1,
    Notes       NVARCHAR(MAX) NULL
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'RFQVendorQuotes' AND type = 'U')
BEGIN
  CREATE TABLE RFQVendorQuotes (
    QuoteID     INT IDENTITY(1,1) PRIMARY KEY,
    RFQHeaderID INT           NOT NULL REFERENCES RFQHeaders(RFQHeaderID),
    RFQLineID   INT           NOT NULL REFERENCES RFQLines(RFQLineID),
    VendorID    INT           NOT NULL REFERENCES Vendors(VendorID),
    QuoteDate   DATE          NULL,
    UnitPrice   DECIMAL(18,4) NOT NULL DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    DeliveryDays INT          NULL,
    Notes       NVARCHAR(MAX) NULL,
    IsAwarded   BIT           NOT NULL DEFAULT 0,
    ChangedBy   NVARCHAR(128) NULL,
    ChangeDate  DATETIME      NULL
  );
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. GRN / Inward Gate Pass
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'GRNHeaders' AND type = 'U')
BEGIN
  CREATE TABLE GRNHeaders (
    GRNHeaderID    INT IDENTITY(1,1) PRIMARY KEY,
    GRNNumber      NVARCHAR(50)  NOT NULL UNIQUE,
    POHeaderID     INT           NOT NULL REFERENCES PurchaseOrders(PurchaseOrderID),
    ProjectID      INT           NOT NULL REFERENCES Projects(ProjectID),
    GRNDate        DATE          NOT NULL,
    VehicleNo      NVARCHAR(50)  NULL,
    DriverName     NVARCHAR(255) NULL,
    DeliveryNoteNo NVARCHAR(100) NULL,
    StoreLocation  NVARCHAR(255) NULL,
    ReceivedBy     NVARCHAR(255) NULL,
    Status         NVARCHAR(20)  NOT NULL DEFAULT 'Draft',
    Notes          NVARCHAR(MAX) NULL,
    ChangedBy      NVARCHAR(128) NULL,
    ChangeDate     DATETIME      NULL
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'GRNLines' AND type = 'U')
BEGIN
  CREATE TABLE GRNLines (
    GRNLineID             INT IDENTITY(1,1) PRIMARY KEY,
    GRNHeaderID           INT           NOT NULL REFERENCES GRNHeaders(GRNHeaderID) ON DELETE CASCADE,
    POLineID              INT           NOT NULL REFERENCES PurchaseOrderItems(LineID),
    Description           NVARCHAR(MAX) NOT NULL,
    Unit                  NVARCHAR(50)  NULL,
    OrderedQty            DECIMAL(18,4) NOT NULL DEFAULT 0,
    PreviouslyReceivedQty DECIMAL(18,4) NOT NULL DEFAULT 0,
    ThisReceiptQty        DECIMAL(18,4) NOT NULL DEFAULT 0,
    Notes                 NVARCHAR(MAX) NULL
  );
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Vendor Bills
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'VendorBills' AND type = 'U')
BEGIN
  CREATE TABLE VendorBills (
    VendorBillID INT IDENTITY(1,1) PRIMARY KEY,
    GRNHeaderID  INT           NOT NULL REFERENCES GRNHeaders(GRNHeaderID),
    VendorID     INT           NULL REFERENCES Vendors(VendorID),
    BillNumber   NVARCHAR(100) NOT NULL,
    BillDate     DATE          NOT NULL,
    DueDate      DATE          NULL,
    Amount       DECIMAL(18,2) NOT NULL DEFAULT 0,
    VATAmount    DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalAmount  DECIMAL(18,2) NOT NULL DEFAULT 0,
    Status       NVARCHAR(20)  NOT NULL DEFAULT 'Pending',
    Notes        NVARCHAR(MAX) NULL,
    ChangedBy    NVARCHAR(128) NULL,
    ChangeDate   DATETIME      NULL
  );
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. QC Inspections
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'QCInspections' AND type = 'U')
BEGIN
  CREATE TABLE QCInspections (
    QCInspectionID INT IDENTITY(1,1) PRIMARY KEY,
    GRNHeaderID    INT           NOT NULL REFERENCES GRNHeaders(GRNHeaderID),
    InspectionDate DATE          NOT NULL,
    InspectedBy    NVARCHAR(255) NULL,
    Status         NVARCHAR(20)  NOT NULL DEFAULT 'Pending',
    Notes          NVARCHAR(MAX) NULL,
    ChangedBy      NVARCHAR(128) NULL,
    ChangeDate     DATETIME      NULL
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'QCInspectionLines' AND type = 'U')
BEGIN
  CREATE TABLE QCInspectionLines (
    QCLineID       INT IDENTITY(1,1) PRIMARY KEY,
    QCInspectionID INT           NOT NULL REFERENCES QCInspections(QCInspectionID) ON DELETE CASCADE,
    GRNLineID      INT           NOT NULL REFERENCES GRNLines(GRNLineID),
    InspectedQty   DECIMAL(18,4) NOT NULL DEFAULT 0,
    AcceptedQty    DECIMAL(18,4) NOT NULL DEFAULT 0,
    RejectedQty    DECIMAL(18,4) NOT NULL DEFAULT 0,
    Decision       NVARCHAR(30)  NOT NULL DEFAULT 'Pending',
    RejectionReason NVARCHAR(MAX) NULL,
    Notes          NVARCHAR(MAX) NULL
  );
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Store Stock
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'StoreStock' AND type = 'U')
BEGIN
  CREATE TABLE StoreStock (
    StockID         INT IDENTITY(1,1) PRIMARY KEY,
    ProjectID       INT           NOT NULL REFERENCES Projects(ProjectID),
    ItemCode        NVARCHAR(100) NULL,
    ItemDescription NVARCHAR(MAX) NOT NULL,
    Unit            NVARCHAR(50)  NULL,
    CurrentQty      DECIMAL(18,4) NOT NULL DEFAULT 0,
    MinStockLevel   DECIMAL(18,4) NOT NULL DEFAULT 0,
    UnitCost        DECIMAL(18,4) NOT NULL DEFAULT 0,
    TotalValue      DECIMAL(18,2) NOT NULL DEFAULT 0,
    LastReceiptDate DATE          NULL,
    LastIssueDate   DATE          NULL,
    ChangedBy       NVARCHAR(128) NULL,
    ChangeDate      DATETIME      NULL
  );
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Material Issue / Delivery Challan
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'MaterialIssueHeaders' AND type = 'U')
BEGIN
  CREATE TABLE MaterialIssueHeaders (
    IssueHeaderID INT IDENTITY(1,1) PRIMARY KEY,
    DCNumber      NVARCHAR(50)  NOT NULL UNIQUE,
    ProjectID     INT           NOT NULL REFERENCES Projects(ProjectID),
    FromStore     NVARCHAR(255) NULL,
    ToSite        NVARCHAR(255) NULL,
    IssueDate     DATE          NOT NULL,
    RequestedBy   NVARCHAR(255) NULL,
    IssuedBy      NVARCHAR(255) NULL,
    AuthorizedBy  NVARCHAR(255) NULL,
    Status        NVARCHAR(20)  NOT NULL DEFAULT 'Draft',
    Notes         NVARCHAR(MAX) NULL,
    ChangedBy     NVARCHAR(128) NULL,
    ChangeDate    DATETIME      NULL
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'MaterialIssueLines' AND type = 'U')
BEGIN
  CREATE TABLE MaterialIssueLines (
    IssueLineID   INT IDENTITY(1,1) PRIMARY KEY,
    IssueHeaderID INT           NOT NULL REFERENCES MaterialIssueHeaders(IssueHeaderID) ON DELETE CASCADE,
    StockID       INT           NOT NULL REFERENCES StoreStock(StockID),
    Description   NVARCHAR(MAX) NOT NULL,
    Unit          NVARCHAR(50)  NULL,
    RequestedQty  DECIMAL(18,4) NOT NULL DEFAULT 0,
    IssuedQty     DECIMAL(18,4) NOT NULL DEFAULT 0,
    UnitCost      DECIMAL(18,4) NOT NULL DEFAULT 0,
    TotalCost     DECIMAL(18,2) NOT NULL DEFAULT 0
  );
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Vendor Payments
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'VendorPayments' AND type = 'U')
BEGIN
  CREATE TABLE VendorPayments (
    VendorPaymentID INT IDENTITY(1,1) PRIMARY KEY,
    VendorID        INT           NOT NULL REFERENCES Vendors(VendorID),
    VendorBillID    INT           NULL REFERENCES VendorBills(VendorBillID),
    POHeaderID      INT           NULL REFERENCES PurchaseOrders(PurchaseOrderID),
    PaymentDate     DATE          NOT NULL,
    PaymentType     NVARCHAR(20)  NOT NULL DEFAULT 'FinalPayment',
    Amount          DECIMAL(18,2) NOT NULL DEFAULT 0,
    PaymentMethod   NVARCHAR(20)  NOT NULL DEFAULT 'BankTransfer',
    ReferenceNo     NVARCHAR(100) NULL,
    Notes           NVARCHAR(MAX) NULL,
    ChangedBy       NVARCHAR(128) NULL,
    ChangeDate      DATETIME      NULL
  );
END
GO

PRINT 'v3.6 migration complete — 15 tables created/altered';
GO
