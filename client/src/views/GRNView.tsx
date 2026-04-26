import { useEffect, useState } from 'react';
import { api, GRNHeader, GRNLine, PurchaseOrder, POItem, Project, GRN_STATUSES } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import ChipFilter from '../components/ChipFilter';

const STATUS_COLOR: Record<string, string> = {
  Draft:          'bg-gray-100 text-gray-600',
  Inspecting:     'bg-yellow-100 text-yellow-700',
  Accepted:       'bg-green-100 text-green-700',
  PartialAccepted:'bg-blue-100 text-blue-700',
  Rejected:       'bg-red-100 text-red-600',
};

export default function GRNView() {
  const { can } = useAuth();
  useLang();
  const canEdit = can('Admin', 'Finance', 'PM');

  const [grns, setGRNs]         = useState<GRNHeader[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [search, setSearch]     = useState('');

  // Detail
  const [detail, setDetail]     = useState<{ grn: GRNHeader; lines: GRNLine[] } | null>(null);

  // New GRN form
  const [showForm, setShowForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<{ purchaseOrder: PurchaseOrder; items: POItem[] } | null>(null);
  const [pos, setPOs]           = useState<PurchaseOrder[]>([]);
  const [form, setForm]         = useState({
    grnNumber: '', poHeaderId: '', grnDate: new Date().toISOString().slice(0, 10),
    vehicleNo: '', driverName: '', deliveryNoteNo: '', storeLocation: '', receivedBy: '', notes: '',
  });
  const [receiptQtys, setReceiptQtys] = useState<Record<number, string>>({});
  const [saving, setSaving]     = useState(false);
  const [loadingPO, setLoadingPO] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.getGRNs(), api.getProjects()])
      .then(([g, p]) => { setGRNs(g.grns); setProjects(p.projects); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const openForm = async () => {
    const poList = await api.getPurchaseOrders({ status: 'Approved' });
    setPOs(poList.purchaseOrders);
    setShowForm(true);
  };

  const onSelectPO = async (poId: string) => {
    setForm(p => ({ ...p, poHeaderId: poId }));
    if (!poId) { setSelectedPO(null); return; }
    setLoadingPO(true);
    try {
      const r = await api.getPurchaseOrder(parseInt(poId));
      setSelectedPO(r);
      const qtys: Record<number, string> = {};
      r.items.forEach(it => { qtys[it.LineID!] = String(it.Quantity); });
      setReceiptQtys(qtys);
    } catch { setSelectedPO(null); }
    finally { setLoadingPO(false); }
  };

  const filtered = grns.filter(g =>
    (!statusFilter || g.Status === statusFilter) &&
    (!filterProject || String(g.ProjectID) === filterProject) &&
    (g.GRNNumber.toLowerCase().includes(search.toLowerCase()) ||
     g.PONumber.toLowerCase().includes(search.toLowerCase()) ||
     g.ProjectCode.toLowerCase().includes(search.toLowerCase()))
  );

  const chips = GRN_STATUSES.map(s => ({
    value: s, label: s, count: grns.filter(g => g.Status === s).length,
  })).filter(c => c.count > 0);

  const openDetail = async (g: GRNHeader) => {
    const r = await api.getGRN(g.GRNHeaderID);
    setDetail(r);
  };

  const handleCreate = async () => {
    if (!form.grnNumber || !form.poHeaderId || !form.grnDate) {
      alert('GRN Number, PO and Date are required'); return;
    }
    if (!selectedPO) { alert('Please select a PO'); return; }

    const lines = (selectedPO.items || []).map(it => ({
      poLineId: it.LineID!, description: it.Description, unit: '',
      orderedQty: Number(it.Quantity),
      previouslyReceivedQty: 0,
      thisReceiptQty: parseFloat(receiptQtys[it.LineID!] || '0') || 0,
    })).filter(l => l.thisReceiptQty > 0);

    if (!lines.length) { alert('Enter at least one receipt quantity'); return; }

    setSaving(true);
    try {
      await api.createGRN({
        ...form, poHeaderId: parseInt(form.poHeaderId),
        projectId: selectedPO.purchaseOrder.ProjectID!,
        lines,
      });
      setShowForm(false);
      setSelectedPO(null);
      setReceiptQtys({});
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (g: GRNHeader, status: string) => {
    try { await api.updateGRNStatus(g.GRNHeaderID, status); load(); if (detail?.grn.GRNHeaderID === g.GRNHeaderID) openDetail(g); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const handleDelete = async (g: GRNHeader) => {
    if (!confirm(`Delete GRN "${g.GRNNumber}"?`)) return;
    try { await api.deleteGRN(g.GRNHeaderID); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Goods Receipt / Inward Gate Pass</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} GRNs</p>
        </div>
        {canEdit && (
          <button onClick={openForm} className="btn-primary flex items-center gap-2 self-start text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            New GRN / IGP
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
          <input type="text" placeholder="Search..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-field w-36 text-sm" />
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['GRN Number', 'PO', 'Project', 'Date', 'Store', 'Received By', 'Status', ''].map(h => (
                    <th key={h} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(g => (
                  <tr key={g.GRNHeaderID} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-700 font-medium">{g.GRNNumber}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{g.PONumber}</td>
                    <td className="px-4 py-3 text-gray-600">{g.ProjectCode}</td>
                    <td className="px-4 py-3 text-gray-500">{g.GRNDate}</td>
                    <td className="px-4 py-3 text-gray-500">{g.StoreLocation || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{g.ReceivedBy || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[g.Status] || 'bg-gray-100 text-gray-600'}`}>{g.Status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openDetail(g)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">View</button>
                        {canEdit && g.Status === 'Draft' && (
                          <>
                            <button onClick={() => handleStatusChange(g, 'Inspecting')} className="text-xs text-yellow-600 hover:text-yellow-800 font-medium">→ Inspect</button>
                            <button onClick={() => handleDelete(g)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={8} className="text-center py-10 text-gray-400">No GRNs found</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map(g => (
              <div key={g.GRNHeaderID} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{g.GRNNumber}</p>
                    <p className="text-xs text-gray-500">{g.PONumber} · {g.ProjectCode} · {g.GRNDate}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium h-fit ${STATUS_COLOR[g.Status] || 'bg-gray-100 text-gray-600'}`}>{g.Status}</span>
                </div>
                <button onClick={() => openDetail(g)} className="btn-secondary text-xs">View Details</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="font-semibold text-lg">{detail.grn.GRNNumber}</h2>
                <p className="text-sm text-gray-500">PO: {detail.grn.PONumber} · {detail.grn.ProjectCode} · {detail.grn.GRNDate}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[detail.grn.Status] || 'bg-gray-100 text-gray-600'}`}>{detail.grn.Status}</span>
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div><span className="text-gray-500">Vehicle: </span>{detail.grn.VehicleNo || '—'}</div>
                <div><span className="text-gray-500">Driver: </span>{detail.grn.DriverName || '—'}</div>
                <div><span className="text-gray-500">Delivery Note: </span>{detail.grn.DeliveryNoteNo || '—'}</div>
                <div><span className="text-gray-500">Store: </span>{detail.grn.StoreLocation || '—'}</div>
                <div><span className="text-gray-500">Received By: </span>{detail.grn.ReceivedBy || '—'}</div>
              </div>
              <table className="w-full text-xs border rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    {['Description', 'Unit', 'Ordered', 'Prev Received', 'This Receipt'].map(h => (
                      <th key={h} className="text-start px-3 py-2 text-gray-500 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {detail.lines.map(ln => (
                    <tr key={ln.GRNLineID} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{ln.Description}</td>
                      <td className="px-3 py-2">{ln.Unit}</td>
                      <td className="px-3 py-2 text-end">{ln.OrderedQty}</td>
                      <td className="px-3 py-2 text-end">{ln.PreviouslyReceivedQty}</td>
                      <td className="px-3 py-2 text-end font-medium text-green-700">{ln.ThisReceiptQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-2 justify-end">
              <button onClick={() => setDetail(null)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New GRN Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">New GRN / Inward Gate Pass</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GRN Number *</label>
                  <input className="input-field" value={form.grnNumber} onChange={e => setForm(p => ({ ...p, grnNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approved PO *</label>
                  <select className="input-field" value={form.poHeaderId} onChange={e => onSelectPO(e.target.value)}>
                    <option value="">Select PO...</option>
                    {pos.map(p => <option key={p.PurchaseOrderID} value={String(p.PurchaseOrderID)}>{p.PONumber} — {p.VendorName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GRN Date *</label>
                  <input type="date" className="input-field" value={form.grnDate} onChange={e => setForm(p => ({ ...p, grnDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No</label>
                  <input className="input-field" value={form.vehicleNo} onChange={e => setForm(p => ({ ...p, vehicleNo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                  <input className="input-field" value={form.driverName} onChange={e => setForm(p => ({ ...p, driverName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Note #</label>
                  <input className="input-field" value={form.deliveryNoteNo} onChange={e => setForm(p => ({ ...p, deliveryNoteNo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store Location</label>
                  <input className="input-field" value={form.storeLocation} onChange={e => setForm(p => ({ ...p, storeLocation: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
                  <input className="input-field" value={form.receivedBy} onChange={e => setForm(p => ({ ...p, receivedBy: e.target.value }))} />
                </div>
              </div>

              {loadingPO && <div className="text-center py-4 text-gray-400 text-sm">Loading PO lines...</div>}

              {selectedPO && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Receipt Quantities</p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Description', 'Ordered', 'This Receipt'].map(h => (
                            <th key={h} className="text-start px-3 py-2 font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedPO.items.map(it => (
                          <tr key={it.LineID}>
                            <td className="px-3 py-2">{it.Description.slice(0, 60)}</td>
                            <td className="px-3 py-2 text-end">{it.Quantity}</td>
                            <td className="px-3 py-2">
                              <input type="number" step="0.01" min="0" max={String(it.Quantity)}
                                className="input-field w-24 text-xs"
                                value={receiptQtys[it.LineID!] || ''}
                                onChange={e => setReceiptQtys(p => ({ ...p, [it.LineID!]: e.target.value }))} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create GRN'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
