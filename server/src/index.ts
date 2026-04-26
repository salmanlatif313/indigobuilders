import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { getPool } from './db';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import laborRoutes from './routes/labor';
import invoiceRoutes from './routes/invoices';
import dashboardRoutes from './routes/dashboard';
import wpsRoutes from './routes/wps';
import reportsRoutes from './routes/reports';
import expensesRoutes from './routes/expenses';
import complianceRoutes from './routes/compliance';
import paymentRoutes from './routes/payments';
import purchaseOrderRoutes from './routes/purchase-orders';
import vendorRoutes from './routes/vendors';
import boqRoutes from './routes/boq';
import rfqRoutes from './routes/rfq';
import grnRoutes from './routes/grn';
import qcRoutes from './routes/qc';
import inventoryRoutes from './routes/inventory';
import materialIssueRoutes from './routes/material-issue';
import vendorPaymentRoutes from './routes/vendor-payments';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Middleware — Gzip compression (Brotli handled by IIS for static files)
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '5mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/labor', laborRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/wps', wpsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/boq', boqRoutes);
app.use('/api/rfq', rfqRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/material-issue', materialIssueRoutes);
app.use('/api/vendor-payments', vendorPaymentRoutes);

// Serve React in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
getPool()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 IndigoBuilders ERP server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

export default app;
