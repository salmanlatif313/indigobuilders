import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

interface InvoiceRow {
  InvoiceID: number; InvoiceNumber: string; InvoiceType: string; InvoiceDate: string;
  DueDate: string; ClientName: string; ClientVAT: string; SubTotal: number;
  VATAmount: number; RetentionAmount: number; TotalAmount: number;
  ZatcaStatus: string; ZatcaUUID: string; ProjectName: string; ProjectCode: string; Notes: string;
}

interface InvoiceItemRow {
  ItemID: number; InvoiceID: number; Description: string;
  Quantity: number; UnitPrice: number; Discount: number; VATRate: number; LineTotal: number;
}

// GET /api/invoices
router.get('/', async (req: Request, res: Response) => {
  const projectId = req.query.projectId;
  const status = req.query.status;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};
  if (projectId) { where += ' AND i.ProjectID = @projectId'; params.projectId = parseInt(projectId as string); }
  if (status) { where += ' AND i.ZatcaStatus = @status'; params.status = status; }
  try {
    const rows = await runQuery<InvoiceRow>(
      `SELECT InvoiceID, InvoiceNumber, InvoiceType, InvoiceDate, DueDate, ClientName, ClientVAT,
              SubTotal, VATAmount, RetentionAmount, TotalAmount, ZatcaStatus, ZatcaUUID,
              ProjectName, ProjectCode
       FROM View_InvoiceSummary ${where} ORDER BY InvoiceID DESC`,
      params
    );
    res.json({ invoices: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/invoices/:id  (with items)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [invoices, items] = await Promise.all([
      runQuery<InvoiceRow & { ClientAddress: string; SupplyDate: string; VATRate: number; RetentionRate: number; ZatcaQRCode: string }>(
        `SELECT i.InvoiceID, i.InvoiceNumber, i.InvoiceType, i.InvoiceDate, i.SupplyDate, i.DueDate,
                i.ClientName, i.ClientVAT, i.ClientAddress, i.SubTotal, i.VATRate, i.VATAmount,
                i.RetentionRate, i.RetentionAmount, i.TotalAmount, i.ZatcaStatus, i.ZatcaUUID,
                i.ZatcaQRCode, i.Notes, p.ProjectName, p.ProjectCode
         FROM Invoices i LEFT JOIN Projects p ON p.ProjectID = i.ProjectID WHERE i.InvoiceID = @id`,
        { id: parseInt(req.params.id) }
      ),
      runQuery<InvoiceItemRow>(
        `SELECT ItemID, InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal
         FROM InvoiceItems WHERE InvoiceID = @id ORDER BY ItemID`,
        { id: parseInt(req.params.id) }
      ),
    ]);
    if (!invoices[0]) { res.status(404).json({ error: 'Invoice not found' }); return; }
    res.json({ invoice: invoices[0], items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/invoices  (Admin, Finance)
router.post('/', requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const {
    invoiceNumber, invoiceType, projectID, clientName, clientVAT, clientAddress,
    invoiceDate, supplyDate, dueDate, vatRate, retentionRate, notes,
    items,
  } = req.body as {
    invoiceNumber: string; invoiceType?: string; projectID?: number; clientName: string;
    clientVAT?: string; clientAddress?: string; invoiceDate: string; supplyDate?: string;
    dueDate?: string; vatRate?: number; retentionRate?: number; notes?: string;
    items: { description: string; quantity: number; unitPrice: number; discount?: number; vatRate?: number }[];
  };

  if (!invoiceNumber || !clientName || !invoiceDate || !items?.length) {
    res.status(400).json({ error: 'invoiceNumber, clientName, invoiceDate, items required' });
    return;
  }

  // Compute totals
  const vat = vatRate ?? 15;
  const ret = retentionRate ?? 0;
  let subTotal = 0;
  const computedItems = items.map(it => {
    const lineTotal = (it.quantity * it.unitPrice) - (it.discount || 0);
    subTotal += lineTotal;
    return { ...it, vatRate: it.vatRate ?? vat, lineTotal };
  });
  const vatAmount = subTotal * (vat / 100);
  const retentionAmount = subTotal * (ret / 100);
  const totalAmount = subTotal + vatAmount - retentionAmount;
  const zatcaUUID = uuidv4();

  // Build minimal ZATCA QR (Base64 TLV stub — production requires full ZATCA SDK)
  const qrData = Buffer.from(
    JSON.stringify({ seller: 'Indigo Builders Co.', vatNo: '311234567890003', date: invoiceDate, total: totalAmount.toFixed(2), vat: vatAmount.toFixed(2) })
  ).toString('base64');

  try {
    const result = await runQueryResult(
      `INSERT INTO Invoices (InvoiceNumber, InvoiceType, ProjectID, ClientName, ClientVAT, ClientAddress,
         InvoiceDate, SupplyDate, DueDate, SubTotal, VATRate, VATAmount, RetentionRate, RetentionAmount,
         TotalAmount, ZatcaStatus, ZatcaQRCode, ZatcaUUID, Notes, ChangedBy)
       OUTPUT INSERTED.InvoiceID
       VALUES (@invoiceNumber, @invoiceType, @projectID, @clientName, @clientVAT, @clientAddress,
         @invoiceDate, @supplyDate, @dueDate, @subTotal, @vatRate, @vatAmount, @retentionRate, @retentionAmount,
         @totalAmount, 'Draft', @qrData, @zatcaUUID, @notes, @changedBy)`,
      {
        invoiceNumber, invoiceType: invoiceType || 'Standard', projectID: projectID || null,
        clientName, clientVAT: clientVAT || null, clientAddress: clientAddress || null,
        invoiceDate, supplyDate: supplyDate || null, dueDate: dueDate || null,
        subTotal, vatRate: vat, vatAmount, retentionRate: ret, retentionAmount, totalAmount,
        qrData, zatcaUUID, notes: notes || null, changedBy: req.user?.username,
      }
    );
    const invoiceId = result.recordset[0]?.InvoiceID as number;

    // Insert line items
    for (const it of computedItems) {
      await runQueryResult(
        `INSERT INTO InvoiceItems (InvoiceID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal)
         VALUES (@invoiceId, @description, @quantity, @unitPrice, @discount, @vatRate, @lineTotal)`,
        { invoiceId, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, discount: it.discount || 0, vatRate: it.vatRate, lineTotal: it.lineTotal }
      );
    }

    res.status(201).json({ message: 'Invoice created', invoiceId, zatcaUUID });
  } catch (err: unknown) {
    const e = err as { number?: number };
    if (e.number === 2627) { res.status(409).json({ error: 'Invoice number already exists' }); }
    else { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
});

// PUT /api/invoices/:id/status  (Admin, Finance)
router.put('/:id/status', requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const { status } = req.body as { status: string };
  const allowed = ['Draft', 'Reported', 'Cleared', 'Rejected'];
  if (!allowed.includes(status)) { res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` }); return; }
  try {
    await runQueryResult(
      `UPDATE Invoices SET ZatcaStatus=@status, ChangedBy=@changedBy, ChangeDate=GETDATE() WHERE InvoiceID=@id`,
      { id: parseInt(req.params.id), status, changedBy: req.user?.username }
    );
    res.json({ message: 'Invoice status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/invoices/:id  (Admin only, Draft only)
router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const rows = await runQuery<{ ZatcaStatus: string }>(`SELECT ZatcaStatus FROM Invoices WHERE InvoiceID=@id`, { id: parseInt(req.params.id) });
    if (!rows[0]) { res.status(404).json({ error: 'Invoice not found' }); return; }
    if (rows[0].ZatcaStatus !== 'Draft') { res.status(400).json({ error: 'Only Draft invoices can be deleted' }); return; }
    await runQueryResult(`DELETE FROM Invoices WHERE InvoiceID=@id`, { id: parseInt(req.params.id) });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
