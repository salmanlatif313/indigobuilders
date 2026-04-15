/**
 * IndigoBuilders ERP — 1000-record seed script
 * Run: node seed.js
 */
const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

// ─── Reference Data ───────────────────────────────────────────────────────────

const CLIENTS = [
  'Saudi Aramco Company', 'NEOM Development Authority', 'Ministry of Housing KSA',
  'Red Sea Global', 'Diriyah Gate Authority', 'Saudi Railway Company',
  'Royal Commission Riyadh', 'Misk Foundation', 'SABIC Industrial',
  'AlUla Development Authority', 'Saudi Water Authority', 'PIF Projects KSA',
  'King Abdulaziz University', 'King Fahd Medical City', 'STC Telecom',
  'Marafiq Utilities', 'Saudi Electricity Company', 'Aramco Overseas BV',
  'Gulf Retail REIT', 'Ministry of Municipal Affairs',
];

const PROJECT_NAMES = [
  'Al Faisaliah Tower Extension', 'Riyadh Metro Station Fit-Out', 'NEOM Smart City Infrastructure',
  'Jeddah Corniche Development', 'Dammam Industrial Complex', 'Makkah Road Expansion Phase 2',
  'Red Sea Resort Villas', 'Diriyah Heritage Site Restoration', 'King Salman Park Pavilions',
  'AlUla Eco Lodge Construction', 'Dhahran Tech Campus', 'Yanbu Refinery Expansion',
  'Tabuk Solar Farm Structures', 'Madinah Convention Centre', 'Abha Mountain Resort',
  'Hail Airport Terminal 3', 'Qassim Highway Interchange', 'Jubail Port Expansion',
  'Jizan Industrial Zone', 'Najran Border Crossing Facility',
];

const LOCATIONS = [
  'Riyadh', 'Jeddah', 'Dammam', 'Makkah', 'Madinah', 'Abha', 'Tabuk',
  'Hail', 'Yanbu', 'Jubail', 'Qassim', 'AlUla', 'Jizan', 'Najran', 'NEOM',
];

const NATIONALITIES = [
  { code: 'SAU', weight: 15 }, { code: 'IND', weight: 20 }, { code: 'PAK', weight: 20 },
  { code: 'BGD', weight: 15 }, { code: 'PHL', weight: 8 }, { code: 'EGY', weight: 8 },
  { code: 'YEM', weight: 5 }, { code: 'SYR', weight: 4 }, { code: 'JOR', weight: 3 },
  { code: 'NPL', weight: 2 },
];

const JOB_TITLES = [
  'Site Engineer', 'Civil Engineer', 'Project Manager', 'Foreman', 'Electrician',
  'Plumber', 'Mason', 'Welder', 'Carpenter', 'Safety Officer', 'Surveyor',
  'MEP Engineer', 'QC Inspector', 'Heavy Equipment Operator', 'Driver',
  'Laborer', 'Steel Fixer', 'Painter', 'Scaffolder', 'Document Controller',
];

const FIRST_NAMES_EN = [
  'Mohammed', 'Ahmed', 'Ali', 'Omar', 'Khalid', 'Abdullah', 'Hassan', 'Ibrahim',
  'Yousef', 'Faisal', 'Majed', 'Sami', 'Tariq', 'Walid', 'Nasser', 'Ravi',
  'Suresh', 'Pradeep', 'Anwar', 'Sajid', 'Kamrul', 'Arjun', 'Raj', 'Deepak',
  'Carlos', 'Juan', 'Mario', 'Ahmad', 'Bilal', 'Ziad',
];

const LAST_NAMES_EN = [
  'Al-Ghamdi', 'Al-Zahrani', 'Al-Otaibi', 'Al-Harbi', 'Al-Shehri', 'Al-Qahtani',
  'Al-Malki', 'Al-Dosari', 'Singh', 'Kumar', 'Khan', 'Hussain', 'Rahman',
  'Islam', 'Ahmed', 'Hossain', 'Sharma', 'Patel', 'Fernandez', 'Santos',
];

const INVOICE_DESCS = [
  ['Structural Steel Works', 'Concrete Foundation', 'MEP Installation'],
  ['Earthworks & Excavation', 'Drainage System', 'Site Clearance'],
  ['Architectural Finishes', 'Flooring & Tiling', 'False Ceiling'],
  ['Electrical Wiring', 'Lighting Fixtures', 'Switchgear Installation'],
  ['HVAC System Supply & Install', 'Ductwork', 'Chiller Units'],
  ['Plumbing Works', 'Fire Fighting System', 'Sprinkler Installation'],
  ['Painting & Coating', 'Waterproofing', 'Cladding Works'],
  ['Scaffolding Works', 'Formwork & Shuttering', 'Rebar Supply'],
  ['Landscaping & Irrigation', 'Paving & Hardscape', 'Boundary Walls'],
  ['Project Management Services', 'Engineering Consultancy', 'Site Supervision'],
];

const EXPENSE_CATEGORIES = ['Materials', 'Equipment', 'Subcontractor', 'Labor', 'Transport', 'Other'];
const EXPENSE_DESCS = {
  Materials:     ['Steel rebars supply', 'Cement bags delivery', 'Sand and aggregate', 'Tiles and flooring', 'Paint and primers', 'PVC pipes', 'Electrical cables', 'Plywood sheets'],
  Equipment:     ['Crane rental monthly', 'Excavator hire', 'Generator fuel', 'Compressor rental', 'Welding machine', 'Concrete mixer', 'Scaffolding rental'],
  Subcontractor: ['Painting subcontract', 'MEP subcontract', 'Glazing works', 'Waterproofing subcontract', 'Landscaping subcontract'],
  Labor:         ['Overtime payments', 'Safety bonus', 'Eid allowance', 'Performance bonus'],
  Transport:     ['Material delivery', 'Labour bus rental', 'Fuel expenses', 'Freight charges'],
  Other:         ['Site office expenses', 'Printing and stationery', 'Safety equipment', 'First aid supplies', 'Testing fees'],
};

const PAYMENT_METHODS = ['BankTransfer', 'Cheque', 'Cash', 'Online'];
const ZATCA_STATUSES = ['Draft', 'Reported', 'Cleared', 'Rejected'];
const ZATCA_WEIGHTS  = [30, 30, 35, 5]; // % for each status

// ─── Helpers ──────────────────────────────────────────────────────────────────

let counters = { iqama: 1000000001, invoiceYear: {} };

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function pickWeighted(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
function dateOffset(base, minDays, maxDays) {
  const d = new Date(base);
  d.setDate(d.getDate() + rand(minDays, maxDays));
  return d.toISOString().slice(0, 10);
}
function fmtDate(d) { return new Date(d).toISOString().slice(0, 10); }

function randomIqama(nat) {
  const prefix = nat === 'SAU' ? '1' : '2';
  return prefix + String(counters.iqama++).padStart(9, '0');
}

function randomIBAN() {
  const bankCode = String(rand(1, 30)).padStart(4, '0');
  const account  = String(Math.floor(Math.random() * 1e14)).padStart(14, '0');
  return `SA${rand(10,99)}${bankCode}${account}`;
}

function randomVAT() {
  return '3' + String(Math.floor(Math.random() * 1e13)).padStart(13, '0') + String(rand(1,9));
}

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function nextInvoiceNum(year) {
  counters.invoiceYear[year] = (counters.invoiceYear[year] || 0) + 1;
  return `INV-${year}-${String(counters.invoiceYear[year]).padStart(4, '0')}`;
}

function pickStatus() {
  return pickWeighted(ZATCA_STATUSES, ZATCA_WEIGHTS);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const pool = await sql.connect(config);
  console.log('Connected to IndigoBuilders DB');

  // ── Check existing data ────────────────────────────────────────────────────
  const existing = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM Projects)        AS projects,
      (SELECT COUNT(*) FROM Labor)           AS labor,
      (SELECT COUNT(*) FROM Invoices)        AS invoices,
      (SELECT COUNT(*) FROM ProjectExpenses) AS expenses,
      (SELECT COUNT(*) FROM InvoicePayments) AS payments
  `);
  const ex = existing.recordset[0];
  console.log('Existing records:', ex);

  // ── 1. Additional Users (PM + Engineer roles) ──────────────────────────────
  console.log('\n[1/6] Seeding users...');
  const seedUsers = [
    { username: 'pm.khalid',    fullName: 'Khalid Al-Otaibi',    email: 'khalid.pm@indigobuilders.sa',    roleId: 3 },
    { username: 'pm.sara',      fullName: 'Sara Al-Rashidi',      email: 'sara.pm@indigobuilders.sa',      roleId: 3 },
    { username: 'eng.faisal',   fullName: 'Faisal Al-Harbi',     email: 'faisal.eng@indigobuilders.sa',   roleId: 4 },
    { username: 'eng.nasser',   fullName: 'Nasser Al-Zahrani',   email: 'nasser.eng@indigobuilders.sa',   roleId: 4 },
    { username: 'finance.huda', fullName: 'Huda Al-Ghamdi',      email: 'huda.finance@indigobuilders.sa', roleId: 2 },
  ];
  // bcrypt hash of "Password@1" at cost 10 (pre-computed)
  const defaultHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVr.6cld9i';
  const pmUserIds = [];
  for (const u of seedUsers) {
    const exists = await pool.request()
      .input('un', sql.NVarChar, u.username)
      .query(`SELECT UserID FROM Users WHERE Username = @un`);
    if (exists.recordset.length === 0) {
      const r = await pool.request()
        .input('un', sql.NVarChar, u.username)
        .input('hash', sql.NVarChar, defaultHash)
        .input('fn', sql.NVarChar, u.fullName)
        .input('em', sql.NVarChar, u.email)
        .input('ri', sql.Int, u.roleId)
        .query(`INSERT INTO Users (Username,PasswordHash,FullName,Email,RoleID,IsActive)
                OUTPUT INSERTED.UserID
                VALUES (@un,@hash,@fn,@em,@ri,1)`);
      if (u.roleId === 3) pmUserIds.push(r.recordset[0].UserID);
    } else {
      if (u.roleId === 3) pmUserIds.push(exists.recordset[0].UserID);
    }
  }
  // also grab existing admin as a PM fallback
  const adminRow = await pool.request().query(`SELECT TOP 1 UserID FROM Users WHERE RoleID = 1`);
  if (adminRow.recordset[0]) pmUserIds.push(adminRow.recordset[0].UserID);
  console.log(`  Users ready. PM IDs: ${pmUserIds}`);

  // ── 2. Projects ────────────────────────────────────────────────────────────
  console.log('[2/6] Seeding projects...');
  const projectIds = [];
  // Keep any already existing project IDs
  const existingProjs = await pool.request().query(`SELECT ProjectID FROM Projects`);
  existingProjs.recordset.forEach(r => projectIds.push(r.ProjectID));

  const projsToAdd = Math.max(0, 20 - existingProjs.recordset.length);
  for (let i = 0; i < projsToAdd; i++) {
    const idx   = existingProjs.recordset.length + i;
    const code  = `IB-${2022 + Math.floor(idx / 5)}-${String((idx % 20) + 1).padStart(3, '0')}`;
    const start = dateOffset('2022-01-01', i * 18, i * 18 + 30);
    const end   = dateOffset(start, 180, 540);
    const cv    = rand(2, 50) * 1000000;
    const pm    = pick(pmUserIds);
    const r = await pool.request()
      .input('code',  sql.NVarChar, code)
      .input('name',  sql.NVarChar, PROJECT_NAMES[idx % PROJECT_NAMES.length])
      .input('client',sql.NVarChar, CLIENTS[idx % CLIENTS.length])
      .input('cv',    sql.Decimal(18,2), cv)
      .input('start', sql.Date, start)
      .input('end',   sql.Date, end)
      .input('loc',   sql.NVarChar, LOCATIONS[idx % LOCATIONS.length])
      .input('pm',    sql.Int, pm)
      .input('status',sql.NVarChar, rand(0,4) === 0 ? 'Completed' : 'Active')
      .query(`INSERT INTO Projects (ProjectCode,ProjectName,ClientName,ContractValue,StartDate,EndDate,Location,ManagerUserID,Status,ChangedBy)
              OUTPUT INSERTED.ProjectID
              VALUES (@code,@name,@client,@cv,@start,@end,@loc,@pm,@status,'seed')`);
    projectIds.push(r.recordset[0].ProjectID);
  }
  console.log(`  Projects total: ${projectIds.length}`);

  // ── 3. Labor (target 300 total) ────────────────────────────────────────────
  console.log('[3/6] Seeding labor...');
  // find highest existing iqama to avoid collisions
  const maxIqRow = await pool.request().query(`SELECT MAX(CAST(IqamaNumber AS BIGINT)) AS mx FROM Labor WHERE ISNUMERIC(IqamaNumber)=1`);
  if (maxIqRow.recordset[0].mx) counters.iqama = parseInt(maxIqRow.recordset[0].mx) + 1;

  const laborTarget = 300;
  const existingLabor = await pool.request().query(`SELECT COUNT(*) AS cnt FROM Labor`);
  const laborToAdd = Math.max(0, laborTarget - existingLabor.recordset[0].cnt);
  const laborIds = [];
  const existingLaborIds = await pool.request().query(`SELECT LaborID FROM Labor`);
  existingLaborIds.recordset.forEach(r => laborIds.push(r.LaborID));

  for (let i = 0; i < laborToAdd; i++) {
    const natObj = pickWeighted(NATIONALITIES, NATIONALITIES.map(n => n.weight));
    const nat    = natObj.code;
    const iqama  = randomIqama(nat);
    const fname  = pick(FIRST_NAMES_EN);
    const lname  = pick(LAST_NAMES_EN);
    const name   = `${fname} ${lname}`;
    const basic  = pick([3000,3500,4000,4500,5000,6000,7000,8000,10000,12000,15000]);
    const hous   = nat === 'SAU' ? rand(1000,3000) : rand(500,1500);
    const trans  = rand(300,800);
    const other  = rand(0,500);
    const proj   = rand(0,4) === 0 ? null : pick(projectIds); // 20% unassigned
    const expiry = dateOffset(new Date().toISOString(), -365, 730); // ±1 yr from today
    const gosi   = nat === 'SAU' ? `GOSI${String(rand(1000000, 9999999))}` : null;
    const r = await pool.request()
      .input('iq',   sql.NVarChar, iqama)
      .input('fn',   sql.NVarChar, name)
      .input('nat',  sql.Char(3),  nat)
      .input('iban', sql.NVarChar, randomIBAN())
      .input('bc',   sql.NVarChar, String(rand(1,30)).padStart(4,'0'))
      .input('bs',   sql.Decimal(18,2), basic)
      .input('ha',   sql.Decimal(18,2), hous)
      .input('ta',   sql.Decimal(18,2), trans)
      .input('oa',   sql.Decimal(18,2), other)
      .input('gosi', sql.NVarChar, gosi)
      .input('job',  sql.NVarChar, pick(JOB_TITLES))
      .input('pid',  sql.Int, proj)
      .input('exp',  sql.Date, expiry)
      .input('active', sql.Bit, rand(0,9) > 0 ? 1 : 0) // 90% active
      .query(`INSERT INTO Labor
               (IqamaNumber,FullName,NationalityCode,IBAN,BankCode,BasicSalary,
                HousingAllowance,TransportAllowance,OtherAllowances,GOSINumber,
                JobTitle,ProjectID,IqamaExpiry,IsActive,ChangedBy)
              OUTPUT INSERTED.LaborID
              VALUES (@iq,@fn,@nat,@iban,@bc,@bs,@ha,@ta,@oa,@gosi,
                      @job,@pid,@exp,@active,'seed')`);
    laborIds.push(r.recordset[0].LaborID);
  }
  console.log(`  Labor total: ${laborIds.length}`);

  // ── 4. Invoices + Items (target 200 invoices, 2–4 items each) ─────────────
  console.log('[4/6] Seeding invoices...');
  const existingInvNums = await pool.request().query(`SELECT InvoiceNumber FROM Invoices`);
  const usedNums = new Set(existingInvNums.recordset.map(r => r.InvoiceNumber));

  // Pre-load existing invoice counter per year
  for (const n of usedNums) {
    const m = n.match(/INV-(\d{4})-(\d+)/);
    if (m) {
      const y = m[1], seq = parseInt(m[2]);
      if (!counters.invoiceYear[y] || counters.invoiceYear[y] < seq) counters.invoiceYear[y] = seq;
    }
  }

  const invoiceTarget = 200;
  const existingInvCount = existingInvNums.recordset.length;
  const invoicesToAdd = Math.max(0, invoiceTarget - existingInvCount);
  const invoiceIds = [];

  for (let i = 0; i < invoicesToAdd; i++) {
    const year      = pick(['2023','2024','2025','2026']);
    const invNum    = nextInvoiceNum(year);
    const proj      = rand(0,4) === 0 ? null : pick(projectIds);
    const clientIdx = rand(0, CLIENTS.length - 1);
    const invDate   = `${year}-${String(rand(1,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`;
    const dueDate   = dateOffset(invDate, 30, 90);
    const vatRate   = 15;
    const retRate   = rand(0,3) * 5; // 0, 5, 10, or 15%
    const status    = pickStatus();
    const uuid      = randomUUID();

    // 2–4 line items
    const numItems = rand(2, 4);
    const descSet  = pick(INVOICE_DESCS);
    let subTotal = 0;
    const lineItems = [];
    for (let j = 0; j < numItems; j++) {
      const qty   = rand(1, 20);
      const price = pick([5000,10000,15000,20000,25000,50000,75000,100000,150000,200000]);
      const disc  = rand(0,2) === 0 ? rand(1000, 5000) : 0;
      const lt    = qty * price - disc;
      subTotal   += lt;
      lineItems.push({ desc: descSet[j % descSet.length], qty, price, disc, vat: vatRate, lt });
    }
    const vatAmt  = subTotal * (vatRate / 100);
    const retAmt  = subTotal * (retRate / 100);
    const total   = subTotal + vatAmt - retAmt;
    const qr      = Buffer.from(`${CLIENTS[clientIdx]}|${uuid}|${invDate}|${total}|${vatAmt}`).toString('base64');

    const r = await pool.request()
      .input('num',    sql.NVarChar, invNum)
      .input('type',   sql.NVarChar, 'Standard')
      .input('pid',    sql.Int, proj)
      .input('client', sql.NVarChar, CLIENTS[clientIdx])
      .input('cvat',   sql.NVarChar, randomVAT())
      .input('caddr',  sql.NVarChar, pick(LOCATIONS) + ', Saudi Arabia')
      .input('idate',  sql.Date, invDate)
      .input('ddate',  sql.Date, dueDate)
      .input('sub',    sql.Decimal(18,2), subTotal)
      .input('vr',     sql.Decimal(5,2),  vatRate)
      .input('va',     sql.Decimal(18,2), vatAmt)
      .input('rr',     sql.Decimal(5,2),  retRate)
      .input('ra',     sql.Decimal(18,2), retAmt)
      .input('tot',    sql.Decimal(18,2), total)
      .input('status', sql.NVarChar, status)
      .input('qr',     sql.NVarChar, qr)
      .input('uuid',   sql.NVarChar, uuid)
      .query(`INSERT INTO Invoices
               (InvoiceNumber,InvoiceType,ProjectID,ClientName,ClientVAT,ClientAddress,
                InvoiceDate,DueDate,SubTotal,VATRate,VATAmount,RetentionRate,RetentionAmount,
                TotalAmount,ZatcaStatus,ZatcaQRCode,ZatcaUUID,ChangedBy)
              OUTPUT INSERTED.InvoiceID
              VALUES (@num,@type,@pid,@client,@cvat,@caddr,@idate,@ddate,
                      @sub,@vr,@va,@rr,@ra,@tot,@status,@qr,@uuid,'seed')`);
    const invId = r.recordset[0].InvoiceID;
    invoiceIds.push({ id: invId, total, status });

    // Insert line items
    for (const it of lineItems) {
      await pool.request()
        .input('iid',  sql.Int, invId)
        .input('desc', sql.NVarChar, it.desc)
        .input('qty',  sql.Decimal(18,4), it.qty)
        .input('up',   sql.Decimal(18,2), it.price)
        .input('disc', sql.Decimal(18,2), it.disc)
        .input('vr',   sql.Decimal(5,2), it.vat)
        .input('lt',   sql.Decimal(18,2), it.lt)
        .query(`INSERT INTO InvoiceItems (InvoiceID,Description,Quantity,UnitPrice,Discount,VATRate,LineTotal)
                VALUES (@iid,@desc,@qty,@up,@disc,@vr,@lt)`);
    }
  }
  console.log(`  Invoices added: ${invoicesToAdd}. Invoice IDs collected: ${invoiceIds.length}`);

  // reload all invoice IDs for payments
  const allInvRows = await pool.request().query(`SELECT InvoiceID, TotalAmount, ZatcaStatus FROM Invoices`);
  const allInvoices = allInvRows.recordset;

  // ── 5. Invoice Payments (on Cleared/Reported) ─────────────────────────────
  console.log('[5/6] Seeding invoice payments...');
  const existingPay = await pool.request().query(`SELECT DISTINCT InvoiceID FROM InvoicePayments`);
  const paidInvIds  = new Set(existingPay.recordset.map(r => r.InvoiceID));

  let payCount = 0;
  for (const inv of allInvoices) {
    if (paidInvIds.has(inv.InvoiceID)) continue;
    if (inv.ZatcaStatus === 'Draft' || inv.ZatcaStatus === 'Rejected') continue;
    // Cleared = full payment, Reported = partial 50-80%
    const pct      = inv.ZatcaStatus === 'Cleared' ? 1.0 : (rand(50, 80) / 100);
    const amount   = Math.round(Number(inv.TotalAmount) * pct * 100) / 100;
    const invDate  = new Date(inv.InvoiceDate || new Date());
    const payDate  = dateOffset(invDate.toISOString(), 15, 60);
    await pool.request()
      .input('iid',    sql.Int, inv.InvoiceID)
      .input('pdate',  sql.Date, payDate)
      .input('amt',    sql.Decimal(18,2), amount)
      .input('method', sql.NVarChar, pick(PAYMENT_METHODS))
      .input('ref',    sql.NVarChar, `PAY-${inv.InvoiceID}-${rand(1000,9999)}`)
      .query(`INSERT INTO InvoicePayments (InvoiceID,PaymentDate,Amount,PaymentMethod,Reference,ChangedBy)
              VALUES (@iid,@pdate,@amt,@method,@ref,'seed')`);
    payCount++;
  }
  console.log(`  Payments added: ${payCount}`);

  // ── 6. Project Expenses (target 200) ──────────────────────────────────────
  console.log('[6/6] Seeding project expenses...');
  const existingExp = await pool.request().query(`SELECT COUNT(*) AS cnt FROM ProjectExpenses`);
  const expToAdd = Math.max(0, 200 - existingExp.recordset[0].cnt);

  for (let i = 0; i < expToAdd; i++) {
    const proj  = pick(projectIds);
    const cat   = pick(EXPENSE_CATEGORIES);
    const desc  = pick(EXPENSE_DESCS[cat]);
    const amt   = rand(5, 200) * 1000;
    const vat   = rand(0,1) === 1 ? Math.round(amt * 0.15) : 0;
    const edate = dateOffset('2022-01-01', rand(0, 3 * 365), rand(0, 3 * 365));
    await pool.request()
      .input('pid',   sql.Int, proj)
      .input('edate', sql.Date, edate)
      .input('cat',   sql.NVarChar, cat)
      .input('desc',  sql.NVarChar, desc)
      .input('amt',   sql.Decimal(18,2), amt)
      .input('vat',   sql.Decimal(18,2), vat)
      .input('vendor',sql.NVarChar, pick(CLIENTS))
      .input('ref',   sql.NVarChar, `EXP-${String(rand(10000,99999))}`)
      .query(`INSERT INTO ProjectExpenses (ProjectID,ExpenseDate,Category,Description,Amount,VATAmount,Vendor,ReferenceNo,ChangedBy)
              VALUES (@pid,@edate,@cat,@desc,@amt,@vat,@vendor,@ref,'seed')`);
  }
  console.log(`  Expenses added: ${expToAdd}`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const summary = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM Users)           AS users,
      (SELECT COUNT(*) FROM Projects)        AS projects,
      (SELECT COUNT(*) FROM Labor)           AS labor,
      (SELECT COUNT(*) FROM Invoices)        AS invoices,
      (SELECT COUNT(*) FROM InvoiceItems)    AS invoiceItems,
      (SELECT COUNT(*) FROM InvoicePayments) AS payments,
      (SELECT COUNT(*) FROM ProjectExpenses) AS expenses,
      (SELECT COUNT(*) FROM WPS_PayrollRuns) AS payrollRuns
  `);
  const s = summary.recordset[0];
  const grandTotal = Object.values(s).reduce((a, b) => a + b, 0);
  console.log('\n✅ Seed complete. Final record counts:');
  console.table(s);
  console.log(`   Grand total rows: ${grandTotal}`);

  await pool.close();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
