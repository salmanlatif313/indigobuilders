import { useEffect, useState } from 'react';
import { api, IssueHeader, IssueLine, StockItem, Project } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import ChipFilter from '../components/ChipFilter';

const STATUS_COLOR: Record<string, string> = {
  Draft:    'bg-gray-100 text-gray-600',
  Approved: 'bg-blue-100 text-blue-700',
  Issued:   'bg-green-100 text-green-700',
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MaterialIssueView() {
  const { can } = useAuth();
  useLang();
  const canCreate = can('Admin', 'Finance', 'PM', 'Engineer');
  const canIssue  = can('Admin', 'PM');

  const [issues, setIssues]     = useState<IssueHeader[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterProject, setFilterProject] = useState('');

  // Detail modal
  const [detail, setDetail]     = useState<{ issue: IssueHeader; lines: IssueLine[] } | null>(null);
  const [issueQtys, setIssueQtys] = useState<Record<number, string>>({});
  const [issuing, setIssuing]   = useState(false);

  // New DC form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    dcNumber: '', projectId: '', fromStore: '', toSite: '',
    issueDate: new Date().toISOString().slice(0, 10),
    requestedBy: '', notes: '',
  });
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedLines, setSelectedLines] = useState<{ stockId: number; description: string; unit: string; requestedQty: string }[]>([]);
  const [saving, setSaving]     = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.getMaterialIssues(), api.getProjects()])
      .then(([r, p]) => { setIssues(r.issues); setProjects(p.projects); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = issues.filter(i =>
    (!statusFilter || i.Status === statusFilter) &&
    (!filterProject || String(i.ProjectID) === filterProject)
  );

  const chips = ['Draft', 'Issued'].map(s => ({
    value: s, label: s, count: issues.filter(i => i.Status === s).length,
  })).filter(c => c.count > 0);

  const onProjectChange = async (projectId: string) => {
    setForm(p => ({ ...p, projectId }));
    setSelectedLines([]);
    if (!projectId) { setStockItems([]); return; }
    setLoadingStock(true);
    try {
      const r = await api.getInventory({ projectId: parseInt(projectId) });
      setStockItems(r.stock.filter(s => s.CurrentQty > 0));
    } catch { setStockItems([]); }
    finally { setLoadingStock(false); }
  };

  const addLine = (stock: StockItem) => {
    if (selectedLines.find(l => l.stockId === stock.StockID)) return;
    setSelectedLines(p => [...p, { stockId: stock.StockID, description: stock.ItemDescription, unit: stock.Unit, requestedQty: '' }]);
  };

  const removeLine = (stockId: number) => setSelectedLines(p => p.filter(l => l.stockId !== stockId));

  const handleCreate = async () => {
    if (!form.dcNumber || !form.projectId || !form.issueDate) {
      alert('DC Number, Project and Date are required'); return;
    }
    const lines = selectedLines.filter(l => parseFloat(l.requestedQty) > 0).map(l => ({
      stockId: l.stockId, description: l.description, unit: l.unit, requestedQty: parseFloat(l.requestedQty),
    }));
    if (!lines.length) { alert('Add at least one item with a quantity'); return; }
    setSaving(true);
    try {
      await api.createMaterialIssue({ ...form, projectId: parseInt(form.projectId), lines });
      setShowForm(false);
      setSelectedLines([]);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const openDetail = async (issue: IssueHeader) => {
    const r = await api.getMaterialIssue(issue.IssueHeaderID);
    setDetail(r);
    const qtys: Record<number, string> = {};
    r.lines.forEach(ln => { qtys[ln.IssueLineID] = String(ln.RequestedQty); });
    setIssueQtys(qtys);
  };

  const handleIssue = async () => {
    if (!detail) return;
    const lines = detail.lines.map(ln => ({
      issueLineId: ln.IssueLineID,
      issuedQty: parseFloat(issueQtys[ln.IssueLineID] || '0') || 0,
    }));
    setIssuing(true);
    try {
      const r = await api.issueDC(detail.issue.IssueHeaderID, { lines });
      alert(`DC issued. Total expense posted: SAR ${fmt(r.totalExpense)}`);
      setDetail(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setIssuing(false); }
  };

  const handleDelete = async (issue: IssueHeader) => {
    if (!confirm(`Delete DC "${issue.DCNumber}"?`)) return;
    try { await api.deleteMaterialIssue(issue.IssueHeaderID); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Material Issue / Delivery Challan</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} DCs</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 self-start text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            New DC
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        <ChipFilter chips={chips} active={statusFilter} onChange={setStatusFilter} />
        <div className="flex gap-2 sm:ms-auto">
          <select className="input-field text-sm" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.ProjectID} value={String(p.ProjectID)}>{p.ProjectCode}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['DC Number', 'Project', 'From Store', 'To Site', 'Date', 'Requested By', 'Total Cost', 'Status', ''].map(h => (
                    <th key={h} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(i => (
                  <tr key={i.IssueHeaderID} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-700 font-medium">{i.DCNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{i.ProjectCode}</td>
                    <td className="px-4 py-3 text-gray-500">{i.FromStore || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{i.ToSite || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{i.IssueDate}</td>
                    <td className="px-4 py-3 text-gray-500">{i.RequestedBy || '—'}</td>
                    <td className="px-4 py-3 text-end font-medium text-gray-800">SAR {fmt(i.TotalCost)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[i.Status] || 'bg-gray-100 text-gray-600'}`}>{i.Status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openDetail(i)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">View</button>
                        {i.Status === 'Draft' && canCreate && (
                          <button onClick={() => handleDelete(i)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={9} className="text-center py-10 text-gray-400">No DCs found</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map(i => (
              <div key={i.IssueHeaderID} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{i.DCNumber}</p>
                    <p className="text-xs text-gray-500">{i.ProjectCode} · {i.IssueDate}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium h-fit ${STATUS_COLOR[i.Status] || 'bg-gray-100 text-gray-600'}`}>{i.Status}</span>
                </div>
                <p className="text-sm font-medium text-gray-800">SAR {fmt(i.TotalCost)}</p>
                <button onClick={() => openDetail(i)} className="btn-secondary text-xs">View</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail / Issue Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="font-semibold text-lg">{detail.issue.DCNumber}</h2>
                <p className="text-sm text-gray-500">{detail.issue.ProjectCode} · {detail.issue.FromStore} → {detail.issue.ToSite} · {detail.issue.IssueDate}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[detail.issue.Status] || 'bg-gray-100 text-gray-600'}`}>{detail.issue.Status}</span>
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <div className="p-6">
              <table className="w-full text-xs border rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    {['Description', 'Unit', 'Requested', detail.issue.Status === 'Draft' ? 'Issue Qty' : 'Issued', 'Unit Cost', 'Total'].map(h => (
                      <th key={h} className="text-start px-3 py-2 font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {detail.lines.map(ln => (
                    <tr key={ln.IssueLineID} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{ln.Description}</td>
                      <td className="px-3 py-2">{ln.Unit}</td>
                      <td className="px-3 py-2 text-end">{ln.RequestedQty}</td>
                      <td className="px-3 py-2">
                        {detail.issue.Status === 'Draft' && canIssue ? (
                          <input type="number" step="0.01" min="0" max={String(ln.RequestedQty)}
                            className="input-field w-20 text-xs"
                            value={issueQtys[ln.IssueLineID] || ''}
                            onChange={e => setIssueQtys(p => ({ ...p, [ln.IssueLineID]: e.target.value }))} />
                        ) : (
                          <span className="font-medium">{ln.IssuedQty}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-end">{fmt(ln.UnitCost)}</td>
                      <td className="px-3 py-2 text-end font-medium">SAR {fmt(ln.TotalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-2 justify-end">
              {canIssue && detail.issue.Status === 'Draft' && (
                <button onClick={handleIssue} disabled={issuing} className="btn-primary text-sm">
                  {issuing ? 'Issuing...' : 'Issue & Post to Expenses'}
                </button>
              )}
              <button onClick={() => setDetail(null)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New DC Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">New Delivery Challan</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DC Number *</label>
                  <input className="input-field" value={form.dcNumber} onChange={e => setForm(p => ({ ...p, dcNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                  <select className="input-field" value={form.projectId} onChange={e => onProjectChange(e.target.value)}>
                    <option value="">Select project...</option>
                    {projects.map(p => <option key={p.ProjectID} value={String(p.ProjectID)}>{p.ProjectCode} — {p.ProjectName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
                  <input type="date" className="input-field" value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requested By</label>
                  <input className="input-field" value={form.requestedBy} onChange={e => setForm(p => ({ ...p, requestedBy: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Store</label>
                  <input className="input-field" value={form.fromStore} onChange={e => setForm(p => ({ ...p, fromStore: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Site</label>
                  <input className="input-field" value={form.toSite} onChange={e => setForm(p => ({ ...p, toSite: e.target.value }))} />
                </div>
              </div>

              {form.projectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Items from Stock</label>
                  {loadingStock ? <div className="text-sm text-gray-400">Loading stock...</div> : (
                    <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {['', 'Description', 'Unit', 'Available'].map(h => (
                              <th key={h} className="text-start px-3 py-2 font-semibold text-gray-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {stockItems.map(s => (
                            <tr key={s.StockID} className={`hover:bg-blue-50 cursor-pointer ${selectedLines.find(l => l.stockId === s.StockID) ? 'bg-blue-50' : ''}`}
                              onClick={() => addLine(s)}>
                              <td className="px-3 py-2">
                                {selectedLines.find(l => l.stockId === s.StockID) ? '✓' : '+'}
                              </td>
                              <td className="px-3 py-2 font-medium">{s.ItemDescription}</td>
                              <td className="px-3 py-2 text-gray-500">{s.Unit}</td>
                              <td className="px-3 py-2 font-semibold">{s.CurrentQty}</td>
                            </tr>
                          ))}
                          {!stockItems.length && <tr><td colSpan={4} className="text-center py-4 text-gray-400">No stock available for this project</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {selectedLines.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selected Items & Quantities</label>
                  <div className="space-y-2">
                    {selectedLines.map(ln => (
                      <div key={ln.stockId} className="flex gap-2 items-center">
                        <span className="flex-1 text-sm text-gray-700 truncate">{ln.description}</span>
                        <span className="text-xs text-gray-500 w-12">{ln.unit}</span>
                        <input type="number" step="0.01" min="0" className="input-field w-24 text-sm"
                          placeholder="Qty" value={ln.requestedQty}
                          onChange={e => setSelectedLines(p => p.map(x => x.stockId === ln.stockId ? { ...x, requestedQty: e.target.value } : x))} />
                        <button onClick={() => removeLine(ln.stockId)} className="text-red-400 hover:text-red-600">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create DC'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
