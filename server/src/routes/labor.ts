import { Router, Request, Response } from 'express';
import multer from 'multer';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();
router.use(requireAuth);

interface LaborRow {
  LaborID: number; IqamaNumber: string; FullName: string; FullNameAr: string;
  NationalityCode: string; IBAN: string; BankCode: string;
  BasicSalary: number; HousingAllowance: number; TransportAllowance: number;
  OtherAllowances: number; GrossSalary: number; GOSINumber: string;
  JobTitle: string; ProjectID: number; ProjectName: string; ProjectCode: string;
  IqamaExpiry: string; IsActive: boolean;
}

// GET /api/labor
router.get('/', async (req: Request, res: Response) => {
  const active = req.query.active;
  const projectId = req.query.projectId;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};
  if (active !== undefined) { where += ' AND IsActive = @active'; params.active = active === 'true' ? 1 : 0; }
  if (projectId) { where += ' AND l.ProjectID = @projectId'; params.projectId = parseInt(projectId as string); }
  try {
    const rows = await runQuery<LaborRow>(
      `SELECT LaborID, IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode,
              BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GrossSalary,
              GOSINumber, JobTitle, ProjectID, ProjectName, ProjectCode, IqamaExpiry, IsActive
       FROM View_LaborSummary ${where} ORDER BY FullName`,
      params
    );
    res.json({ labor: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/labor/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rows = await runQuery<LaborRow>(
      `SELECT LaborID, IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode,
              BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GrossSalary,
              GOSINumber, JobTitle, ProjectID, ProjectName, ProjectCode, IqamaExpiry, IsActive
       FROM View_LaborSummary WHERE LaborID = @id`,
      { id: parseInt(req.params.id) }
    );
    if (!rows[0]) { res.status(404).json({ error: 'Labor record not found' }); return; }
    res.json({ labor: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/labor  (Admin, Finance, PM)
router.post('/', requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const { iqamaNumber, fullName, fullNameAr, nationalityCode, iban, bankCode, basicSalary, housingAllowance, transportAllowance, otherAllowances, gosiNumber, jobTitle, projectID, iqamaExpiry } =
    req.body as { iqamaNumber: string; fullName: string; fullNameAr?: string; nationalityCode: string; iban: string; bankCode?: string; basicSalary: number; housingAllowance?: number; transportAllowance?: number; otherAllowances?: number; gosiNumber?: string; jobTitle?: string; projectID?: number; iqamaExpiry?: string };
  if (!iqamaNumber || !fullName || !nationalityCode || !iban || !basicSalary) {
    res.status(400).json({ error: 'iqamaNumber, fullName, nationalityCode, iban, basicSalary required' });
    return;
  }
  try {
    const result = await runQueryResult(
      `INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, GOSINumber, JobTitle, ProjectID, IqamaExpiry, ChangedBy)
       OUTPUT INSERTED.LaborID
       VALUES (@iqamaNumber, @fullName, @fullNameAr, @nationalityCode, @iban, @bankCode, @basicSalary, @housingAllowance, @transportAllowance, @otherAllowances, @gosiNumber, @jobTitle, @projectID, @iqamaExpiry, @changedBy)`,
      { iqamaNumber, fullName, fullNameAr: fullNameAr || null, nationalityCode, iban, bankCode: bankCode || null, basicSalary, housingAllowance: housingAllowance || 0, transportAllowance: transportAllowance || 0, otherAllowances: otherAllowances || 0, gosiNumber: gosiNumber || null, jobTitle: jobTitle || null, projectID: projectID || null, iqamaExpiry: iqamaExpiry || null, changedBy: req.user?.username }
    );
    res.status(201).json({ message: 'Labor record created', laborId: result.recordset[0]?.LaborID });
  } catch (err: unknown) {
    const e = err as { number?: number };
    if (e.number === 2627) { res.status(409).json({ error: 'Iqama number already exists' }); }
    else { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
});

// PUT /api/labor/:id  (Admin, Finance, PM)
router.put('/:id', requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const { fullName, fullNameAr, nationalityCode, iban, bankCode, basicSalary, housingAllowance, transportAllowance, otherAllowances, gosiNumber, jobTitle, projectID, iqamaExpiry, isActive } = req.body as {
    fullName?: string; fullNameAr?: string; nationalityCode?: string; iban?: string; bankCode?: string;
    basicSalary?: number; housingAllowance?: number; transportAllowance?: number; otherAllowances?: number;
    gosiNumber?: string; jobTitle?: string; projectID?: number; iqamaExpiry?: string; isActive?: boolean;
  };
  try {
    await runQueryResult(
      `UPDATE Labor SET FullName=@fullName, FullNameAr=@fullNameAr, NationalityCode=@nationalityCode,
         IBAN=@iban, BankCode=@bankCode, BasicSalary=@basicSalary, HousingAllowance=@housingAllowance,
         TransportAllowance=@transportAllowance, OtherAllowances=@otherAllowances, GOSINumber=@gosiNumber,
         JobTitle=@jobTitle, ProjectID=@projectID, IqamaExpiry=@iqamaExpiry, IsActive=@isActive,
         ChangedBy=@changedBy, ChangeDate=GETDATE()
       WHERE LaborID=@id`,
      { id: parseInt(req.params.id), fullName, fullNameAr: fullNameAr || null, nationalityCode, iban, bankCode: bankCode || null, basicSalary, housingAllowance: housingAllowance || 0, transportAllowance: transportAllowance || 0, otherAllowances: otherAllowances || 0, gosiNumber: gosiNumber || null, jobTitle: jobTitle || null, projectID: projectID || null, iqamaExpiry: iqamaExpiry || null, isActive: isActive ? 1 : 0, changedBy: req.user?.username }
    );
    res.json({ message: 'Labor record updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/labor/:id  (Admin only)
router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    await runQueryResult(`DELETE FROM Labor WHERE LaborID=@id`, { id: parseInt(req.params.id) });
    res.json({ message: 'Labor record deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/labor/import  (Admin, Finance, PM) — bulk CSV import
router.post('/import', requireRole('Admin', 'Finance', 'PM'), upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'CSV file required' }); return; }
  const text = req.file.buffer.toString('utf-8');
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) { res.status(400).json({ error: 'CSV must have header + at least one row' }); return; }

  // Expected columns (order): IqamaNumber,FullName,FullNameAr,NationalityCode,IBAN,BankCode,BasicSalary,HousingAllowance,TransportAllowance,OtherAllowances,GOSINumber,JobTitle,ProjectID,IqamaExpiry
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name.toLowerCase());

  const inserted: number[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const get = (name: string) => cols[idx(name)] || '';

    const iqamaNumber   = get('IqamaNumber');
    const fullName      = get('FullName');
    const nationalityCode = get('NationalityCode');
    const iban          = get('IBAN');
    const basicSalary   = parseFloat(get('BasicSalary'));

    if (!iqamaNumber || !fullName || !nationalityCode || !iban || isNaN(basicSalary) || basicSalary <= 0) {
      skipped.push({ row: i + 1, reason: 'Missing required fields (IqamaNumber, FullName, NationalityCode, IBAN, BasicSalary)' });
      continue;
    }

    const projectIDStr = get('ProjectID');
    const projectID = projectIDStr ? parseInt(projectIDStr) : null;

    try {
      const result = await runQueryResult(
        `INSERT INTO Labor (IqamaNumber, FullName, FullNameAr, NationalityCode, IBAN, BankCode,
           BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances,
           GOSINumber, JobTitle, ProjectID, IqamaExpiry, ChangedBy)
         OUTPUT INSERTED.LaborID
         VALUES (@iqamaNumber, @fullName, @fullNameAr, @nationalityCode, @iban, @bankCode,
           @basicSalary, @housingAllowance, @transportAllowance, @otherAllowances,
           @gosiNumber, @jobTitle, @projectID, @iqamaExpiry, @changedBy)`,
        {
          iqamaNumber, fullName,
          fullNameAr:          get('FullNameAr') || null,
          nationalityCode,     iban,
          bankCode:            get('BankCode') || null,
          basicSalary,
          housingAllowance:    parseFloat(get('HousingAllowance')) || 0,
          transportAllowance:  parseFloat(get('TransportAllowance')) || 0,
          otherAllowances:     parseFloat(get('OtherAllowances')) || 0,
          gosiNumber:          get('GOSINumber') || null,
          jobTitle:            get('JobTitle') || null,
          projectID:           isNaN(projectID as unknown as number) ? null : projectID,
          iqamaExpiry:         get('IqamaExpiry') || null,
          changedBy:           req.user?.username,
        }
      );
      inserted.push(result.recordset[0]?.LaborID as number);
    } catch (err: unknown) {
      const e = err as { number?: number };
      if (e.number === 2627) {
        skipped.push({ row: i + 1, reason: `Iqama ${iqamaNumber} already exists` });
      } else {
        skipped.push({ row: i + 1, reason: 'Database error' });
      }
    }
  }

  res.status(201).json({ message: `Import complete`, inserted: inserted.length, skipped });
});

// GET /api/labor/wps/generate?month=2026-03  (Admin, Finance)
router.get('/wps/generate', requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const month = req.query.month as string;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: 'month required (format: YYYY-MM)' });
    return;
  }
  try {
    const laborRows = await runQuery<{
      IqamaNumber: string; FullName: string; IBAN: string; BankCode: string;
      BasicSalary: number; HousingAllowance: number; TransportAllowance: number; OtherAllowances: number;
    }>(
      `SELECT IqamaNumber, FullName, IBAN, BankCode, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances
       FROM Labor WHERE IsActive = 1 ORDER BY FullName`
    );

    // WPS SIF v3.1 format (pipe-delimited)
    const lines: string[] = [];
    let totalSalary = 0;
    for (const l of laborRows) {
      const net = l.BasicSalary + l.HousingAllowance + l.TransportAllowance + l.OtherAllowances;
      totalSalary += net;
      // SIF record: EmployerCode|IqamaNo|IBAN|SalaryMonth|BasicSalary|HousingAllow|TransportAllow|OtherAllow|NetSalary
      lines.push([
        'INDIGOBLD',
        l.IqamaNumber,
        l.IBAN,
        month,
        l.BasicSalary.toFixed(2),
        l.HousingAllowance.toFixed(2),
        l.TransportAllowance.toFixed(2),
        l.OtherAllowances.toFixed(2),
        net.toFixed(2),
      ].join('|'));
    }
    const sif = lines.join('\n');
    const fileName = `WPS_${month}_IndigoBuilders.sif`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(sif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
