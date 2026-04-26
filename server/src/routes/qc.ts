import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();

interface QCRow {
  QCInspectionID: number; GRNHeaderID: number; GRNNumber: string;
  PONumber: string; ProjectCode: string; ProjectName: string;
  InspectionDate: string; InspectedBy: string; Status: string; Notes: string;
  ChangedBy: string; ChangeDate: string;
}

interface QCLineRow {
  QCLineID: number; QCInspectionID: number; GRNLineID: number;
  Description: string; Unit: string; ThisReceiptQty: number;
  InspectedQty: number; AcceptedQty: number; RejectedQty: number;
  Decision: string; RejectionReason: string; Notes: string;
}

// GET /
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { status, projectId } = req.query as Record<string, string>;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};
  if (status)    { where += ' AND q.Status=@status';       params.status = status; }
  if (projectId) { where += ' AND g.ProjectID=@projectId'; params.projectId = parseInt(projectId); }
  try {
    const rows = await runQuery<QCRow>(`
      SELECT q.QCInspectionID, q.GRNHeaderID,
        ISNULL(g.GRNNumber,'') AS GRNNumber,
        ISNULL(po.PONumber,'') AS PONumber,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        CONVERT(NVARCHAR(10),q.InspectionDate,23) AS InspectionDate,
        ISNULL(q.InspectedBy,'') AS InspectedBy,
        q.Status, ISNULL(q.Notes,'') AS Notes,
        ISNULL(q.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),q.ChangeDate,120),'') AS ChangeDate
      FROM QCInspections q
      JOIN GRNHeaders g ON g.GRNHeaderID=q.GRNHeaderID
      LEFT JOIN PurchaseOrders po ON po.PurchaseOrderID=g.POHeaderID
      LEFT JOIN Projects p ON p.ProjectID=g.ProjectID
      ${where} ORDER BY q.ChangeDate DESC
    `, params);
    res.json({ inspections: rows, count: rows.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /:id — with lines
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const inspections = await runQuery<QCRow>(`
      SELECT q.QCInspectionID, q.GRNHeaderID,
        ISNULL(g.GRNNumber,'') AS GRNNumber,
        ISNULL(po.PONumber,'') AS PONumber,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        CONVERT(NVARCHAR(10),q.InspectionDate,23) AS InspectionDate,
        ISNULL(q.InspectedBy,'') AS InspectedBy,
        q.Status, ISNULL(q.Notes,'') AS Notes,
        ISNULL(q.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),q.ChangeDate,120),'') AS ChangeDate
      FROM QCInspections q
      JOIN GRNHeaders g ON g.GRNHeaderID=q.GRNHeaderID
      LEFT JOIN PurchaseOrders po ON po.PurchaseOrderID=g.POHeaderID
      LEFT JOIN Projects p ON p.ProjectID=g.ProjectID
      WHERE q.QCInspectionID=@id
    `, { id });
    if (!inspections[0]) { res.status(404).json({ error: 'Inspection not found' }); return; }

    const lines = await runQuery<QCLineRow>(`
      SELECT ql.QCLineID, ql.QCInspectionID, ql.GRNLineID,
        gl.Description, ISNULL(gl.Unit,'') AS Unit, gl.ThisReceiptQty,
        ql.InspectedQty, ql.AcceptedQty, ql.RejectedQty,
        ql.Decision, ISNULL(ql.RejectionReason,'') AS RejectionReason,
        ISNULL(ql.Notes,'') AS Notes
      FROM QCInspectionLines ql
      JOIN GRNLines gl ON gl.GRNLineID=ql.GRNLineID
      WHERE ql.QCInspectionID=@id ORDER BY ql.QCLineID
    `, { id });

    // If no lines yet, auto-populate from GRN lines
    if (!lines.length) {
      const grnLines = await runQuery<{ GRNLineID: number; Description: string; Unit: string; ThisReceiptQty: number }>(`
        SELECT GRNLineID, Description, ISNULL(Unit,'') AS Unit, ThisReceiptQty
        FROM GRNLines WHERE GRNHeaderID=@grnId
      `, { grnId: inspections[0].GRNHeaderID });

      for (const gl of grnLines) {
        await runQueryResult(`
          INSERT INTO QCInspectionLines
            (QCInspectionID,GRNLineID,InspectedQty,AcceptedQty,RejectedQty,Decision)
          VALUES (@qcId,@grnLineId,@qty,0,0,'Pending')
        `, { qcId: id, grnLineId: gl.GRNLineID, qty: gl.ThisReceiptQty });
      }

      const freshLines = await runQuery<QCLineRow>(`
        SELECT ql.QCLineID, ql.QCInspectionID, ql.GRNLineID,
          gl.Description, ISNULL(gl.Unit,'') AS Unit, gl.ThisReceiptQty,
          ql.InspectedQty, ql.AcceptedQty, ql.RejectedQty,
          ql.Decision, ISNULL(ql.RejectionReason,'') AS RejectionReason,
          ISNULL(ql.Notes,'') AS Notes
        FROM QCInspectionLines ql
        JOIN GRNLines gl ON gl.GRNLineID=ql.GRNLineID
        WHERE ql.QCInspectionID=@id ORDER BY ql.QCLineID
      `, { id });
      return res.json({ inspection: inspections[0], lines: freshLines });
    }

    res.json({ inspection: inspections[0], lines });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /:id/complete — submit QC decisions, update stock
router.put('/:id/complete', requireAuth, requireRole('Admin', 'Finance', 'PM', 'Engineer'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { inspectedBy, notes, lines } = req.body as {
    inspectedBy?: string; notes?: string;
    lines: { qcLineId: number; inspectedQty: number; acceptedQty: number; rejectedQty: number;
             decision: string; rejectionReason?: string }[];
  };

  if (!lines?.length) { res.status(400).json({ error: 'Lines are required' }); return; }

  try {
    const inspection = await runQuery<{ GRNHeaderID: number; Status: string }>(`
      SELECT GRNHeaderID, Status FROM QCInspections WHERE QCInspectionID=@id
    `, { id });
    if (!inspection[0]) { res.status(404).json({ error: 'Inspection not found' }); return; }
    if (inspection[0].Status === 'Completed') {
      res.status(400).json({ error: 'Inspection already completed' }); return;
    }

    // Get GRN project for stock updates
    const grn = await runQuery<{ ProjectID: number; ProjectCode: string }>(`
      SELECT g.ProjectID, ISNULL(p.ProjectCode,'') AS ProjectCode
      FROM GRNHeaders g LEFT JOIN Projects p ON p.ProjectID=g.ProjectID
      WHERE g.GRNHeaderID=@id
    `, { id: inspection[0].GRNHeaderID });

    for (const ln of lines) {
      await runQueryResult(`
        UPDATE QCInspectionLines SET
          InspectedQty=@inspQty, AcceptedQty=@accQty, RejectedQty=@rejQty,
          Decision=@decision, RejectionReason=@reason, Notes=@notes
        WHERE QCLineID=@id
      `, {
        id: ln.qcLineId, inspQty: ln.inspectedQty, accQty: ln.acceptedQty,
        rejQty: ln.rejectedQty, decision: ln.decision,
        reason: ln.rejectionReason || null, notes: null,
      });

      // Move accepted qty to store stock
      if (ln.acceptedQty > 0 && grn[0]) {
        const grnLine = await runQuery<{ Description: string; Unit: string }>(`
          SELECT gl.Description, ISNULL(gl.Unit,'') AS Unit
          FROM QCInspectionLines ql JOIN GRNLines gl ON gl.GRNLineID=ql.GRNLineID
          WHERE ql.QCLineID=@id
        `, { id: ln.qcLineId });

        if (grnLine[0]) {
          // Upsert stock
          const stock = await runQuery<{ StockID: number; CurrentQty: number; UnitCost: number }>(`
            SELECT StockID, CurrentQty, UnitCost FROM StoreStock
            WHERE ProjectID=@projectId AND ItemDescription=@desc
          `, { projectId: grn[0].ProjectID, desc: grnLine[0].Description });

          if (stock[0]) {
            const newQty = Number(stock[0].CurrentQty) + Number(ln.acceptedQty);
            await runQueryResult(`
              UPDATE StoreStock SET CurrentQty=@qty, TotalValue=@qty*UnitCost,
                LastReceiptDate=GETDATE(), ChangedBy=@changedBy, ChangeDate=GETDATE()
              WHERE StockID=@stockId
            `, { stockId: stock[0].StockID, qty: newQty, changedBy: req.user?.username });
          } else {
            await runQueryResult(`
              INSERT INTO StoreStock
                (ProjectID,ItemDescription,Unit,CurrentQty,MinStockLevel,UnitCost,TotalValue,LastReceiptDate,ChangedBy,ChangeDate)
              VALUES (@projectId,@desc,@unit,@qty,0,0,0,GETDATE(),@changedBy,GETDATE())
            `, {
              projectId: grn[0].ProjectID, desc: grnLine[0].Description,
              unit: grnLine[0].Unit, qty: ln.acceptedQty, changedBy: req.user?.username,
            });
          }
        }
      }
    }

    // Determine overall GRN status
    const allLines = await runQuery<{ Decision: string }>(`
      SELECT Decision FROM QCInspectionLines WHERE QCInspectionID=@id
    `, { id });
    const allAccepted = allLines.every(l => l.Decision === 'Accepted' || l.Decision === 'AcceptedWithDeviation');
    const allRejected = allLines.every(l => l.Decision === 'Rejected');
    const grnStatus = allAccepted ? 'Accepted' : allRejected ? 'Rejected' : 'PartialAccepted';

    await runQueryResult(`
      UPDATE GRNHeaders SET Status=@status, ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE GRNHeaderID=@grnId
    `, { grnId: inspection[0].GRNHeaderID, status: grnStatus, changedBy: req.user?.username });

    await runQueryResult(`
      UPDATE QCInspections SET Status='Completed', InspectedBy=@by, Notes=@notes,
        ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE QCInspectionID=@id
    `, { id, by: inspectedBy || req.user?.username, notes: notes || null, changedBy: req.user?.username });

    res.json({ message: 'QC inspection completed', grnStatus });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
