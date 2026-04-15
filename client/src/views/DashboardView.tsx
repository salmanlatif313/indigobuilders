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

  const { summary, recentInvoices, recentProjects, iqamaAlerts = [], activity = [] } = data;
  const sar = tr('common', 'sar', lang);

  const kpis = [
    {
      title: tr('dashboard', 'totalProjects', lang),
      value: summary.projects.TotalProjects,
      sub: `${summary.projects.ActiveProjects} ${tr('dashboard', 'active', lang)}`,
      color: 'bg-brand-600',
    },
    {
      title: tr('dashboard', 'totalLabor', lang),
      value: summary.labor.TotalLabor,
      sub: `${summary.labor.ActiveLabor} ${tr('dashboard', 'active', lang)}`,
      color: 'bg-emerald-500',
    },
    {
      title: tr('dashboard', 'totalInvoices', lang),
      value: summary.invoices.TotalInvoices,
      sub: `${summary.invoices.DraftCount} ${tr('dashboard', 'draft', lang)}`,
      color: 'bg-orange-500',
    },
    {
      title: tr('dashboard', 'invoiceValue', lang),
      value: `${Number(summary.invoices.TotalValue).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')} ${sar}`,
      sub: `${summary.invoices.ClearedCount} ${tr('dashboard', 'cleared', lang)}`,
      color: 'bg-violet-600',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr('dashboard', 'title', lang)}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.title} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${k.color}`}>
              <span className="text-white text-xl font-bold">{String(k.value).charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">{k.title}</p>
              <p className="text-2xl font-bold text-gray-900">{k.value}</p>
              <p className="text-xs text-gray-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                    <p className="text-xs text-gray-500 truncate max-w-[180px]">{inv.ClientName}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-semibold text-gray-900">
                      {Number(inv.TotalAmount).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')} {sar}
                    </p>
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
                    <p className="text-sm font-medium text-gray-800">{p.ProjectName}</p>
                    <p className="text-xs text-gray-500">{p.ProjectCode}</p>
                  </div>
                  {statusBadge(p.Status)}
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
                  Expense: 'bg-orange-500', Project: 'bg-violet-600', Payment: 'bg-green-600',
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
