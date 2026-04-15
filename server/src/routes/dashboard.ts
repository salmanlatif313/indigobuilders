import { Router, Request, Response } from 'express';
import { runQuery } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

// GET /api/dashboard
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [projects, labor, invoices, recentInvoices, recentProjects, iqamaAlerts] = await Promise.all([
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
      runQuery<{ InvoiceNumber: string; ClientName: string; TotalAmount: number; ZatcaStatus: string; InvoiceDate: string }>(
        `SELECT TOP 5 InvoiceNumber, ClientName, TotalAmount, ZatcaStatus, InvoiceDate
         FROM Invoices ORDER BY InvoiceID DESC`
      ),
      runQuery<{ ProjectCode: string; ProjectName: string; Status: string; ChangeDate: string }>(
        `SELECT TOP 5 ProjectCode, ProjectName, Status, ChangeDate FROM Projects ORDER BY ProjectID DESC`
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

    res.json({
      summary: {
        projects: projects[0] || { TotalProjects: 0, ActiveProjects: 0 },
        labor: labor[0] || { TotalLabor: 0, ActiveLabor: 0 },
        invoices: invoices[0] || { TotalInvoices: 0, TotalValue: 0, DraftCount: 0, ClearedCount: 0 },
      },
      recentInvoices,
      recentProjects,
      iqamaAlerts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
