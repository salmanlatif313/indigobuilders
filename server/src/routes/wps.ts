import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

interface RunRow {
  RunID: number; PayrollMonth: string; GeneratedDate: string; GeneratedBy: string;
  SIFFileName: string; TotalLabor: number; TotalAmount: number; Status: string; Notes: string;
}

interface LineRow {
  LineID: number; LaborID: number; FullName: string; IqamaNumber: string; IBAN: string;
  BasicSalary: number; HousingAllowance: number; TransportAllowance: number;
  OtherAllowances: number; Deductions: number; NetSalary: number; WorkingDays: number;
}

// GET /api/wps  — list all runs
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await runQuery<RunRow>(
      `SELECT RunID, PayrollMonth, GeneratedDate, GeneratedBy, SIFFileName,
              TotalLabor, TotalAmount, Status, Notes
       FROM WPS_PayrollRuns ORDER BY RunID DESC`
    );
    res.json({ runs: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/wps/:id/lines  — lines for a run
router.get('/:id/lines', async (req: Request, res: Response) => {
  try {
    const rows = await runQuery<LineRow>(
      `SELECT wl.LineID, wl.LaborID, l.FullName, l.IqamaNumber, l.IBAN,
              wl.BasicSalary, wl.HousingAllowance, wl.TransportAllowance,
              wl.OtherAllowances, wl.Deductions, wl.NetSalary, wl.WorkingDays
       FROM WPS_PayrollLines wl
       JOIN Labor l ON l.LaborID = wl.LaborID
       WHERE wl.RunID = @id
       ORDER BY l.FullName`,
      { id: parseInt(req.params.id) }
    );
    res.json({ lines: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/wps  — generate new payroll run (Admin, Finance)
router.post('/', requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const { payrollMonth } = req.body as { payrollMonth: string };
  if (!payrollMonth || !/^\d{4}-\d{2}$/.test(payrollMonth)) {
    res.status(400).json({ error: 'payrollMonth required (YYYY-MM)' });
    return;
  }

  try {
    // Check for duplicate
    const exists = await runQuery<{ RunID: number }>(
      `SELECT RunID FROM WPS_PayrollRuns WHERE PayrollMonth = @month`,
      { month: payrollMonth }
    );
    if (exists.length > 0) {
      res.status(409).json({ error: `Payroll run for ${payrollMonth} already exists` });
      return;
    }

    // Fetch active labor
    const labor = await runQuery<{
      LaborID: number; FullName: string; IqamaNumber: string; IBAN: string;
      BasicSalary: number; HousingAllowance: number; TransportAllowance: number; OtherAllowances: number;
    }>(
      `SELECT LaborID, FullName, IqamaNumber, IBAN,
              BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances
       FROM Labor WHERE IsActive = 1 ORDER BY FullName`
    );

    if (labor.length === 0) {
      res.status(400).json({ error: 'No active labor records found' });
      return;
    }

    let totalAmount = 0;
    const lines = labor.map(l => {
      const net = l.BasicSalary + l.HousingAllowance + l.TransportAllowance + l.OtherAllowances;
      totalAmount += net;
      return { ...l, net };
    });

    const sifFileName = `WPS_${payrollMonth}_IndigoBuilders.sif`;

    // Create run
    const runResult = await runQueryResult(
      `INSERT INTO WPS_PayrollRuns (PayrollMonth, GeneratedBy, SIFFileName, TotalLabor, TotalAmount, Status, ChangedBy)
       OUTPUT INSERTED.RunID
       VALUES (@month, @generatedBy, @sifFileName, @totalLabor, @totalAmount, 'Draft', @changedBy)`,
      { month: payrollMonth, generatedBy: req.user?.username, sifFileName, totalLabor: labor.length, totalAmount, changedBy: req.user?.username }
    );
    const runId = runResult.recordset[0]?.RunID as number;

    // Insert lines
    for (const l of lines) {
      await runQueryResult(
        `INSERT INTO WPS_PayrollLines (RunID, LaborID, BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances, Deductions, NetSalary, WorkingDays)
         VALUES (@runId, @laborId, @basic, @housing, @transport, @other, 0, @net, 30)`,
        { runId, laborId: l.LaborID, basic: l.BasicSalary, housing: l.HousingAllowance, transport: l.TransportAllowance, other: l.OtherAllowances, net: l.net }
      );
    }

    res.status(201).json({ message: 'Payroll run created', runId, totalLabor: labor.length, totalAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/wps/:id/sif  — download SIF file
router.get('/:id/sif', requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  try {
    const runs = await runQuery<RunRow>(
      `SELECT RunID, PayrollMonth, SIFFileName FROM WPS_PayrollRuns WHERE RunID = @id`,
      { id: parseInt(req.params.id) }
    );
    if (!runs[0]) { res.status(404).json({ error: 'Run not found' }); return; }

    const lines = await runQuery<{
      IqamaNumber: string; IBAN: string;
      BasicSalary: number; HousingAllowance: number; TransportAllowance: number; OtherAllowances: number; NetSalary: number;
    }>(
      `SELECT l.IqamaNumber, l.IBAN,
              wl.BasicSalary, wl.HousingAllowance, wl.TransportAllowance, wl.OtherAllowances, wl.NetSalary
       FROM WPS_PayrollLines wl JOIN Labor l ON l.LaborID = wl.LaborID
       WHERE wl.RunID = @id ORDER BY l.FullName`,
      { id: parseInt(req.params.id) }
    );

    // WPS SIF v3.1 format
    const sif = lines.map(l =>
      ['INDIGOBLD', l.IqamaNumber, l.IBAN, runs[0].PayrollMonth,
        l.BasicSalary.toFixed(2), l.HousingAllowance.toFixed(2),
        l.TransportAllowance.toFixed(2), l.OtherAllowances.toFixed(2),
        l.NetSalary.toFixed(2)
      ].join('|')
    ).join('\n');

    res.setHeader('Content-Disposition', `attachment; filename="${runs[0].SIFFileName}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(sif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/wps/:id/lines/:lineId  — update deductions for one line (Admin, Finance)
router.put('/:id/lines/:lineId', requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const runId  = parseInt(req.params.id);
  const lineId = parseInt(req.params.lineId);
  const { deductions } = req.body as { deductions: number };
  if (deductions === undefined || isNaN(deductions) || deductions < 0) {
    res.status(400).json({ error: 'deductions must be a non-negative number' }); return;
  }
  try {
    // Get current line data to recalculate NetSalary
    const lines = await runQuery<{ BasicSalary: number; HousingAllowance: number; TransportAllowance: number; OtherAllowances: number }>(
      `SELECT BasicSalary, HousingAllowance, TransportAllowance, OtherAllowances
       FROM WPS_PayrollLines WHERE LineID=@lineId AND RunID=@runId`,
      { lineId, runId }
    );
    if (!lines[0]) { res.status(404).json({ error: 'Line not found' }); return; }

    const l = lines[0];
    const gross    = Number(l.BasicSalary) + Number(l.HousingAllowance) + Number(l.TransportAllowance) + Number(l.OtherAllowances);
    const netSalary = Math.max(0, gross - deductions);

    await runQueryResult(
      `UPDATE WPS_PayrollLines SET Deductions=@deductions, NetSalary=@net WHERE LineID=@lineId AND RunID=@runId`,
      { deductions, net: netSalary, lineId, runId }
    );

    // Recalculate run totals
    await runQueryResult(
      `UPDATE WPS_PayrollRuns SET
         TotalAmount = (SELECT ISNULL(SUM(NetSalary),0) FROM WPS_PayrollLines WHERE RunID=@runId),
         ChangedBy=@changedBy, ChangeDate=GETDATE()
       WHERE RunID=@runId`,
      { runId, changedBy: req.user?.username }
    );

    res.json({ message: 'Line updated', netSalary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/wps/:id/status  (Admin, Finance)
router.put('/:id/status', requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const { status } = req.body as { status: string };
  if (!['Draft', 'Submitted', 'Accepted'].includes(status)) {
    res.status(400).json({ error: 'status must be Draft, Submitted, or Accepted' });
    return;
  }
  try {
    await runQueryResult(
      `UPDATE WPS_PayrollRuns SET Status=@status, ChangedBy=@changedBy, ChangeDate=GETDATE() WHERE RunID=@id`,
      { id: parseInt(req.params.id), status, changedBy: req.user?.username }
    );
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/wps/:id  (Admin only, Draft only)
router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const rows = await runQuery<{ Status: string }>(`SELECT Status FROM WPS_PayrollRuns WHERE RunID=@id`, { id: parseInt(req.params.id) });
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    if (rows[0].Status !== 'Draft') { res.status(400).json({ error: 'Only Draft runs can be deleted' }); return; }
    await runQueryResult(`DELETE FROM WPS_PayrollLines WHERE RunID=@id`, { id: parseInt(req.params.id) });
    await runQueryResult(`DELETE FROM WPS_PayrollRuns WHERE RunID=@id`, { id: parseInt(req.params.id) });
    res.json({ message: 'Run deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
