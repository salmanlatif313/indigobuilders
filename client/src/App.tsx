import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { LangProvider } from './LangContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoginView from './views/LoginView';
import Layout from './components/Layout';
import DashboardView from './views/DashboardView';
import ProjectsView from './views/ProjectsView';
import LaborView from './views/LaborView';
import InvoicesView from './views/InvoicesView';
import UsersView from './views/UsersView';
import WPSView from './views/WPSView';
import ReportsView from './views/ReportsView';
import ExpensesView from './views/ExpensesView';
import ComplianceView from './views/ComplianceView';
import PurchaseOrdersView from './views/PurchaseOrdersView';
import VendorsView from './views/VendorsView';
import BOQView from './views/BOQView';
import RFQView from './views/RFQView';
import GRNView from './views/GRNView';
import QCView from './views/QCView';
import InventoryView from './views/InventoryView';
import MaterialIssueView from './views/MaterialIssueView';
import VendorPaymentsView from './views/VendorPaymentsView';

type Page = 'dashboard' | 'projects' | 'labor' | 'invoices' | 'expenses' | 'users' | 'wps' | 'reports' | 'compliance' | 'purchase-orders' | 'vendors' | 'boq' | 'rfq' | 'grn' | 'qc' | 'inventory' | 'material-issue' | 'vendor-payments';

function AppInner() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return <LoginView />;

  const views: Record<Page, React.ReactElement> = {
    dashboard: <DashboardView />,
    projects:  <ProjectsView />,
    labor:     <LaborView />,
    invoices:  <InvoicesView />,
    users:     <UsersView />,
    wps:       <WPSView />,
    expenses:   <ExpensesView />,
    reports:    <ReportsView />,
    compliance:       <ComplianceView />,
    'purchase-orders': <PurchaseOrdersView />,
    vendors:           <VendorsView />,
    boq:               <BOQView />,
    rfq:               <RFQView />,
    grn:               <GRNView />,
    qc:                <QCView />,
    inventory:         <InventoryView />,
    'material-issue':  <MaterialIssueView />,
    'vendor-payments': <VendorPaymentsView />,
  };

  return (
    <Layout page={page} onNavigate={p => setPage(p as Page)}>
      {views[page]}
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LangProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </LangProvider>
    </ErrorBoundary>
  );
}
