import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();

interface VendorRow {
  VendorID: number; VendorCode: string; VendorName: string; VendorNameAr: string;
  Category: string; ContactPerson: string; Phone: string; Email: string;
  VATNumber: string; IBAN: string; BankCode: string; PaymentTerms: string;
  ApprovalStatus: string; Rating: number; Address: string; IsActive: boolean;
  Notes: string; ChangedBy: string; ChangeDate: string;
}

// GET / — list
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { status, category } = req.query as Record<string, string>;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};
  if (status)   { where += ' AND ApprovalStatus = @status';   params.status = status; }
  if (category) { where += ' AND Category = @category';       params.category = category; }
  try {
    const rows = await runQuery<VendorRow>(`
      SELECT VendorID, VendorCode, VendorName, ISNULL(VendorNameAr,'') AS VendorNameAr,
        ISNULL(Category,'') AS Category, ISNULL(ContactPerson,'') AS ContactPerson,
        ISNULL(Phone,'') AS Phone, ISNULL(Email,'') AS Email,
        ISNULL(VATNumber,'') AS VATNumber, ISNULL(IBAN,'') AS IBAN,
        ISNULL(BankCode,'') AS BankCode, PaymentTerms, ApprovalStatus,
        ISNULL(Rating,3) AS Rating, ISNULL(Address,'') AS Address,
        IsActive, ISNULL(Notes,'') AS Notes,
        ISNULL(ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),ChangeDate,120),'') AS ChangeDate
      FROM Vendors ${where} ORDER BY VendorName
    `, params);
    res.json({ vendors: rows, count: rows.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /:id — detail
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const rows = await runQuery<VendorRow>(`
      SELECT VendorID, VendorCode, VendorName, ISNULL(VendorNameAr,'') AS VendorNameAr,
        ISNULL(Category,'') AS Category, ISNULL(ContactPerson,'') AS ContactPerson,
        ISNULL(Phone,'') AS Phone, ISNULL(Email,'') AS Email,
        ISNULL(VATNumber,'') AS VATNumber, ISNULL(IBAN,'') AS IBAN,
        ISNULL(BankCode,'') AS BankCode, PaymentTerms, ApprovalStatus,
        ISNULL(Rating,3) AS Rating, ISNULL(Address,'') AS Address,
        IsActive, ISNULL(Notes,'') AS Notes,
        ISNULL(ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),ChangeDate,120),'') AS ChangeDate
      FROM Vendors WHERE VendorID = @id
    `, { id });
    if (!rows[0]) { res.status(404).json({ error: 'Vendor not found' }); return; }
    res.json({ vendor: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST / — create (Admin/Finance)
router.post('/', requireAuth, requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const {
    vendorCode, vendorName, vendorNameAr, category, contactPerson, phone, email,
    vatNumber, iban, bankCode, paymentTerms, approvalStatus, rating, address, notes,
  } = req.body as Record<string, string | number>;

  if (!vendorCode || !vendorName) {
    res.status(400).json({ error: 'vendorCode and vendorName are required' }); return;
  }
  try {
    const result = await runQueryResult<{ VendorID: number }>(`
      INSERT INTO Vendors
        (VendorCode,VendorName,VendorNameAr,Category,ContactPerson,Phone,Email,
         VATNumber,IBAN,BankCode,PaymentTerms,ApprovalStatus,Rating,Address,Notes,
         IsActive,ChangedBy,ChangeDate)
      OUTPUT INSERTED.VendorID
      VALUES
        (@code,@name,@nameAr,@cat,@contact,@phone,@email,
         @vat,@iban,@bank,@terms,@status,@rating,@addr,@notes,
         1,@changedBy,GETDATE())
    `, {
      code: vendorCode, name: vendorName, nameAr: vendorNameAr || null,
      cat: category || null, contact: contactPerson || null,
      phone: phone || null, email: email || null,
      vat: vatNumber || null, iban: iban || null, bank: bankCode || null,
      terms: paymentTerms || 'Net30', status: approvalStatus || 'Pending',
      rating: rating || 3, addr: address || null, notes: notes || null,
      changedBy: req.user?.username,
    });
    res.status(201).json({ message: 'Vendor created', vendorId: result.recordset[0].VendorID });
  } catch (err: unknown) {
    if ((err as { number?: number }).number === 2627)
      res.status(409).json({ error: `Vendor code "${vendorCode}" already exists` });
    else { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
});

// PUT /:id — update
router.put('/:id', requireAuth, requireRole('Admin', 'Finance'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const {
    vendorName, vendorNameAr, category, contactPerson, phone, email,
    vatNumber, iban, bankCode, paymentTerms, approvalStatus, rating, address, isActive, notes,
  } = req.body as Record<string, string | number | boolean>;
  try {
    await runQueryResult(`
      UPDATE Vendors SET
        VendorName=@name, VendorNameAr=@nameAr, Category=@cat,
        ContactPerson=@contact, Phone=@phone, Email=@email,
        VATNumber=@vat, IBAN=@iban, BankCode=@bank,
        PaymentTerms=@terms, ApprovalStatus=@status, Rating=@rating,
        Address=@addr, IsActive=@active, Notes=@notes,
        ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE VendorID=@id
    `, {
      id, name: vendorName, nameAr: vendorNameAr || null,
      cat: category || null, contact: contactPerson || null,
      phone: phone || null, email: email || null,
      vat: vatNumber || null, iban: iban || null, bank: bankCode || null,
      terms: paymentTerms || 'Net30', status: approvalStatus || 'Pending',
      rating: rating || 3, addr: address || null,
      active: isActive !== false ? 1 : 0,
      notes: notes || null, changedBy: req.user?.username,
    });
    res.json({ message: 'Vendor updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /:id — Admin only
router.delete('/:id', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    await runQueryResult(`DELETE FROM Vendors WHERE VendorID=@id`, { id });
    res.json({ message: 'Vendor deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
