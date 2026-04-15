import { Router, Request, Response } from 'express';
import { runQuery } from '../db';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();
router.use(requireAuth);
router.use(requireRole('Admin', 'Finance'));

// GET /api/reports/gosi?month=YYYY-MM
// GOSI contributions for Saudi labor (9% employee, 11.75% employer on BasicSalary)
router.get('/gosi', async (req: Request, res: Response) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: 'month required (YYYY-MM)' }); return;
  }
  try {
    const rows = await runQuery<{
      LaborID: number; IqamaNumber: string; FullName: string; FullNameAr: string;
      NationalityCode: string; JobTitle: string; BasicSalary: number;
      EmployeeContribution: number; EmployerContribution: number; TotalContribution: number;
    }>(
      `SELECT
         LaborID, IqamaNumber, FullName, ISNULL(FullNameAr,'') AS FullNameAr,
         NationalityCode, ISNULL(JobTitle,'') AS JobTitle, BasicSalary,
         CAST(BasicSalary * 0.09   AS DECIMAL(18,2)) AS EmployeeContribution,
         CAST(BasicSalary * 0.1175 AS DECIMAL(18,2)) AS EmployerContribution,
         CAST(BasicSalary * 0.2075 AS DECIMAL(18,2)) AS TotalContribution
       FROM Labor
       WHERE IsActive = 1 AND NationalityCode = 'SAU'
       ORDER BY FullName`
    );

    const totals = rows.reduce(
      (acc, r) => ({
        basic:    acc.basic    + Number(r.BasicSalary),
        employee: acc.employee + Number(r.EmployeeContribution),
        employer: acc.employer + Number(r.EmployerContribution),
        total:    acc.total    + Number(r.TotalContribution),
      }),
      { basic: 0, employee: 0, employer: 0, total: 0 }
    );

    res.json({ month, rows, totals, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/invoice-aging
// Overdue analysis on non-cleared, non-rejected invoices
router.get('/invoice-aging', async (_req: Request, res: Response) => {
  try {
    const rows = await runQuery<{
      InvoiceID: number; InvoiceNumber: string; ClientName: string;
      ProjectName: string; ProjectCode: string;
      InvoiceDate: string; DueDate: string; TotalAmount: number;
      ZatcaStatus: string; DaysOverdue: number; AgingBucket: string;
    }>(
      `SELECT
         i.InvoiceID, i.InvoiceNumber, i.ClientName, i.TotalAmount, i.ZatcaStatus,
         ISNULL(i.InvoiceDate,'') AS InvoiceDate,
         ISNULL(CONVERT(NVARCHAR(10), i.DueDate, 23),'') AS DueDate,
         ISNULL(p.ProjectName,'') AS ProjectName,
         ISNULL(p.ProjectCode,'') AS ProjectCode,
         DATEDIFF(day, ISNULL(i.DueDate, i.InvoiceDate), GETDATE()) AS DaysOverdue,
         CASE
           WHEN i.DueDate IS NULL OR DATEDIFF(day, i.DueDate, GETDATE()) <= 0 THEN 'Current'
           WHEN DATEDIFF(day, i.DueDate, GETDATE()) BETWEEN 1  AND 30  THEN '1-30 days'
           WHEN DATEDIFF(day, i.DueDate, GETDATE()) BETWEEN 31 AND 60  THEN '31-60 days'
           WHEN DATEDIFF(day, i.DueDate, GETDATE()) BETWEEN 61 AND 90  THEN '61-90 days'
           ELSE '90+ days'
         END AS AgingBucket
       FROM Invoices i
       LEFT JOIN Projects p ON p.ProjectID = i.ProjectID
       WHERE i.ZatcaStatus NOT IN ('Cleared','Rejected')
       ORDER BY DaysOverdue DESC`
    );

    // Bucket summary
    const buckets: Record<string, { count: number; amount: number }> = {
      'Current':    { count: 0, amount: 0 },
      '1-30 days':  { count: 0, amount: 0 },
      '31-60 days': { count: 0, amount: 0 },
      '61-90 days': { count: 0, amount: 0 },
      '90+ days':   { count: 0, amount: 0 },
    };
    for (const r of rows) {
      const b = buckets[r.AgingBucket];
      if (b) { b.count++; b.amount += Number(r.TotalAmount); }
    }

    res.json({ rows, buckets, totalOutstanding: rows.reduce((s, r) => s + Number(r.TotalAmount), 0), count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/labor-by-project
// Active labor headcount and payroll cost per project
router.get('/labor-by-project', async (_req: Request, res: Response) => {
  try {
    const rows = await runQuery<{
      ProjectID: number | null; ProjectCode: string; ProjectName: string;
      HeadCount: number; TotalBasic: number; TotalGross: number;
      SaudiCount: number; NonSaudiCount: number;
    }>(
      `SELECT
         l.ProjectID,
         ISNULL(p.ProjectCode, 'UNASSIGNED') AS ProjectCode,
         ISNULL(p.ProjectName, 'Unassigned') AS ProjectName,
         COUNT(*) AS HeadCount,
         CAST(SUM(l.BasicSalary) AS DECIMAL(18,2)) AS TotalBasic,
         CAST(SUM(l.BasicSalary + l.HousingAllowance + l.TransportAllowance + l.OtherAllowances) AS DECIMAL(18,2)) AS TotalGross,
         SUM(CASE WHEN l.NationalityCode = 'SAU' THEN 1 ELSE 0 END) AS SaudiCount,
         SUM(CASE WHEN l.NationalityCode <> 'SAU' THEN 1 ELSE 0 END) AS NonSaudiCount
       FROM Labor l
       LEFT JOIN Projects p ON p.ProjectID = l.ProjectID
       WHERE l.IsActive = 1
       GROUP BY l.ProjectID, p.ProjectCode, p.ProjectName
       ORDER BY HeadCount DESC`
    );

    const totals = rows.reduce(
      (acc, r) => ({
        headCount: acc.headCount + r.HeadCount,
        totalBasic: acc.totalBasic + Number(r.TotalBasic),
        totalGross: acc.totalGross + Number(r.TotalGross),
        saudiCount: acc.saudiCount + r.SaudiCount,
        nonSaudiCount: acc.nonSaudiCount + r.NonSaudiCount,
      }),
      { headCount: 0, totalBasic: 0, totalGross: 0, saudiCount: 0, nonSaudiCount: 0 }
    );

    res.json({ rows, totals, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
