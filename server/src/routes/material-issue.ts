import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();

interface IssueRow {
  IssueHeaderID: number; DCNumber: string; ProjectID: number;
  ProjectCode: string; ProjectName: string; FromStore: string; ToSite: string;
  IssueDate: string; RequestedBy: string; IssuedBy: string; AuthorizedBy: string;
  Status: string; Notes: string; TotalCost: number; ChangedBy: string; ChangeDate: string;
}

interface IssueLineRow {
  IssueLineID: number; IssueHeaderID: number; StockID: number;
  Description: string; Unit: string; RequestedQty: number;
  IssuedQty: number; UnitCost: number; TotalCost: number;
}

// GET /
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { projectId, status } = req.query as Record<string, string>;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};
  if (projectId) { where += ' AND m.ProjectID=@projectId'; params.projectId = parseInt(projectId); }
  if (status)    { where += ' AND m.Status=@status';       params.status = status; }
  try {
    const rows = await runQuery<IssueRow>(`
      SELECT m.IssueHeaderID, m.DCNumber, m.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        ISNULL(m.FromStore,'') AS FromStore, ISNULL(m.ToSite,'') AS ToSite,
        CONVERT(NVARCHAR(10),m.IssueDate,23) AS IssueDate,
        ISNULL(m.RequestedBy,'') AS RequestedBy, ISNULL(m.IssuedBy,'') AS IssuedBy,
        ISNULL(m.AuthorizedBy,'') AS AuthorizedBy,
        m.Status, ISNULL(m.Notes,'') AS Notes,
        ISNULL((SELECT SUM(TotalCost) FROM MaterialIssueLines WHERE IssueHeaderID=m.IssueHeaderID),0) AS TotalCost,
        ISNULL(m.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),m.ChangeDate,120),'') AS ChangeDate
      FROM MaterialIssueHeaders m
      LEFT JOIN Projects p ON p.ProjectID=m.ProjectID
      ${where} ORDER BY m.ChangeDate DESC
    `, params);
    res.json({ issues: rows, count: rows.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /:id — header + lines
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const issues = await runQuery<IssueRow>(`
      SELECT m.IssueHeaderID, m.DCNumber, m.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        ISNULL(m.FromStore,'') AS FromStore, ISNULL(m.ToSite,'') AS ToSite,
        CONVERT(NVARCHAR(10),m.IssueDate,23) AS IssueDate,
        ISNULL(m.RequestedBy,'') AS RequestedBy, ISNULL(m.IssuedBy,'') AS IssuedBy,
        ISNULL(m.AuthorizedBy,'') AS AuthorizedBy,
        m.Status, ISNULL(m.Notes,'') AS Notes,
        ISNULL((SELECT SUM(TotalCost) FROM MaterialIssueLines WHERE IssueHeaderID=m.IssueHeaderID),0) AS TotalCost,
        ISNULL(m.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),m.ChangeDate,120),'') AS ChangeDate
      FROM MaterialIssueHeaders m
      LEFT JOIN Projects p ON p.ProjectID=m.ProjectID
      WHERE m.IssueHeaderID=@id
    `, { id });
    if (!issues[0]) { res.status(404).json({ error: 'DC not found' }); return; }

    const lines = await runQuery<IssueLineRow>(`
      SELECT IssueLineID, IssueHeaderID, StockID, Description, ISNULL(Unit,'') AS Unit,
        RequestedQty, IssuedQty, UnitCost, TotalCost
      FROM MaterialIssueLines WHERE IssueHeaderID=@id ORDER BY IssueLineID
    `, { id });

    res.json({ issue: issues[0], lines });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST / — create DC
router.post('/', requireAuth, requireRole('Admin', 'Finance', 'PM', 'Engineer'), async (req: Request, res: Response) => {
  const {
    dcNumber, projectId, fromStore, toSite, issueDate,
    requestedBy, notes, lines,
  } = req.body as {
    dcNumber: string; projectId: number; fromStore?: string; toSite?: string;
    issueDate: string; requestedBy?: string; notes?: string;
    lines: { stockId: number; description: string; unit?: string; requestedQty: number }[];
  };

  if (!dcNumber || !projectId || !issueDate || !lines?.length) {
    res.status(400).json({ error: 'dcNumber, projectId, issueDate and lines are required' }); return;
  }

  // Validate stock availability
  for (const ln of lines) {
    const stock = await runQuery<{ CurrentQty: number; UnitCost: number; ItemDescription: string }>(`
      SELECT CurrentQty, UnitCost, ItemDescription FROM StoreStock
      WHERE StockID=@stockId AND ProjectID=@projectId
    `, { stockId: ln.stockId, projectId });
    if (!stock[0]) {
      res.status(400).json({ error: `Stock item #${ln.stockId} not found for this project` }); return;
    }
    if (Number(stock[0].CurrentQty) < Number(ln.requestedQty)) {
      res.status(400).json({
        error: `Insufficient stock for "${stock[0].ItemDescription}". Available: ${stock[0].CurrentQty}`,
      }); return;
    }
  }

  try {
    const result = await runQueryResult<{ IssueHeaderID: number }>(`
      INSERT INTO MaterialIssueHeaders
        (DCNumber,ProjectID,FromStore,ToSite,IssueDate,RequestedBy,Status,Notes,ChangedBy,ChangeDate)
      OUTPUT INSERTED.IssueHeaderID
      VALUES (@dcNumber,@projectId,@fromStore,@toSite,@issueDate,@requestedBy,'Draft',@notes,@changedBy,GETDATE())
    `, {
      dcNumber, projectId, fromStore: fromStore || null, toSite: toSite || null,
      issueDate, requestedBy: requestedBy || null, notes: notes || null,
      changedBy: req.user?.username,
    });
    const issueId = result.recordset[0].IssueHeaderID;

    for (const ln of lines) {
      const stock = await runQuery<{ UnitCost: number }>(`SELECT UnitCost FROM StoreStock WHERE StockID=@stockId`, { stockId: ln.stockId });
      const unitCost = Number(stock[0]?.UnitCost || 0);
      const totalCost = Number(ln.requestedQty) * unitCost;

      await runQueryResult(`
        INSERT INTO MaterialIssueLines
          (IssueHeaderID,StockID,Description,Unit,RequestedQty,IssuedQty,UnitCost,TotalCost)
        VALUES (@issueId,@stockId,@desc,@unit,@reqQty,0,@unitCost,0)
      `, {
        issueId, stockId: ln.stockId, desc: ln.description, unit: ln.unit || null,
        reqQty: ln.requestedQty, unitCost, totalCost: 0,
      });
    }

    res.status(201).json({ message: 'DC created', issueId, dcNumber });
  } catch (err: unknown) {
    if ((err as { number?: number }).number === 2627)
      res.status(409).json({ error: `DC number "${dcNumber}" already exists` });
    else { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
});

// PUT /:id/issue — approve and issue (PM/Admin), deducts stock and posts to expenses
router.put('/:id/issue', requireAuth, requireRole('Admin', 'PM'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { authorizedBy, lines } = req.body as {
    authorizedBy?: string;
    lines?: { issueLineId: number; issuedQty: number }[];
  };

  try {
    const existing = await runQuery<{ Status: string; ProjectID: number; DCNumber: string; IssueDate: string }>(`
      SELECT Status, ProjectID, DCNumber, CONVERT(NVARCHAR(10),IssueDate,23) AS IssueDate
      FROM MaterialIssueHeaders WHERE IssueHeaderID=@id
    `, { id });
    if (!existing[0]) { res.status(404).json({ error: 'DC not found' }); return; }
    if (existing[0].Status === 'Issued') { res.status(400).json({ error: 'DC already issued' }); return; }

    let totalExpense = 0;

    for (const ln of (lines || [])) {
      const line = await runQuery<{ StockID: number; UnitCost: number; Description: string }>(`
        SELECT StockID, UnitCost, Description FROM MaterialIssueLines WHERE IssueLineID=@id
      `, { id: ln.issueLineId });
      if (!line[0]) continue;

      const totalCost = Number(ln.issuedQty) * Number(line[0].UnitCost);
      totalExpense += totalCost;

      await runQueryResult(`
        UPDATE MaterialIssueLines SET IssuedQty=@qty, TotalCost=@cost
        WHERE IssueLineID=@id
      `, { id: ln.issueLineId, qty: ln.issuedQty, cost: totalCost });

      // Deduct from store stock
      await runQueryResult(`
        UPDATE StoreStock SET
          CurrentQty = CurrentQty - @qty,
          TotalValue = (CurrentQty - @qty) * UnitCost,
          LastIssueDate = GETDATE(), ChangedBy=@changedBy, ChangeDate=GETDATE()
        WHERE StockID=@stockId
      `, { stockId: line[0].StockID, qty: ln.issuedQty, changedBy: req.user?.username });

      // Auto-post to ProjectExpenses
      await runQueryResult(`
        INSERT INTO ProjectExpenses
          (ProjectID,ExpenseDate,Category,Description,Amount,VATAmount,Vendor,ReferenceNo,ChangedBy,ChangeDate)
        VALUES
          (@projectId,@date,'Materials',@desc,@amount,0,'Store Issue',@ref,@changedBy,GETDATE())
      `, {
        projectId: existing[0].ProjectID,
        date: existing[0].IssueDate,
        desc: `DC: ${existing[0].DCNumber} — ${line[0].Description}`,
        amount: totalCost,
        ref: existing[0].DCNumber,
        changedBy: req.user?.username,
      });
    }

    await runQueryResult(`
      UPDATE MaterialIssueHeaders SET
        Status='Issued', IssuedBy=@issuedBy, AuthorizedBy=@authBy,
        ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE IssueHeaderID=@id
    `, {
      id, issuedBy: req.user?.username,
      authBy: authorizedBy || req.user?.username,
      changedBy: req.user?.username,
    });

    res.json({ message: 'DC issued and stock deducted', totalExpense });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /:id — Draft only
router.delete('/:id', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const existing = await runQuery<{ Status: string }>(`SELECT Status FROM MaterialIssueHeaders WHERE IssueHeaderID=@id`, { id });
    if (!existing[0]) { res.status(404).json({ error: 'DC not found' }); return; }
    if (existing[0].Status !== 'Draft') {
      res.status(400).json({ error: 'Only Draft DCs can be deleted' }); return;
    }
    await runQueryResult(`DELETE FROM MaterialIssueHeaders WHERE IssueHeaderID=@id`, { id });
    res.json({ message: 'DC deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
