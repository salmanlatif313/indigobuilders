import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();

interface PaymentRow {
  VendorPaymentID: number; VendorID: number; VendorName: string;
  VendorBillID: number | null; BillNumber: string;
  POHeaderID: number | null; PONumber: string;
  PaymentDate: string; PaymentType: string; Amount: number;
  PaymentMethod: string; ReferenceNo: string; Notes: string;
  ChangedBy: string; ChangeDate: string;
}

interface VendorStatRow {
  VendorID: number; VendorName: string; TotalBilled: number;
  TotalPaid: number; Outstanding: number;
}

// GET / — list payments
router.get('/', requireAuth, requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const { vendorId, from, to } = req.query as Record<string, string>;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};
  if (vendorId) { where += ' AND vp.VendorID=@vendorId'; params.vendorId = parseInt(vendorId); }
  if (from)     { where += ' AND vp.PaymentDate>=@from'; params.from = from; }
  if (to)       { where += ' AND vp.PaymentDate<=@to';   params.to = to; }
  try {
    const rows = await runQuery<PaymentRow>(`
      SELECT vp.VendorPaymentID, vp.VendorID, v.VendorName,
        vp.VendorBillID, ISNULL(vb.BillNumber,'') AS BillNumber,
        vp.POHeaderID, ISNULL(po.PONumber,'') AS PONumber,
        CONVERT(NVARCHAR(10),vp.PaymentDate,23) AS PaymentDate,
        vp.PaymentType, vp.Amount, vp.PaymentMethod,
        ISNULL(vp.ReferenceNo,'') AS ReferenceNo, ISNULL(vp.Notes,'') AS Notes,
        ISNULL(vp.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),vp.ChangeDate,120),'') AS ChangeDate
      FROM VendorPayments vp
      JOIN Vendors v ON v.VendorID=vp.VendorID
      LEFT JOIN VendorBills vb ON vb.VendorBillID=vp.VendorBillID
      LEFT JOIN PurchaseOrders po ON po.PurchaseOrderID=vp.POHeaderID
      ${where} ORDER BY vp.PaymentDate DESC
    `, params);
    res.json({ payments: rows, count: rows.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /bills — unpaid/partial vendor bills
router.get('/bills', requireAuth, requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const { vendorId } = req.query as Record<string, string>;
  let where = "WHERE vb.Status IN ('Pending','PartiallyPaid')";
  const params: Record<string, unknown> = {};
  if (vendorId) { where += ' AND vb.VendorID=@vendorId'; params.vendorId = parseInt(vendorId); }
  try {
    const rows = await runQuery<{
      VendorBillID: number; GRNNumber: string; VendorID: number; VendorName: string;
      BillNumber: string; BillDate: string; DueDate: string;
      TotalAmount: number; TotalPaid: number; Outstanding: number; Status: string;
    }>(`
      SELECT vb.VendorBillID, ISNULL(g.GRNNumber,'') AS GRNNumber,
        ISNULL(vb.VendorID,0) AS VendorID, ISNULL(v.VendorName,'') AS VendorName,
        vb.BillNumber,
        CONVERT(NVARCHAR(10),vb.BillDate,23) AS BillDate,
        ISNULL(CONVERT(NVARCHAR(10),vb.DueDate,23),'') AS DueDate,
        vb.TotalAmount,
        ISNULL((SELECT SUM(Amount) FROM VendorPayments WHERE VendorBillID=vb.VendorBillID),0) AS TotalPaid,
        vb.TotalAmount - ISNULL((SELECT SUM(Amount) FROM VendorPayments WHERE VendorBillID=vb.VendorBillID),0) AS Outstanding,
        vb.Status
      FROM VendorBills vb
      JOIN GRNHeaders g ON g.GRNHeaderID=vb.GRNHeaderID
      LEFT JOIN Vendors v ON v.VendorID=vb.VendorID
      ${where} ORDER BY vb.BillDate
    `, params);
    res.json({ bills: rows, count: rows.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /statement/:vendorId — vendor AP ledger
router.get('/statement/:vendorId', requireAuth, requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const vendorId = parseInt(req.params.vendorId);
  try {
    const stat = await runQuery<VendorStatRow>(`
      SELECT v.VendorID, v.VendorName,
        ISNULL((SELECT SUM(TotalAmount) FROM VendorBills WHERE VendorID=@vendorId),0) AS TotalBilled,
        ISNULL((SELECT SUM(Amount)      FROM VendorPayments WHERE VendorID=@vendorId),0) AS TotalPaid,
        ISNULL((SELECT SUM(TotalAmount) FROM VendorBills WHERE VendorID=@vendorId),0) -
        ISNULL((SELECT SUM(Amount)      FROM VendorPayments WHERE VendorID=@vendorId),0) AS Outstanding
      FROM Vendors v WHERE v.VendorID=@vendorId
    `, { vendorId });
    if (!stat[0]) { res.status(404).json({ error: 'Vendor not found' }); return; }

    const bills = await runQuery(`
      SELECT vb.VendorBillID, vb.BillNumber,
        CONVERT(NVARCHAR(10),vb.BillDate,23) AS BillDate,
        ISNULL(CONVERT(NVARCHAR(10),vb.DueDate,23),'') AS DueDate,
        vb.TotalAmount,
        ISNULL((SELECT SUM(Amount) FROM VendorPayments WHERE VendorBillID=vb.VendorBillID),0) AS TotalPaid,
        vb.Status
      FROM VendorBills vb WHERE vb.VendorID=@vendorId ORDER BY vb.BillDate
    `, { vendorId });

    const payments = await runQuery<PaymentRow>(`
      SELECT vp.VendorPaymentID, CONVERT(NVARCHAR(10),vp.PaymentDate,23) AS PaymentDate,
        vp.PaymentType, vp.Amount, vp.PaymentMethod,
        ISNULL(vp.ReferenceNo,'') AS ReferenceNo, ISNULL(vp.Notes,'') AS Notes,
        ISNULL(vb.BillNumber,'') AS BillNumber
      FROM VendorPayments vp
      LEFT JOIN VendorBills vb ON vb.VendorBillID=vp.VendorBillID
      WHERE vp.VendorID=@vendorId ORDER BY vp.PaymentDate DESC
    `, { vendorId });

    res.json({ summary: stat[0], bills, payments });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST / — record payment
router.post('/', requireAuth, requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const {
    vendorId, vendorBillId, poHeaderId,
    paymentDate, paymentType, amount, paymentMethod, referenceNo, notes,
  } = req.body as {
    vendorId: number; vendorBillId?: number; poHeaderId?: number;
    paymentDate: string; paymentType: string; amount: number;
    paymentMethod: string; referenceNo?: string; notes?: string;
  };

  if (!vendorId || !paymentDate || !paymentType || amount === undefined || !paymentMethod) {
    res.status(400).json({ error: 'vendorId, paymentDate, paymentType, amount and paymentMethod are required' }); return;
  }
  const validTypes = ['Advance', 'COD', 'PartialPayment', 'FinalPayment'];
  const validMethods = ['BankTransfer', 'Cheque', 'Cash', 'Online'];
  if (!validTypes.includes(paymentType)) { res.status(400).json({ error: 'Invalid paymentType' }); return; }
  if (!validMethods.includes(paymentMethod)) { res.status(400).json({ error: 'Invalid paymentMethod' }); return; }

  try {
    const result = await runQueryResult<{ VendorPaymentID: number }>(`
      INSERT INTO VendorPayments
        (VendorID,VendorBillID,POHeaderID,PaymentDate,PaymentType,Amount,PaymentMethod,ReferenceNo,Notes,ChangedBy,ChangeDate)
      OUTPUT INSERTED.VendorPaymentID
      VALUES (@vendorId,@billId,@poId,@paymentDate,@paymentType,@amount,@paymentMethod,@refNo,@notes,@changedBy,GETDATE())
    `, {
      vendorId, billId: vendorBillId || null, poId: poHeaderId || null,
      paymentDate, paymentType, amount, paymentMethod,
      refNo: referenceNo || null, notes: notes || null, changedBy: req.user?.username,
    });

    // Update bill status if linked
    if (vendorBillId) {
      await runQueryResult(`
        UPDATE VendorBills SET
          Status = CASE
            WHEN TotalAmount <= (SELECT ISNULL(SUM(Amount),0) FROM VendorPayments WHERE VendorBillID=@billId)
            THEN 'Paid' ELSE 'PartiallyPaid' END,
          ChangedBy=@changedBy, ChangeDate=GETDATE()
        WHERE VendorBillID=@billId
      `, { billId: vendorBillId, changedBy: req.user?.username });
    }

    res.status(201).json({ message: 'Payment recorded', paymentId: result.recordset[0].VendorPaymentID });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /:id — Admin only
router.delete('/:id', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const pmt = await runQuery<{ VendorBillID: number | null }>(`
      SELECT VendorBillID FROM VendorPayments WHERE VendorPaymentID=@id
    `, { id });
    if (!pmt[0]) { res.status(404).json({ error: 'Payment not found' }); return; }

    await runQueryResult(`DELETE FROM VendorPayments WHERE VendorPaymentID=@id`, { id });

    // Recalculate bill status
    if (pmt[0].VendorBillID) {
      await runQueryResult(`
        UPDATE VendorBills SET
          Status = CASE
            WHEN (SELECT ISNULL(SUM(Amount),0) FROM VendorPayments WHERE VendorBillID=@billId) = 0
            THEN 'Pending'
            WHEN TotalAmount <= (SELECT ISNULL(SUM(Amount),0) FROM VendorPayments WHERE VendorBillID=@billId)
            THEN 'Paid' ELSE 'PartiallyPaid' END,
          ChangedBy=@changedBy, ChangeDate=GETDATE()
        WHERE VendorBillID=@billId
      `, { billId: pmt[0].VendorBillID, changedBy: req.user?.username });
    }

    res.json({ message: 'Payment deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
