-- =============================================================================
-- IndigoBuilders ERP — Seed Data (Mock / Demo)
-- Run: sqlcmd -S 172.1.10.43 -U sa -P "L@hor3butUS4" -d IndigoBuilders -i seed.sql
-- =============================================================================

USE IndigoBuilders;
GO

-- =============================================================================
-- USERS
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'finance1')
INSERT INTO Users (Username, PasswordHash, FullName, Email, RoleID, IsActive, ChangedBy)
VALUES ('finance1', '$2a$12$8hIFlCWw0hHEuiOQPqOnsOW7c5qb8IUWUwwCj9Q/BK81U4jxLixvO', 'Khalid Al-Otaibi', 'khalid@indigobuilders.sa', 2, 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'pm1')
INSERT INTO Users (Username, PasswordHash, FullName, Email, RoleID, IsActive, ChangedBy)
VALUES ('pm1', '$2a$12$8hIFlCWw0hHEuiOQPqOnsOW7c5qb8IUWUwwCj9Q/BK81U4jxLixvO', 'Mohammed Al-Qahtani', 'mohammed@indigobuilders.sa', 3, 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'pm2')
INSERT INTO Users (Username, PasswordHash, FullName, Email, RoleID, IsActive, ChangedBy)
VALUES ('pm2', '$2a$12$8hIFlCWw0hHEuiOQPqOnsOW7c5qb8IUWUwwCj9Q/BK81U4jxLixvO', 'Faisal Al-Ghamdi', 'faisal@indigobuilders.sa', 3, 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'eng1')
INSERT INTO Users (Username, PasswordHash, FullName, Email, RoleID, IsActive, ChangedBy)
VALUES ('eng1', '$2a$12$8hIFlCWw0hHEuiOQPqOnsOW7c5qb8IUWUwwCj9Q/BK81U4jxLixvO', 'Omar Al-Zahrani', 'omar@indigobuilders.sa', 4, 1, 'seed');
GO

-- =============================================================================
-- PROJECTS (20 items)
-- =============================================================================
DECLARE @pm1 INT = (SELECT UserID FROM Users WHERE Username = 'pm1');
DECLARE @pm2 INT = (SELECT UserID FROM Users WHERE Username = 'pm2');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2024-001')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2024-001', 'Riyadh Commercial Tower', 'Al-Rajhi Development Co.', 45000000, '2024-01-15', '2025-12-31', 'Active', 'Riyadh, King Fahd Road', @pm1, 'G+20 commercial tower with basement parking', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2024-002')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2024-002', 'Jeddah Waterfront Villas', 'Emaar Saudi Arabia', 28500000, '2024-03-01', '2025-08-31', 'Active', 'Jeddah, Corniche District', @pm2, '12 luxury villas with private pools', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2024-003')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2024-003', 'Dammam Industrial Warehouse', 'Saudi Aramco Subsidiary', 12000000, '2024-02-10', '2024-11-30', 'Completed', 'Dammam, Industrial City', @pm1, 'Steel-frame warehouse 8,000 sqm', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2024-004')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2024-004', 'Mecca Hotel Renovation', 'Makkah Hotels Group', 9800000, '2024-04-01', '2024-12-31', 'Active', 'Makkah, Ajyad Street', @pm2, 'Full interior renovation of 5-star hotel', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2024-005')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2024-005', 'Medina Road Infrastructure', 'Ministry of Municipal Affairs', 67000000, '2024-06-01', '2026-05-31', 'Active', 'Madinah, Northern Ring Road', @pm1, '12km road widening and utility relocation', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2024-006')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2024-006', 'Khobar Shopping Mall', 'Gulf Retail REIT', 38000000, '2024-05-15', '2026-01-31', 'Active', 'Al-Khobar, Prince Faisal Street', @pm2, 'Regional mall 35,000 sqm GLA', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2024-007')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2024-007', 'Abha Mountain Resort', 'Aseer Tourism Development', 55000000, '2024-07-01', '2026-06-30', 'Active', 'Abha, Al-Souda Area', @pm1, 'Eco-resort with 80 chalets', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2024-008')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2024-008', 'Tabuk Solar Plant Civil Works', 'ACWA Power', 22000000, '2024-08-01', '2025-07-31', 'Active', 'Tabuk, Desert Industrial Zone', @pm2, 'Civil and structural works for 200MW solar plant', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2024-009')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2024-009', 'Riyadh Metro Station Fit-Out', 'Arriyadh Development Authority', 18500000, '2024-09-01', '2025-06-30', 'Active', 'Riyadh, Station 14', @pm1, 'Interior fit-out and MEP for 2 metro stations', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2024-010')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2024-010', 'Jubail Residential Compound', 'SABIC Housing', 31000000, '2024-10-01', '2026-03-31', 'Active', 'Jubail Industrial City', @pm2, '120-unit staff compound', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2025-001')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2025-001', 'Neom Residential Blocks', 'NEOM Company', 120000000, '2025-01-01', '2027-12-31', 'Active', 'NEOM, Tabuk Province', @pm1, 'Phase 1 residential — 8 blocks 240 units', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2025-002')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2025-002', 'Yanbu Port Expansion', 'Saudi Ports Authority', 43000000, '2025-02-01', '2026-08-31', 'Active', 'Yanbu Commercial Port', @pm2, 'Quay wall extension and container yard', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2025-003')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2025-003', 'Qassim University Expansion', 'Qassim University', 16000000, '2025-01-15', '2026-01-14', 'Active', 'Buraydah, University City', @pm1, '4 academic buildings and lecture halls', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2025-004')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2025-004', 'Riyadh Data Center', 'STC Solutions', 29500000, '2025-03-01', '2026-02-28', 'Active', 'Riyadh, Digital City', @pm2, 'Tier-3 data center civil and MEP', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2023-011')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2023-011', 'Taif Hospital Annex', 'Ministry of Health', 8500000, '2023-06-01', '2024-05-31', 'Completed', 'Taif, King Faisal Hospital', @pm1, 'New wing — 60 beds', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2023-012')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2023-012', 'Al-Ula Heritage Village', 'Royal Commission for Al-Ula', 72000000, '2023-09-01', '2025-08-31', 'Active', 'Al-Ula, Heritage Area', @pm2, 'Heritage restoration and tourism infrastructure', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2025-005')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2025-005', 'Najran Border Facilities', 'General Directorate of Border Guards', 19000000, '2025-02-15', '2026-02-14', 'Active', 'Najran, Southern Border', @pm1, 'Administrative and residential facilities', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2025-006')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2025-006', 'Dammam Corniche Landscaping', 'Eastern Province Municipality', 5500000, '2025-03-15', '2025-11-30', 'OnHold', 'Dammam, Corniche Road', @pm2, 'Public park and promenade landscaping', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2025-007')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2025-007', 'Madinah Airport Terminal', 'Madinah Airport Authority', 88000000, '2025-04-01', '2027-03-31', 'Active', 'Madinah, Prince Mohammad bin Abdulaziz Airport', @pm1, 'Terminal C expansion — 8 gates', 'seed');

IF NOT EXISTS (SELECT 1 FROM Projects WHERE ProjectCode = 'IB-2025-008')
INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, ChangedBy)
VALUES ('IB-2025-008', 'Riyadh Desalination Plant', 'Saline Water Conversion Corp.', 34000000, '2025-05-01', '2026-10-31', 'Active', 'Riyadh, Southern Industrial', @pm2, 'Civil works for 150,000 m3/day plant', 'seed');
GO

-- =============================================================================
-- LABOR (20 employees)
-- =============================================================================
DECLARE @p1 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-001');
DECLARE @p2 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-002');
DECLARE @p3 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-005');
DECLARE @p4 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-006');
DECLARE @p5 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2025-001');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2385671049123')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2385671049123', 'Ahmed Al-Harbi', N'أحمد الحربي', 'SAU', 'SA0380000000608010167519', 'RJHI', 8000, 3200, 800, 0, 'G-10234567', 'Senior Civil Engineer', @p1, '2026-06-30', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '1098234567890')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('1098234567890', 'Tariq Al-Mutairi', N'طارق المطيري', 'SAU', 'SA4420000001234567891234', 'ANB', 7500, 3000, 800, 500, 'G-10876543', 'Project Supervisor', @p2, '2027-03-15', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2471839204756')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2471839204756', 'Muhammad Nawaz', N'محمد نواز', 'OTH', 'SA2550000000200502810015', 'SABB', 4500, 1500, 500, 0, NULL, 'Carpenter', @p1, '2026-08-20', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2183746509234')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2183746509234', 'Ramesh Kumar Sharma', N'راميش كومار', 'OTH', 'SA8980000000001234567890', 'ALBI', 3800, 1200, 400, 0, NULL, 'Mason', @p3, '2025-11-10', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2904817362058')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2904817362058', 'Badr Al-Shehri', N'بدر الشهري', 'SAU', 'SA6350000000123456789012', 'RJHI', 9500, 3800, 1000, 700, 'G-20345678', 'Safety Manager', @p5, '2027-09-01', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2637190485623')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2637190485623', 'Syed Imran Ali', N'سيد عمران علي', 'OTH', 'SA7880000000098765432109', 'SCB', 5200, 2000, 600, 200, NULL, 'Electrical Technician', @p4, '2026-12-31', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '1276438509127')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('1276438509127', 'Saleh Al-Dosari', N'صالح الدوسري', 'SAU', 'SA1760000000543219876543', 'BJAZ', 12000, 4800, 1200, 1000, 'G-30456789', 'Structural Engineer', @p3, '2027-04-30', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2758394016253')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2758394016253', 'Prabhat Singh Thakur', N'برابهات سينغ', 'OTH', 'SA0450000000321987654321', 'SABB', 4000, 1400, 400, 0, NULL, 'Steel Fixer', @p1, '2026-05-15', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2094857361204')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2094857361204', 'Rashid Al-Anazi', N'راشد العنزي', 'SAU', 'SA3890000000654321098765', 'NCB', 6800, 2720, 800, 480, 'G-40567890', 'MEP Coordinator', @p2, '2026-10-20', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2847563019284')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2847563019284', 'Waqas Mehmood', N'وقاس محمود', 'OTH', 'SA2170000000789012345678', 'RJHI', 3500, 1200, 400, 0, NULL, 'General Laborer', @p5, '2026-03-31', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '1384729503817')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('1384729503817', 'Nawaf Al-Subaie', N'نواف السبيعي', 'SAU', 'SA5570000000901234567890', 'ALBI', 11000, 4400, 1100, 900, 'G-50678901', 'Quantity Surveyor', @p4, '2027-07-31', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2583016274938')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2583016274938', 'Deepak Nair Krishnan', N'ديباك نير', 'OTH', 'SA8870000000012345678901', 'SCB', 4200, 1500, 400, 0, NULL, 'Plumber', @p3, '2025-09-30', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2019384756102')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2019384756102', 'Hamad Al-Rashidi', N'حمد الرشيدي', 'SAU', 'SA0190000000234567890123', 'ANB', 7200, 2880, 900, 420, 'G-60789012', 'Site Engineer', @p5, '2026-11-15', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2746018293847')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2746018293847', 'Suresh Babu Pillai', N'سوريش بابو', 'OTH', 'SA3510000000345678901234', 'SABB', 3800, 1300, 400, 0, NULL, 'Painter', @p1, '2026-07-01', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '1847302918475')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('1847302918475', 'Abdullah Al-Zahrani', N'عبدالله الزهراني', 'SAU', 'SA7730000000456789012345', 'RJHI', 15000, 6000, 1500, 1500, 'G-70890123', 'Construction Manager', @p5, '2028-01-31', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2916473058291')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2916473058291', 'Md. Shahidul Islam', N'محمد شاهد', 'OTH', 'SA0130000000567890123456', 'NCB', 3600, 1200, 400, 0, NULL, 'Welder', @p4, '2026-02-28', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2837461920385')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2837461920385', 'Turki Al-Qahtani', N'تركي القحطاني', 'SAU', 'SA4450000000678901234567', 'BJAZ', 9800, 3920, 980, 700, 'G-80901234', 'Contracts Engineer', @p2, '2027-05-20', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2648301927564')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2648301927564', 'Ganesh Prasad Yadav', N'غانيش برساد', 'OTH', 'SA6750000000789012345678', 'ALBI', 4100, 1400, 400, 0, NULL, 'Tiler', @p2, '2026-09-15', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '1039284756031')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('1039284756031', 'Waleed Al-Harbi', N'وليد الحربي', 'SAU', 'SA9890000000890123456789', 'SCB', 6500, 2600, 750, 350, 'G-91012345', 'Surveyor', @p3, '2026-04-30', 1, 'seed');

IF NOT EXISTS (SELECT 1 FROM Labor WHERE IqamaNumber = '2571048392716')
INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, IsActive, ChangedBy)
VALUES ('2571048392716', 'Khalifa Rabah Al-Otaibi', N'خليفة الغامدي', 'SAU', 'SA1290000000901234567890', 'ANB', 5800, 2320, 700, 280, 'G-10123456', 'Document Controller', @p3, '2025-08-15', 1, 'seed');
GO

-- =============================================================================
-- INVOICES + INVOICE ITEMS (20 invoices)
-- =============================================================================
DECLARE @proj1 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-001');
DECLARE @proj2 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-002');
DECLARE @proj3 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-003');
DECLARE @proj4 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-004');
DECLARE @proj5 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-005');
DECLARE @proj6 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-006');
DECLARE @proj7 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-007');
DECLARE @proj8 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-008');
DECLARE @proj11 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2025-001');
DECLARE @proj12 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2023-012');

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2024-0001')
BEGIN
    DECLARE @inv1 INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2024-0001', 'Standard', @proj1, 'Al-Rajhi Development Co.', '310000000000003', 'P.O. Box 1234, Riyadh 11241', '2024-03-01', '2024-03-01', '2024-04-01', 3500000, 15, 525000, 10, 350000, 3675000, 'Cleared', NEWID(), 'dummy-qr', 'Mobilization and substructure — Invoice 1', 'seed');
    SET @inv1 = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv1, 'Site Mobilization', 1, 850000, 0, 15, 850000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv1, 'Excavation Works', 5000, 200, 0, 15, 1000000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv1, 'Pile Foundation', 120, 13750, 0, 15, 1650000);
    INSERT INTO InvoicePayments (InvoiceID, PaymentDate, Amount, PaymentMethod, Reference, ChangedBy) VALUES (@inv1, '2024-04-05', 3675000, 'BankTransfer', 'TRF-20240405-001', 'seed');
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2024-0002')
BEGIN
    DECLARE @inv2 INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2024-0002', 'Standard', @proj1, 'Al-Rajhi Development Co.', '310000000000003', 'P.O. Box 1234, Riyadh 11241', '2024-06-01', '2024-06-01', '2024-07-01', 4200000, 15, 630000, 10, 420000, 4410000, 'Cleared', NEWID(), 'dummy-qr', 'Structural works floors 1-5', 'seed');
    SET @inv2 = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv2, 'Concrete Works B1-GF', 2100, 1000, 0, 15, 2100000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv2, 'Steel Reinforcement', 280, 7500, 0, 15, 2100000);
    INSERT INTO InvoicePayments (InvoiceID, PaymentDate, Amount, PaymentMethod, Reference, ChangedBy) VALUES (@inv2, '2024-07-08', 4410000, 'BankTransfer', 'TRF-20240708-002', 'seed');
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2024-0003')
BEGIN
    DECLARE @inv3 INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2024-0003', 'Standard', @proj2, 'Emaar Saudi Arabia', '300000000000003', 'Emaar Tower, King Abdullah Road, Jeddah', '2024-05-15', '2024-05-15', '2024-06-15', 2800000, 15, 420000, 10, 280000, 2940000, 'Cleared', NEWID(), 'dummy-qr', 'Villa foundations and ground slabs — Units 1-6', 'seed');
    SET @inv3 = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv3, 'Foundation Works 6 Villas', 6, 300000, 0, 15, 1800000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv3, 'Ground Floor Slab', 1800, 555.56, 0, 15, 1000000);
    INSERT INTO InvoicePayments (InvoiceID, PaymentDate, Amount, PaymentMethod, Reference, ChangedBy) VALUES (@inv3, '2024-06-20', 2940000, 'Cheque', 'CHQ-20240620-001', 'seed');
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2024-0004')
BEGIN
    DECLARE @inv4 INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2024-0004', 'Standard', @proj3, 'Saudi Aramco Subsidiary', '311000000000003', 'Dhahran 31311, Saudi Arabia', '2024-04-01', '2024-04-01', '2024-05-01', 4500000, 15, 675000, 5, 225000, 4950000, 'Cleared', NEWID(), 'dummy-qr', 'Steel structure erection and roofing', 'seed');
    SET @inv4 = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv4, 'Steel Structure Supply & Erect', 450, 6666.67, 0, 15, 3000000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv4, 'Roof Cladding', 8000, 187.50, 0, 15, 1500000);
    INSERT INTO InvoicePayments (InvoiceID, PaymentDate, Amount, PaymentMethod, Reference, ChangedBy) VALUES (@inv4, '2024-05-05', 4950000, 'BankTransfer', 'TRF-20240505-003', 'seed');
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2024-0005')
BEGIN
    DECLARE @inv5 INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2024-0005', 'Standard', @proj4, 'Makkah Hotels Group', '305000000000003', 'Ibrahim Al-Khalil Road, Makkah', '2024-06-01', '2024-06-01', '2024-07-01', 1800000, 15, 270000, 10, 180000, 1890000, 'Cleared', NEWID(), 'dummy-qr', 'Lobby and restaurant renovation', 'seed');
    SET @inv5 = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv5, 'Marble Flooring Lobby', 1200, 650, 0, 15, 780000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv5, 'Gypsum Ceiling Works', 1800, 200, 0, 15, 360000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv5, 'Custom Joinery', 1, 660000, 0, 15, 660000);
    INSERT INTO InvoicePayments (InvoiceID, PaymentDate, Amount, PaymentMethod, Reference, ChangedBy) VALUES (@inv5, '2024-07-15', 1890000, 'BankTransfer', 'TRF-20240715-004', 'seed');
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2024-0006')
BEGIN
    DECLARE @inv6 INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2024-0006', 'Standard', @proj5, 'Ministry of Municipal Affairs', '300001000000003', 'King Fahd Road, Riyadh', '2024-08-01', '2024-08-01', '2024-09-01', 8500000, 15, 1275000, 10, 850000, 8925000, 'Reported', NEWID(), 'dummy-qr', 'Earthworks and drainage — KM 0-4', 'seed');
    SET @inv6 = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv6, 'Cut and Fill Earthworks', 120000, 45, 0, 15, 5400000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv6, 'Storm Water Drainage', 4000, 775, 0, 15, 3100000);
    INSERT INTO InvoicePayments (InvoiceID, PaymentDate, Amount, PaymentMethod, Reference, ChangedBy) VALUES (@inv6, '2024-09-10', 5000000, 'BankTransfer', 'TRF-20240910-005', 'seed');
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2024-0007')
BEGIN
    DECLARE @inv7 INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2024-0007', 'Standard', @proj6, 'Gulf Retail REIT', '308000000000003', 'Al-Khobar, Eastern Province', '2024-09-01', '2024-09-01', '2024-10-01', 5200000, 15, 780000, 10, 520000, 5460000, 'Reported', NEWID(), 'dummy-qr', 'Substructure and ground floor slab', 'seed');
    SET @inv7 = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv7, 'Raft Foundation', 3500, 800, 0, 15, 2800000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv7, 'Ground Floor RC Slab', 12000, 200, 0, 15, 2400000);
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2024-0008')
BEGIN
    DECLARE @inv8 INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2024-0008', 'Standard', @proj7, 'Aseer Tourism Development', '312000000000003', 'Abha, Aseer Region', '2024-10-01', '2024-10-01', '2024-11-01', 6800000, 15, 1020000, 10, 680000, 7140000, 'Reported', NEWID(), 'dummy-qr', 'Site preparation and access roads', 'seed');
    SET @inv8 = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv8, 'Land Clearing and Grading', 85000, 40, 0, 15, 3400000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv8, 'Internal Access Roads', 3400, 1000, 0, 15, 3400000);
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2024-0009')
BEGIN
    DECLARE @inv9 INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2024-0009', 'Standard', @proj8, 'ACWA Power', '301000000000003', 'Riyadh, King Abdullah Financial District', '2024-10-15', '2024-10-15', '2024-11-15', 3100000, 15, 465000, 5, 155000, 3410000, 'Cleared', NEWID(), 'dummy-qr', 'Piling and civil works — Phase 1', 'seed');
    SET @inv9 = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv9, 'Bored Pile Foundation', 180, 12000, 0, 15, 2160000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv9, 'Pile Cap Construction', 45, 20888.89, 0, 15, 940000);
    INSERT INTO InvoicePayments (InvoiceID, PaymentDate, Amount, PaymentMethod, Reference, ChangedBy) VALUES (@inv9, '2024-11-20', 3410000, 'BankTransfer', 'TRF-20241120-006', 'seed');
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2025-0001')
BEGIN
    DECLARE @inv10 INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2025-0001', 'Standard', @proj11, 'NEOM Company', '300002000000003', 'NEOM Headquarters, Tabuk', '2025-02-01', '2025-02-01', '2025-03-01', 15000000, 15, 2250000, 10, 1500000, 15750000, 'Reported', NEWID(), 'dummy-qr', 'Blocks A & B — Foundation and structure', 'seed');
    SET @inv10 = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv10, 'Foundation Works Block A', 1, 7000000, 0, 15, 7000000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv10, 'Foundation Works Block B', 1, 8000000, 0, 15, 8000000);
    INSERT INTO InvoicePayments (InvoiceID, PaymentDate, Amount, PaymentMethod, Reference, ChangedBy) VALUES (@inv10, '2025-03-10', 10000000, 'BankTransfer', 'TRF-20250310-007', 'seed');
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2025-0002')
BEGIN
    DECLARE @inv11 INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2025-0002', 'Standard', @proj12, 'Royal Commission for Al-Ula', '300003000000003', 'Al-Ula, Madinah Province', '2025-01-15', '2025-01-15', '2025-02-15', 9500000, 15, 1425000, 10, 950000, 9975000, 'Draft', NEWID(), 'dummy-qr', 'Heritage wall restoration — Sector 1', 'seed');
    SET @inv11 = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv11, 'Stone Wall Restoration', 2800, 2321.43, 0, 15, 6500000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@inv11, 'Conservation Treatment', 1, 3000000, 0, 15, 3000000);
END

-- Additional invoices (Draft/Reported to show pipeline)
IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2025-0003')
BEGIN
    DECLARE @invA INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2025-0003', 'Standard', @proj1, 'Al-Rajhi Development Co.', '310000000000003', 'P.O. Box 1234, Riyadh 11241', '2025-01-01', '2025-01-01', '2025-02-01', 5600000, 15, 840000, 10, 560000, 5880000, 'Reported', NEWID(), 'dummy-qr', 'Structural works floors 6-12', 'seed');
    SET @invA = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@invA, 'RC Frame Floors 6-12', 7, 800000, 0, 15, 5600000);
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2025-0004')
BEGIN
    DECLARE @invB INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2025-0004', 'Standard', @proj5, 'Ministry of Municipal Affairs', '300001000000003', 'King Fahd Road, Riyadh', '2025-02-01', '2025-02-01', '2025-03-01', 11000000, 15, 1650000, 10, 1100000, 11550000, 'Reported', NEWID(), 'dummy-qr', 'Road base course and asphalt — KM 4-8', 'seed');
    SET @invB = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@invB, 'Sub-base Aggregate', 85000, 65, 0, 15, 5525000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@invB, 'Asphalt Paving', 48000, 115, 0, 15, 5520000);
    -- partial payment only
    INSERT INTO InvoicePayments (InvoiceID, PaymentDate, Amount, PaymentMethod, Reference, ChangedBy) VALUES (@invB, '2025-03-15', 6000000, 'BankTransfer', 'TRF-20250315-008', 'seed');
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2025-0005')
BEGIN
    DECLARE @invC INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2025-0005', 'Standard', @proj6, 'Gulf Retail REIT', '308000000000003', 'Al-Khobar, Eastern Province', '2025-02-15', '2025-02-15', '2025-03-15', 6800000, 15, 1020000, 10, 680000, 7140000, 'Draft', NEWID(), 'dummy-qr', 'Superstructure levels 1-3', 'seed');
    SET @invC = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@invC, 'Columns and Shear Walls', 1, 3500000, 0, 15, 3500000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@invC, 'Post-Tensioned Slabs', 18000, 183.33, 0, 15, 3300000);
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2025-0006')
BEGIN
    DECLARE @invD INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2025-0006', 'Standard', @proj11, 'NEOM Company', '300002000000003', 'NEOM Headquarters, Tabuk', '2025-03-01', '2025-03-01', '2025-04-01', 18000000, 15, 2700000, 10, 1800000, 18900000, 'Draft', NEWID(), 'dummy-qr', 'Blocks C, D, E — Structure', 'seed');
    SET @invD = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@invD, 'Superstructure 3 Blocks', 3, 6000000, 0, 15, 18000000);
END

IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceNumber = 'INV-2024-0010')
BEGIN
    DECLARE @invE INT;
    INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress, InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID, ZatcaQRCode, Notes, ChangedBy)
    VALUES ('INV-2024-0010', 'Standard', @proj3, 'Saudi Aramco Subsidiary', '311000000000003', 'Dhahran 31311, Saudi Arabia', '2024-08-01', '2024-08-01', '2024-09-01', 7500000, 15, 1125000, 5, 375000, 8250000, 'Cleared', NEWID(), 'dummy-qr', 'Final completion and handover', 'seed');
    SET @invE = SCOPE_IDENTITY();
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@invE, 'MEP Installation', 1, 3500000, 0, 15, 3500000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@invE, 'External Works & Paving', 1, 2000000, 0, 15, 2000000);
    INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal) VALUES (@invE, 'Defects Rectification', 1, 2000000, 0, 15, 2000000);
    INSERT INTO InvoicePayments (InvoiceID, PaymentDate, Amount, PaymentMethod, Reference, ChangedBy) VALUES (@invE, '2024-09-25', 8250000, 'BankTransfer', 'TRF-20240925-009', 'seed');
END
GO

-- =============================================================================
-- PROJECT EXPENSES (20 items)
-- =============================================================================
DECLARE @ep1 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-001');
DECLARE @ep2 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-002');
DECLARE @ep3 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-005');
DECLARE @ep4 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2025-001');
DECLARE @ep5 INT = (SELECT ProjectID FROM Projects WHERE ProjectCode = 'IB-2024-006');

INSERT INTO ProjectExpenses (ProjectID, ExpenseDate, Category, Description, Amount, VATAmount, Vendor, ReferenceNo, Notes, ChangedBy)
SELECT * FROM (VALUES
    (@ep1, '2024-02-15', 'Materials',      'Ready-mix concrete supply — 500m3',              187500, 28125, 'Al-Salam Concrete',       'PO-2024-0045', NULL, 'seed'),
    (@ep1, '2024-03-20', 'Equipment',      'Tower crane monthly rental',                       75000,  11250, 'Al-Muhaidib Heavy',       'INV-CRANE-001', NULL, 'seed'),
    (@ep1, '2024-04-10', 'Subcontractor',  'Waterproofing works basement',                     95000,  14250, 'Gulf Waterproof Co.',     'SC-2024-012', NULL, 'seed'),
    (@ep1, '2024-05-05', 'Materials',      'Structural steel reinforcement 80 tons',          640000,  96000, 'Saudi Steel Products',    'PO-2024-0067', NULL, 'seed'),
    (@ep2, '2024-04-01', 'Materials',      'Block work materials — 6 villas',                  58000,   8700, 'Al-Yamama Building Sup.', 'PO-2024-0052', NULL, 'seed'),
    (@ep2, '2024-05-15', 'Labor',          'Skilled labor payroll April 2024',                 92000,      0, 'Internal Payroll',        'WPS-2024-04', NULL, 'seed'),
    (@ep2, '2024-06-20', 'Transport',      'Material delivery — Riyadh to Jeddah',             18000,   2700, 'Fast Freight Co.',         'TRK-2024-088', NULL, 'seed'),
    (@ep3, '2024-07-01', 'Equipment',      'Earthmoving equipment fleet — monthly',           280000,  42000, 'Almabani Equipment',      'EQ-2024-034', NULL, 'seed'),
    (@ep3, '2024-08-15', 'Materials',      'Drainage pipes and fittings 4km',                 145000,  21750, 'Saudi HDPE Pipes',         'PO-2024-0089', NULL, 'seed'),
    (@ep3, '2024-09-01', 'Subcontractor',  'Traffic management services',                      38000,   5700, 'Safeway Traffic Control', 'SC-2024-045', NULL, 'seed'),
    (@ep4, '2025-01-10', 'Materials',      'Precast concrete panels — 240 units',            2400000, 360000, 'SPCF Precast',             'PO-2025-0012', NULL, 'seed'),
    (@ep4, '2025-02-01', 'Equipment',      'Crawler crane and rigging — monthly',             185000,  27750, 'Al-Hessa Cranes',          'EQ-2025-008', NULL, 'seed'),
    (@ep4, '2025-02-15', 'Subcontractor',  'MEP rough-in Block A',                            620000,  93000, 'Al-Faris MEP',             'SC-2025-003', NULL, 'seed'),
    (@ep4, '2025-03-01', 'Labor',          'Skilled labor payroll February 2025',             380000,      0, 'Internal Payroll',         'WPS-2025-02', NULL, 'seed'),
    (@ep5, '2024-08-20', 'Materials',      'Formwork system rental',                           92000,  13800, 'DOKA Saudi Arabia',        'FW-2024-019', NULL, 'seed'),
    (@ep5, '2024-09-15', 'Materials',      'Post-tension cables and anchorages',             178000,  26700, 'VSL Systems Saudi',        'PO-2024-0101', NULL, 'seed'),
    (@ep5, '2024-10-01', 'Equipment',      'Concrete pump — daily hire 30 days',               45000,   6750, 'Putzmeister Gulf',         'EQ-2024-056', NULL, 'seed'),
    (@ep1, '2025-01-20', 'Other',          'Site security services — Q1 2025',                 32000,   4800, 'Shield Guard Security',   'SG-2025-Q1', NULL, 'seed'),
    (@ep3, '2025-01-10', 'Materials',      'Asphalt binder course 48,000 sqm',               552000,  82800, 'National Asphalt Co.',     'PO-2025-0005', NULL, 'seed'),
    (@ep2, '2025-02-10', 'Subcontractor',  'Pool construction and tiling — 6 pools',         480000,  72000, 'Aqua Pools Arabia',        'SC-2025-009', NULL, 'seed')
) v (ProjectID, ExpenseDate, Category, Description, Amount, VATAmount, Vendor, ReferenceNo, Notes, ChangedBy)
WHERE NOT EXISTS (SELECT 1 FROM ProjectExpenses WHERE Description = v.Description AND ProjectID = v.ProjectID);
GO

-- =============================================================================
-- WPS PAYROLL RUNS
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM WPS_PayrollRuns WHERE PayrollMonth = '2025-01')
BEGIN
    DECLARE @run1 INT;
    INSERT INTO WPS_PayrollRuns (PayrollMonth, GeneratedDate, GeneratedBy, SIFFileName, TotalLabor, TotalAmount, Status, Notes)
    VALUES ('2025-01', '2025-02-01', 'admin', 'WPS_2025-01_IndigoBuilders.sif',
            (SELECT COUNT(*) FROM Labor WHERE IsActive = 1),
            (SELECT SUM(BasicSalary + HousingAllowance + TransportAllowance + OtherAllowances) FROM Labor WHERE IsActive = 1),
            'Submitted', 'January 2025 payroll — submitted to MHRSD');
    SET @run1 = SCOPE_IDENTITY();

    INSERT INTO WPS_PayrollLines (RunID, LaborID, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, Deductions, NetSalary, WorkingDays)
    SELECT @run1, LaborID, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, 0,
           BasicSalary + HousingAllowance + TransportAllowance + OtherAllowances, 26
    FROM Labor WHERE IsActive = 1;
END

IF NOT EXISTS (SELECT 1 FROM WPS_PayrollRuns WHERE PayrollMonth = '2025-02')
BEGIN
    DECLARE @run2 INT;
    INSERT INTO WPS_PayrollRuns (PayrollMonth, GeneratedDate, GeneratedBy, SIFFileName, TotalLabor, TotalAmount, Status, Notes)
    VALUES ('2025-02', '2025-03-01', 'admin', 'WPS_2025-02_IndigoBuilders.sif',
            (SELECT COUNT(*) FROM Labor WHERE IsActive = 1),
            (SELECT SUM(BasicSalary + HousingAllowance + TransportAllowance + OtherAllowances) FROM Labor WHERE IsActive = 1),
            'Submitted', 'February 2025 payroll — submitted to MHRSD');
    SET @run2 = SCOPE_IDENTITY();

    INSERT INTO WPS_PayrollLines (RunID, LaborID, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, Deductions, NetSalary, WorkingDays)
    SELECT @run2, LaborID, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, 0,
           BasicSalary + HousingAllowance + TransportAllowance + OtherAllowances, 24
    FROM Labor WHERE IsActive = 1;
END

IF NOT EXISTS (SELECT 1 FROM WPS_PayrollRuns WHERE PayrollMonth = '2025-03')
BEGIN
    DECLARE @run3 INT;
    INSERT INTO WPS_PayrollRuns (PayrollMonth, GeneratedDate, GeneratedBy, SIFFileName, TotalLabor, TotalAmount, Status, Notes)
    VALUES ('2025-03', '2025-04-01', 'admin', 'WPS_2025-03_IndigoBuilders.sif',
            (SELECT COUNT(*) FROM Labor WHERE IsActive = 1),
            (SELECT SUM(BasicSalary + HousingAllowance + TransportAllowance + OtherAllowances) FROM Labor WHERE IsActive = 1),
            'Draft', 'March 2025 payroll — pending review');
    SET @run3 = SCOPE_IDENTITY();

    INSERT INTO WPS_PayrollLines (RunID, LaborID, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, Deductions, NetSalary, WorkingDays)
    SELECT @run3, LaborID, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, 0,
           BasicSalary + HousingAllowance + TransportAllowance + OtherAllowances, 26
    FROM Labor WHERE IsActive = 1;
END
GO

PRINT 'Seed data inserted successfully.';
GO
