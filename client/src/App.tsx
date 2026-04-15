import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { LangProvider } from './LangContext';
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

type Page = 'dashboard' | 'projects' | 'labor' | 'invoices' | 'expenses' | 'users' | 'wps' | 'reports' | 'compliance';

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
    compliance: <ComplianceView />,
  };

  return (
    <Layout page={page} onNavigate={p => setPage(p as Page)}>
      {views[page]}
    </Layout>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </LangProvider>
  );
}
