import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

interface ProjectRow {
  ProjectID: number; ProjectCode: string; ProjectName: string; ClientName: string;
  ContractValue: number; StartDate: string; EndDate: string; Status: string;
  Location: string; ManagerUserID: number; ManagerName: string;
  ActiveLabor: number; InvoiceCount: number; TotalInvoiced: number;
  TotalExpenses: number; Notes: string;
}

// GET /api/projects
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await runQuery<ProjectRow>(
      `SELECT ProjectID, ProjectCode, ProjectName, ClientName, ContractValue,
              StartDate, EndDate, Status, Location, ManagerUserID, ManagerName,
              ActiveLabor, InvoiceCount, TotalInvoiced, TotalExpenses, Notes
       FROM View_ProjectSummary
       ORDER BY ProjectID DESC`
    );
    res.json({ projects: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rows = await runQuery<ProjectRow>(
      `SELECT ProjectID, ProjectCode, ProjectName, ClientName, ContractValue,
              StartDate, EndDate, Status, Location, ManagerUserID, ManagerName,
              ActiveLabor, InvoiceCount, TotalInvoiced, TotalExpenses, Notes
       FROM View_ProjectSummary WHERE ProjectID = @id`,
      { id: parseInt(req.params.id) }
    );
    if (!rows[0]) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json({ project: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id/financials
router.get('/:id/financials', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const [summary, invoiceBreakdown, expenseBreakdown, laborCost, recentExpenses, recentInvoices] = await Promise.all([
      runQuery<{ ContractValue: number; TotalInvoiced: number; TotalExpenses: number; ActiveLabor: number }>(
        `SELECT ContractValue, TotalInvoiced, TotalExpenses, ActiveLabor FROM View_ProjectSummary WHERE ProjectID=@id`, { id }
      ),
      runQuery<{ ZatcaStatus: string; Count: number; Amount: number }>(
        `SELECT ZatcaStatus,
                COUNT(*) AS Count,
                ISNULL(SUM(TotalAmount),0) AS Amount
         FROM Invoices WHERE ProjectID=@id GROUP BY ZatcaStatus`, { id }
      ),
      runQuery<{ Category: string; Total: number }>(
        `SELECT Category, CAST(SUM(Amount+VATAmount) AS DECIMAL(18,2)) AS Total
         FROM ProjectExpenses WHERE ProjectID=@id GROUP BY Category ORDER BY Total DESC`, { id }
      ),
      runQuery<{ HeadCount: number; MonthlyGross: number }>(
        `SELECT COUNT(*) AS HeadCount,
                CAST(ISNULL(SUM(BasicSalary+HousingAllowance+TransportAllowance+OtherAllowances),0) AS DECIMAL(18,2)) AS MonthlyGross
         FROM Labor WHERE ProjectID=@id AND IsActive=1`, { id }
      ),
      runQuery<{ ExpenseDate: string; Category: string; Description: string; Amount: number; VATAmount: number; Vendor: string }>(
        `SELECT TOP 5 CONVERT(NVARCHAR(10),ExpenseDate,23) AS ExpenseDate, Category, Description, Amount, VATAmount, ISNULL(Vendor,'') AS Vendor
         FROM ProjectExpenses WHERE ProjectID=@id ORDER BY ExpenseDate DESC`, { id }
      ),
      runQuery<{ InvoiceNumber: string; TotalAmount: number; ZatcaStatus: string; InvoiceDate: string }>(
        `SELECT TOP 5 InvoiceNumber, TotalAmount, ZatcaStatus, CONVERT(NVARCHAR(10),InvoiceDate,23) AS InvoiceDate
         FROM Invoices WHERE ProjectID=@id ORDER BY InvoiceDate DESC`, { id }
      ),
    ]);

    if (!summary[0]) { res.status(404).json({ error: 'Project not found' }); return; }

    const s = summary[0];
    const contractValue   = Number(s.ContractValue);
    const totalInvoiced   = Number(s.TotalInvoiced);
    const totalExpenses   = Number(s.TotalExpenses);
    const monthlyLabor    = Number(laborCost[0]?.MonthlyGross || 0);
    const totalCollected  = invoiceBreakdown.find(b => b.ZatcaStatus === 'Cleared')?.Amount || 0;
    const remaining       = contractValue - totalInvoiced;
    const grossMargin     = contractValue - totalExpenses;
    const invoicedPct     = contractValue > 0 ? Math.round((totalInvoiced / contractValue) * 100) : 0;
    const expensePct      = contractValue > 0 ? Math.round((totalExpenses / contractValue) * 100) : 0;

    res.json({
      summary: { contractValue, totalInvoiced, totalCollected, totalExpenses, remaining, grossMargin, invoicedPct, expensePct, monthlyLabor, headCount: laborCost[0]?.HeadCount || 0 },
      invoiceBreakdown,
      expenseBreakdown,
      recentExpenses,
      recentInvoices,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects  (Admin, PM)
router.post('/', requireRole('Admin', 'PM'), async (req: Request, res: Response) => {
  const { ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, MinInvoiceAmount } =
    req.body as { ProjectCode: string; ProjectName: string; ClientName?: string; ContractValue?: number; StartDate?: string; EndDate?: string; Status?: string; Location?: string; ManagerUserID?: number; Notes?: string; MinInvoiceAmount?: number };
  if (!ProjectCode || !ProjectName) { res.status(400).json({ error: 'Project code and name are required' }); return; }
  try {
    const result = await runQueryResult(
      `INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, MinInvoiceAmount, ChangedBy)
       OUTPUT INSERTED.ProjectID
       VALUES (@projectCode, @projectName, @clientName, @contractValue, @startDate, @endDate, @status, @location, @managerUserID, @notes, @minInvoiceAmount, @changedBy)`,
      { projectCode: ProjectCode, projectName: ProjectName, clientName: ClientName || null, contractValue: ContractValue || 0, startDate: StartDate || null, endDate: EndDate || null, status: Status || 'Active', location: Location || null, managerUserID: ManagerUserID || null, notes: Notes || null, minInvoiceAmount: MinInvoiceAmount || null, changedBy: req.user?.username }
    );
    res.status(201).json({ message: 'Project created', projectId: result.recordset[0]?.ProjectID });
  } catch (err: unknown) {
    const e = err as { number?: number };
    if (e.number === 2627) { res.status(409).json({ error: 'Project code already exists' }); }
    else { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
});

// PUT /api/projects/:id  (Admin, PM)
router.put('/:id', requireRole('Admin', 'PM'), async (req: Request, res: Response) => {
  const { ProjectName, ClientName, ContractValue, StartDate, EndDate, Status, Location, ManagerUserID, Notes, MinInvoiceAmount } = req.body as {
    ProjectName?: string; ClientName?: string; ContractValue?: number; StartDate?: string; EndDate?: string;
    Status?: string; Location?: string; ManagerUserID?: number; Notes?: string; MinInvoiceAmount?: number;
  };
  try {
    await runQueryResult(
      `UPDATE Projects SET
         ProjectName=@projectName, ClientName=@clientName, ContractValue=@contractValue,
         StartDate=@startDate, EndDate=@endDate, Status=@status, Location=@location,
         ManagerUserID=@managerUserID, Notes=@notes, MinInvoiceAmount=@minInvoiceAmount,
         ChangedBy=@changedBy, ChangeDate=GETDATE()
       WHERE ProjectID=@id`,
      { id: parseInt(req.params.id), projectName: ProjectName, clientName: ClientName || null, contractValue: ContractValue || 0, startDate: StartDate || null, endDate: EndDate || null, status: Status || 'Active', location: Location || null, managerUserID: ManagerUserID || null, notes: Notes || null, minInvoiceAmount: MinInvoiceAmount || null, changedBy: req.user?.username }
    );
    res.json({ message: 'Project updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id  (Admin only)
router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    await runQueryResult(`DELETE FROM Projects WHERE ProjectID=@id`, { id: parseInt(req.params.id) });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
