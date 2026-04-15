import { Router, Request, Response } from 'express';
import { runQuery } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);

// GET /api/compliance  — all compliance alerts in one call
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [iqamaExpiring, iqamaExpired, missingIBAN, missingGOSI, wpsDraft, overdueInvoices] = await Promise.all([

      // Iqama expiring within 60 days (not yet expired)
      runQuery<{ LaborID: number; FullName: string; IqamaNumber: string; IqamaExpiry: string; DaysLeft: number; ProjectName: string; NationalityCode: string }>(
        `SELECT l.LaborID, l.FullName, l.IqamaNumber,
                CONVERT(NVARCHAR(10), l.IqamaExpiry, 23) AS IqamaExpiry,
                DATEDIFF(day, GETDATE(), l.IqamaExpiry) AS DaysLeft,
                ISNULL(p.ProjectName,'') AS ProjectName,
                l.NationalityCode
         FROM Labor l LEFT JOIN Projects p ON p.ProjectID = l.ProjectID
         WHERE l.IsActive=1
           AND l.IqamaExpiry IS NOT NULL
           AND l.IqamaExpiry > GETDATE()
           AND l.IqamaExpiry <= DATEADD(day, 60, GETDATE())
         ORDER BY l.IqamaExpiry`
      ),

      // Iqama already expired
      runQuery<{ LaborID: number; FullName: string; IqamaNumber: string; IqamaExpiry: string; DaysLeft: number; ProjectName: string }>(
        `SELECT l.LaborID, l.FullName, l.IqamaNumber,
                CONVERT(NVARCHAR(10), l.IqamaExpiry, 23) AS IqamaExpiry,
                DATEDIFF(day, GETDATE(), l.IqamaExpiry) AS DaysLeft,
                ISNULL(p.ProjectName,'') AS ProjectName
         FROM Labor l LEFT JOIN Projects p ON p.ProjectID = l.ProjectID
         WHERE l.IsActive=1
           AND l.IqamaExpiry IS NOT NULL
           AND l.IqamaExpiry <= GETDATE()
         ORDER BY l.IqamaExpiry`
      ),

      // Active labor missing IBAN
      runQuery<{ LaborID: number; FullName: string; IqamaNumber: string; ProjectName: string }>(
        `SELECT l.LaborID, l.FullName, l.IqamaNumber, ISNULL(p.ProjectName,'') AS ProjectName
         FROM Labor l LEFT JOIN Projects p ON p.ProjectID = l.ProjectID
         WHERE l.IsActive=1 AND (l.IBAN IS NULL OR LTRIM(RTRIM(l.IBAN))='')`
      ),

      // Active Saudi labor missing GOSI number
      runQuery<{ LaborID: number; FullName: string; IqamaNumber: string; ProjectName: string }>(
        `SELECT l.LaborID, l.FullName, l.IqamaNumber, ISNULL(p.ProjectName,'') AS ProjectName
         FROM Labor l LEFT JOIN Projects p ON p.ProjectID = l.ProjectID
         WHERE l.IsActive=1
           AND l.NationalityCode='SAU'
           AND (l.GOSINumber IS NULL OR LTRIM(RTRIM(l.GOSINumber))='')`
      ),

      // WPS runs still Draft for months that have passed
      runQuery<{ RunID: number; PayrollMonth: string; TotalLabor: number; TotalAmount: number; GeneratedDate: string }>(
        `SELECT RunID, PayrollMonth, TotalLabor, TotalAmount,
                CONVERT(NVARCHAR(10), GeneratedDate, 23) AS GeneratedDate
         FROM WPS_PayrollRuns
         WHERE Status='Draft'
           AND PayrollMonth < FORMAT(GETDATE(), 'yyyy-MM')
         ORDER BY PayrollMonth`
      ),

      // Non-cleared invoices with DueDate passed by more than 30 days
      runQuery<{ InvoiceID: number; InvoiceNumber: string; ClientName: string; TotalAmount: number; DueDate: string; DaysOverdue: number; ProjectCode: string }>(
        `SELECT i.InvoiceID, i.InvoiceNumber, i.ClientName, i.TotalAmount,
                ISNULL(CONVERT(NVARCHAR(10),i.DueDate,23),'') AS DueDate,
                DATEDIFF(day, i.DueDate, GETDATE()) AS DaysOverdue,
                ISNULL(p.ProjectCode,'') AS ProjectCode
         FROM Invoices i LEFT JOIN Projects p ON p.ProjectID = i.ProjectID
         WHERE i.ZatcaStatus NOT IN ('Cleared','Rejected')
           AND i.DueDate IS NOT NULL
           AND i.DueDate < DATEADD(day,-30, GETDATE())
         ORDER BY i.DueDate`
      ),
    ]);

    const totalAlerts = iqamaExpired.length + iqamaExpiring.length + missingIBAN.length +
                        missingGOSI.length + wpsDraft.length + overdueInvoices.length;

    res.json({
      totalAlerts,
      iqamaExpired,
      iqamaExpiring,
      missingIBAN,
      missingGOSI,
      wpsDraft,
      overdueInvoices,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
