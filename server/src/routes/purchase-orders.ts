import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { sendPOApprovalEmail, sendPOStatusEmail } from '../utils/email';

const router = Router();
router.use(requireAuth);

const APP_URL = process.env.APP_URL || 'https://indigobuilders.deltatechcorp.com';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PORow {
  PurchaseOrderID: number;
  PONumber: string;
  ProjectID: number | null;
  ProjectCode: string;
  ProjectName: string;
  VendorName: string;
  VendorEmail: string;
  VendorPhone: string;
  VendorVAT: string;
  VendorAddress: string;
  OrderDate: string;
  ExpectedDeliveryDate: string;
  DeliveryAddress: string;
  SubTotal: number;
  VATRate: number;
  VATAmount: number;
  ShippingCost: number;
  TotalAmount: number;
  Status: string;
  PaymentTerms: string;
  ApprovedBy: string;
  ApprovedDate: string;
  Notes: string;
  ChangedBy: string;
  ChangeDate: string;
}

interface POItemRow {
  LineID: number;
  PurchaseOrderID: number;
  Description: string;
  Quantity: number;
  UnitPrice: number;
  Discount: number;
  VATRate: number;
  LineTotal: number;
}

// ── GET /  — list ─────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  const { projectId, status, from, to } = req.query as Record<string, string>;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};

  if (projectId) { where += ' AND po.ProjectID = @projectId'; params.projectId = parseInt(projectId); }
  if (status)    { where += ' AND po.Status = @status';       params.status = status; }
  if (from)      { where += ' AND po.OrderDate >= @from';     params.from = from; }
  if (to)        { where += ' AND po.OrderDate <= @to';       params.to = to; }

  try {
    const rows = await runQuery<PORow>(`
      SELECT
        po.PurchaseOrderID, po.PONumber, po.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode,
        ISNULL(p.ProjectName,'') AS ProjectName,
        po.VendorName, ISNULL(po.VendorEmail,'') AS VendorEmail,
        ISNULL(po.VendorPhone,'') AS VendorPhone,
        ISNULL(po.VendorVAT,'') AS VendorVAT,
        ISNULL(po.VendorAddress,'') AS VendorAddress,
        CONVERT(NVARCHAR(10), po.OrderDate, 23) AS OrderDate,
        ISNULL(CONVERT(NVARCHAR(10), po.ExpectedDeliveryDate, 23),'') AS ExpectedDeliveryDate,
        ISNULL(po.DeliveryAddress,'') AS DeliveryAddress,
        po.SubTotal, po.VATRate, po.VATAmount, po.ShippingCost, po.TotalAmount,
        po.Status, ISNULL(po.PaymentTerms,'') AS PaymentTerms,
        ISNULL(po.ApprovedBy,'') AS ApprovedBy,
        ISNULL(CONVERT(NVARCHAR(19), po.ApprovedDate, 120),'') AS ApprovedDate,
        ISNULL(po.Notes,'') AS Notes,
        ISNULL(po.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19), po.ChangeDate, 120),'') AS ChangeDate
      FROM PurchaseOrders po
      LEFT JOIN Projects p ON p.ProjectID = po.ProjectID
      ${where}
      ORDER BY po.ChangeDate DESC
    `, params);
    res.json({ purchaseOrders: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /:id  — detail with items ─────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const pos = await runQuery<PORow>(`
      SELECT
        po.PurchaseOrderID, po.PONumber, po.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode,
        ISNULL(p.ProjectName,'') AS ProjectName,
        po.VendorName, ISNULL(po.VendorEmail,'') AS VendorEmail,
        ISNULL(po.VendorPhone,'') AS VendorPhone,
        ISNULL(po.VendorVAT,'') AS VendorVAT,
        ISNULL(po.VendorAddress,'') AS VendorAddress,
        CONVERT(NVARCHAR(10), po.OrderDate, 23) AS OrderDate,
        ISNULL(CONVERT(NVARCHAR(10), po.ExpectedDeliveryDate, 23),'') AS ExpectedDeliveryDate,
        ISNULL(po.DeliveryAddress,'') AS DeliveryAddress,
        po.SubTotal, po.VATRate, po.VATAmount, po.ShippingCost, po.TotalAmount,
        po.Status, ISNULL(po.PaymentTerms,'') AS PaymentTerms,
        ISNULL(po.ApprovedBy,'') AS ApprovedBy,
        ISNULL(CONVERT(NVARCHAR(19), po.ApprovedDate, 120),'') AS ApprovedDate,
        ISNULL(po.Notes,'') AS Notes,
        ISNULL(po.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19), po.ChangeDate, 120),'') AS ChangeDate
      FROM PurchaseOrders po
      LEFT JOIN Projects p ON p.ProjectID = po.ProjectID
      WHERE po.PurchaseOrderID = @id
    `, { id });
    if (!pos[0]) { res.status(404).json({ error: 'PO not found' }); return; }

    const items = await runQuery<POItemRow>(`
      SELECT LineID, PurchaseOrderID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal
      FROM PurchaseOrderItems WHERE PurchaseOrderID = @id ORDER BY LineID
    `, { id });

    res.json({ purchaseOrder: pos[0], items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /  — create ──────────────────────────────────────────────────────────

router.post('/', requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const {
    poNumber, projectID, vendorName, vendorEmail, vendorPhone, vendorVAT,
    vendorAddress, orderDate, expectedDeliveryDate, deliveryAddress,
    vatRate, shippingCost, paymentTerms, notes, items,
  } = req.body as {
    poNumber: string; projectID?: number; vendorName: string; vendorEmail?: string;
    vendorPhone?: string; vendorVAT?: string; vendorAddress?: string;
    orderDate: string; expectedDeliveryDate?: string; deliveryAddress?: string;
    vatRate?: number; shippingCost?: number; paymentTerms?: string; notes?: string;
    items: { description: string; quantity: number; unitPrice: number; discount?: number; vatRate?: number }[];
  };

  if (!poNumber || !vendorName || !orderDate || !items?.length) {
    res.status(400).json({ error: 'poNumber, vendorName, orderDate and at least one item are required' });
    return;
  }

  const vat = vatRate ?? 15;
  const shipping = shippingCost ?? 0;

  let subTotal = 0;
  const lineItems = items.map(it => {
    const lineVAT = it.vatRate ?? vat;
    const discounted = Number(it.unitPrice) * Number(it.quantity) - Number(it.discount ?? 0);
    const lineTotal = discounted + (discounted * lineVAT / 100);
    subTotal += discounted;
    return { ...it, lineTotal, lineVAT };
  });

  const vatAmount  = subTotal * vat / 100;
  const totalAmount = subTotal + vatAmount + shipping;

  try {
    const result = await runQueryResult<{ PurchaseOrderID: number }>(`
      INSERT INTO PurchaseOrders
        (PONumber, ProjectID, VendorName, VendorEmail, VendorPhone, VendorVAT, VendorAddress,
         OrderDate, ExpectedDeliveryDate, DeliveryAddress,
         SubTotal, VATRate, VATAmount, ShippingCost, TotalAmount,
         Status, PaymentTerms, Notes, ChangedBy, ChangeDate)
      OUTPUT INSERTED.PurchaseOrderID
      VALUES
        (@poNumber, @projectID, @vendorName, @vendorEmail, @vendorPhone, @vendorVAT, @vendorAddress,
         @orderDate, @expectedDeliveryDate, @deliveryAddress,
         @subTotal, @vatRate, @vatAmount, @shippingCost, @totalAmount,
         'Draft', @paymentTerms, @notes, @changedBy, GETDATE())
    `, {
      poNumber, projectID: projectID || null, vendorName,
      vendorEmail: vendorEmail || null, vendorPhone: vendorPhone || null,
      vendorVAT: vendorVAT || null, vendorAddress: vendorAddress || null,
      orderDate, expectedDeliveryDate: expectedDeliveryDate || null,
      deliveryAddress: deliveryAddress || null,
      subTotal, vatRate: vat, vatAmount, shippingCost: shipping, totalAmount,
      paymentTerms: paymentTerms || null, notes: notes || null,
      changedBy: req.user?.username,
    });

    const poId = result.recordset[0]?.PurchaseOrderID;

    for (const it of lineItems) {
      await runQueryResult(`
        INSERT INTO PurchaseOrderItems
          (PurchaseOrderID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal)
        VALUES (@poId, @desc, @qty, @price, @discount, @lineVAT, @lineTotal)
      `, {
        poId, desc: it.description, qty: it.quantity, price: it.unitPrice,
        discount: it.discount ?? 0, lineVAT: it.lineVAT, lineTotal: it.lineTotal,
      });
    }

    res.status(201).json({ message: 'Purchase order created', poId, poNumber });
  } catch (err: unknown) {
    if ((err as { number?: number }).number === 2627) {
      res.status(409).json({ error: `PO number "${poNumber}" already exists` });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// ── PUT /:id  — update (Draft only) ──────────────────────────────────────────

router.put('/:id', requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const {
    vendorName, vendorEmail, vendorPhone, vendorVAT, vendorAddress,
    projectID, orderDate, expectedDeliveryDate, deliveryAddress,
    vatRate, shippingCost, paymentTerms, notes, items,
  } = req.body as {
    vendorName: string; vendorEmail?: string; vendorPhone?: string;
    vendorVAT?: string; vendorAddress?: string; projectID?: number;
    orderDate: string; expectedDeliveryDate?: string; deliveryAddress?: string;
    vatRate?: number; shippingCost?: number; paymentTerms?: string; notes?: string;
    items?: { description: string; quantity: number; unitPrice: number; discount?: number; vatRate?: number }[];
  };

  try {
    const existing = await runQuery<{ Status: string }>(`SELECT Status FROM PurchaseOrders WHERE PurchaseOrderID = @id`, { id });
    if (!existing[0]) { res.status(404).json({ error: 'PO not found' }); return; }
    if (existing[0].Status !== 'Draft') {
      res.status(400).json({ error: 'Only Draft purchase orders can be edited' });
      return;
    }

    const vat = vatRate ?? 15;
    const shipping = shippingCost ?? 0;

    let subTotal = 0;
    const lineItems = (items || []).map(it => {
      const lineVAT = it.vatRate ?? vat;
      const discounted = Number(it.unitPrice) * Number(it.quantity) - Number(it.discount ?? 0);
      const lineTotal = discounted + (discounted * lineVAT / 100);
      subTotal += discounted;
      return { ...it, lineTotal, lineVAT };
    });

    const vatAmount   = subTotal * vat / 100;
    const totalAmount = subTotal + vatAmount + shipping;

    await runQueryResult(`
      UPDATE PurchaseOrders SET
        ProjectID=@projectID, VendorName=@vendorName, VendorEmail=@vendorEmail,
        VendorPhone=@vendorPhone, VendorVAT=@vendorVAT, VendorAddress=@vendorAddress,
        OrderDate=@orderDate, ExpectedDeliveryDate=@expectedDeliveryDate,
        DeliveryAddress=@deliveryAddress, SubTotal=@subTotal, VATRate=@vatRate,
        VATAmount=@vatAmount, ShippingCost=@shippingCost, TotalAmount=@totalAmount,
        PaymentTerms=@paymentTerms, Notes=@notes,
        ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE PurchaseOrderID=@id
    `, {
      id, projectID: projectID || null, vendorName,
      vendorEmail: vendorEmail || null, vendorPhone: vendorPhone || null,
      vendorVAT: vendorVAT || null, vendorAddress: vendorAddress || null,
      orderDate, expectedDeliveryDate: expectedDeliveryDate || null,
      deliveryAddress: deliveryAddress || null,
      subTotal, vatRate: vat, vatAmount, shippingCost: shipping, totalAmount,
      paymentTerms: paymentTerms || null, notes: notes || null,
      changedBy: req.user?.username,
    });

    if (items?.length) {
      await runQueryResult(`DELETE FROM PurchaseOrderItems WHERE PurchaseOrderID=@id`, { id });
      for (const it of lineItems) {
        await runQueryResult(`
          INSERT INTO PurchaseOrderItems
            (PurchaseOrderID, Description, Quantity, UnitPrice, Discount, VATRate, LineTotal)
          VALUES (@poId, @desc, @qty, @price, @discount, @lineVAT, @lineTotal)
        `, {
          poId: id, desc: it.description, qty: it.quantity, price: it.unitPrice,
          discount: it.discount ?? 0, lineVAT: it.lineVAT, lineTotal: it.lineTotal,
        });
      }
    }

    res.json({ message: 'Purchase order updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /:id/submit  — submit for approval (sends emails) ─────────────────────

router.put('/:id/submit', requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const pos = await runQuery<PORow & { ProjectName: string }>(`
      SELECT po.*, ISNULL(p.ProjectName,'') AS ProjectName
      FROM PurchaseOrders po
      LEFT JOIN Projects p ON p.ProjectID = po.ProjectID
      WHERE po.PurchaseOrderID = @id
    `, { id });
    if (!pos[0]) { res.status(404).json({ error: 'PO not found' }); return; }
    if (pos[0].Status !== 'Draft') {
      res.status(400).json({ error: 'Only Draft POs can be submitted for approval' });
      return;
    }

    await runQueryResult(`
      UPDATE PurchaseOrders SET Status='PendingApproval', ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE PurchaseOrderID=@id
    `, { id, changedBy: req.user?.username });

    // Fetch approvers — Admin + Finance users with email
    const approvers = await runQuery<{ UserID: number; FullName: string; Email: string }>(`
      SELECT u.UserID, u.FullName, u.Email
      FROM Users u
      JOIN Roles r ON r.RoleID = u.RoleID
      WHERE r.RoleName IN ('Admin','Finance') AND u.IsActive = 1 AND u.Email IS NOT NULL AND u.Email <> ''
    `, {});

    const po = pos[0];
    let emailsSent = 0;

    for (const approver of approvers) {
      const approveToken = randomUUID();
      const rejectToken  = randomUUID();
      const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await runQueryResult(`
        INSERT INTO PurchaseOrderApprovals
          (PurchaseOrderID, Token, Action, ApproverEmail, ApproverName, ExpiresAt)
        VALUES (@poId, @token, 'Approve', @email, @name, @expires)
      `, { poId: id, token: approveToken, email: approver.Email, name: approver.FullName, expires: expiresAt });

      await runQueryResult(`
        INSERT INTO PurchaseOrderApprovals
          (PurchaseOrderID, Token, Action, ApproverEmail, ApproverName, ExpiresAt)
        VALUES (@poId, @token, 'Reject', @email, @name, @expires)
      `, { poId: id, token: rejectToken, email: approver.Email, name: approver.FullName, expires: expiresAt });

      try {
        await sendPOApprovalEmail({
          to:           approver.Email,
          approverName: approver.FullName,
          poNumber:     po.PONumber,
          vendorName:   po.VendorName,
          totalAmount:  po.TotalAmount,
          projectName:  po.ProjectName,
          submittedBy:  req.user?.username || 'System',
          approveUrl:   `${APP_URL}/api/purchase-orders/action/${approveToken}`,
          rejectUrl:    `${APP_URL}/api/purchase-orders/action/${rejectToken}`,
        });
        emailsSent++;
      } catch (mailErr) {
        console.error('Email failed for', approver.Email, mailErr);
      }
    }

    res.json({ message: 'PO submitted for approval', emailsSent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /action/:token  — email approval/rejection link (no auth required) ────

router.get('/action/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const reason = (req.query.reason as string) || '';

  try {
    const rows = await runQuery<{
      ApprovalID: number; PurchaseOrderID: number; Action: string;
      ApproverName: string; ActedAt: string | null; ExpiresAt: string;
      PONumber: string; VendorName: string; SubmitterEmail: string;
    }>(`
      SELECT
        a.ApprovalID, a.PurchaseOrderID, a.Action, a.ApproverName,
        a.ActedAt, a.ExpiresAt,
        po.PONumber, po.VendorName,
        ISNULL(u.Email,'') AS SubmitterEmail
      FROM PurchaseOrderApprovals a
      JOIN PurchaseOrders po ON po.PurchaseOrderID = a.PurchaseOrderID
      LEFT JOIN Users u ON u.Username = po.ChangedBy
      WHERE a.Token = @token
    `, { token });

    if (!rows[0]) {
      res.status(200).send(htmlPage('Invalid Link', 'This approval link is invalid or has already been used.', '#dc2626'));
      return;
    }

    const row = rows[0];

    if (row.ActedAt) {
      res.status(200).send(htmlPage('Already Processed', `This PO (${row.PONumber}) has already been processed.`, '#f59e0b'));
      return;
    }

    if (new Date(row.ExpiresAt) < new Date()) {
      res.status(200).send(htmlPage('Link Expired', 'This approval link has expired. Please log in to the ERP to take action.', '#f59e0b'));
      return;
    }

    const newStatus = row.Action === 'Approve' ? 'Approved' : 'Rejected';

    await runQueryResult(`
      UPDATE PurchaseOrders
      SET Status=@status, ApprovedBy=@name, ApprovedDate=GETDATE(), ChangedBy=@name, ChangeDate=GETDATE()
      WHERE PurchaseOrderID=@poId
    `, { status: newStatus, name: row.ApproverName, poId: row.PurchaseOrderID });

    await runQueryResult(`
      UPDATE PurchaseOrderApprovals SET ActedAt=GETDATE() WHERE ApprovalID=@id
    `, { id: row.ApprovalID });

    // Notify submitter
    if (row.SubmitterEmail) {
      try {
        await sendPOStatusEmail({
          to:         row.SubmitterEmail,
          poNumber:   row.PONumber,
          vendorName: row.VendorName,
          status:     newStatus as 'Approved' | 'Rejected',
          notes:      reason || undefined,
        });
      } catch { /* non-fatal */ }
    }

    const color = newStatus === 'Approved' ? '#059669' : '#dc2626';
    res.status(200).send(htmlPage(
      `PO ${newStatus}`,
      `Purchase Order <strong>${row.PONumber}</strong> has been <strong>${newStatus.toLowerCase()}</strong> successfully.`,
      color,
    ));
  } catch (err) {
    console.error(err);
    res.status(500).send(htmlPage('Error', 'An error occurred. Please try again or contact support.', '#dc2626'));
  }
});

// ── PUT /:id/status  — manual status override (Admin only) ───────────────────

router.put('/:id/status', requireRole('Admin'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { status } = req.body as { status: string };
  const allowed = ['Draft', 'PendingApproval', 'Approved', 'Delivered', 'Cancelled', 'Rejected'];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: 'Invalid status' }); return;
  }
  try {
    await runQueryResult(`
      UPDATE PurchaseOrders SET Status=@status, ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE PurchaseOrderID=@id
    `, { id, status, changedBy: req.user?.username });
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

router.delete('/:id', requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const existing = await runQuery<{ Status: string }>(`SELECT Status FROM PurchaseOrders WHERE PurchaseOrderID=@id`, { id });
    if (!existing[0]) { res.status(404).json({ error: 'PO not found' }); return; }
    if (!['Draft', 'Rejected', 'Cancelled'].includes(existing[0].Status)) {
      res.status(400).json({ error: 'Only Draft / Rejected / Cancelled POs can be deleted' });
      return;
    }
    await runQueryResult(`DELETE FROM PurchaseOrders WHERE PurchaseOrderID=@id`, { id });
    res.json({ message: 'Purchase order deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Helper: tiny HTML response page ──────────────────────────────────────────

function htmlPage(title: string, message: string, color: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — IndigoBuilders ERP</title>
<style>
  body{font-family:Arial,sans-serif;background:#f4f6f9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#fff;border-radius:10px;padding:40px 48px;max-width:480px;width:100%;box-shadow:0 2px 12px rgba(0,0,0,.1);text-align:center}
  .icon{font-size:48px;margin-bottom:16px}
  h1{color:${color};font-size:22px;margin:0 0 12px}
  p{color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px}
  a{color:#0c2f5c;font-weight:600}
</style>
</head>
<body>
<div class="card">
  <div class="icon">${color === '#059669' ? '✅' : color === '#dc2626' ? '❌' : '⚠️'}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <p><a href="${process.env.APP_URL || 'https://indigobuilders.deltatechcorp.com'}">Go to IndigoBuilders ERP →</a></p>
</div>
</body></html>`;
}

export default router;
