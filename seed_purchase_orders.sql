-- =============================================================================
-- IndigoBuilders ERP — Purchase Orders Seed Data
-- Run: sqlcmd -S 172.1.10.43 -U sa -P "L@hor3butUS4" -d IndigoBuilders -i "C:\Projects\IndigoBuilders\seed_purchase_orders.sql"
-- =============================================================================

USE IndigoBuilders;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PurchaseOrders')
CREATE TABLE PurchaseOrders (
    PurchaseOrderID    INT           PRIMARY KEY IDENTITY(1,1),
    PONumber           NVARCHAR(50)  NOT NULL UNIQUE,
    ProjectID          INT           NULL REFERENCES Projects(ProjectID),
    VendorName         NVARCHAR(200) NOT NULL,
    VendorEmail        NVARCHAR(200) NULL,
    VendorPhone        NVARCHAR(50)  NULL,
    VendorVAT          NVARCHAR(20)  NULL,
    VendorAddress      NVARCHAR(500) NULL,
    OrderDate          DATE          NOT NULL DEFAULT GETDATE(),
    ExpectedDeliveryDate DATE        NULL,
    DeliveryAddress    NVARCHAR(500) NULL,
    SubTotal           DECIMAL(18,2) DEFAULT 0,
    VATRate            DECIMAL(5,2)  DEFAULT 15.00,
    VATAmount          DECIMAL(18,2) DEFAULT 0,
    ShippingCost       DECIMAL(18,2) DEFAULT 0,
    TotalAmount        DECIMAL(18,2) DEFAULT 0,
    Status             NVARCHAR(30)  DEFAULT 'Draft',
    PaymentTerms       NVARCHAR(100) NULL,
    ApprovedBy         NVARCHAR(128) NULL,
    ApprovedDate       DATETIME      NULL,
    Notes              NVARCHAR(MAX) NULL,
    ChangedBy          NVARCHAR(128) NULL,
    ChangeDate         DATETIME      DEFAULT GETDATE()
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PurchaseOrderItems')
CREATE TABLE PurchaseOrderItems (
    LineID             INT           PRIMARY KEY IDENTITY(1,1),
    PurchaseOrderID    INT           NOT NULL REFERENCES PurchaseOrders(PurchaseOrderID) ON DELETE CASCADE,
    Description        NVARCHAR(500) NOT NULL,
    Quantity           DECIMAL(18,4) DEFAULT 1,
    UnitPrice          DECIMAL(18,2) NOT NULL,
    Discount           DECIMAL(18,2) DEFAULT 0,
    VATRate            DECIMAL(5,2)  DEFAULT 15.00,
    LineTotal          DECIMAL(18,2) NOT NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PurchaseOrderApprovals')
CREATE TABLE PurchaseOrderApprovals (
    ApprovalID         INT           PRIMARY KEY IDENTITY(1,1),
    PurchaseOrderID    INT           NOT NULL REFERENCES PurchaseOrders(PurchaseOrderID),
    Token              NVARCHAR(100) NOT NULL UNIQUE,
    Action             NVARCHAR(20)  NOT NULL,
    ApproverEmail      NVARCHAR(200) NULL,
    ApproverName       NVARCHAR(200) NULL,
    ActedAt            DATETIME      NULL,
    ExpiresAt          DATETIME      NOT NULL,
    CreatedAt          DATETIME      DEFAULT GETDATE()
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PurchaseOrders_ProjectID')
    CREATE INDEX IX_PurchaseOrders_ProjectID ON PurchaseOrders(ProjectID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PurchaseOrderItems_POID')
    CREATE INDEX IX_PurchaseOrderItems_POID  ON PurchaseOrderItems(PurchaseOrderID);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_POApprovals_Token')
    CREATE INDEX IX_POApprovals_Token        ON PurchaseOrderApprovals(Token);
GO

-- =============================================================================
-- APPROVED
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0001')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0001',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-001'),'Al-Matar Building Materials','orders@almatar-bm.sa','+966-11-4441234','3001234567890001','Riyadh, 2nd Industrial City','2026-01-10','2026-01-25','Site: Riyadh, King Fahd Road',52500.00,15,7875.00,850.00,61225.00,'Approved','Net 30','Khalid Al-Otaibi','2026-01-11 09:30:00','Structural steel for tower floors 1-5','seed',GETDATE();
    DECLARE @id1 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id1,'Structural Steel Beams HEB 300',40,850.00,0,15,39100.00),
        (@id1,'Steel Column Sections UC 203x203',20,620.00,0,15,14260.00),
        (@id1,'Steel Connection Plates 20mm',50,95.00,250.00,15,5177.50);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0002')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0002',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-002'),'Arabian Cement Company','supply@arabcement.sa','+966-12-6665555','3009876543210001','Jeddah, Port Area','2026-01-12','2026-01-20','Site: Jeddah, Corniche District',18000.00,15,2700.00,0.00,20700.00,'Approved','Net 15','Khalid Al-Otaibi','2026-01-13 11:00:00','Ready-mix concrete for villa foundations','seed',GETDATE();
    DECLARE @id2 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id2,'Ready-Mix Concrete C35 (m³)',120,115.00,0,15,15870.00),
        (@id2,'Ready-Mix Concrete C25 (m³)',30,105.00,0,15,3622.50);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0003')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0003',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-005'),'Saudi Road Safety Equipment','sales@saudiroadequip.sa','+966-14-7778888','3007778881234567','Madinah, Industrial Zone','2026-01-15','2026-01-22','Site: Madinah, Northern Ring Road',34200.00,15,5130.00,1200.00,40530.00,'Approved','Net 30','admin','2026-01-16 08:45:00','Traffic management equipment for road widening Phase 1','seed',GETDATE();
    DECLARE @id3 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id3,'Traffic Cones (set of 100)',6,1800.00,0,15,12420.00),
        (@id3,'Road Barrier Water-Filled (per unit)',80,220.00,0,15,20240.00),
        (@id3,'Reflective Warning Signs',20,115.00,0,15,2645.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0004')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0004',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-006'),'Gulf Tiles & Ceramics','export@gulftiles.sa','+966-13-5554444','3005554441987654','Al-Khobar, Trade Center Road','2026-01-18','2026-02-05','Site: Al-Khobar, Prince Faisal Street',127500.00,15,19125.00,2500.00,149125.00,'Approved','Net 45','Khalid Al-Otaibi','2026-01-20 14:15:00','Floor and wall tiles for mall common areas','seed',GETDATE();
    DECLARE @id4 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id4,'Porcelain Floor Tile 60x60 (m²)',3500,28.00,5000.00,15,107825.00),
        (@id4,'Granite Skirting 10x60cm (lm)',800,22.00,0,15,20240.00),
        (@id4,'Tile Adhesive Premium (25kg bag)',250,48.00,0,15,13800.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0005')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0005',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-004'),'National Paints KSA','trade@nationalpaint-ksa.com','+966-2-5553333','3003333551234567','Makkah, Aziziyah Industrial','2026-02-01','2026-02-10','Site: Makkah, Ajyad Street',21600.00,15,3240.00,450.00,25290.00,'Approved','Net 30','admin','2026-02-02 10:30:00','Interior and exterior paints for hotel renovation','seed',GETDATE();
    DECLARE @id5 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id5,'Interior Emulsion Paint (20L)',120,85.00,0,15,11730.00),
        (@id5,'Exterior Weathershield Paint (20L)',80,110.00,0,15,10120.00),
        (@id5,'Paint Primer Alkali-Resistant (5L)',60,45.00,0,15,3105.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0013')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0013',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-007'),'Rebar & Wire Products KSA','sales@rebarwire.sa','+966-11-3334444','3003334441234568','Riyadh, Sulay District','2026-01-20','2026-02-01','Site: Riyadh',74000.00,15,11100.00,800.00,85900.00,'Approved','Net 30','admin','2026-01-21 10:00:00','seed',GETDATE();
    DECLARE @id6 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id6,'Rebar Y12 (tonne)',30,1350.00,0,15,46687.50),
        (@id6,'Rebar Y16 (tonne)',20,1380.00,0,15,31740.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0014')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0014',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-008'),'Formwork Solutions Arabia','enquiry@formworkarabia.sa','+966-11-6665555','3006665551234567','Riyadh, Airport Road','2026-01-22','2026-01-30','Site: Riyadh',39500.00,15,5925.00,0.00,45425.00,'Approved','Net 30','Khalid Al-Otaibi','2026-01-23 09:00:00','seed',GETDATE();
    DECLARE @id7 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id7,'Formwork Panel 1.2x2.4m (per unit)',200,145.00,0,15,33350.00),
        (@id7,'Formwork Props Adjustable (per unit)',150,48.00,0,15,8280.00);
END
GO

-- =============================================================================
-- DELIVERED
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2025-0087')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2025-0087',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-003'),'SATCO Scaffolding Systems','hire@satco-scaffold.sa','+966-3-8887777','3008887776543210','Dammam, Port Industrial Area','2025-08-10','2025-08-17','Site: Dammam, Industrial City',48000.00,15,7200.00,0.00,55200.00,'Delivered','Net 30','Khalid Al-Otaibi','2025-08-11 09:00:00','Scaffolding hire for warehouse steel erection — 6 weeks','seed',GETDATE();
    DECLARE @id8 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id8,'Scaffolding System Hire (per week)',6,7500.00,0,15,51750.00),
        (@id8,'Safety Netting (m²)',200,12.00,0,15,2760.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2025-0088')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2025-0088',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-001'),'Riyadh Electrical Supplies','supply@riyadelec.sa','+966-11-2221111','3002221119876543','Riyadh, Malaz District','2025-09-05','2025-09-15','Site: Riyadh, King Fahd Road',83500.00,15,12525.00,750.00,96775.00,'Delivered','Net 30','admin','2025-09-06 11:30:00','Main distribution boards and cabling for floors 1-10','seed',GETDATE();
    DECLARE @id9 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id9,'Main Distribution Board 400A',5,8500.00,0,15,48875.00),
        (@id9,'Sub Distribution Board 100A',10,2200.00,0,15,25300.00),
        (@id9,'Cable Tray Galvanised 100mm (3m)',200,85.00,0,15,19550.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2025-0091')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2025-0091',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-002'),'Jeddah Plumbing Merchants','orders@jeddahplumbing.sa','+966-12-3334444','3003334441234567','Jeddah, Khalid Ibn Al-Waleed Street','2025-10-01','2025-10-10','Site: Jeddah, Corniche District',29750.00,15,4462.50,500.00,34712.50,'Delivered','Net 15','Khalid Al-Otaibi','2025-10-02 08:00:00','Plumbing rough-in for villas 1-6','seed',GETDATE();
    DECLARE @id10 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id10,'UPVC Pipe 110mm (6m length)',120,85.00,0,15,11730.00),
        (@id10,'UPVC Pipe 50mm (6m length)',200,42.00,0,15,9660.00),
        (@id10,'Copper Pipe 22mm (3m length)',150,55.00,0,15,9487.50);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2025-0095')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2025-0095',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-005'),'Saudi Asphalt & Paving Co.','projects@saudiasphalt.sa','+966-14-6669999','3006669991234567','Madinah, Contractors Zone','2025-11-15','2025-11-25','Site: Madinah, Northern Ring Road',215000.00,15,32250.00,0.00,247250.00,'Delivered','Net 45','admin','2025-11-16 09:15:00','Asphalt laying — Km 0 to Km 4 Phase 1','seed',GETDATE();
    DECLARE @id11 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id11,'Hot Mix Asphalt AC-20 (tonnes)',800,185.00,0,15,170600.00),
        (@id11,'Tack Coat Emulsion (200L drum)',60,450.00,0,15,31050.00),
        (@id11,'Road Marking Paint (20L can)',40,240.00,0,15,11040.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2025-0098')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,ChangedBy,ChangeDate)
    SELECT 'PO-2025-0098',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-009'),'Thermal Insulation Supplies KSA','sales@thermalins.sa','+966-13-2221111','3002221111234567','Al-Khobar, Aramco Road','2025-12-01','2025-12-10','Site: Al-Khobar',41200.00,15,6180.00,600.00,47980.00,'Delivered','Net 30','admin','2025-12-02 10:30:00','seed',GETDATE();
    DECLARE @id12 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id12,'Rockwool Insulation 50mm (m²)',600,42.00,0,15,28980.00),
        (@id12,'PIR Board 75mm (m²)',200,68.00,0,15,15640.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2025-0099')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,ChangedBy,ChangeDate)
    SELECT 'PO-2025-0099',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-010'),'Safety Equipment Arabia','ppe@safetyarabia.sa','+966-13-4443333','3004443331234567','Al-Khobar, Industrial District','2025-12-05','2025-12-12','Site: Al-Khobar',15600.00,15,2340.00,350.00,18290.00,'Delivered','Net 15','Khalid Al-Otaibi','2025-12-06 08:30:00','seed',GETDATE();
    DECLARE @id13 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id13,'Safety Helmet (per unit)',100,45.00,0,15,5175.00),
        (@id13,'Hi-Vis Vest (per unit)',200,22.00,0,15,5060.00),
        (@id13,'Safety Harness Full Body',50,185.00,0,15,10637.50);
END
GO

-- =============================================================================
-- PENDING APPROVAL
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0006')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0006',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-001'),'Zahrani Glass & Aluminium','quotes@zahraniglass.sa','+966-11-9998888','3009998881234567','Riyadh, Al-Urouba Road','2026-02-10','2026-03-01','Site: Riyadh, King Fahd Road',378000.00,15,56700.00,3500.00,438200.00,'PendingApproval','Net 60','Curtain wall glazing system floors 6-20','seed',GETDATE();
    DECLARE @id14 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id14,'Structural Glazing Unit 1.2x2.4m',420,680.00,5000.00,15,325395.00),
        (@id14,'Aluminium Mullion System (lm)',850,95.00,0,15,92737.50),
        (@id14,'Silicon Sealant Structural (600ml)',300,38.00,0,15,13110.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0007')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0007',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-006'),'Siemens Building Technologies KSA','buildings.sa@siemens.com','+966-13-8889999','3001112223334445','Al-Khobar, King Abdul Aziz Road','2026-02-12','2026-03-15','Site: Al-Khobar, Prince Faisal Street',542000.00,15,81300.00,0.00,623300.00,'PendingApproval','Net 60 EOM','BMS and fire alarm system for mall','seed',GETDATE();
    DECLARE @id15 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id15,'BMS Controller Desigo CC',2,45000.00,0,15,103500.00),
        (@id15,'Fire Alarm Panel Cerberus FIT',4,28000.00,0,15,129360.00),
        (@id15,'Smoke Detector Optica (per unit)',800,380.00,0,15,349200.00),
        (@id15,'Installation & Commissioning',1,68000.00,0,15,78200.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0008')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0008',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-005'),'Heavy Equipment Rentals Arabia','fleet@hearabia.sa','+966-14-1112222','3001112221234567','Madinah, Heavy Industry Zone','2026-02-15','2026-02-20','Site: Madinah, Northern Ring Road',96000.00,15,14400.00,0.00,110400.00,'PendingApproval','Monthly billing','Excavators and graders for Phase 2 earthworks','seed',GETDATE();
    DECLARE @id16 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id16,'CAT 320 Excavator Hire (per month)',2,22000.00,0,15,50600.00),
        (@id16,'Motor Grader 140M Hire (per month)',1,18000.00,0,15,20700.00),
        (@id16,'Water Tanker 10,000L (per month)',2,8500.00,0,15,19550.00),
        (@id16,'Fuel & Lubricants Allowance',1,7500.00,0,15,8625.00);
END
GO

-- =============================================================================
-- DRAFT
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0009')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0009',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-002'),'Schneider Electric Saudi Arabia','orders-ksa@schneider-electric.com','+966-12-4445555','3004445551234567','Jeddah, Tahlia Street','2026-02-18','2026-03-10','Site: Jeddah, Corniche District',186000.00,15,27900.00,1200.00,215100.00,'Draft','Net 45','MEP panel boards and switchgear for villas','seed',GETDATE();
    DECLARE @id17 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id17,'Acti9 Consumer Unit 24-way',12,4200.00,0,15,58005.00),
        (@id17,'iC60N MCB 32A (pack of 12)',60,580.00,0,15,40020.00),
        (@id17,'RCD 63A 30mA (per unit)',48,1100.00,0,15,60720.00),
        (@id17,'RCCB 63A (per unit)',48,850.00,0,15,46920.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0010')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0010',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-004'),'Saudi Elevator & Escalator Co.','contracts@saudielevatorksa.sa','+966-2-6667777','3006667771234567','Makkah, Al-Shoqiyah Road','2026-02-20','2026-04-01','Site: Makkah, Ajyad Street',320000.00,15,48000.00,0.00,368000.00,'Draft','Net 60 milestone','4 passenger elevators and 2 service elevators','seed',GETDATE();
    DECLARE @id18 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id18,'Passenger Elevator 10-person 1m/s',4,55000.00,0,15,253000.00),
        (@id18,'Service Elevator 1600kg',2,62000.00,0,15,142600.00),
        (@id18,'Installation & Commissioning',1,45000.00,0,15,51750.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0011')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0011',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-006'),'International HVAC Systems','projects@ihvacksa.com','+966-13-3332222','3003332221234567','Al-Khobar, Dhahran Road','2026-02-22','2026-04-15','Site: Al-Khobar, Prince Faisal Street',680000.00,15,102000.00,5000.00,787000.00,'Draft','Net 90 milestone','Central HVAC system for mall — Carrier Aquaforce chillers','seed',GETDATE();
    DECLARE @id19 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id19,'Carrier Aquaforce 150RT Chiller',2,185000.00,0,15,425750.00),
        (@id19,'AHU 25,000 CFM (per unit)',8,28000.00,0,15,258160.00),
        (@id19,'FCU Cassette 3-Ton (per unit)',120,1800.00,0,15,248400.00),
        (@id19,'HVAC Controls & DDC',1,42000.00,0,15,48300.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0012')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0012',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-001'),'Concrete Pumping Services Arabia','dispatch@concretepumping.sa','+966-11-5556666','3005556661234567','Riyadh, Salama District','2026-02-24','2026-03-01','Site: Riyadh, King Fahd Road',28500.00,15,4275.00,0.00,32775.00,'Draft','Per job','Concrete pump hire for slab pours floors 11-15','seed',GETDATE();
    DECLARE @id20 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id20,'Stationary Pump Hire 52m boom (per day)',5,3800.00,0,15,21850.00),
        (@id20,'Pump Operator (per day)',5,1100.00,0,15,6325.00);
END
GO

IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0015')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0015',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-003'),'Gulf Waterproofing Systems','contracts@gulfwaterproof.sa','+966-3-5554444','3005554441234568','Dammam, Al-Aziziyah Road','2026-02-25','2026-03-08',NULL,58000.00,15,8700.00,0.00,66700.00,'Draft','Net 30','Waterproofing membrane for roof and podium deck','seed',GETDATE();
    DECLARE @id21 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id21,'Torch-on Membrane 4mm (m²)',400,95.00,0,15,43700.00),
        (@id21,'Liquid Waterproofing 20L',120,180.00,0,15,24840.00);
END
GO

-- =============================================================================
-- CANCELLED
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2025-0072')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2025-0072',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-007'),'Al-Faris Marble & Stone','export@alfarismarble.sa','+966-11-7778888','3007778881234568','Riyadh, Batha District','2025-07-10','2025-07-25',NULL,145000.00,15,21750.00,2000.00,168750.00,'Cancelled','Net 30','Cancelled — project scope change eliminated marble lobby spec','seed',GETDATE();
    DECLARE @id22 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id22,'Italian Calacatta Marble 60x60 (m²)',800,145.00,0,15,133400.00),
        (@id22,'Marble Skirting 10x60cm (lm)',400,55.00,0,15,25300.00);
END
GO

-- =============================================================================
-- REJECTED
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = 'PO-2026-0004R')
BEGIN
    INSERT INTO PurchaseOrders (PONumber,ProjectID,VendorName,VendorEmail,VendorPhone,VendorVAT,VendorAddress,OrderDate,ExpectedDeliveryDate,DeliveryAddress,SubTotal,VATRate,VATAmount,ShippingCost,TotalAmount,Status,PaymentTerms,ApprovedBy,ApprovedDate,Notes,ChangedBy,ChangeDate)
    SELECT 'PO-2026-0004R',(SELECT TOP 1 ProjectID FROM Projects WHERE ProjectCode='IB-2024-002'),'Premium Marble Imports LLC','sales@premiummarble.sa','+966-12-9990000','3009990001234567','Jeddah, Palestine Street','2026-01-28','2026-02-15','Site: Jeddah, Corniche District',290000.00,15,43500.00,3000.00,336500.00,'Rejected','Net 60','Khalid Al-Otaibi','2026-01-29 15:00:00','Rejected — budget exceeded. Resubmit with 2 alternative vendors','seed',GETDATE();
    DECLARE @id23 INT = SCOPE_IDENTITY();
    INSERT INTO PurchaseOrderItems (PurchaseOrderID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal) VALUES
        (@id23,'Imported Italian Marble Slab (m²)',500,380.00,0,15,218500.00),
        (@id23,'Marble Installation Works',1,85000.00,0,15,97750.00);
END
GO

PRINT '=== Purchase Order seed complete ===';
SELECT Status, COUNT(*) AS Count, SUM(TotalAmount) AS TotalValue
FROM PurchaseOrders GROUP BY Status ORDER BY Status;
GO
