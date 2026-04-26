import { useEffect, useState } from 'react';
import { api, StockItem, Project } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { files } from '../services/files';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InventoryView() {
  const { can } = useAuth();
  const { lang } = useLang();
  const canEdit = can('Admin', 'PM');

  const [stock, setStock]       = useState<StockItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [search, setSearch]     = useState('');

  // Edit min stock
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [editForm, setEditForm] = useState({ minStockLevel: '', unitCost: '', itemCode: '' });
  const [saving, setSaving]     = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getInventory(filterProject ? { projectId: parseInt(filterProject) } : undefined),
      api.getProjects(),
    ])
      .then(([r, p]) => { setStock(r.stock); setProjects(p.projects); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = stock.filter(s =>
    (!filterProject || String(s.ProjectID) === filterProject) &&
    (!lowStockOnly || s.LowStock) &&
    (s.ItemDescription.toLowerCase().includes(search.toLowerCase()) ||
     s.ItemCode.toLowerCase().includes(search.toLowerCase()) ||
     s.ProjectCode.toLowerCase().includes(search.toLowerCase()))
  );

  const lowStockCount = stock.filter(s => s.LowStock).length;
  const totalValue    = filtered.reduce((sum, s) => sum + Number(s.TotalValue), 0);

  const openEdit = (item: StockItem) => {
    setEditItem(item);
    setEditForm({ minStockLevel: String(item.MinStockLevel), unitCost: String(item.UnitCost), itemCode: item.ItemCode });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await api.updateStockItem(editItem.StockID, {
        MinStockLevel: parseFloat(editForm.minStockLevel) || 0,
        UnitCost: parseFloat(editForm.unitCost) || 0,
        ItemCode: editForm.itemCode,
      });
      setEditItem(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const downloadCSV = () => {
    const csv = ['Project,Item Code,Description,Unit,Qty,Min Level,Unit Cost,Total Value,Last Receipt,Last Issue',
      ...filtered.map(s => [
        s.ProjectCode, s.ItemCode, `"${s.ItemDescription}"`, s.Unit,
        s.CurrentQty, s.MinStockLevel, s.UnitCost, s.TotalValue,
        s.LastReceiptDate, s.LastIssueDate,
      ].join(','))
    ].join('\n');
    files.downloadCSV(csv, `Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{lang === 'ar' ? 'المخزون' : 'Store Inventory'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} items · Total Value: SAR {fmt(totalValue)}
            {lowStockCount > 0 && <span className="text-red-600 ms-2">· {lowStockCount} low stock</span>}
          </p>
        </div>
        <button onClick={downloadCSV} className="btn-secondary text-sm flex items-center gap-1 self-start">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Export CSV
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Items', value: String(stock.length), color: 'text-gray-900' },
          { label: 'Total Value', value: `SAR ${fmt(stock.reduce((s, i) => s + Number(i.TotalValue), 0))}`, color: 'text-blue-700' },
          { label: 'Low Stock', value: String(lowStockCount), color: lowStockCount > 0 ? 'text-red-600' : 'text-gray-900' },
          { label: 'Projects', value: String(new Set(stock.map(s => s.ProjectID)).size), color: 'text-gray-900' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={`text-lg font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select className="input-field text-sm" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.ProjectID} value={String(p.ProjectID)}>{p.ProjectCode}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)}
            className="w-4 h-4" />
          Low Stock Only
        </label>
        <input type="text" placeholder="Search items..." value={search}
          onChange={e => setSearch(e.target.value)} className="input-field w-48 text-sm ms-auto" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Project', 'Code', 'Description', 'Unit', 'Qty', 'Min Level', 'Unit Cost', 'Total Value', 'Last Receipt', ''].map(h => (
                    <th key={h} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => (
                  <tr key={s.StockID} className={`hover:bg-gray-50 ${s.LowStock ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3 text-gray-600">{s.ProjectCode}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.ItemCode || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{s.ItemDescription}</td>
                    <td className="px-4 py-3 text-gray-500">{s.Unit}</td>
                    <td className={`px-4 py-3 font-semibold ${s.LowStock ? 'text-red-600' : 'text-gray-900'}`}>
                      {s.CurrentQty}
                      {s.LowStock && <span className="ms-1 text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded">LOW</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.MinStockLevel}</td>
                    <td className="px-4 py-3 text-end text-gray-600">{fmt(s.UnitCost)}</td>
                    <td className="px-4 py-3 text-end font-medium text-gray-800">SAR {fmt(s.TotalValue)}</td>
                    <td className="px-4 py-3 text-gray-500">{s.LastReceiptDate || '—'}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={10} className="text-center py-10 text-gray-400">No stock items found</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map(s => (
              <div key={s.StockID} className={`bg-white rounded-xl border p-4 space-y-1 ${s.LowStock ? 'border-red-200' : 'border-gray-200'}`}>
                <div className="flex justify-between">
                  <p className="font-semibold text-gray-900">{s.ItemDescription}</p>
                  {s.LowStock && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">LOW</span>}
                </div>
                <p className="text-xs text-gray-500">{s.ProjectCode} · {s.Unit} · Qty: {s.CurrentQty}</p>
                <p className="text-sm text-gray-700">SAR {fmt(s.TotalValue)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Min Stock Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold">Edit Stock Settings</h3>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 font-medium">{editItem.ItemDescription}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
                <input className="input-field" value={editForm.itemCode} onChange={e => setEditForm(p => ({ ...p, itemCode: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                <input type="number" step="0.01" className="input-field" value={editForm.minStockLevel} onChange={e => setEditForm(p => ({ ...p, minStockLevel: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
                <input type="number" step="0.01" className="input-field" value={editForm.unitCost} onChange={e => setEditForm(p => ({ ...p, unitCost: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button className="btn-primary flex-1" onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setEditItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
