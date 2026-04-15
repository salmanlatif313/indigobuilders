import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

export const EXPENSE_CATEGORIES = ['Materials', 'Equipment', 'Subcontractor', 'Labor', 'Transport', 'Other'];

interface ExpenseRow {
  ExpenseID: number; ProjectID: number; ProjectCode: string; ProjectName: string;
  ExpenseDate: string; Category: string; Description: string;
  Amount: number; VATAmount: number; Vendor: string; ReferenceNo: string;
  Notes: string; ChangedBy: string; ChangeDate: string;
}

// GET /api/expenses?projectId=&category=&from=&to=
router.get('/', async (req: Request, res: Response) => {
  const { projectId, category, from, to } = req.query as Record<string, string>;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};
  if (projectId) { where += ' AND e.ProjectID = @projectId'; params.projectId = parseInt(projectId); }
  if (category)  { where += ' AND e.Category = @category';  params.category = category; }
  if (from)      { where += ' AND e.ExpenseDate >= @from';  params.from = from; }
  if (to)        { where += ' AND e.ExpenseDate <= @to';    params.to = to; }

  try {
    const rows = await runQuery<ExpenseRow>(
      `SELECT e.ExpenseID, e.ProjectID, ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
              CONVERT(NVARCHAR(10), e.ExpenseDate, 23) AS ExpenseDate,
              e.Category, e.Description, e.Amount, e.VATAmount,
              ISNULL(e.Vendor,'') AS Vendor, ISNULL(e.ReferenceNo,'') AS ReferenceNo,
              ISNULL(e.Notes,'') AS Notes, ISNULL(e.ChangedBy,'') AS ChangedBy,
              CONVERT(NVARCHAR(23), e.ChangeDate, 121) AS ChangeDate
       FROM ProjectExpenses e
       LEFT JOIN Projects p ON p.ProjectID = e.ProjectID
       ${where}
       ORDER BY e.ExpenseDate DESC, e.ExpenseID DESC`,
      params
    );
    const total = rows.reduce((s, r) => s + Number(r.Amount) + Number(r.VATAmount), 0);
    res.json({ expenses: rows, count: rows.length, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/expenses/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rows = await runQuery<ExpenseRow>(
      `SELECT e.ExpenseID, e.ProjectID, ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
              CONVERT(NVARCHAR(10), e.ExpenseDate, 23) AS ExpenseDate,
              e.Category, e.Description, e.Amount, e.VATAmount,
              ISNULL(e.Vendor,'') AS Vendor, ISNULL(e.ReferenceNo,'') AS ReferenceNo,
              ISNULL(e.Notes,'') AS Notes, ISNULL(e.ChangedBy,'') AS ChangedBy,
              CONVERT(NVARCHAR(23), e.ChangeDate, 121) AS ChangeDate
       FROM ProjectExpenses e LEFT JOIN Projects p ON p.ProjectID = e.ProjectID
       WHERE e.ExpenseID = @id`,
      { id: parseInt(req.params.id) }
    );
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ expense: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/expenses  (Admin, Finance, PM)
router.post('/', requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const { projectID, expenseDate, category, description, amount, vatAmount, vendor, referenceNo, notes } =
    req.body as { projectID?: number; expenseDate: string; category: string; description: string;
      amount: number; vatAmount?: number; vendor?: string; referenceNo?: string; notes?: string };

  if (!expenseDate || !category || !description || !amount) {
    res.status(400).json({ error: 'expenseDate, category, description, amount required' }); return;
  }
  if (!EXPENSE_CATEGORIES.includes(category)) {
    res.status(400).json({ error: `category must be one of: ${EXPENSE_CATEGORIES.join(', ')}` }); return;
  }
  try {
    const result = await runQueryResult(
      `INSERT INTO ProjectExpenses (ProjectID, ExpenseDate, Category, Description, Amount, VATAmount, Vendor, ReferenceNo, Notes, ChangedBy)
       OUTPUT INSERTED.ExpenseID
       VALUES (@projectID, @expenseDate, @category, @description, @amount, @vatAmount, @vendor, @referenceNo, @notes, @changedBy)`,
      { projectID: projectID || null, expenseDate, category, description, amount,
        vatAmount: vatAmount || 0, vendor: vendor || null, referenceNo: referenceNo || null,
        notes: notes || null, changedBy: req.user?.username }
    );
    res.status(201).json({ message: 'Expense created', expenseId: result.recordset[0]?.ExpenseID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/expenses/:id  (Admin, Finance, PM)
router.put('/:id', requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const { projectID, expenseDate, category, description, amount, vatAmount, vendor, referenceNo, notes } =
    req.body as { projectID?: number; expenseDate?: string; category?: string; description?: string;
      amount?: number; vatAmount?: number; vendor?: string; referenceNo?: string; notes?: string };
  try {
    await runQueryResult(
      `UPDATE ProjectExpenses SET
         ProjectID=@projectID, ExpenseDate=@expenseDate, Category=@category,
         Description=@description, Amount=@amount, VATAmount=@vatAmount,
         Vendor=@vendor, ReferenceNo=@referenceNo, Notes=@notes,
         ChangedBy=@changedBy, ChangeDate=GETDATE()
       WHERE ExpenseID=@id`,
      { id: parseInt(req.params.id), projectID: projectID || null, expenseDate, category, description,
        amount, vatAmount: vatAmount || 0, vendor: vendor || null, referenceNo: referenceNo || null,
        notes: notes || null, changedBy: req.user?.username }
    );
    res.json({ message: 'Expense updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/expenses/:id  (Admin, Finance)
router.delete('/:id', requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  try {
    await runQueryResult(`DELETE FROM ProjectExpenses WHERE ExpenseID=@id`, { id: parseInt(req.params.id) });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/expenses/summary/by-project  — totals per project + category
router.get('/summary/by-project', async (_req: Request, res: Response) => {
  try {
    const rows = await runQuery<{ ProjectID: number; ProjectCode: string; ProjectName: string; Category: string; Total: number; TaxTotal: number }>(
      `SELECT e.ProjectID, ISNULL(p.ProjectCode,'UNASSIGNED') AS ProjectCode,
              ISNULL(p.ProjectName,'Unassigned') AS ProjectName,
              e.Category,
              CAST(SUM(e.Amount) AS DECIMAL(18,2)) AS Total,
              CAST(SUM(e.VATAmount) AS DECIMAL(18,2)) AS TaxTotal
       FROM ProjectExpenses e
       LEFT JOIN Projects p ON p.ProjectID = e.ProjectID
       GROUP BY e.ProjectID, p.ProjectCode, p.ProjectName, e.Category
       ORDER BY p.ProjectCode, e.Category`
    );
    res.json({ rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
