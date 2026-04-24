import { useEffect, useState } from 'react';
import { api, WPSRun, WPSLine } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { tr } from '../translations';
import { files } from '../services/files';

function downloadPayrollCSV(run: WPSRun, lines: WPSLine[], sar: string) {
  const headers = ['Name', 'Iqama', 'IBAN', 'Basic', 'Housing', 'Transport', 'Other', 'Deductions', `Net (${sar})`];
  const rows = lines.map(l => [
    `"${l.FullName}"`, l.IqamaNumber, l.IBAN,
    l.BasicSalary, l.HousingAllowance, l.TransportAllowance,
    l.OtherAllowances, l.Deductions, l.NetSalary,
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  files.downloadCSV(csv, `Payroll_${run.PayrollMonth}.csv`);
}

function statusBadge(s: string) {
  const cls: Record<string, string> = { Draft: 'badge-draft', Submitted: 'badge-reported', Accepted: 'badge-cleared' };
  return <span className={cls[s] || 'badge-draft'}>{s}</span>;
}

export default function WPSView() {
  const { can } = useAuth();
  const { lang } = useLang();
  const [runs, setRuns] = useState<WPSRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState('');
  const [generating, setGenerating] = useState(false);
  const [detail, setDetail] = useState<{ run: WPSRun; lines: WPSLine[] } | null>(null);
  const [loadingLines, setLoadingLines] = useState(false);
  const [editLine, setEditLine] = useState<{ lineId: number; deductions: number } | null>(null);
  const [savingLine, setSavingLine] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = (k: any) => tr('wps', k, lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = (k: any) => tr('common', k, lang);
  const sar = C('sar');

  const load = () => {
    setLoading(true);
    api.getWPSRuns().then(r => setRuns(r.runs)).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (run: WPSRun) => {
    setDetail({ run, lines: [] });
    setLoadingLines(true);
    try {
      const r = await api.getWPSLines(run.RunID);
      setDetail({ run, lines: r.lines });
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setLoadingLines(false); }
  };

  const handleGenerate = async () => {
    if (!payrollMonth || !/^\d{4}-\d{2}$/.test(payrollMonth)) { alert(T('required')); return; }
    setGenerating(true);
    try {
      await api.createWPSRun(payrollMonth);
      setShowForm(false);
      setPayrollMonth('');
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setGenerating(false); }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.updateWPSStatus(id, status);
      if (detail) setDetail(d => d ? { ...d, run: { ...d.run, Status: status } } : null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const handleSaveLine = async () => {
    if (!editLine || !detail) return;
    setSavingLine(true);
    try {
      const result = await api.updateWPSLine(detail.run.RunID, editLine.lineId, editLine.deductions);
      setDetail(d => d ? {
        ...d,
        lines: d.lines.map(l => l.LineID === editLine.lineId ? { ...l, Deductions: editLine.deductions, NetSalary: result.netSalary } : l),
        run: { ...d.run, TotalAmount: d.lines.reduce((s, l) => s + (l.LineID === editLine.lineId ? result.netSalary : Number(l.NetSalary)), 0) },
      } : null);
      setEditLine(null);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSavingLine(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(C('confirm'))) return;
    try { await api.deleteWPSRun(id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{T('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{runs.length} {C('records')}</p>
        </div>
        {can('Admin', 'Finance') && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>{T('newBtn')}</button>
        )}
      </div>

      {error && <div className="text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-gray-400">{C('loading')}</div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {[T('month'), T('totalLabor'), T('totalAmount'), C('status'), T('generatedBy'), T('generatedDate'), C('actions')].map(h => (
                    <th key={h} className="px-4 py-3 text-start font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.map(r => (
                  <tr key={r.RunID} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-sm text-brand-600 font-medium">{r.PayrollMonth}</td>
                    <td className="px-4 py-3 text-center">{r.TotalLabor}</td>
                    <td className="px-4 py-3 font-medium">{Number(r.TotalAmount).toLocaleString()} {sar}</td>
                    <td className="px-4 py-3">{statusBadge(r.Status)}</td>
                    <td className="px-4 py-3 text-gray-600">{r.GeneratedBy}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(r.GeneratedDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openDetail(r)} className="text-brand-600 hover:underline text-xs">{C('view')}</button>
                        {can('Admin', 'Finance') && (
                          <button onClick={() => api.downloadSIF(r.RunID, r.SIFFileName)} className="text-emerald-600 hover:underline text-xs">{T('downloadSIF')}</button>
                        )}
                        {can('Admin') && r.Status === 'Draft' && (
                          <button onClick={() => handleDelete(r.RunID)} className="text-red-500 hover:underline text-xs">{C('delete')}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">{T('noRuns')}</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {runs.map(r => (
              <div key={r.RunID} className="card">
                <div className="flex justify-between mb-1">
                  <p className="font-mono font-bold text-brand-600">{r.PayrollMonth}</p>
                  {statusBadge(r.Status)}
                </div>
                <p className="text-sm text-gray-700">{r.TotalLabor} {T('totalLabor')} · {Number(r.TotalAmount).toLocaleString()} {sar}</p>
                <p className="text-xs text-gray-500 mt-1">{r.GeneratedBy} — {new Date(r.GeneratedDate).toLocaleDateString()}</p>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => openDetail(r)} className="btn-secondary text-xs flex-1">{C('view')}</button>
                  {can('Admin', 'Finance') && (
                    <button onClick={() => api.downloadSIF(r.RunID, r.SIFFileName)} className="btn-primary text-xs flex-1">{T('downloadSIF')}</button>
                  )}
                </div>
              </div>
            ))}
            {runs.length === 0 && <p className="text-center py-12 text-gray-400">{T('noRuns')}</p>}
          </div>
        </>
      )}

      {/* Generate run modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-semibold text-lg mb-4">{T('formTitle')}</h2>
            <label className="block text-sm font-medium text-gray-700 mb-1">{T('payrollMonth')}</label>
            <input type="month" className="input-field mb-4" value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)} />
            <p className="text-xs text-gray-500 mb-4">
              {lang === 'ar'
                ? 'سيتم إنشاء مسير رواتب لجميع الموظفين النشطين لهذا الشهر.'
                : 'A payroll run will be generated for all active employees for this month.'}
            </p>
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={handleGenerate} disabled={generating}>
                {generating ? T('generating') : T('generateBtn')}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>{C('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Deductions edit mini-modal */}
      {editLine && detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-6">
            <h3 className="font-semibold mb-4">{lang === 'ar' ? 'تعديل الاستقطاعات' : 'Edit Deductions'}</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'مبلغ الاستقطاع' : 'Deduction Amount'} ({sar})</label>
            <input type="number" min="0" step="0.01" className="input-field mb-4"
              value={editLine.deductions}
              onChange={e => setEditLine(el => el ? { ...el, deductions: parseFloat(e.target.value) || 0 } : null)} />
            <p className="text-xs text-gray-400 mb-4">
              {lang === 'ar' ? 'سيتم تحديث صافي الراتب تلقائياً.' : 'Net salary will be recalculated automatically.'}
            </p>
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={handleSaveLine} disabled={savingLine}>
                {savingLine ? C('saving') : C('save')}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setEditLine(null)}>{C('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="font-semibold text-lg">{T('title')} — {detail.run.PayrollMonth}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {detail.run.TotalLabor} {T('totalLabor')} · {Number(detail.run.TotalAmount).toLocaleString()} {sar}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(detail.run.Status)}
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 ms-2">✕</button>
              </div>
            </div>
            <div className="p-6">
              {loadingLines ? (
                <div className="text-center py-8 text-gray-400">{C('loading')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {[T('name'), T('iban'), T('basic'), T('housing'), T('transport'), lang === 'ar' ? 'الاستقطاعات' : 'Deductions', T('net'), ''].map(h => (
                          <th key={h} className="px-3 py-2 text-start font-medium text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {detail.lines.map(l => (
                        <tr key={l.LineID} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-medium text-gray-900">{l.FullName.slice(0, 35)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-600">{l.IBAN}</td>
                          <td className="px-3 py-2">{Number(l.BasicSalary).toLocaleString()}</td>
                          <td className="px-3 py-2">{Number(l.HousingAllowance).toLocaleString()}</td>
                          <td className="px-3 py-2">{Number(l.TransportAllowance).toLocaleString()}</td>
                          <td className="px-3 py-2 text-red-600">{Number(l.Deductions) > 0 ? `-${Number(l.Deductions).toLocaleString()}` : '—'}</td>
                          <td className="px-3 py-2 font-bold text-emerald-700">{Number(l.NetSalary).toLocaleString()} {sar}</td>
                          <td className="px-3 py-2">
                            {can('Admin', 'Finance') && detail.run.Status === 'Draft' && (
                              <button onClick={() => setEditLine({ lineId: l.LineID, deductions: Number(l.Deductions) })} className="text-xs text-brand-600 hover:underline">
                                {lang === 'ar' ? 'تعديل' : 'Edit'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {detail.lines.length === 0 && (
                        <tr><td colSpan={8} className="text-center py-8 text-gray-400">{T('noLines')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t flex-wrap">
              {can('Admin', 'Finance') && detail.run.Status === 'Draft' && (
                <button onClick={() => handleUpdateStatus(detail.run.RunID, 'Submitted')} className="btn-primary">
                  {lang === 'ar' ? '📤 إرسال للبنك' : '📤 Submit to Bank'}
                </button>
              )}
              {can('Admin', 'Finance') && detail.run.Status === 'Submitted' && (
                <button onClick={() => handleUpdateStatus(detail.run.RunID, 'Accepted')} className="btn-primary">
                  {lang === 'ar' ? '✓ تأكيد القبول' : '✓ Mark Accepted'}
                </button>
              )}
              {can('Admin', 'Finance') && (
                <button onClick={() => api.downloadSIF(detail.run.RunID, detail.run.SIFFileName)} className="btn-secondary">
                  {T('downloadSIF')}
                </button>
              )}
              {detail.lines.length > 0 && (
                <button onClick={() => downloadPayrollCSV(detail.run, detail.lines, sar)} className="btn-secondary">
                  ⬇ CSV
                </button>
              )}
              <button onClick={() => setDetail(null)} className="btn-secondary ms-auto">{C('close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
