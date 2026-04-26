import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();

interface BOQRow {
  BOQHeaderID: number; ProjectID: number; ProjectCode: string; ProjectName: string;
  BOQNumber: string; Title: string; RevisionNumber: number; BOQDate: string;
  Status: string; TotalAmount: number; Notes: string; ChangedBy: string; ChangeDate: string;
}

interface BOQItemRow {
  BOQItemID: number; BOQHeaderID: number; SerialNo: string; MainScope: string;
  Category: string; Description: string; Unit: string; Quantity: number;
  UnitRate: number; Amount: number; ProfitPct: number; ProfitAmount: number;
  TotalWithProfit: number; ProcurementStatus: string;
}

// GET / — list BOQ headers
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { projectId } = req.query as Record<string, string>;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};
  if (projectId) { where += ' AND b.ProjectID=@projectId'; params.projectId = parseInt(projectId); }
  try {
    const rows = await runQuery<BOQRow>(`
      SELECT b.BOQHeaderID, b.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode,
        ISNULL(p.ProjectName,'') AS ProjectName,
        b.BOQNumber, b.Title, b.RevisionNumber,
        CONVERT(NVARCHAR(10),b.BOQDate,23) AS BOQDate,
        b.Status, b.TotalAmount,
        ISNULL(b.Notes,'') AS Notes,
        ISNULL(b.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),b.ChangeDate,120),'') AS ChangeDate
      FROM BOQ b
      LEFT JOIN Projects p ON p.ProjectID = b.ProjectID
      ${where} ORDER BY b.ChangeDate DESC
    `, params);
    res.json({ boqs: rows, count: rows.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /:id/items — items for a BOQ
router.get('/:id/items', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const items = await runQuery<BOQItemRow>(`
      SELECT BOQItemID, BOQHeaderID,
        ISNULL(SerialNo,'') AS SerialNo, ISNULL(MainScope,'') AS MainScope,
        ISNULL(Category,'') AS Category, Description, ISNULL(Unit,'') AS Unit,
        Quantity, UnitRate, Amount, ProfitPct, ProfitAmount, TotalWithProfit,
        ProcurementStatus
      FROM BOQItems WHERE BOQHeaderID=@id ORDER BY BOQItemID
    `, { id });
    res.json({ items, count: items.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /:id — header detail
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const rows = await runQuery<BOQRow>(`
      SELECT b.BOQHeaderID, b.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        b.BOQNumber, b.Title, b.RevisionNumber,
        CONVERT(NVARCHAR(10),b.BOQDate,23) AS BOQDate,
        b.Status, b.TotalAmount, ISNULL(b.Notes,'') AS Notes,
        ISNULL(b.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),b.ChangeDate,120),'') AS ChangeDate
      FROM BOQ b LEFT JOIN Projects p ON p.ProjectID=b.ProjectID
      WHERE b.BOQHeaderID=@id
    `, { id });
    if (!rows[0]) { res.status(404).json({ error: 'BOQ not found' }); return; }
    res.json({ boq: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST / — create BOQ header + items
router.post('/', requireAuth, requireRole('Admin', 'PM'), async (req: Request, res: Response) => {
  const { projectId, boqNumber, title, revisionNumber, boqDate, notes, items } = req.body as {
    projectId: number; boqNumber: string; title: string; revisionNumber?: number;
    boqDate: string; notes?: string;
    items?: { serialNo?: string; mainScope?: string; category?: string; description: string;
              unit?: string; quantity: number; unitRate: number; profitPct?: number }[];
  };

  if (!projectId || !boqNumber || !title || !boqDate) {
    res.status(400).json({ error: 'projectId, boqNumber, title and boqDate are required' }); return;
  }

  const lineItems = (items || []).map(it => {
    const amt = Number(it.quantity) * Number(it.unitRate);
    const profitAmt = amt * (Number(it.profitPct || 0) / 100);
    return { ...it, amount: amt, profitAmount: profitAmt, totalWithProfit: amt + profitAmt };
  });
  const totalAmount = lineItems.reduce((s, it) => s + it.totalWithProfit, 0);

  try {
    const result = await runQueryResult<{ BOQHeaderID: number }>(`
      INSERT INTO BOQ (ProjectID,BOQNumber,Title,RevisionNumber,BOQDate,Status,TotalAmount,Notes,ChangedBy,ChangeDate)
      OUTPUT INSERTED.BOQHeaderID
      VALUES (@projectId,@boqNumber,@title,@rev,@boqDate,'Active',@total,@notes,@changedBy,GETDATE())
    `, {
      projectId, boqNumber, title, rev: revisionNumber || 0,
      boqDate, total: totalAmount, notes: notes || null, changedBy: req.user?.username,
    });
    const boqId = result.recordset[0].BOQHeaderID;

    for (const it of lineItems) {
      await runQueryResult(`
        INSERT INTO BOQItems
          (BOQHeaderID,SerialNo,MainScope,Category,Description,Unit,Quantity,UnitRate,
           Amount,ProfitPct,ProfitAmount,TotalWithProfit,ProcurementStatus,ChangedBy,ChangeDate)
        VALUES (@boqId,@serial,@scope,@cat,@desc,@unit,@qty,@rate,
                @amt,@profitPct,@profitAmt,@total,'NotStarted',@changedBy,GETDATE())
      `, {
        boqId, serial: it.serialNo || null, scope: it.mainScope || null,
        cat: it.category || null, desc: it.description, unit: it.unit || null,
        qty: it.quantity, rate: it.unitRate, amt: it.amount,
        profitPct: it.profitPct || 0, profitAmt: it.profitAmount, total: it.totalWithProfit,
        changedBy: req.user?.username,
      });
    }

    res.status(201).json({ message: 'BOQ created', boqId, boqNumber });
  } catch (err: unknown) {
    if ((err as { number?: number }).number === 2627)
      res.status(409).json({ error: `BOQ number "${boqNumber}" already exists for this project` });
    else { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
});

// PUT /:id/status — status change (Admin/PM)
router.put('/:id/status', requireAuth, requireRole('Admin', 'PM'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { status } = req.body as { status: string };
  if (!['Active', 'Revised', 'Superseded'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' }); return;
  }
  try {
    await runQueryResult(`
      UPDATE BOQ SET Status=@status, ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE BOQHeaderID=@id
    `, { id, status, changedBy: req.user?.username });
    res.json({ message: 'BOQ status updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /:id — Admin only, cascade deletes items
router.delete('/:id', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    await runQueryResult(`DELETE FROM BOQ WHERE BOQHeaderID=@id`, { id });
    res.json({ message: 'BOQ deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /import — bulk import items into existing BOQ
router.post('/:id/import', requireAuth, requireRole('Admin', 'PM'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { items, replaceExisting } = req.body as {
    items: { serialNo?: string; mainScope?: string; category?: string; description: string;
             unit?: string; quantity: number; unitRate: number; profitPct?: number }[];
    replaceExisting?: boolean;
  };

  if (!items?.length) { res.status(400).json({ error: 'No items provided' }); return; }

  try {
    const existing = await runQuery<{ BOQHeaderID: number }>(`SELECT BOQHeaderID FROM BOQ WHERE BOQHeaderID=@id`, { id });
    if (!existing[0]) { res.status(404).json({ error: 'BOQ not found' }); return; }

    if (replaceExisting) {
      await runQueryResult(`DELETE FROM BOQItems WHERE BOQHeaderID=@id`, { id });
    }

    let totalAmount = 0;
    for (const it of items) {
      const amt = Number(it.quantity) * Number(it.unitRate);
      const profitAmt = amt * (Number(it.profitPct || 0) / 100);
      const totalWithProfit = amt + profitAmt;
      totalAmount += totalWithProfit;
      await runQueryResult(`
        INSERT INTO BOQItems
          (BOQHeaderID,SerialNo,MainScope,Category,Description,Unit,Quantity,UnitRate,
           Amount,ProfitPct,ProfitAmount,TotalWithProfit,ProcurementStatus,ChangedBy,ChangeDate)
        VALUES (@boqId,@serial,@scope,@cat,@desc,@unit,@qty,@rate,
                @amt,@profitPct,@profitAmt,@total,'NotStarted',@changedBy,GETDATE())
      `, {
        boqId: id, serial: it.serialNo || null, scope: it.mainScope || null,
        cat: it.category || null, desc: it.description, unit: it.unit || null,
        qty: it.quantity, rate: it.unitRate, amt,
        profitPct: it.profitPct || 0, profitAmt, total: totalWithProfit,
        changedBy: req.user?.username,
      });
    }

    const totals = await runQuery<{ TotalAmount: number }>(`
      UPDATE BOQ SET TotalAmount = (SELECT ISNULL(SUM(TotalWithProfit),0) FROM BOQItems WHERE BOQHeaderID=@id),
        ChangedBy=@changedBy, ChangeDate=GETDATE()
      OUTPUT INSERTED.TotalAmount
      WHERE BOQHeaderID=@id
    `, { id, changedBy: req.user?.username });

    // Return the DB-computed total (all items, including pre-existing when not replacing)
    const fullTotal = totals[0]?.TotalAmount ?? totalAmount;
    res.json({ message: `${items.length} items imported`, totalAmount: fullTotal });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
