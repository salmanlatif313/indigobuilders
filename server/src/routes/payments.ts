import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

export const PAYMENT_METHODS = ['BankTransfer', 'Cheque', 'Cash', 'Online'];

interface PaymentRow {
  PaymentID: number; InvoiceID: number; InvoiceNumber: string;
  PaymentDate: string; Amount: number; PaymentMethod: string;
  Reference: string; Notes: string; ChangedBy: string; ChangeDate: string;
}

// GET /api/payments?invoiceId=
router.get('/', async (req: Request, res: Response) => {
  const { invoiceId } = req.query as Record<string, string>;
  const where = invoiceId ? 'WHERE p.InvoiceID = @invoiceId' : '';
  const params: Record<string, unknown> = {};
  if (invoiceId) params.invoiceId = parseInt(invoiceId);
  try {
    const rows = await runQuery<PaymentRow>(
      `SELECT p.PaymentID, p.InvoiceID, i.InvoiceNumber,
              CONVERT(NVARCHAR(10), p.PaymentDate, 23) AS PaymentDate,
              p.Amount, p.PaymentMethod,
              ISNULL(p.Reference,'') AS Reference,
              ISNULL(p.Notes,'') AS Notes,
              ISNULL(p.ChangedBy,'') AS ChangedBy,
              CONVERT(NVARCHAR(10), p.ChangeDate, 23) AS ChangeDate
       FROM InvoicePayments p
       JOIN Invoices i ON i.InvoiceID = p.InvoiceID
       ${where}
       ORDER BY p.PaymentDate DESC, p.PaymentID DESC`,
      params
    );
    const total = rows.reduce((s, r) => s + Number(r.Amount), 0);
    res.json({ payments: rows, count: rows.length, total });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/payments  (Admin, Finance)
router.post('/', requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const { invoiceId, paymentDate, amount, paymentMethod, reference, notes } =
    req.body as { invoiceId: number; paymentDate: string; amount: number; paymentMethod?: string; reference?: string; notes?: string };
  if (!invoiceId || !paymentDate || !amount || amount <= 0) {
    res.status(400).json({ error: 'invoiceId, paymentDate, amount required' }); return;
  }
  try {
    // Check invoice exists and get balance
    const invRows = await runQuery<{ TotalAmount: number; TotalPaid: number; ZatcaStatus: string }>(
      `SELECT TotalAmount, TotalPaid, ZatcaStatus FROM View_InvoiceSummary WHERE InvoiceID=@id`,
      { id: invoiceId }
    );
    if (!invRows[0]) { res.status(404).json({ error: 'Invoice not found' }); return; }
    const balance = Number(invRows[0].TotalAmount) - Number(invRows[0].TotalPaid);
    if (amount > balance + 0.01) {
      res.status(400).json({ error: `Amount (${amount}) exceeds balance due (${balance.toFixed(2)})` }); return;
    }

    const result = await runQueryResult(
      `INSERT INTO InvoicePayments (InvoiceID, PaymentDate, Amount, PaymentMethod, Reference, Notes, ChangedBy)
       OUTPUT INSERTED.PaymentID
       VALUES (@invoiceId, @paymentDate, @amount, @paymentMethod, @reference, @notes, @changedBy)`,
      { invoiceId, paymentDate, amount, paymentMethod: paymentMethod || 'BankTransfer',
        reference: reference || null, notes: notes || null, changedBy: req.user?.username }
    );
    res.status(201).json({ message: 'Payment recorded', paymentId: result.recordset[0]?.PaymentID });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/payments/:id  (Admin, Finance)
router.delete('/:id', requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  try {
    await runQueryResult(`DELETE FROM InvoicePayments WHERE PaymentID=@id`, { id: parseInt(req.params.id) });
    res.json({ message: 'Payment deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
