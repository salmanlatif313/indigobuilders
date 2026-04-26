import { Router, Request, Response } from 'express';
import { runQuery, runQueryResult } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();

interface GRNRow {
  GRNHeaderID: number; GRNNumber: string; POHeaderID: number; PONumber: string;
  ProjectID: number; ProjectCode: string; ProjectName: string;
  GRNDate: string; VehicleNo: string; DriverName: string; DeliveryNoteNo: string;
  StoreLocation: string; ReceivedBy: string; Status: string; Notes: string;
  ChangedBy: string; ChangeDate: string;
}

interface GRNLineRow {
  GRNLineID: number; GRNHeaderID: number; POLineID: number; Description: string;
  Unit: string; OrderedQty: number; PreviouslyReceivedQty: number; ThisReceiptQty: number; Notes: string;
}

// GET /
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { projectId, status, poId } = req.query as Record<string, string>;
  let where = 'WHERE 1=1';
  const params: Record<string, unknown> = {};
  if (projectId) { where += ' AND g.ProjectID=@projectId'; params.projectId = parseInt(projectId); }
  if (status)    { where += ' AND g.Status=@status';       params.status = status; }
  if (poId)      { where += ' AND g.POHeaderID=@poId';     params.poId = parseInt(poId); }
  try {
    const rows = await runQuery<GRNRow>(`
      SELECT g.GRNHeaderID, g.GRNNumber, g.POHeaderID,
        ISNULL(po.PONumber,'') AS PONumber, g.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        CONVERT(NVARCHAR(10),g.GRNDate,23) AS GRNDate,
        ISNULL(g.VehicleNo,'') AS VehicleNo, ISNULL(g.DriverName,'') AS DriverName,
        ISNULL(g.DeliveryNoteNo,'') AS DeliveryNoteNo,
        ISNULL(g.StoreLocation,'') AS StoreLocation, ISNULL(g.ReceivedBy,'') AS ReceivedBy,
        g.Status, ISNULL(g.Notes,'') AS Notes,
        ISNULL(g.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),g.ChangeDate,120),'') AS ChangeDate
      FROM GRNHeaders g
      LEFT JOIN PurchaseOrders po ON po.PurchaseOrderID=g.POHeaderID
      LEFT JOIN Projects p ON p.ProjectID=g.ProjectID
      ${where} ORDER BY g.ChangeDate DESC
    `, params);
    res.json({ grns: rows, count: rows.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /:id — header + lines
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const grns = await runQuery<GRNRow>(`
      SELECT g.GRNHeaderID, g.GRNNumber, g.POHeaderID,
        ISNULL(po.PONumber,'') AS PONumber, g.ProjectID,
        ISNULL(p.ProjectCode,'') AS ProjectCode, ISNULL(p.ProjectName,'') AS ProjectName,
        CONVERT(NVARCHAR(10),g.GRNDate,23) AS GRNDate,
        ISNULL(g.VehicleNo,'') AS VehicleNo, ISNULL(g.DriverName,'') AS DriverName,
        ISNULL(g.DeliveryNoteNo,'') AS DeliveryNoteNo,
        ISNULL(g.StoreLocation,'') AS StoreLocation, ISNULL(g.ReceivedBy,'') AS ReceivedBy,
        g.Status, ISNULL(g.Notes,'') AS Notes,
        ISNULL(g.ChangedBy,'') AS ChangedBy,
        ISNULL(CONVERT(NVARCHAR(19),g.ChangeDate,120),'') AS ChangeDate
      FROM GRNHeaders g
      LEFT JOIN PurchaseOrders po ON po.PurchaseOrderID=g.POHeaderID
      LEFT JOIN Projects p ON p.ProjectID=g.ProjectID
      WHERE g.GRNHeaderID=@id
    `, { id });
    if (!grns[0]) { res.status(404).json({ error: 'GRN not found' }); return; }

    const lines = await runQuery<GRNLineRow>(`
      SELECT GRNLineID, GRNHeaderID, POLineID, Description, ISNULL(Unit,'') AS Unit,
        OrderedQty, PreviouslyReceivedQty, ThisReceiptQty, ISNULL(Notes,'') AS Notes
      FROM GRNLines WHERE GRNHeaderID=@id ORDER BY GRNLineID
    `, { id });

    res.json({ grn: grns[0], lines });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST / — create GRN against a PO
router.post('/', requireAuth, requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const {
    grnNumber, poHeaderId, projectId, grnDate,
    vehicleNo, driverName, deliveryNoteNo, storeLocation, receivedBy, notes,
    lines,
  } = req.body as {
    grnNumber: string; poHeaderId: number; projectId: number; grnDate: string;
    vehicleNo?: string; driverName?: string; deliveryNoteNo?: string;
    storeLocation?: string; receivedBy?: string; notes?: string;
    lines: { poLineId: number; description: string; unit?: string;
             orderedQty: number; previouslyReceivedQty: number; thisReceiptQty: number; notes?: string }[];
  };

  if (!grnNumber || !poHeaderId || !projectId || !grnDate || !lines?.length) {
    res.status(400).json({ error: 'grnNumber, poHeaderId, projectId, grnDate and lines are required' }); return;
  }

  try {
    const result = await runQueryResult<{ GRNHeaderID: number }>(`
      INSERT INTO GRNHeaders
        (GRNNumber,POHeaderID,ProjectID,GRNDate,VehicleNo,DriverName,DeliveryNoteNo,
         StoreLocation,ReceivedBy,Status,Notes,ChangedBy,ChangeDate)
      OUTPUT INSERTED.GRNHeaderID
      VALUES (@grnNumber,@poId,@projectId,@grnDate,@vehicleNo,@driverName,@deliveryNoteNo,
              @storeLocation,@receivedBy,'Draft',@notes,@changedBy,GETDATE())
    `, {
      grnNumber, poId: poHeaderId, projectId, grnDate,
      vehicleNo: vehicleNo || null, driverName: driverName || null,
      deliveryNoteNo: deliveryNoteNo || null, storeLocation: storeLocation || null,
      receivedBy: receivedBy || null, notes: notes || null, changedBy: req.user?.username,
    });
    const grnId = result.recordset[0].GRNHeaderID;

    for (const ln of lines) {
      await runQueryResult(`
        INSERT INTO GRNLines (GRNHeaderID,POLineID,Description,Unit,OrderedQty,PreviouslyReceivedQty,ThisReceiptQty,Notes)
        VALUES (@grnId,@poLineId,@desc,@unit,@ordQty,@prevQty,@thisQty,@notes)
      `, {
        grnId, poLineId: ln.poLineId, desc: ln.description, unit: ln.unit || null,
        ordQty: ln.orderedQty, prevQty: ln.previouslyReceivedQty,
        thisQty: ln.thisReceiptQty, notes: ln.notes || null,
      });
    }

    // Auto-create QC inspection
    await runQueryResult(`
      INSERT INTO QCInspections (GRNHeaderID,InspectionDate,Status,ChangedBy,ChangeDate)
      VALUES (@grnId,GETDATE(),'Pending',@changedBy,GETDATE())
    `, { grnId, changedBy: req.user?.username });

    res.status(201).json({ message: 'GRN created', grnId, grnNumber });
  } catch (err: unknown) {
    if ((err as { number?: number }).number === 2627)
      res.status(409).json({ error: `GRN number "${grnNumber}" already exists` });
    else { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
});

// PUT /:id/status
router.put('/:id/status', requireAuth, requireRole('Admin', 'Finance', 'PM'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { status } = req.body as { status: string };
  if (!['Draft', 'Inspecting', 'Accepted', 'PartialAccepted', 'Rejected'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' }); return;
  }
  try {
    await runQueryResult(`
      UPDATE GRNHeaders SET Status=@status, ChangedBy=@changedBy, ChangeDate=GETDATE()
      WHERE GRNHeaderID=@id
    `, { id, status, changedBy: req.user?.username });

    // If accepted, check if all PO lines are fully received → auto-close PO
    if (status === 'Accepted') {
      await runQueryResult(`
        UPDATE PurchaseOrders SET Status='Delivered', ChangedBy=@changedBy, ChangeDate=GETDATE()
        WHERE PurchaseOrderID = (SELECT POHeaderID FROM GRNHeaders WHERE GRNHeaderID=@id)
          AND NOT EXISTS (
            SELECT 1 FROM PurchaseOrderItems poi
            WHERE poi.PurchaseOrderID = (SELECT POHeaderID FROM GRNHeaders WHERE GRNHeaderID=@id)
              AND poi.Quantity > ISNULL((
                SELECT SUM(gl.ThisReceiptQty)
                FROM GRNLines gl JOIN GRNHeaders gh ON gh.GRNHeaderID=gl.GRNHeaderID
                WHERE gl.POLineID=poi.LineID AND gh.Status IN ('Accepted','PartialAccepted')
              ), 0)
          )
      `, { id, changedBy: req.user?.username });
    }

    res.json({ message: 'GRN status updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /:id — Draft only
router.delete('/:id', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  try {
    const existing = await runQuery<{ Status: string }>(`SELECT Status FROM GRNHeaders WHERE GRNHeaderID=@id`, { id });
    if (!existing[0]) { res.status(404).json({ error: 'GRN not found' }); return; }
    if (existing[0].Status !== 'Draft') {
      res.status(400).json({ error: 'Only Draft GRNs can be deleted' }); return;
    }
    await runQueryResult(`DELETE FROM GRNHeaders WHERE GRNHeaderID=@id`, { id });
    res.json({ message: 'GRN deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
