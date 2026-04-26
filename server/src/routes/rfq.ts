import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();

interface RFQRow {
  RFQHeaderID: number; RFQNumber: string; ProjectID: number;
  ProjectCode: string; ProjectName: string; Title: string;
  RFQDate: string; DueDate: string; Status: string; Notes: string;
  ChangedBy: string; ChangeDate: string; LineCount: number;
}

interface RFQLineRow {
  RFQLineID: number; RFQHeaderID: number; BOQItemID: number | null;
  Description: string; Unit: string; Quantity: number; Notes: string;
}

interface QuoteRow {
  QuoteID: number; RFQHeaderID: number; RFQLineID: number; VendorID: number;
  VendorName: string; QuoteDate: string; UnitPrice: number; TotalAmount: number;
  DeliveryDays: number; Notes: string; IsAwarded: boolean;
}

// GET /
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { projectId, status } = req.query as Record<string, string>;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};
  if (projectId) { where += ' AND r.ProjectID=@projectId'; params.projectId = parseInt(projectId); }
  if (status)    { where += ' AND r.Status=@status';       params.status = status; }
  try {
    const rows = await runQuery<RFQRow>(`
      SELECT r.RFQHeaderID, r.RFQNumber, r.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        r.Title, CONVERT(NVARCHAR(10),r.RFQDate,23) AS RFQDate,
        ISNULL(CONVERT(NVARCHAR(10),r.DueDate,23),'') AS DueDate,
        r.Status, ISNULL(r.Notes,'') AS Notes,
        ISNULL(r.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),r.ChangeDate,120),'') AS ChangeDate,
        (SELECT COUNT(*) FROM RFQLines rl WHERE rl.RFQHeaderID=r.RFQHeaderID) AS LineCount
      FROM RFQHeaders r
      LEFT JOIN Projects p ON p.ProjectID=r.ProjectID
      ${where} ORDER BY r.ChangeDate DESC
    `, params);
    res.json({ rfqs: rows, count: rows.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /:id — header + lines + quotes
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const rfqs = await runQuery<RFQRow>(`
      SELECT r.RFQHeaderID, r.RFQNumber, r.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        r.Title, CONVERT(NVARCHAR(10),r.RFQDate,23) AS RFQDate,
        ISNULL(CONVERT(NVARCHAR(10),r.DueDate,23),'') AS DueDate,
        r.Status, ISNULL(r.Notes,'') AS Notes,
        ISNULL(r.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),r.ChangeDate,120),'') AS ChangeDate, 0 AS LineCount
      FROM RFQHeaders r LEFT JOIN Projects p ON p.ProjectID=r.ProjectID
      WHERE r.RFQHeaderID=@id
    `, { id });
    if (!rfqs[0]) { res.status(404).json({ error: 'RFQ not found' }); return; }

    const lines = await runQuery<RFQLineRow>(`
      SELECT RFQLineID, RFQHeaderID, BOQItemID, Description,
        ISNULL(Unit,'') AS Unit, Quantity, ISNULL(Notes,'') AS Notes
      FROM RFQLines WHERE RFQHeaderID=@id ORDER BY RFQLineID
    `, { id });

    const quotes = await runQuery<QuoteRow>(`
      SELECT q.QuoteID, q.RFQHeaderID, q.RFQLineID, q.VendorID,
        v.VendorName, ISNULL(CONVERT(NVARCHAR(10),q.QuoteDate,23),'') AS QuoteDate,
        q.UnitPrice, q.TotalAmount, ISNULL(q.DeliveryDays,0) AS DeliveryDays,
        ISNULL(q.Notes,'') AS Notes, q.IsAwarded
      FROM RFQVendorQuotes q
      JOIN Vendors v ON v.VendorID=q.VendorID
      WHERE q.RFQHeaderID=@id ORDER BY q.RFQLineID, q.UnitPrice
    `, { id });

    res.json({ rfq: rfqs[0], lines, quotes });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST / — create RFQ + lines
router.post('/', requireAuth, requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const { rfqNumber, projectId, title, rfqDate, dueDate, notes, lines } = req.body as {
    rfqNumber: string; projectId: number; title: string; rfqDate: string;
    dueDate?: string; notes?: string;
    lines?: { boqItemId?: number; description: string; unit?: string; quantity: number; notes?: string }[];
  };
  if (!rfqNumber || !projectId || !title || !rfqDate) {
    res.status(400).json({ error: 'rfqNumber, projectId, title and rfqDate are required' }); return;
  }
  try {
    const result = await runQueryResult<{ RFQHeaderID: number }>(`
      INSERT INTO RFQHeaders (RFQNumber,ProjectID,Title,RFQDate,DueDate,Status,Notes,ChangedBy,ChangeDate)
      OUTPUT INSERTED.RFQHeaderID
      VALUES (@rfqNumber,@projectId,@title,@rfqDate,@dueDate,'Draft',@notes,@changedBy,GETDATE())
    `, {
      rfqNumber, projectId, title, rfqDate, dueDate: dueDate || null,
      notes: notes || null, changedBy: req.user?.username,
    });
    const rfqId = result.recordset[0].RFQHeaderID;

    for (const ln of (lines || [])) {
      await runQueryResult(`
        INSERT INTO RFQLines (RFQHeaderID,BOQItemID,Description,Unit,Quantity,Notes)
        VALUES (@rfqId,@boqItemId,@desc,@unit,@qty,@notes)
      `, {
        rfqId, boqItemId: ln.boqItemId || null, desc: ln.description,
        unit: ln.unit || null, qty: ln.quantity, notes: ln.notes || null,
      });
    }

    res.status(201).json({ message: 'RFQ created', rfqId, rfqNumber });
  } catch (err: unknown) {
    if ((err as { number?: number }).number === 2627)
      res.status(409).json({ error: `RFQ number "${rfqNumber}" already exists` });
    else { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
});

// PUT /:id/status
router.put('/:id/status', requireAuth, requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { status } = req.body as { status: string };
  if (!['Draft', 'Sent', 'QuotesReceived', 'Awarded', 'Cancelled'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' }); return;
  }
  try {
    await runQueryResult(`
      UPDATE RFQHeaders SET Status=@status, ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE RFQHeaderID=@id
    `, { id, status, changedBy: req.user?.username });
    res.json({ message: 'RFQ status updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /:id/quotes — save vendor quote for a line
router.post('/:id/quotes', requireAuth, requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const rfqId = parseInt(req.params.id);
  const { rfqLineId, vendorId, quoteDate, unitPrice, deliveryDays, notes } = req.body as {
    rfqLineId: number; vendorId: number; quoteDate?: string;
    unitPrice: number; deliveryDays?: number; notes?: string;
  };
  if (!rfqLineId || !vendorId || unitPrice === undefined) {
    res.status(400).json({ error: 'rfqLineId, vendorId and unitPrice are required' }); return;
  }
  try {
    const line = await runQuery<{ Quantity: number }>(`SELECT Quantity FROM RFQLines WHERE RFQLineID=@id`, { id: rfqLineId });
    if (!line[0]) { res.status(404).json({ error: 'RFQ line not found' }); return; }
    const totalAmount = Number(unitPrice) * Number(line[0].Quantity);

    const existing = await runQuery<{ QuoteID: number }>(`
      SELECT QuoteID FROM RFQVendorQuotes WHERE RFQLineID=@lineId AND VendorID=@vendorId
    `, { lineId: rfqLineId, vendorId });

    if (existing[0]) {
      await runQueryResult(`
        UPDATE RFQVendorQuotes SET UnitPrice=@up, TotalAmount=@total,
          QuoteDate=@qd, DeliveryDays=@days, Notes=@notes, ChangedBy=@changedBy, ChangeDate=GETDATE()
        WHERE QuoteID=@id
      `, {
        id: existing[0].QuoteID, up: unitPrice, total: totalAmount,
        qd: quoteDate || null, days: deliveryDays || null,
        notes: notes || null, changedBy: req.user?.username,
      });
    } else {
      await runQueryResult(`
        INSERT INTO RFQVendorQuotes
          (RFQHeaderID,RFQLineID,VendorID,QuoteDate,UnitPrice,TotalAmount,DeliveryDays,Notes,IsAwarded,ChangedBy,ChangeDate)
        VALUES (@rfqId,@lineId,@vendorId,@qd,@up,@total,@days,@notes,0,@changedBy,GETDATE())
      `, {
        rfqId, lineId: rfqLineId, vendorId, qd: quoteDate || null,
        up: unitPrice, total: totalAmount, days: deliveryDays || null,
        notes: notes || null, changedBy: req.user?.username,
      });
    }

    await runQueryResult(`
      UPDATE RFQHeaders SET Status='QuotesReceived', ChangeDate=GETDATE(), ChangedBy=@changedBy
      WHERE RFQHeaderID=@id AND Status='Sent'
    `, { id: rfqId, changedBy: req.user?.username });

    res.json({ message: 'Quote saved', totalAmount });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /:id/award — award a quote
router.put('/:id/award', requireAuth, requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const rfqId = parseInt(req.params.id);
  const { quoteId } = req.body as { quoteId: number };
  try {
    const quote = await runQuery<{ RFQLineID: number }>(`SELECT RFQLineID FROM RFQVendorQuotes WHERE QuoteID=@id AND RFQHeaderID=@rfqId`, { id: quoteId, rfqId });
    if (!quote[0]) { res.status(404).json({ error: 'Quote not found' }); return; }

    await runQueryResult(`
      UPDATE RFQVendorQuotes SET IsAwarded=0
      WHERE RFQLineID=@lineId
    `, { lineId: quote[0].RFQLineID });

    await runQueryResult(`
      UPDATE RFQVendorQuotes SET IsAwarded=1, ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE QuoteID=@id
    `, { id: quoteId, changedBy: req.user?.username });

    await runQueryResult(`
      UPDATE RFQHeaders SET Status='Awarded', ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE RFQHeaderID=@rfqId
    `, { rfqId, changedBy: req.user?.username });

    res.json({ message: 'Quote awarded' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /:id
router.delete('/:id', requireAuth, requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    await runQueryResult(`DELETE FROM RFQHeaders WHERE RFQHeaderID=@id`, { id });
    res.json({ message: 'RFQ deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
