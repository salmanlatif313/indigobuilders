-- =============================================================================
-- IndigoBuilders ERP — Purchase Orders Bulk Seed (generates up to 150 total)
-- Run: sqlcmd -S 172.1.10.43 -U sa -P "L@hor3butUS4" -d IndigoBuilders -i "C:\Projects\IndigoBuilders\seed_po_bulk.sql"
-- =============================================================================

USE IndigoBuilders;
GO

SET NOCOUNT ON;

-- ── Lookup tables (in-memory) ──────────────────────────────────────────────────
DECLARE @Projects TABLE (n INT IDENTITY(1,1), ProjectID INT, ProjectCode NVARCHAR(50));
INSERT INTO @Projects (ProjectID, ProjectCode)
SELECT TOP 15 ProjectID, ProjectCode FROM Projects ORDER BY ProjectID;

DECLARE @ProjectCount INT = (SELECT COUNT(*) FROM @Projects);

-- Vendor pool
DECLARE @Vendors TABLE (n INT IDENTITY(1,1), VendorName NVARCHAR(200), VendorEmail NVARCHAR(200), VendorPhone NVARCHAR(50), VendorVAT NVARCHAR(20), VendorAddress NVARCHAR(200), Category NVARCHAR(50));
INSERT INTO @Vendors VALUES
('Al-Matar Building Materials',       'orders@almatar-bm.sa',             '+966-11-4441234','3001234567890001','Riyadh, 2nd Industrial City',       'Materials'),
('Arabian Cement Company',            'supply@arabcement.sa',              '+966-12-6665555','3009876543210001','Jeddah, Port Area',                 'Materials'),
('Gulf Tiles & Ceramics',             'export@gulftiles.sa',               '+966-13-5554444','3005554441987654','Al-Khobar, Trade Center Road',       'Materials'),
('National Paints KSA',               'trade@nationalpaint-ksa.com',       '+966-2-5553333', '3003333551234567','Makkah, Aziziyah Industrial',        'Materials'),
('Rebar & Wire Products KSA',         'sales@rebarwire.sa',                '+966-11-3334444','3003334441234568','Riyadh, Sulay District',             'Materials'),
('Saudi Asphalt & Paving Co.',        'projects@saudiasphalt.sa',          '+966-14-6669999','3006669991234567','Madinah, Contractors Zone',          'Materials'),
('Gulf Waterproofing Systems',        'contracts@gulfwaterproof.sa',       '+966-3-5554444', '3005554441234568','Dammam, Al-Aziziyah Road',           'Materials'),
('SATCO Scaffolding Systems',         'hire@satco-scaffold.sa',            '+966-3-8887777', '3008887776543210','Dammam, Port Industrial Area',       'Equipment'),
('Heavy Equipment Rentals Arabia',    'fleet@hearabia.sa',                 '+966-14-1112222','3001112221234567','Madinah, Heavy Industry Zone',       'Equipment'),
('Formwork Solutions Arabia',         'enquiry@formworkarabia.sa',         '+966-11-6665555','3006665551234567','Riyadh, Airport Road',               'Equipment'),
('Concrete Pumping Services Arabia',  'dispatch@concretepumping.sa',       '+966-11-5556666','3005556661234567','Riyadh, Salama District',            'Equipment'),
('Crane Arabia Heavy Lift',           'ops@cranearabia.sa',                '+966-13-7778888','3007778881234569','Al-Khobar, Industrial City',         'Equipment'),
('Riyadh Electrical Supplies',        'supply@riyadelec.sa',               '+966-11-2221111','3002221119876543','Riyadh, Malaz District',             'Subcontractor'),
('Schneider Electric Saudi Arabia',   'orders-ksa@schneider-electric.com', '+966-12-4445555','3004445551234567','Jeddah, Tahlia Street',              'Subcontractor'),
('Siemens Building Technologies KSA', 'buildings.sa@siemens.com',          '+966-13-8889999','3001112223334445','Al-Khobar, King Abdul Aziz Road',    'Subcontractor'),
('ABB Saudi Arabia',                  'sales.sa@abb.com',                  '+966-11-2223333','3002223331234567','Riyadh, Olaya District',             'Subcontractor'),
('Saudi Road Safety Equipment',       'sales@saudiroadequip.sa',           '+966-14-7778888','3007778881234567','Madinah, Industrial Zone',           'Subcontractor'),
('International HVAC Systems',        'projects@ihvacksa.com',             '+966-13-3332222','3003332221234567','Al-Khobar, Dhahran Road',            'Subcontractor'),
('Jeddah Plumbing Merchants',         'orders@jeddahplumbing.sa',          '+966-12-3334444','3003334441234567','Jeddah, Khalid Ibn Al-Waleed St',    'Subcontractor'),
('Zahrani Glass & Aluminium',         'quotes@zahraniglass.sa',            '+966-11-9998888','3009998881234567','Riyadh, Al-Urouba Road',             'Materials'),
('Saudi Elevator & Escalator Co.',    'contracts@saudielevatorksa.sa',     '+966-2-6667777', '3006667771234567','Makkah, Al-Shoqiyah Road',           'Subcontractor'),
('Thermal Insulation Supplies KSA',   'sales@thermalins.sa',               '+966-13-2221111','3002221111234567','Al-Khobar, Aramco Road',             'Materials'),
('Safety Equipment Arabia',           'ppe@safetyarabia.sa',               '+966-13-4443333','3004443331234567','Al-Khobar, Industrial District',     'Labor'),
('Al-Rajhi Construction Supplies',    'supply@alrajhiconstruct.sa',        '+966-11-8889999','3008889991234567','Riyadh, Al-Suwaidi District',        'Materials'),
('Bin Laden Ready-Mix',               'readymix@ssbg.sa',                  '+966-2-7776666', '3007776661234567','Jeddah, Al-Balad',                   'Materials'),
('Arabian Hardware & Tools',          'sales@arabianhardware.sa',          '+966-11-6667777','3006667771234568','Riyadh, Batha District',             'Materials'),
('Gulf Survey & Instruments',         'instruments@gulfsurvey.sa',         '+966-13-5556666','3005556661234568','Al-Khobar, Corniche Road',           'Equipment'),
('Madinah Steel Fabricators',         'fab@madinahsteel.sa',               '+966-14-4445555','3004445551234568','Madinah, Steel Market',             'Materials'),
('KSA Fire Protection Systems',       'contracts@ksafireprotect.sa',       '+966-11-3335555','3003335551234567','Riyadh, Al-Malqa District',          'Subcontractor'),
('Eastern Province Carpentry',        'wood@epcarpentry.sa',               '+966-3-6667777', '3006667771234569','Dammam, Al-Nuzha District',          'Subcontractor');

DECLARE @VendorCount INT = (SELECT COUNT(*) FROM @Vendors);

-- Item description pools by category
DECLARE @Items TABLE (n INT IDENTITY(1,1), Category NVARCHAR(50), Desc1 NVARCHAR(200), Desc2 NVARCHAR(200), Desc3 NVARCHAR(200), Price1 DECIMAL(18,2), Price2 DECIMAL(18,2), Price3 DECIMAL(18,2));
INSERT INTO @Items VALUES
('Materials','Portland Cement (50kg bag)','Sand Filling (m³)','Coarse Aggregate 20mm (m³)',28.00,45.00,55.00),
('Materials','Hollow Block 200mm (per unit)','Plaster Sand (tonne)','Building Lime (25kg bag)',3.50,38.00,18.00),
('Materials','Rebar Y10 (tonne)','Rebar Y12 (tonne)','Binding Wire (kg)',1200.00,1350.00,8.50),
('Materials','Ceramic Floor Tile 40x40 (m²)','Wall Tile 30x60 (m²)','Tile Grout (5kg bag)',22.00,28.00,15.00),
('Materials','UPVC Pipe 110mm (6m)','UPVC Elbow 110mm','UPVC Coupling 110mm',85.00,12.00,8.00),
('Materials','Electrical Cable 6mm² (100m)','Electrical Cable 4mm² (100m)','Junction Box (per unit)',180.00,140.00,12.00),
('Materials','Plasterboard 12.5mm (sheet)','Metal Stud 92mm (3m)','Joint Compound (20kg)',32.00,18.00,22.00),
('Materials','Waterproof Membrane (m²)','Bitumen Primer (20L)','Drainage Board (m²)',85.00,95.00,45.00),
('Equipment','Excavator Hire CAT 308 (day)','Loader Hire (day)','Compactor Hire (day)',2800.00,2200.00,1200.00),
('Equipment','Scaffolding Hire (week)','Tower Scaffold (week)','Scissor Lift Hire (day)',7500.00,4500.00,1800.00),
('Equipment','Generator 100kVA (month)','Lighting Tower (month)','Air Compressor (month)',4500.00,1800.00,2200.00),
('Equipment','Concrete Mixer 350L (month)','Vibrator Poker (month)','Laser Level (month)',1200.00,450.00,380.00),
('Subcontractor','Electrical Rough-in (m²)','Plumbing Rough-in (m²)','AC Duct Installation (m²)',85.00,75.00,65.00),
('Subcontractor','Plastering Works (m²)','Tiling Works (m²)','Painting Works (m²)',45.00,55.00,25.00),
('Subcontractor','Steel Fabrication (kg)','Welding Works (lm)','Structural Inspection',18.00,35.00,2500.00),
('Labor','Skilled Mason (day)','General Labour (day)','Site Foreman (day)',280.00,180.00,350.00);

DECLARE @ItemCount INT = (SELECT COUNT(*) FROM @Items);

-- Status distribution: 30 Draft, 25 PendingApproval, 40 Approved, 35 Delivered, 10 Cancelled, 10 Rejected
DECLARE @StatusPool TABLE (n INT IDENTITY(1,1), Status NVARCHAR(30), ApproverRequired BIT);
INSERT INTO @StatusPool VALUES
('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),
('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),
('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),('Draft',0),
('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),
('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),
('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),
('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),
('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),('PendingApproval',0),
('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),
('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),
('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),
('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),
('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),('Approved',1),
('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),
('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),
('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),
('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),('Delivered',1),
('Delivered',1),('Delivered',1),('Delivered',1),
('Cancelled',0),('Cancelled',0),('Cancelled',0),('Cancelled',0),('Cancelled',0),
('Cancelled',0),('Cancelled',0),('Cancelled',0),('Cancelled',0),('Cancelled',0),
('Rejected',1),('Rejected',1),('Rejected',1),('Rejected',1),('Rejected',1),
('Rejected',1),('Rejected',1),('Rejected',1),('Rejected',1),('Rejected',1);

DECLARE @StatusCount INT = (SELECT COUNT(*) FROM @StatusPool);

DECLARE @PaymentTerms TABLE (n INT IDENTITY(1,1), Terms NVARCHAR(100));
INSERT INTO @PaymentTerms VALUES ('Net 15'),('Net 30'),('Net 45'),('Net 60'),('Net 60 EOM'),('30% advance, 70% on delivery'),('Monthly billing'),('Per milestone'),('COD');

DECLARE @PTermsCount INT = (SELECT COUNT(*) FROM @PaymentTerms);

-- ── Generation loop ────────────────────────────────────────────────────────────
DECLARE @Target    INT = 150;
DECLARE @Existing  INT = (SELECT COUNT(*) FROM PurchaseOrders);
DECLARE @ToInsert  INT = @Target - @Existing;
DECLARE @i         INT = 1;
DECLARE @Year      INT;
DECLARE @SeqBase   INT;
DECLARE @PONum     NVARCHAR(50);
DECLARE @poId      INT;
DECLARE @pIdx      INT;
DECLARE @vIdx      INT;
DECLARE @sIdx      INT;
DECLARE @ptIdx     INT;
DECLARE @iIdx      INT;
DECLARE @status    NVARCHAR(30);
DECLARE @approver  NVARCHAR(128);
DECLARE @approveDate DATETIME;
DECLARE @projectID INT;
DECLARE @ordDate   DATE;
DECLARE @delDate   DATE;
DECLARE @subTotal  DECIMAL(18,2);
DECLARE @vatAmt    DECIMAL(18,2);
DECLARE @ship      DECIMAL(18,2);
DECLARE @total     DECIMAL(18,2);
DECLARE @q1        DECIMAL(18,4);
DECLARE @q2        DECIMAL(18,4);
DECLARE @q3        DECIMAL(18,4);
DECLARE @p1v       DECIMAL(18,2);
DECLARE @p2v       DECIMAL(18,2);
DECLARE @p3v       DECIMAL(18,2);
DECLARE @lt1       DECIMAL(18,2);
DECLARE @lt2       DECIMAL(18,2);
DECLARE @lt3       DECIMAL(18,2);
DECLARE @d1        NVARCHAR(200);
DECLARE @d2        NVARCHAR(200);
DECLARE @d3        NVARCHAR(200);
DECLARE @vn        NVARCHAR(200);
DECLARE @ve        NVARCHAR(200);
DECLARE @vp        NVARCHAR(50);
DECLARE @vv        NVARCHAR(20);
DECLARE @va        NVARCHAR(500);
DECLARE @pt        NVARCHAR(100);

WHILE @i <= @ToInsert
BEGIN
    -- Deterministic but varied selection
    SET @pIdx  = (@i % @ProjectCount)  + 1;
    SET @vIdx  = (@i % @VendorCount)   + 1;
    SET @sIdx  = (@i % @StatusCount)   + 1;
    SET @ptIdx = (@i % @PTermsCount)   + 1;
    SET @iIdx  = (@i % @ItemCount)     + 1;

    -- Year and sequence for PO number
    SET @Year    = CASE WHEN @i % 3 = 0 THEN 2025 ELSE 2026 END;
    SET @SeqBase = 100 + @i;
    SET @PONum   = 'PO-' + CAST(@Year AS NVARCHAR(4)) + '-' + RIGHT('0000' + CAST(@SeqBase AS NVARCHAR(4)), 4) + 'B';

    -- Skip if already exists
    IF EXISTS (SELECT 1 FROM PurchaseOrders WHERE PONumber = @PONum)
    BEGIN
        SET @i = @i + 1;
        CONTINUE;
    END

    -- Lookup values
    SELECT @projectID = ProjectID FROM @Projects WHERE n = @pIdx;
    SELECT @vn = VendorName, @ve = VendorEmail, @vp = VendorPhone, @vv = VendorVAT, @va = VendorAddress FROM @Vendors WHERE n = @vIdx;
    SELECT @status = Status FROM @StatusPool WHERE n = @sIdx;
    SELECT @pt = Terms FROM @PaymentTerms WHERE n = @ptIdx;
    SELECT @d1 = Desc1, @d2 = Desc2, @d3 = Desc3, @p1v = Price1, @p2v = Price2, @p3v = Price3 FROM @Items WHERE n = @iIdx;

    -- Dates — spread across 2025-2026
    SET @ordDate = DATEADD(DAY, -( (@i * 7) % 480 ), '2026-04-01');
    SET @delDate = DATEADD(DAY, 14 + (@i % 30), @ordDate);

    -- Quantities based on index
    SET @q1 = CAST(5  + (@i % 45) AS DECIMAL(18,4));
    SET @q2 = CAST(3  + (@i % 30) AS DECIMAL(18,4));
    SET @q3 = CAST(10 + (@i % 60) AS DECIMAL(18,4));

    -- Line totals
    SET @lt1 = (@q1 * @p1v) * 1.15;
    SET @lt2 = (@q2 * @p2v) * 1.15;
    SET @lt3 = (@q3 * @p3v) * 1.15;

    SET @subTotal = (@q1 * @p1v) + (@q2 * @p2v) + (@q3 * @p3v);
    SET @ship     = CASE WHEN @i % 4 = 0 THEN CAST(500 + (@i % 2000) AS DECIMAL(18,2)) ELSE 0 END;
    SET @vatAmt   = @subTotal * 0.15;
    SET @total    = @subTotal + @vatAmt + @ship;

    -- Approver for approved/delivered/rejected statuses
    IF @status IN ('Approved','Delivered','Rejected')
    BEGIN
        SET @approver    = CASE WHEN @i % 2 = 0 THEN 'Khalid Al-Otaibi' ELSE 'admin' END;
        SET @approveDate = DATEADD(DAY, 1, @ordDate);
    END
    ELSE
    BEGIN
        SET @approver    = NULL;
        SET @approveDate = NULL;
    END

    -- Insert PO header
    INSERT INTO PurchaseOrders (
        PONumber, ProjectID, VendorName, VendorEmail, VendorPhone, VendorVAT, VendorAddress,
        OrderDate, ExpectedDeliveryDate, DeliveryAddress,
        SubTotal, VATRate, VATAmount, ShippingCost, TotalAmount,
        Status, PaymentTerms, ApprovedBy, ApprovedDate, Notes, ChangedBy, ChangeDate
    ) VALUES (
        @PONum, @projectID, @vn, @ve, @vp, @vv, @va,
        @ordDate, @delDate, 'Site: ' + (SELECT ProjectCode FROM @Projects WHERE n = @pIdx),
        @subTotal, 15.00, @vatAmt, @ship, @total,
        @status, @pt, @approver, @approveDate,
        'Seed record ' + CAST(@i AS NVARCHAR(10)) + ' — ' + @vn,
        'seed', GETDATE()
    );

    SET @poId = SCOPE_IDENTITY();

    -- Insert 3 line items
    INSERT INTO PurchaseOrderItems (PurchaseOrderID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal)
    VALUES
        (@poId, @d1, @q1, @p1v, 0, 15, @lt1),
        (@poId, @d2, @q2, @p2v, 0, 15, @lt2),
        (@poId, @d3, @q3, @p3v, 0, 15, @lt3);

    SET @i = @i + 1;
END

PRINT '=== Bulk seed complete ===';
SELECT Status, COUNT(*) AS Count, CAST(SUM(TotalAmount) AS DECIMAL(18,2)) AS TotalValue
FROM PurchaseOrders GROUP BY Status ORDER BY Status;
SELECT 'Total POs' AS Label, COUNT(*) AS Count FROM PurchaseOrders;
GO
