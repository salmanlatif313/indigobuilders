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

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Middleware
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
