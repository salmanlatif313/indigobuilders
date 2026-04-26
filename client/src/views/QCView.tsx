import { useEffect, useState } from 'react';
import { api, QCInspection, QCLine, Project, QC_DECISIONS } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import ChipFilter from '../components/ChipFilter';

const DECISION_COLOR: Record<string, string> = {
  Accepted:              'bg-green-100 text-green-700',
  Rejected:              'bg-red-100 text-red-600',
  AcceptedWithDeviation: 'bg-yellow-100 text-yellow-700',
  Pending:               'bg-gray-100 text-gray-500',
};

export default function QCView() {
  const { can } = useAuth();
  useLang();
  const canComplete = can('Admin', 'Finance', 'PM', 'Engineer');

  const [inspections, setInspections] = useState<QCInspection[]>([]);
  const [projects, setProjects]       = useState<Project[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterProject, setFilterProject] = useState('');

  // Active inspection being completed
  const [active, setActive]   = useState<{ inspection: QCInspection; lines: QCLine[] } | null>(null);
  const [lineDecisions, setLineDecisions] = useState<Record<number, { acceptedQty: string; rejectedQty: string; decision: string; rejectionReason: string }>>({});
  const [inspectedBy, setInspectedBy] = useState('');
  const [saving, setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.getQCInspections(), api.getProjects()])
      .then(([r, p]) => { setInspections(r.inspections); setProjects(p.projects); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = inspections.filter(i =>
    (!statusFilter || i.Status === statusFilter) &&
    (!filterProject || i.ProjectCode === projects.find(p => String(p.ProjectID) === filterProject)?.ProjectCode)
  );

  const chips = ['Pending', 'Completed'].map(s => ({
    value: s, label: s, count: inspections.filter(i => i.Status === s).length,
  })).filter(c => c.count > 0);

  const openInspection = async (inspection: QCInspection) => {
    const r = await api.getQCInspection(inspection.QCInspectionID);
    setActive(r);
    const decisions: Record<number, { acceptedQty: string; rejectedQty: string; decision: string; rejectionReason: string }> = {};
    r.lines.forEach(ln => {
      decisions[ln.QCLineID] = {
        acceptedQty: String(ln.AcceptedQty || ln.ThisReceiptQty),
        rejectedQty: String(ln.RejectedQty || 0),
        decision: ln.Decision === 'Pending' ? 'Accepted' : ln.Decision,
        rejectionReason: ln.RejectionReason || '',
      };
    });
    setLineDecisions(decisions);
    setInspectedBy('');
  };

  const handleComplete = async () => {
    if (!active) return;
    const lines = active.lines.map(ln => {
      const d = lineDecisions[ln.QCLineID] || { acceptedQty: '0', rejectedQty: '0', decision: 'Accepted', rejectionReason: '' };
      const accQty = parseFloat(d.acceptedQty) || 0;
      const rejQty = parseFloat(d.rejectedQty) || 0;
      return {
        qcLineId: ln.QCLineID,
        inspectedQty: accQty + rejQty,
        acceptedQty: accQty,
        rejectedQty: rejQty,
        decision: d.decision,
        rejectionReason: d.rejectionReason || undefined,
      };
    });
    setSaving(true);
    try {
      const r = await api.completeQC(active.inspection.QCInspectionID, { inspectedBy, lines });
      alert(`QC completed. GRN status: ${r.grnStatus}`);
      setActive(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const setDecision = (qcLineId: number, key: string, value: string) => {
    setLineDecisions(p => ({ ...p, [qcLineId]: { ...p[qcLineId], [key]: value } }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">QC Inspection</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} inspections</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        <ChipFilter chips={chips} active={statusFilter} onChange={setStatusFilter} />
        <select className="input-field text-sm sm:ms-auto" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.ProjectID} value={String(p.ProjectID)}>{p.ProjectCode}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Inspection ID', 'GRN', 'PO', 'Project', 'Date', 'Inspected By', 'Status', ''].map(h => (
                  <th key={h} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(i => (
                <tr key={i.QCInspectionID} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">QC-{i.QCInspectionID}</td>
                  <td className="px-4 py-3 text-blue-700 font-medium text-xs">{i.GRNNumber}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{i.PONumber}</td>
                  <td className="px-4 py-3 text-gray-600">{i.ProjectCode}</td>
                  <td className="px-4 py-3 text-gray-500">{i.InspectionDate}</td>
                  <td className="px-4 py-3 text-gray-500">{i.InspectedBy || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${i.Status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {i.Status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canComplete && i.Status === 'Pending' ? (
                      <button onClick={() => openInspection(i)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Complete</button>
                    ) : (
                      <button onClick={() => openInspection(i)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">View</button>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={8} className="text-center py-10 text-gray-400">No inspections found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspection Modal */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="font-semibold text-lg">QC Inspection — {active.inspection.GRNNumber}</h2>
                <p className="text-sm text-gray-500">{active.inspection.PONumber} · {active.inspection.ProjectCode} · {active.inspection.InspectionDate}</p>
              </div>
              <button onClick={() => setActive(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {active.inspection.Status === 'Pending' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inspected By</label>
                  <input className="input-field w-64 text-sm" value={inspectedBy} onChange={e => setInspectedBy(e.target.value)} placeholder="Name of inspector" />
                </div>
              )}
              <div className="space-y-3">
                {active.lines.map(ln => {
                  const d = lineDecisions[ln.QCLineID];
                  const isReadonly = active.inspection.Status === 'Completed';
                  return (
                    <div key={ln.QCLineID} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{ln.Description}</p>
                          <p className="text-xs text-gray-500">Receipt Qty: {ln.ThisReceiptQty} {ln.Unit}</p>
                        </div>
                        {isReadonly ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DECISION_COLOR[ln.Decision] || 'bg-gray-100 text-gray-500'}`}>{ln.Decision}</span>
                        ) : (
                          <select className="input-field text-sm w-44"
                            value={d?.decision || 'Accepted'}
                            onChange={e => setDecision(ln.QCLineID, 'decision', e.target.value)}>
                            {QC_DECISIONS.filter(x => x !== 'Pending').map(x => <option key={x}>{x}</option>)}
                          </select>
                        )}
                      </div>
                      {!isReadonly && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Accepted Qty</label>
                            <input type="number" step="0.01" min="0" className="input-field text-sm"
                              value={d?.acceptedQty || ''}
                              onChange={e => setDecision(ln.QCLineID, 'acceptedQty', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Rejected Qty</label>
                            <input type="number" step="0.01" min="0" className="input-field text-sm"
                              value={d?.rejectedQty || ''}
                              onChange={e => setDecision(ln.QCLineID, 'rejectedQty', e.target.value)} />
                          </div>
                          {d?.decision === 'Rejected' && (
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Rejection Reason</label>
                              <input className="input-field text-sm"
                                value={d?.rejectionReason || ''}
                                onChange={e => setDecision(ln.QCLineID, 'rejectionReason', e.target.value)}
                                placeholder="Damaged / Wrong Spec / Short Qty..." />
                            </div>
                          )}
                        </div>
                      )}
                      {isReadonly && (
                        <div className="flex gap-6 text-xs mt-2">
                          <span className="text-green-600">✓ Accepted: {ln.AcceptedQty}</span>
                          {ln.RejectedQty > 0 && <span className="text-red-600">✗ Rejected: {ln.RejectedQty}</span>}
                          {ln.RejectionReason && <span className="text-gray-500">Reason: {ln.RejectionReason}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-2 justify-end">
              {canComplete && active.inspection.Status === 'Pending' && (
                <button onClick={handleComplete} disabled={saving} className="btn-primary text-sm">
                  {saving ? 'Completing...' : 'Complete Inspection'}
                </button>
              )}
              <button onClick={() => setActive(null)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
