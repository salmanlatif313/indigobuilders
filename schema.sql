-- =============================================================================
-- IndigoBuilders ERP — Master Database Schema
-- Database: IndigoBuilders
-- Compliance: ZATCA Phase 2 | MHRSD WPS v3.1 | GOSI
-- =============================================================================

USE IndigoBuilders;
GO

-- =============================================================================
-- ROLES
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Roles')
CREATE TABLE Roles (
    RoleID   INT PRIMARY KEY IDENTITY(1,1),
    RoleName NVARCHAR(50) NOT NULL UNIQUE
);
GO

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Admin')
    INSERT INTO Roles (RoleName) VALUES ('Admin'), ('Finance'), ('PM'), ('Engineer');
GO

-- =============================================================================
-- USERS
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
CREATE TABLE Users (
    UserID        INT PRIMARY KEY IDENTITY(1,1),
    Username      NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash  NVARCHAR(MAX) NOT NULL,
    FullName      NVARCHAR(150),
    Email         NVARCHAR(200),
    RoleID        INT NOT NULL REFERENCES Roles(RoleID),
    IsActive      BIT DEFAULT 1,
    Notes         NVARCHAR(MAX),
    ChangedBy     NVARCHAR(128),
    ChangeDate    DATETIME DEFAULT GETDATE()
);
GO

-- Default admin: username=admin  password=Admin@123
-- Hash generated with bcrypt cost 12
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'admin')
    INSERT INTO Users (Username, PasswordHash, FullName, Email, RoleID, IsActive)
    VALUES (
        'admin',
        '$2a$12$8hIFlCWw0hHEuiOQPqOnsOW7c5qb8IUWUwwCj9Q/BK81U4jxLixvO',
        'System Administrator',
        'admin@indigobuilders.sa',
        1,
        1
    );
GO

-- =============================================================================
-- PROJECTS
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Projects')
CREATE TABLE Projects (
    ProjectID        INT PRIMARY KEY IDENTITY(1,1),
    ProjectCode      NVARCHAR(50) NOT NULL UNIQUE,
    ProjectName      NVARCHAR(200) NOT NULL,
    ClientName       NVARCHAR(200),
    ContractValue    DECIMAL(18,2) DEFAULT 0,
    StartDate        DATE,
    EndDate          DATE,
    Status           NVARCHAR(30) DEFAULT 'Active',
    Location         NVARCHAR(300),
    ManagerUserID    INT REFERENCES Users(UserID),
    Notes            NVARCHAR(MAX),
    ChangedBy        NVARCHAR(128),
    ChangeDate       DATETIME DEFAULT GETDATE()
);
GO

-- =============================================================================
-- LABOR (MHRSD WPS v3.1 Compliant)
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Labor')
CREATE TABLE Labor (
    LaborID              INT PRIMARY KEY IDENTITY(1,1),
    IqamaNumber          NVARCHAR(15) NOT NULL UNIQUE,
    FullName             NVARCHAR(200) NOT NULL,
    FullNameAr           NVARCHAR(200),
    NationalityCode      CHAR(3) NOT NULL,
    IBAN                 NVARCHAR(34) NOT NULL,
    BankCode             NVARCHAR(10),
    BasicSalary          DECIMAL(18,2) NOT NULL,
    HousingAllowance     DECIMAL(18,2) DEFAULT 0,
    TransportAllowance   DECIMAL(18,2) DEFAULT 0,
    OtherAllowances      DECIMAL(18,2) DEFAULT 0,
    GOSINumber           NVARCHAR(20),
    JobTitle             NVARCHAR(100),
    ProjectID            INT REFERENCES Projects(ProjectID),
    IqamaExpiry          DATE,
    IsActive             BIT DEFAULT 1,
    Notes                NVARCHAR(MAX),
    ChangedBy            NVARCHAR(128),
    ChangeDate           DATETIME DEFAULT GETDATE()
);
GO

-- =============================================================================
-- WPS PAYROLL RUNS
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WPS_PayrollRuns')
CREATE TABLE WPS_PayrollRuns (
    RunID          INT PRIMARY KEY IDENTITY(1,1),
    PayrollMonth   CHAR(7) NOT NULL,
    GeneratedDate  DATETIME DEFAULT GETDATE(),
    GeneratedBy    NVARCHAR(128),
    SIFFileName    NVARCHAR(300),
    TotalLabor     INT DEFAULT 0,
    TotalAmount    DECIMAL(18,2) DEFAULT 0,
    Status         NVARCHAR(30) DEFAULT 'Draft',
    Notes          NVARCHAR(MAX),
    ChangedBy      NVARCHAR(128),
    ChangeDate     DATETIME DEFAULT GETDATE()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'WPS_PayrollLines')
CREATE TABLE WPS_PayrollLines (
    LineID              INT PRIMARY KEY IDENTITY(1,1),
    RunID               INT NOT NULL REFERENCES WPS_PayrollRuns(RunID),
    LaborID             INT NOT NULL REFERENCES Labor(LaborID),
    BasicSalary         DECIMAL(18,2) NOT NULL,
    HousingAllowance    DECIMAL(18,2) DEFAULT 0,
    TransportAllowance  DECIMAL(18,2) DEFAULT 0,
    OtherAllowances     DECIMAL(18,2) DEFAULT 0,
    Deductions          DECIMAL(18,2) DEFAULT 0,
    NetSalary           DECIMAL(18,2) NOT NULL,
    WorkingDays         INT DEFAULT 30
);
GO

-- =============================================================================
-- INVOICES (ZATCA Phase 2)
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Invoices')
CREATE TABLE Invoices (
    InvoiceID         INT PRIMARY KEY IDENTITY(1,1),
    InvoiceNumber     NVARCHAR(50) NOT NULL UNIQUE,
    InvoiceType       NVARCHAR(20) DEFAULT 'Standard',
    ProjectID         INT REFERENCES Projects(ProjectID),
    ClientName        NVARCHAR(200),
    ClientVAT         NVARCHAR(20),
    ClientAddress     NVARCHAR(500),
    InvoiceDate       DATE NOT NULL,
    SupplyDate        DATE,
    DueDate           DATE,
    SubTotal          DECIMAL(18,2) DEFAULT 0,
    VATRate           DECIMAL(5,2)  DEFAULT 15.00,
    VATAmount         DECIMAL(18,2) DEFAULT 0,
    RetentionRate     DECIMAL(5,2)  DEFAULT 0,
    RetentionAmount   DECIMAL(18,2) DEFAULT 0,
    TotalAmount       DECIMAL(18,2) DEFAULT 0,
    ZatcaStatus       NVARCHAR(20)  DEFAULT 'Draft',
    ZatcaQRCode       NVARCHAR(MAX),
    ZatcaXML          XML,
    ZatcaUUID         NVARCHAR(36),
    Notes             NVARCHAR(MAX),
    ChangedBy         NVARCHAR(128),
    ChangeDate        DATETIME DEFAULT GETDATE()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InvoiceItems')
CREATE TABLE InvoiceItems (
    ItemID        INT PRIMARY KEY IDENTITY(1,1),
    InvoiceID     INT NOT NULL REFERENCES Invoices(InvoiceID) ON DELETE CASCADE,
    Description   NVARCHAR(500) NOT NULL,
    Quantity      DECIMAL(18,4) DEFAULT 1,
    UnitPrice     DECIMAL(18,2) NOT NULL,
    Discount      DECIMAL(18,2) DEFAULT 0,
    VATRate       DECIMAL(5,2)  DEFAULT 15.00,
    LineTotal     DECIMAL(18,2) NOT NULL
);
GO

-- =============================================================================
-- PROJECT EXPENSES
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProjectExpenses')
CREATE TABLE ProjectExpenses (
    ExpenseID     INT PRIMARY KEY IDENTITY(1,1),
    ProjectID     INT REFERENCES Projects(ProjectID),
    ExpenseDate   DATE NOT NULL,
    Category      NVARCHAR(50) NOT NULL,   -- Materials | Equipment | Subcontractor | Labor | Transport | Other
    Description   NVARCHAR(500) NOT NULL,
    Amount        DECIMAL(18,2) NOT NULL,
    VATAmount     DECIMAL(18,2) DEFAULT 0,
    Vendor        NVARCHAR(200),
    ReferenceNo   NVARCHAR(100),
    Notes         NVARCHAR(MAX),
    ChangedBy     NVARCHAR(128),
    ChangeDate    DATETIME DEFAULT GETDATE()
);
GO

-- =============================================================================
-- INVOICE PAYMENTS
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InvoicePayments')
CREATE TABLE InvoicePayments (
    PaymentID     INT PRIMARY KEY IDENTITY(1,1),
    InvoiceID     INT NOT NULL REFERENCES Invoices(InvoiceID) ON DELETE CASCADE,
    PaymentDate   DATE NOT NULL,
    Amount        DECIMAL(18,2) NOT NULL,
    PaymentMethod NVARCHAR(50) DEFAULT 'BankTransfer',  -- BankTransfer, Cheque, Cash, Online
    Reference     NVARCHAR(200),
    Notes         NVARCHAR(MAX),
    ChangedBy     NVARCHAR(128),
    ChangeDate    DATETIME DEFAULT GETDATE()
);
GO

-- =============================================================================
-- VIEWS
-- =============================================================================
CREATE OR ALTER VIEW View_LaborSummary AS
SELECT
    l.LaborID, l.IqamaNumber, l.FullName, l.FullNameAr,
    l.NationalityCode, l.JobTitle,
    l.BasicSalary, l.HousingAllowance, l.TransportAllowance, l.OtherAllowances,
    (l.BasicSalary + l.HousingAllowance + l.TransportAllowance + l.OtherAllowances) AS GrossSalary,
    l.IBAN, l.BankCode, l.GOSINumber, l.IqamaExpiry, l.IsActive,
    p.ProjectName, p.ProjectCode
FROM Labor l
LEFT JOIN Projects p ON p.ProjectID = l.ProjectID;
GO

CREATE OR ALTER VIEW View_InvoiceSummary AS
SELECT
    i.InvoiceID, i.InvoiceNumber, i.InvoiceType,
    i.InvoiceDate, i.DueDate, i.ClientName, i.ClientVAT,
    i.SubTotal, i.VATAmount, i.RetentionAmount, i.TotalAmount,
    ISNULL((SELECT SUM(py.Amount) FROM InvoicePayments py WHERE py.InvoiceID = i.InvoiceID), 0) AS TotalPaid,
    i.TotalAmount - ISNULL((SELECT SUM(py.Amount) FROM InvoicePayments py WHERE py.InvoiceID = i.InvoiceID), 0) AS BalanceDue,
    i.ZatcaStatus, i.ZatcaUUID,
    p.ProjectName, p.ProjectCode
FROM Invoices i
LEFT JOIN Projects p ON p.ProjectID = i.ProjectID;
GO

CREATE OR ALTER VIEW View_ProjectSummary AS
SELECT
    p.ProjectID, p.ProjectCode, p.ProjectName, p.ClientName,
    p.ContractValue, p.StartDate, p.EndDate, p.Status, p.Location,
    u.FullName AS ManagerName,
    (SELECT COUNT(*) FROM Labor l WHERE l.ProjectID = p.ProjectID AND l.IsActive = 1) AS ActiveLabor,
    (SELECT COUNT(*) FROM Invoices i WHERE i.ProjectID = p.ProjectID) AS InvoiceCount,
    (SELECT ISNULL(SUM(i.TotalAmount), 0) FROM Invoices i
     WHERE i.ProjectID = p.ProjectID AND i.ZatcaStatus <> 'Rejected') AS TotalInvoiced,
    (SELECT ISNULL(SUM(e.Amount + e.VATAmount), 0) FROM ProjectExpenses e
     WHERE e.ProjectID = p.ProjectID) AS TotalExpenses
FROM Projects p
LEFT JOIN Users u ON u.UserID = p.ManagerUserID;
GO

-- =============================================================================
-- INDEXES
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Labor_IqamaNumber')
    CREATE UNIQUE INDEX IX_Labor_IqamaNumber ON Labor(IqamaNumber);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invoices_Number')
    CREATE UNIQUE INDEX IX_Invoices_Number ON Invoices(InvoiceNumber);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invoices_ProjectID')
    CREATE INDEX IX_Invoices_ProjectID ON Invoices(ProjectID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Labor_ProjectID')
    CREATE INDEX IX_Labor_ProjectID ON Labor(ProjectID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WPS_Lines_RunID')
    CREATE INDEX IX_WPS_Lines_RunID ON WPS_PayrollLines(RunID);
GO

PRINT 'IndigoBuilders ERP schema applied successfully.';
GO
