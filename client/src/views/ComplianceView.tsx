import { useEffect, useState } from 'react';
import { api, ComplianceData } from '../api';
import { useLang } from '../LangContext';
import { tr } from '../translations';

interface AlertSection {
  key: keyof Omit<ComplianceData, 'totalAlerts'>;
  color: string;
  icon: string;
}

const SECTIONS: AlertSection[] = [
  { key: 'iqamaExpired',    color: 'red',    icon: '🚨' },
  { key: 'iqamaExpiring',   color: 'orange', icon: '⚠️' },
  { key: 'wpsDraft',        color: 'orange', icon: '📋' },
  { key: 'overdueInvoices', color: 'red',    icon: '💰' },
  { key: 'missingIBAN',     color: 'yellow', icon: '🏦' },
  { key: 'missingGOSI',     color: 'yellow', icon: '📄' },
];

const COLOR_MAP: Record<string, { bg: string; border: string; title: string; badge: string }> = {
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    title: 'text-red-800',    badge: 'bg-red-100 text-red-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-800', badge: 'bg-orange-100 text-orange-700' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', title: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700' },
};

export default function ComplianceView() {
  const { lang } = useLang();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = (k: any) => tr('compliance', k, lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = (k: any) => tr('common', k, lang);
  const sar = C('sar');

  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCompliance()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">{C('loading')}</div>;
  if (error)   return <div className="text-red-600 p-4">{error}</div>;
  if (!data)   return null;

  const labelMap: Record<AlertSection['key'], string> = {
    iqamaExpired:    T('iqamaExpired'),
    iqamaExpiring:   T('iqamaExpiring'),
    missingIBAN:     T('missingIBAN'),
    missingGOSI:     T('missingGOSI'),
    wpsDraft:        T('wpsDraft'),
    overdueInvoices: T('overdueInvoices'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{T('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data.totalAlerts === 0
              ? T('allClear')
              : `${data.totalAlerts} ${lang === 'ar' ? 'تنبيه يستوجب المتابعة' : 'items require attention'}`}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => { setLoading(true); api.getCompliance().then(setData).finally(() => setLoading(false)); }}>
          {lang === 'ar' ? '↻ تحديث' : '↻ Refresh'}
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        {SECTIONS.map(s => {
          const items = data[s.key] as unknown[];
          const c = COLOR_MAP[s.color];
          return (
            <div key={s.key} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${c.bg} ${c.border}`}>
              <span>{s.icon}</span>
              <span className={`text-xs font-medium ${c.title}`}>{labelMap[s.key]}</span>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${c.badge}`}>{items.length}</span>
            </div>
          );
        })}
      </div>

      {data.totalAlerts === 0 && (
        <div className="card flex items-center gap-4 bg-emerald-50 border border-emerald-200">
          <span className="text-4xl">✅</span>
          <div>
            <p className="font-semibold text-emerald-800">{T('allClear')}</p>
            <p className="text-sm text-emerald-600">{lang === 'ar' ? 'جميع متطلبات الامتثال مكتملة.' : 'All compliance requirements are met.'}</p>
          </div>
        </div>
      )}

      {/* Expired Iqamas */}
      {data.iqamaExpired.length > 0 && (
        <Section icon="🚨" color="red" title={`${T('iqamaExpired')} (${data.iqamaExpired.length})`}>
          <table className="w-full text-sm">
            <thead className="bg-red-50 border-b border-red-100">
              <tr>{[T('name'), T('iqama'), T('expiry'), T('daysLeft'), T('project')].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody className="divide-y divide-red-50">
              {data.iqamaExpired.map(r => (
                <tr key={r.LaborID} className="hover:bg-red-50/50">
                  <Td><span className="font-medium">{r.FullName.slice(0,35)}</span></Td>
                  <Td><span className="font-mono text-xs text-brand-600">{r.IqamaNumber}</span></Td>
                  <Td>{r.IqamaExpiry}</Td>
                  <Td><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">{Math.abs(r.DaysLeft)}d ago</span></Td>
                  <Td className="text-gray-500 text-xs">{r.ProjectName || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Expiring Iqamas */}
      {data.iqamaExpiring.length > 0 && (
        <Section icon="⚠️" color="orange" title={`${T('iqamaExpiring')} (${data.iqamaExpiring.length})`}>
          <table className="w-full text-sm">
            <thead className="bg-orange-50 border-b border-orange-100">
              <tr>{[T('name'), T('iqama'), T('expiry'), T('daysLeft'), T('project')].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody className="divide-y divide-orange-50">
              {data.iqamaExpiring.map(r => (
                <tr key={r.LaborID} className="hover:bg-orange-50/50">
                  <Td><span className="font-medium">{r.FullName.slice(0,35)}</span></Td>
                  <Td><span className="font-mono text-xs text-brand-600">{r.IqamaNumber}</span></Td>
                  <Td>{r.IqamaExpiry}</Td>
                  <Td>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.DaysLeft <= 14 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {r.DaysLeft}d
                    </span>
                  </Td>
                  <Td className="text-gray-500 text-xs">{r.ProjectName || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* WPS Draft (past months) */}
      {data.wpsDraft.length > 0 && (
        <Section icon="📋" color="orange" title={`${T('wpsDraft')} (${data.wpsDraft.length})`}>
          <table className="w-full text-sm">
            <thead className="bg-orange-50 border-b border-orange-100">
              <tr>{[T('month'), lang === 'ar' ? 'موظفين' : 'Employees', lang === 'ar' ? 'المبلغ' : 'Amount', lang === 'ar' ? 'تاريخ الإنشاء' : 'Created'].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody className="divide-y divide-orange-50">
              {data.wpsDraft.map(r => (
                <tr key={r.RunID} className="hover:bg-orange-50/50">
                  <Td><span className="font-mono font-medium text-brand-600">{r.PayrollMonth}</span></Td>
                  <Td>{r.TotalLabor}</Td>
                  <Td className="font-medium">{Number(r.TotalAmount).toLocaleString()} {sar}</Td>
                  <Td className="text-gray-500 text-xs">{r.GeneratedDate}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Overdue Invoices */}
      {data.overdueInvoices.length > 0 && (
        <Section icon="💰" color="red" title={`${T('overdueInvoices')} (${data.overdueInvoices.length})`}>
          <table className="w-full text-sm">
            <thead className="bg-red-50 border-b border-red-100">
              <tr>{[T('invoice'), T('client'), T('project'), T('amount'), T('daysOverdue')].map(h => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody className="divide-y divide-red-50">
              {data.overdueInvoices.map(r => (
                <tr key={r.InvoiceID} className="hover:bg-red-50/50">
                  <Td><span className="font-mono text-xs text-brand-600">{r.InvoiceNumber}</span></Td>
                  <Td className="font-medium text-gray-900">{r.ClientName.slice(0,30)}</Td>
                  <Td className="text-gray-500 text-xs">{r.ProjectCode || '—'}</Td>
                  <Td className="font-bold text-red-700">{Number(r.TotalAmount).toLocaleString()} {sar}</Td>
                  <Td><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">{r.DaysOverdue}d</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Missing IBAN */}
      {data.missingIBAN.length > 0 && (
        <Section icon="🏦" color="yellow" title={`${T('missingIBAN')} (${data.missingIBAN.length})`}>
          <SimpleLabor rows={data.missingIBAN} iqamaLabel={T('iqama')} nameLabel={T('name')} projectLabel={T('project')} />
        </Section>
      )}

      {/* Missing GOSI */}
      {data.missingGOSI.length > 0 && (
        <Section icon="📄" color="yellow" title={`${T('missingGOSI')} (${data.missingGOSI.length})`}>
          <SimpleLabor rows={data.missingGOSI} iqamaLabel={T('iqama')} nameLabel={T('name')} projectLabel={T('project')} />
        </Section>
      )}
    </div>
  );
}

// Sub-components
function Section({ icon, color, title, children }: { icon: string; color: string; title: string; children: React.ReactNode }) {
  const c = COLOR_MAP[color];
  return (
    <div className={`card border ${c.border} p-0 overflow-hidden`}>
      <div className={`flex items-center gap-2 px-4 py-3 ${c.bg} border-b ${c.border}`}>
        <span>{icon}</span>
        <h2 className={`font-semibold ${c.title}`}>{title}</h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-start font-medium text-gray-600 text-xs">{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}

function SimpleLabor({ rows, nameLabel, iqamaLabel, projectLabel }: {
  rows: { LaborID: number; FullName: string; IqamaNumber: string; ProjectName: string }[];
  nameLabel: string; iqamaLabel: string; projectLabel: string;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-yellow-50 border-b border-yellow-100">
        <tr>{[nameLabel, iqamaLabel, projectLabel].map(h => <Th key={h}>{h}</Th>)}</tr>
      </thead>
      <tbody className="divide-y divide-yellow-50">
        {rows.map(r => (
          <tr key={r.LaborID} className="hover:bg-yellow-50/50">
            <Td><span className="font-medium">{r.FullName.slice(0,35)}</span></Td>
            <Td><span className="font-mono text-xs text-brand-600">{r.IqamaNumber}</span></Td>
            <Td className="text-gray-500 text-xs">{r.ProjectName || '—'}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
