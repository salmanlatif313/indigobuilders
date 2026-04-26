import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();

interface StockRow {
  StockID: number; ProjectID: number; ProjectCode: string; ProjectName: string;
  ItemCode: string; ItemDescription: string; Unit: string;
  CurrentQty: number; MinStockLevel: number; UnitCost: number; TotalValue: number;
  LastReceiptDate: string; LastIssueDate: string; LowStock: boolean;
  ChangedBy: string; ChangeDate: string;
}

// GET / — full stock ledger, optionally filtered by project
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { projectId, lowStock } = req.query as Record<string, string>;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};
  if (projectId) { where += ' AND s.ProjectID=@projectId'; params.projectId = parseInt(projectId); }
  if (lowStock === 'true') { where += ' AND s.CurrentQty <= s.MinStockLevel'; }
  try {
    const rows = await runQuery<StockRow>(`
      SELECT s.StockID, s.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        ISNULL(s.ItemCode,'') AS ItemCode, s.ItemDescription, ISNULL(s.Unit,'') AS Unit,
        s.CurrentQty, s.MinStockLevel, s.UnitCost, s.TotalValue,
        ISNULL(CONVERT(NVARCHAR(10),s.LastReceiptDate,23),'') AS LastReceiptDate,
        ISNULL(CONVERT(NVARCHAR(10),s.LastIssueDate,23),'') AS LastIssueDate,
        CASE WHEN s.CurrentQty <= s.MinStockLevel AND s.MinStockLevel > 0 THEN 1 ELSE 0 END AS LowStock,
        ISNULL(s.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),s.ChangeDate,120),'') AS ChangeDate
      FROM StoreStock s
      LEFT JOIN Projects p ON p.ProjectID=s.ProjectID
      ${where} ORDER BY p.ProjectCode, s.ItemDescription
    `, params);
    const lowStockCount = rows.filter(r => r.LowStock).length;
    res.json({ stock: rows, count: rows.length, lowStockCount });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /:id — single stock item
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const rows = await runQuery<StockRow>(`
      SELECT s.StockID, s.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        ISNULL(s.ItemCode,'') AS ItemCode, s.ItemDescription, ISNULL(s.Unit,'') AS Unit,
        s.CurrentQty, s.MinStockLevel, s.UnitCost, s.TotalValue,
        ISNULL(CONVERT(NVARCHAR(10),s.LastReceiptDate,23),'') AS LastReceiptDate,
        ISNULL(CONVERT(NVARCHAR(10),s.LastIssueDate,23),'') AS LastIssueDate,
        CASE WHEN s.CurrentQty <= s.MinStockLevel AND s.MinStockLevel > 0 THEN 1 ELSE 0 END AS LowStock,
        ISNULL(s.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),s.ChangeDate,120),'') AS ChangeDate
      FROM StoreStock s
      LEFT JOIN Projects p ON p.ProjectID=s.ProjectID
      WHERE s.StockID=@id
    `, { id });
    if (!rows[0]) { res.status(404).json({ error: 'Stock item not found' }); return; }
    res.json({ stock: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /:id — update min stock level and unit cost (Admin/PM)
router.put('/:id', requireAuth, requireRole('Admin', 'PM'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { minStockLevel, unitCost, itemCode } = req.body as {
    minStockLevel?: number; unitCost?: number; itemCode?: string;
  };
  try {
    await runQueryResult(`
      UPDATE StoreStock SET
        MinStockLevel = ISNULL(@minStock, MinStockLevel),
        UnitCost = ISNULL(@unitCost, UnitCost),
        TotalValue = CurrentQty * ISNULL(@unitCost, UnitCost),
        ItemCode = ISNULL(@itemCode, ItemCode),
        ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE StockID=@id
    `, {
      id, minStock: minStockLevel ?? null, unitCost: unitCost ?? null,
      itemCode: itemCode || null, changedBy: req.user?.username,
    });
    res.json({ message: 'Stock item updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /summary — per-project stock summary
router.get('/summary/projects', requireAuth, async (_req: Request, res: Response) => {
  try {
    const rows = await runQuery<{ ProjectID: number; ProjectCode: string; ProjectName: string; ItemCount: number; TotalValue: number; LowStockCount: number }>(`
      SELECT s.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        COUNT(*) AS ItemCount,
        SUM(s.TotalValue) AS TotalValue,
        SUM(CASE WHEN s.CurrentQty <= s.MinStockLevel AND s.MinStockLevel > 0 THEN 1 ELSE 0 END) AS LowStockCount
      FROM StoreStock s
      LEFT JOIN Projects p ON p.ProjectID=s.ProjectID
      GROUP BY s.ProjectID, p.ProjectCode, p.ProjectName
      ORDER BY p.ProjectCode
    `);
    res.json({ projects: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
