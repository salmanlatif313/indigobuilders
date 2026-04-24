import { useEffect, useState } from 'react';
import { api, DashboardData } from '../api';
import { useLang } from '../LangContext';
import { tr } from '../translations';

function statusBadge(status: string) {
  const cls: Record<string, string> = {
    Draft: 'badge-draft', Cleared: 'badge-cleared', Reported: 'badge-reported', Rejected: 'badge-rejected',
    Active: 'badge-active', Completed: 'badge-inactive', OnHold: 'badge-draft', Cancelled: 'badge-rejected',
    Submitted: 'badge-reported', Accepted: 'badge-cleared',
  };
  return <span className={cls[status] || 'badge-inactive'}>{status}</span>;
}

export default function DashboardView() {
  const { lang } = useLang();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20 text-gray-400">{tr('common', 'loading', lang)}</div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!data) return null;

  const { summary, recentInvoices, recentProjects, recentPOs = [], iqamaAlerts = [], activity = [] } = data;
  const sar = tr('common', 'sar', lang);
  const loc = lang === 'ar' ? 'ar-SA' : 'en-US';

  const kpis = [
    {
      title: tr('dashboard', 'totalProjects', lang),
      value: summary.projects.TotalProjects,
      sub: `${summary.projects.ActiveProjects} ${tr('dashboard', 'active', lang)}`,
      color: 'bg-brand-600',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      title: tr('dashboard', 'totalLabor', lang),
      value: summary.labor.TotalLabor,
      sub: `${summary.labor.ActiveLabor} ${tr('dashboard', 'active', lang)}`,
      color: 'bg-emerald-500',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      title: tr('dashboard', 'totalInvoices', lang),
      value: summary.invoices.TotalInvoices,
      sub: `${summary.invoices.DraftCount} ${tr('dashboard', 'draft', lang)}`,
      color: 'bg-orange-500',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: tr('dashboard', 'invoiceValue', lang),
      value: `${Number(summary.invoices.TotalValue).toLocaleString(loc)} ${sar}`,
      sub: `${summary.invoices.ClearedCount} ${tr('dashboard', 'cleared', lang)}`,
      color: 'bg-violet-600',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: tr('dashboard', 'totalPOs', lang),
      value: summary.purchaseOrders.TotalPOs,
      sub: `${summary.purchaseOrders.PendingCount} ${tr('dashboard', 'pendingApproval', lang)}`,
      color: summary.purchaseOrders.PendingCount > 0 ? 'bg-yellow-500' : 'bg-cyan-600',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      title: tr('dashboard', 'poValue', lang),
      value: `${Number(summary.purchaseOrders.TotalValue).toLocaleString(loc)} ${sar}`,
      sub: `${summary.purchaseOrders.ApprovedCount} ${tr('dashboard', 'approved', lang)}`,
      color: 'bg-teal-600',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr('dashboard', 'title', lang)}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.title} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${k.color}`}>
              {k.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">{k.title}</p>
              <p className="text-2xl font-bold text-gray-900 truncate">{k.value}</p>
              <p className="text-xs text-gray-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* PO Pending Approval alert banner */}
      {summary.purchaseOrders.PendingCount > 0 && (
        <div className="card border border-yellow-200 bg-yellow-50 flex items-center gap-3 py-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-yellow-800 font-medium">
            {summary.purchaseOrders.PendingCount}{' '}
            {lang === 'ar' ? 'أمر شراء بانتظار الاعتماد — تحقق من بريدك الإلكتروني' : 'purchase order(s) pending approval — check your email'}
          </p>
        </div>
      )}

      {iqamaAlerts.length > 0 && (
        <div className="card border border-amber-200 bg-amber-50">
          <h2 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {tr('iqamaAlert', 'title', lang)} ({iqamaAlerts.length})
          </h2>
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '220px' }}>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-amber-100">
                {iqamaAlerts.map(a => (
                  <tr key={a.LaborID} className="hover:bg-amber-100/50">
                    <td className="py-2 pe-4 font-medium text-gray-900">{a.FullName.slice(0, 40)}</td>
                    <td className="py-2 pe-4 font-mono text-xs text-gray-500">{a.IqamaNumber}</td>
                    <td className="py-2 pe-4 text-gray-500 text-xs">{a.ProjectName || '—'}</td>
                    <td className="py-2 pe-4 text-xs text-gray-500">{a.IqamaExpiry}</td>
                    <td className="py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.DaysLeft < 0 ? 'bg-red-100 text-red-700' : a.DaysLeft <= 14 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                        {a.DaysLeft < 0 ? tr('iqamaAlert', 'expired', lang) : `${a.DaysLeft} ${tr('iqamaAlert', 'days', lang)}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">{tr('dashboard', 'recentInvoices', lang)}</h2>
          {recentInvoices.length === 0 ? (
            <p className="text-gray-400 text-sm">{tr('dashboard', 'noInvoices', lang)}</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map(inv => (
                <div key={inv.InvoiceNumber} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{inv.InvoiceNumber}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[140px]">{inv.ClientName}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-semibold text-gray-900">{Number(inv.TotalAmount).toLocaleString(loc)} {sar}</p>
                    {statusBadge(inv.ZatcaStatus)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">{tr('dashboard', 'recentProjects', lang)}</h2>
          {recentProjects.length === 0 ? (
            <p className="text-gray-400 text-sm">{tr('dashboard', 'noProjects', lang)}</p>
          ) : (
            <div className="space-y-3">
              {recentProjects.map(p => (
                <div key={p.ProjectCode} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{p.ProjectName}</p>
                    <p className="text-xs text-gray-500">{p.ProjectCode}</p>
                  </div>
                  {statusBadge(p.Status)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">{tr('dashboard', 'recentPOs', lang)}</h2>
          {recentPOs.length === 0 ? (
            <p className="text-gray-400 text-sm">{tr('dashboard', 'noPOs', lang)}</p>
          ) : (
            <div className="space-y-3">
              {recentPOs.map(po => (
                <div key={po.PONumber} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 font-mono">{po.PONumber}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[140px]">{po.VendorName}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-semibold text-gray-900">{Number(po.TotalAmount).toLocaleString(loc)} {sar}</p>
                    {statusBadge(po.Status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      {activity.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">
            {lang === 'ar' ? 'سجل النشاط الأخير' : 'Recent Activity'}
          </h2>
          <div className="relative">
            <div className="absolute start-3 top-0 bottom-0 w-px bg-gray-100" />
            <div className="space-y-3 ps-8">
              {activity.map((a, i) => {
                const moduleColors: Record<string, string> = {
                  Invoice: 'bg-brand-600', Labor: 'bg-emerald-500',
                  Expense: 'bg-orange-500', Project: 'bg-violet-600',
                  Payment: 'bg-green-600', PO: 'bg-cyan-600',
                };
                const color = moduleColors[a.Module] || 'bg-gray-400';
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`absolute start-1 w-4 h-4 rounded-full ${color} flex items-center justify-center`} style={{ marginTop: '2px' }}>
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{a.Description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${color} text-white font-medium`}>{a.Module}</span>
                        <span className="text-xs text-gray-400">{a.ChangedBy}</span>
                        <span className="text-xs text-gray-300">{a.ChangeDate?.slice(0, 16).replace('T', ' ')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
