import { useEffect, useRef, useState } from 'react';
import { api, BOQHeader, BOQItem, Project } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import ChipFilter from '../components/ChipFilter';
import { files } from '../services/files';

const STATUS_COLOR: Record<string, string> = {
  Active:      'bg-green-100 text-green-700',
  Revised:     'bg-yellow-100 text-yellow-700',
  Superseded:  'bg-gray-100 text-gray-500',
};

function fmtAmt(n: number) { return Number(n || 0).toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

export default function BOQView() {
  const { can } = useAuth();
  const { lang } = useLang();
  const canEdit = can('Admin', 'PM');

  const [boqs, setBOQs]       = useState<BOQHeader[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [search, setSearch]   = useState('');

  // New BOQ form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ projectId: '', boqNumber: '', title: '', boqDate: new Date().toISOString().slice(0, 10), notes: '' });
  const [saving, setSaving]   = useState(false);

  // Items modal
  const [selectedBOQ, setSelectedBOQ] = useState<BOQHeader | null>(null);
  const [items, setItems]             = useState<BOQItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Import
  const [showImport, setShowImport]   = useState(false);
  const [importBOQId, setImportBOQId] = useState<number | null>(null);
  const [csvText, setCsvText]         = useState('');
  const [importing, setImporting]     = useState(false);
  const [importMsg, setImportMsg]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getBOQs(filterProject ? { projectId: parseInt(filterProject) } : undefined),
      api.getProjects(),
    ])
      .then(([b, p]) => { setBOQs(b.boqs); setProjects(p.projects); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = boqs.filter(b =>
    (!statusFilter || b.Status === statusFilter) &&
    (!filterProject || String(b.ProjectID) === filterProject) &&
    (b.BOQNumber.toLowerCase().includes(search.toLowerCase()) ||
     b.Title.toLowerCase().includes(search.toLowerCase()) ||
     b.ProjectCode.toLowerCase().includes(search.toLowerCase()))
  );

  const chips = ['Active', 'Revised', 'Superseded'].map(s => ({
    value: s, label: s, count: boqs.filter(b => b.Status === s).length,
  })).filter(c => c.count > 0);

  const openItems = async (b: BOQHeader) => {
    setSelectedBOQ(b);
    setItemsLoading(true);
    try {
      const r = await api.getBOQItems(b.BOQHeaderID);
      setItems(r.items);
    } catch { setItems([]); }
    finally { setItemsLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.projectId || !form.boqNumber || !form.title || !form.boqDate) {
      alert('Project, BOQ Number, Title and Date are required'); return;
    }
    setSaving(true);
    try {
      await api.createBOQ({ ...form, projectId: parseInt(form.projectId) });
      setShowForm(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (b: BOQHeader, status: string) => {
    try { await api.updateBOQStatus(b.BOQHeaderID, status); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const handleDelete = async (b: BOQHeader) => {
    if (!confirm(`Delete BOQ "${b.BOQNumber} — ${b.Title}"?`)) return;
    try { await api.deleteBOQ(b.BOQHeaderID); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const parseCSV = (text: string): Partial<BOQItem>[] => {
    const lines = text.trim().split('\n').slice(1); // skip header
    return lines.map(line => {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      return {
        SerialNo: parts[0] || '', MainScope: parts[1] || '', Category: parts[2] || '',
        Description: parts[3] || '', Unit: parts[4] || '',
        Quantity: parseFloat(parts[5]) || 0, UnitRate: parseFloat(parts[6]) || 0,
        ProfitPct: parseFloat(parts[7]) || 0,
      };
    }).filter(it => it.Description);
  };

  const handleImport = async () => {
    if (!importBOQId || !csvText.trim()) { alert('Select a BOQ and paste CSV data'); return; }
    const items = parseCSV(csvText);
    if (!items.length) { alert('No valid rows found. Check CSV format.'); return; }
    setImporting(true);
    try {
      const r = await api.importBOQItems(importBOQId, items, true);
      setImportMsg(`✅ ${items.length} items imported. Total: SAR ${fmtAmt(r.totalAmount)}`);
      load();
    } catch (e: unknown) { setImportMsg(`❌ ${e instanceof Error ? e.message : 'Error'}`); }
    finally { setImporting(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target?.result as string || '');
    reader.readAsText(file);
  };

  const downloadCSV = () => {
    const csv = ['SerialNo,MainScope,Category,Description,Unit,Quantity,UnitRate,ProfitPct',
      ...items.map(it => [it.SerialNo, it.MainScope, it.Category,
        `"${it.Description}"`, it.Unit, it.Quantity, it.UnitRate, it.ProfitPct].join(','))
    ].join('\n');
    files.downloadCSV(csv, `BOQ_${selectedBOQ?.BOQNumber}_${selectedBOQ?.RevisionNumber}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{lang === 'ar' ? 'جداول الكميات' : 'Bill of Quantities'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} {lang === 'ar' ? 'BOQ' : 'BOQs'}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <>
              <button onClick={() => { setShowImport(true); setImportBOQId(null); setCsvText(''); setImportMsg(''); }}
                className="btn-secondary flex items-center gap-1 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                Import CSV
              </button>
              <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                New BOQ
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        <ChipFilter chips={chips} active={statusFilter} onChange={setStatusFilter} />
        <div className="flex gap-2 sm:ms-auto">
          <select className="input-field text-sm" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.ProjectID} value={String(p.ProjectID)}>{p.ProjectCode}</option>)}
          </select>
          <input type="text" placeholder="Search..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-field w-40 text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['BOQ Number', 'Project', 'Title', 'Rev', 'Date', 'Status', 'Total Amount', ''].map(h => (
                  <th key={h} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(b => (
                <tr key={b.BOQHeaderID} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-700 font-medium">{b.BOQNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{b.ProjectCode}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{b.Title}</td>
                  <td className="px-4 py-3 text-center text-gray-500">Rev {b.RevisionNumber}</td>
                  <td className="px-4 py-3 text-gray-500">{b.BOQDate}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.Status] || 'bg-gray-100 text-gray-600'}`}>{b.Status}</span>
                  </td>
                  <td className="px-4 py-3 text-end font-medium text-gray-800">SAR {fmtAmt(b.TotalAmount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openItems(b)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">Items</button>
                      {canEdit && b.Status === 'Active' && (
                        <button onClick={() => handleStatusChange(b, 'Superseded')}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium">Supersede</button>
                      )}
                      {canEdit && (
                        <button onClick={() => handleDelete(b)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No BOQs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map(b => (
          <div key={b.BOQHeaderID} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">{b.BOQNumber}</p>
                <p className="text-xs text-gray-500">{b.ProjectCode} · Rev {b.RevisionNumber} · {b.BOQDate}</p>
                <p className="text-sm text-gray-700 mt-0.5">{b.Title}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.Status] || 'bg-gray-100 text-gray-600'}`}>{b.Status}</span>
            </div>
            <p className="text-sm font-semibold text-gray-800">SAR {fmtAmt(b.TotalAmount)}</p>
            <button onClick={() => openItems(b)} className="btn-secondary text-xs">View Items</button>
          </div>
        ))}
      </div>

      {/* Items Modal */}
      {selectedBOQ && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="font-semibold text-lg">{selectedBOQ.BOQNumber} — {selectedBOQ.Title}</h2>
                <p className="text-sm text-gray-500">{selectedBOQ.ProjectCode} · Rev {selectedBOQ.RevisionNumber} · {selectedBOQ.Status}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadCSV} className="btn-secondary text-xs">Export CSV</button>
                <button onClick={() => setSelectedBOQ(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <div className="p-4 overflow-x-auto" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {itemsLoading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['#', 'Scope', 'Category', 'Description', 'Unit', 'Qty', 'Rate', 'Amount', 'Profit%', 'Total', 'Status'].map(h => (
                        <th key={h} className="text-start px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map(it => (
                      <tr key={it.BOQItemID} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{it.SerialNo}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{it.MainScope}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{it.Category}</td>
                        <td className="px-3 py-2 text-gray-900 max-w-[240px]">{it.Description.slice(0, 80)}{it.Description.length > 80 ? '…' : ''}</td>
                        <td className="px-3 py-2 text-gray-500">{it.Unit}</td>
                        <td className="px-3 py-2 text-end">{it.Quantity}</td>
                        <td className="px-3 py-2 text-end">{fmtAmt(it.UnitRate)}</td>
                        <td className="px-3 py-2 text-end">{fmtAmt(it.Amount)}</td>
                        <td className="px-3 py-2 text-end">{it.ProfitPct}%</td>
                        <td className="px-3 py-2 text-end font-medium">{fmtAmt(it.TotalWithProfit)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            it.ProcurementStatus === 'Completed' ? 'bg-green-100 text-green-700' :
                            it.ProcurementStatus === 'InProgress' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{it.ProcurementStatus}</span>
                        </td>
                      </tr>
                    ))}
                    {!items.length && <tr><td colSpan={11} className="text-center py-8 text-gray-400">No items. Use "Import CSV" to load BOQ items.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <span className="text-sm text-gray-500">{items.length} line items</span>
              <span className="font-semibold text-gray-900">Total: SAR {fmtAmt(selectedBOQ.TotalAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* New BOQ Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">New BOQ</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select className="input-field" value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}>
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.ProjectID} value={String(p.ProjectID)}>{p.ProjectCode} — {p.ProjectName}</option>)}
                </select>
              </div>
              {[
                { label: 'BOQ Number *', key: 'boqNumber' },
                { label: 'Title *', key: 'title' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input className="input-field" value={(form as Record<string, string>)[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BOQ Date *</label>
                <input type="date" className="input-field" value={form.boqDate}
                  onChange={e => setForm(p => ({ ...p, boqDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="input-field" rows={2} value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create BOQ'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">Import BOQ Items from CSV</h2>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target BOQ *</label>
                <select className="input-field" value={importBOQId || ''} onChange={e => setImportBOQId(parseInt(e.target.value))}>
                  <option value="">Select BOQ...</option>
                  {boqs.map(b => <option key={b.BOQHeaderID} value={b.BOQHeaderID}>{b.BOQNumber} — {b.Title}</option>)}
                </select>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                <strong>CSV Format:</strong> SerialNo, MainScope, Category, Description, Unit, Quantity, UnitRate, ProfitPct
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload CSV File</label>
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileSelect} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Or Paste CSV Data</label>
                <textarea className="input-field font-mono text-xs" rows={8} value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder="SerialNo,MainScope,Category,Description,Unit,Quantity,UnitRate,ProfitPct" />
              </div>
              {importMsg && <div className={`text-sm p-3 rounded-lg ${importMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{importMsg}</div>}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : 'Import Items (Replace All)'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowImport(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
