import { Router, Request, Response } from 'express';
import { runQuery } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

// GET /api/dashboard
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [projects, labor, invoices, purchaseOrders, recentInvoices, recentProjects, iqamaAlerts, recentPOs] = await Promise.all([
      runQuery<{ TotalProjects: number; ActiveProjects: number }>(
        `SELECT COUNT(*) AS TotalProjects, ISNULL(SUM(CASE WHEN Status='Active' THEN 1 ELSE 0 END),0) AS ActiveProjects FROM Projects`
      ),
      runQuery<{ TotalLabor: number; ActiveLabor: number }>(
        `SELECT COUNT(*) AS TotalLabor, ISNULL(SUM(CASE WHEN IsActive=1 THEN 1 ELSE 0 END),0) AS ActiveLabor FROM Labor`
      ),
      runQuery<{ TotalInvoices: number; TotalValue: number; DraftCount: number; ClearedCount: number }>(
        `SELECT COUNT(*) AS TotalInvoices,
                ISNULL(SUM(TotalAmount),0) AS TotalValue,
                ISNULL(SUM(CASE WHEN ZatcaStatus='Draft' THEN 1 ELSE 0 END),0) AS DraftCount,
                ISNULL(SUM(CASE WHEN ZatcaStatus='Cleared' THEN 1 ELSE 0 END),0) AS ClearedCount
         FROM Invoices`
      ),
      runQuery<{ TotalPOs: number; TotalValue: number; PendingCount: number; ApprovedCount: number; DraftCount: number }>(
        `SELECT COUNT(*) AS TotalPOs,
                ISNULL(SUM(TotalAmount),0) AS TotalValue,
                ISNULL(SUM(CASE WHEN Status='PendingApproval' THEN 1 ELSE 0 END),0) AS PendingCount,
                ISNULL(SUM(CASE WHEN Status='Approved' THEN 1 ELSE 0 END),0) AS ApprovedCount,
                ISNULL(SUM(CASE WHEN Status='Draft' THEN 1 ELSE 0 END),0) AS DraftCount
         FROM PurchaseOrders`
      ),
      runQuery<{ InvoiceNumber: string; ClientName: string; TotalAmount: number; ZatcaStatus: string; InvoiceDate: string }>(
        `SELECT TOP 5 InvoiceNumber, ClientName, TotalAmount, ZatcaStatus, InvoiceDate
         FROM Invoices ORDER BY InvoiceID DESC`
      ),
      runQuery<{ ProjectCode: string; ProjectName: string; Status: string; ChangeDate: string }>(
        `SELECT TOP 5 ProjectCode, ProjectName, Status, ChangeDate FROM Projects ORDER BY ProjectID DESC`
      ),
      runQuery<{ PONumber: string; VendorName: string; TotalAmount: number; Status: string; OrderDate: string; ProjectCode: string }>(
        `SELECT TOP 5
           po.PONumber, po.VendorName, po.TotalAmount, po.Status,
           CONVERT(NVARCHAR(10), po.OrderDate, 23) AS OrderDate,
           ISNULL(p.ProjectCode,'') AS ProjectCode
         FROM PurchaseOrders po
         LEFT JOIN Projects p ON p.ProjectID = po.ProjectID
         ORDER BY po.PurchaseOrderID DESC`
      ),
      runQuery<{ LaborID: number; FullName: string; IqamaNumber: string; IqamaExpiry: string; DaysLeft: number; ProjectName: string }>(
        `SELECT TOP 20
           LaborID, FullName, IqamaNumber,
           CONVERT(NVARCHAR(10), IqamaExpiry, 23) AS IqamaExpiry,
           DATEDIFF(day, GETDATE(), IqamaExpiry) AS DaysLeft,
           ISNULL(p.ProjectName, '') AS ProjectName
         FROM Labor l
         LEFT JOIN Projects p ON p.ProjectID = l.ProjectID
         WHERE l.IsActive = 1
           AND l.IqamaExpiry IS NOT NULL
           AND l.IqamaExpiry <= DATEADD(day, 60, GETDATE())
         ORDER BY l.IqamaExpiry ASC`
      ),
    ]);

    // Activity feed: last 15 changes across modules
    const activity = await runQuery<{ Module: string; Description: string; ChangedBy: string; ChangeDate: string }>(
      `SELECT TOP 15 Module, Description, ChangedBy,
              CONVERT(NVARCHAR(19), ChangeDate, 120) AS ChangeDate
       FROM (
         SELECT 'Invoice' AS Module,
                'Invoice ' + InvoiceNumber + ' — ' + ClientName AS Description,
                ISNULL(ChangedBy,'system') AS ChangedBy, ChangeDate
         FROM Invoices WHERE ChangeDate IS NOT NULL
         UNION ALL
         SELECT 'Labor',
                'Employee ' + FullName + ' (' + IqamaNumber + ')',
                ISNULL(ChangedBy,'system'), ChangeDate
         FROM Labor WHERE ChangeDate IS NOT NULL
         UNION ALL
         SELECT 'Expense',
                'Expense ' + Category + ': ' + Description,
                ISNULL(ChangedBy,'system'), ChangeDate
         FROM ProjectExpenses WHERE ChangeDate IS NOT NULL
         UNION ALL
         SELECT 'Project',
                'Project ' + ProjectCode + ' — ' + ProjectName,
                ISNULL(ChangedBy,'system'), ChangeDate
         FROM Projects WHERE ChangeDate IS NOT NULL
         UNION ALL
         SELECT 'Payment',
                'Payment ' + CAST(CAST(Amount AS INT) AS NVARCHAR(20)) + ' SAR for Invoice#' + CAST(InvoiceID AS NVARCHAR(10)),
                ISNULL(ChangedBy,'system'), ChangeDate
         FROM InvoicePayments WHERE ChangeDate IS NOT NULL
         UNION ALL
         SELECT 'PO',
                'PO ' + PONumber + ' — ' + VendorName + ' (' + Status + ')',
                ISNULL(ChangedBy,'system'), ChangeDate
         FROM PurchaseOrders WHERE ChangeDate IS NOT NULL
       ) feed
       ORDER BY ChangeDate DESC`
    );

    res.json({
      summary: {
        projects:       projects[0]       || { TotalProjects: 0, ActiveProjects: 0 },
        labor:          labor[0]          || { TotalLabor: 0, ActiveLabor: 0 },
        invoices:       invoices[0]       || { TotalInvoices: 0, TotalValue: 0, DraftCount: 0, ClearedCount: 0 },
        purchaseOrders: purchaseOrders[0] || { TotalPOs: 0, TotalValue: 0, PendingCount: 0, ApprovedCount: 0, DraftCount: 0 },
      },
      recentInvoices,
      recentProjects,
      recentPOs,
      iqamaAlerts,
      activity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
