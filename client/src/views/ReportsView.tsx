import { useState } from 'react';
import { api, GosiReport, InvoiceAgingReport, LaborByProjectReport } from '../api';
import { useLang } from '../LangContext';
import { tr } from '../translations';

type Tab = 'gosi' | 'aging' | 'labor';

const BUCKET_ORDER = ['Current', '1-30 days', '31-60 days', '61-90 days', '90+ days'];

const BUCKET_COLOR: Record<string, string> = {
  'Current':    'bg-green-100 text-green-700',
  '1-30 days':  'bg-yellow-100 text-yellow-700',
  '31-60 days': 'bg-orange-100 text-orange-700',
  '61-90 days': 'bg-red-100 text-red-700',
  '90+ days':   'bg-red-200 text-red-800',
};

export default function ReportsView() {
  const { lang } = useLang();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = (k: any) => tr('reports', k, lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = (k: any) => tr('common', k, lang);
  const sar = C('sar');

  const [tab, setTab] = useState<Tab>('gosi');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [gosiData, setGosiData] = useState<GosiReport | null>(null);
  const [agingData, setAgingData] = useState<InvoiceAgingReport | null>(null);
  const [laborData, setLaborData] = useState<LaborByProjectReport | null>(null);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'gosi') {
        const d = await api.getGosiReport(month);
        setGosiData(d);
      } else if (tab === 'aging') {
        const d = await api.getInvoiceAging();
        setAgingData(d);
      } else {
        const d = await api.getLaborByProject();
        setLaborData(d);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'gosi',  label: T('gosiTab') },
    { key: 'aging', label: T('agingTab') },
    { key: 'labor', label: T('laborTab') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{T('title')}</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 max-w-md">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setError(''); }}
            className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-colors ${tab === t.key ? 'bg-white shadow text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-end gap-3 flex-wrap">
        {tab === 'gosi' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{T('month')}</label>
            <input type="month" className="input-field" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
        )}
        <button className="btn-primary" onClick={generate} disabled={loading}>
          {loading ? C('loading') : T('generate')}
        </button>
      </div>

      {error && <div className="text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>}

      {/* GOSI Report */}
      {tab === 'gosi' && gosiData && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-1">{T('gosiTitle')} — {gosiData.month}</h2>
            <p className="text-sm text-gray-500 mb-4">{gosiData.count} {lang === 'ar' ? 'موظف سعودي' : 'Saudi employee(s)'}</p>

            {gosiData.count === 0 ? (
              <p className="text-gray-400 text-sm">{T('noGosi')}</p>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: lang === 'ar' ? 'إجمالي الأساسي' : 'Total Basic', val: gosiData.totals.basic, color: 'bg-gray-50' },
                    { label: lang === 'ar' ? 'استقطاع الموظفين (9%)' : 'Employee Deductions (9%)', val: gosiData.totals.employee, color: 'bg-blue-50' },
                    { label: lang === 'ar' ? 'حصة صاحب العمل (11.75%)' : 'Employer Share (11.75%)', val: gosiData.totals.employer, color: 'bg-orange-50' },
                    { label: lang === 'ar' ? 'الإجمالي (20.75%)' : 'Total GOSI (20.75%)', val: gosiData.totals.total, color: 'bg-brand-50' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
                      <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                      <p className="font-bold text-gray-900">{Number(s.val).toLocaleString()} {sar}</p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {[T('iqama'), T('name'), T('basic'), T('empContrib'), T('emplrContrib'), T('total')].map(h => (
                          <th key={h} className="px-3 py-2 text-start font-medium text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {gosiData.rows.map(r => (
                        <tr key={r.LaborID} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-mono text-xs text-brand-600">{r.IqamaNumber}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{r.FullName.slice(0, 35)}</td>
                          <td className="px-3 py-2">{Number(r.BasicSalary).toLocaleString()}</td>
                          <td className="px-3 py-2 text-blue-700">{Number(r.EmployeeContribution).toLocaleString()}</td>
                          <td className="px-3 py-2 text-orange-700">{Number(r.EmployerContribution).toLocaleString()}</td>
                          <td className="px-3 py-2 font-semibold text-brand-700">{Number(r.TotalContribution).toLocaleString()} {sar}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-semibold">
                        <td colSpan={2} className="px-3 py-2">{C('total')}</td>
                        <td className="px-3 py-2">{Number(gosiData.totals.basic).toLocaleString()}</td>
                        <td className="px-3 py-2 text-blue-700">{Number(gosiData.totals.employee).toLocaleString()}</td>
                        <td className="px-3 py-2 text-orange-700">{Number(gosiData.totals.employer).toLocaleString()}</td>
                        <td className="px-3 py-2 text-brand-700">{Number(gosiData.totals.total).toLocaleString()} {sar}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Invoice Aging */}
      {tab === 'aging' && agingData && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-1">{T('agingTitle')}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {T('outstanding')}: <strong>{Number(agingData.totalOutstanding).toLocaleString()} {sar}</strong> — {agingData.count} {C('records')}
            </p>

            {agingData.count === 0 ? (
              <p className="text-gray-400 text-sm">{T('noAging')}</p>
            ) : (
              <>
                {/* Bucket summary */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
                  {BUCKET_ORDER.map(b => {
                    const bk = agingData.buckets[b] || { count: 0, amount: 0 };
                    return (
                      <div key={b} className={`rounded-xl p-3 ${bk.count > 0 ? BUCKET_COLOR[b] : 'bg-gray-50 text-gray-400'}`}>
                        <p className="text-xs font-medium mb-1">{b}</p>
                        <p className="font-bold text-sm">{bk.count} inv.</p>
                        <p className="text-xs">{Number(bk.amount).toLocaleString()} {sar}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {[T('invoice'), T('client'), T('project'), T('dueDate'), T('amount'), T('bucket')].map(h => (
                          <th key={h} className="px-3 py-2 text-start font-medium text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {agingData.rows.map(r => (
                        <tr key={r.InvoiceID} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-mono text-xs text-brand-600">{r.InvoiceNumber}</td>
                          <td className="px-3 py-2 text-gray-800">{r.ClientName.slice(0, 30)}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{r.ProjectCode || '—'}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">{r.DueDate || '—'}</td>
                          <td className="px-3 py-2 font-medium">{Number(r.TotalAmount).toLocaleString()} {sar}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BUCKET_COLOR[r.AgingBucket] || ''}`}>
                              {r.AgingBucket}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Labor by Project */}
      {tab === 'labor' && laborData && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-1">{T('laborTitle')}</h2>
          <p className="text-sm text-gray-500 mb-4">
            {laborData.totals.headCount} {lang === 'ar' ? 'موظف نشط' : 'active employees'} — {Number(laborData.totals.totalGross).toLocaleString()} {sar} {lang === 'ar' ? 'إجمالي رواتب' : 'total payroll'}
          </p>

          {laborData.count === 0 ? (
            <p className="text-gray-400 text-sm">{T('noLabor')}</p>
          ) : (
            <>
              {/* Visual bar chart (CSS) */}
              <div className="space-y-2 mb-6">
                {laborData.rows.map(r => {
                  const pct = laborData.totals.headCount > 0 ? Math.round((r.HeadCount / laborData.totals.headCount) * 100) : 0;
                  return (
                    <div key={r.ProjectCode} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-gray-600 truncate flex-shrink-0">{r.ProjectCode}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div className="bg-brand-500 h-full rounded-full flex items-center justify-end pe-2" style={{ width: `${Math.max(pct, 4)}%` }}>
                          <span className="text-white text-xs font-medium">{r.HeadCount}</span>
                        </div>
                      </div>
                      <div className="w-24 text-xs text-gray-500 text-end">{pct}%</div>
                    </div>
                  );
                })}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['', T('project'), T('headCount'), T('saudi'), T('nonSaudi'), T('totalBasic'), T('totalGross')].map(h => (
                        <th key={h} className="px-3 py-2 text-start font-medium text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {laborData.rows.map(r => (
                      <tr key={r.ProjectCode} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-mono text-xs text-brand-600">{r.ProjectCode}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{r.ProjectName.slice(0, 40)}</td>
                        <td className="px-3 py-2 text-center font-bold text-gray-800">{r.HeadCount}</td>
                        <td className="px-3 py-2 text-center text-green-700">{r.SaudiCount}</td>
                        <td className="px-3 py-2 text-center text-blue-700">{r.NonSaudiCount}</td>
                        <td className="px-3 py-2">{Number(r.TotalBasic).toLocaleString()} {sar}</td>
                        <td className="px-3 py-2 font-semibold text-emerald-700">{Number(r.TotalGross).toLocaleString()} {sar}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold">
                      <td colSpan={2} className="px-3 py-2">{C('total')}</td>
                      <td className="px-3 py-2 text-center">{laborData.totals.headCount}</td>
                      <td className="px-3 py-2 text-center text-green-700">{laborData.totals.saudiCount}</td>
                      <td className="px-3 py-2 text-center text-blue-700">{laborData.totals.nonSaudiCount}</td>
                      <td className="px-3 py-2">{Number(laborData.totals.totalBasic).toLocaleString()} {sar}</td>
                      <td className="px-3 py-2 text-emerald-700">{Number(laborData.totals.totalGross).toLocaleString()} {sar}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
