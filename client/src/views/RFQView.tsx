import { useEffect, useState } from 'react';
import { api, RFQHeader, RFQLine, VendorQuote, Vendor, Project, RFQ_STATUSES } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import ChipFilter from '../components/ChipFilter';

const STATUS_COLOR: Record<string, string> = {
  Draft:          'bg-gray-100 text-gray-600',
  Sent:           'bg-blue-100 text-blue-700',
  QuotesReceived: 'bg-yellow-100 text-yellow-700',
  Awarded:        'bg-green-100 text-green-700',
  Cancelled:      'bg-red-100 text-red-500',
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RFQView() {
  const { can } = useAuth();
  const { lang } = useLang();
  const canEdit  = can('Admin', 'Finance', 'PM');
  const canAward = can('Admin', 'Finance');

  const [rfqs, setRFQs]         = useState<RFQHeader[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors]   = useState<Vendor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]     = useState('');

  // Detail
  const [detail, setDetail]     = useState<{ rfq: RFQHeader; lines: RFQLine[]; quotes: VendorQuote[] } | null>(null);
  const [, setLoadingDetail] = useState(false);

  // New RFQ form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ rfqNumber: '', projectId: '', title: '', rfqDate: new Date().toISOString().slice(0, 10), dueDate: '', notes: '' });
  const [rfqLines, setRfqLines] = useState([{ description: '', unit: '', quantity: 1 }]);
  const [saving, setSaving]     = useState(false);

  // Quote form
  const [quoteForm, setQuoteForm] = useState<{ rfqLineId: number; vendorId: string; unitPrice: string; deliveryDays: string; notes: string } | null>(null);
  const [savingQuote, setSavingQuote] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.getRFQs(), api.getProjects(), api.getVendors({ status: 'Approved' })])
      .then(([r, p, v]) => { setRFQs(r.rfqs); setProjects(p.projects); setVendors(v.vendors); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = rfqs.filter(r =>
    (!statusFilter || r.Status === statusFilter) &&
    (r.RFQNumber.toLowerCase().includes(search.toLowerCase()) ||
     r.Title.toLowerCase().includes(search.toLowerCase()) ||
     r.ProjectCode.toLowerCase().includes(search.toLowerCase()))
  );

  const chips = RFQ_STATUSES.map(s => ({
    value: s, label: s, count: rfqs.filter(r => r.Status === s).length,
  })).filter(c => c.count > 0);

  const openDetail = async (rfq: RFQHeader) => {
    setLoadingDetail(true);
    try { setDetail(await api.getRFQ(rfq.RFQHeaderID)); }
    catch { setDetail(null); }
    finally { setLoadingDetail(false); }
  };

  const handleCreate = async () => {
    if (!form.rfqNumber || !form.projectId || !form.title || !form.rfqDate) {
      alert('RFQ Number, Project, Title and Date are required'); return;
    }
    setSaving(true);
    try {
      await api.createRFQ({
        ...form, projectId: parseInt(form.projectId),
        dueDate: form.dueDate || undefined,
        lines: rfqLines.filter(l => l.description),
      });
      setShowForm(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (rfq: RFQHeader, status: string) => {
    try { await api.updateRFQStatus(rfq.RFQHeaderID, status); load(); if (detail?.rfq.RFQHeaderID === rfq.RFQHeaderID) openDetail(rfq); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const handleSaveQuote = async () => {
    if (!quoteForm || !detail) return;
    setSavingQuote(true);
    try {
      await api.saveQuote(detail.rfq.RFQHeaderID, {
        RFQLineID: quoteForm.rfqLineId, VendorID: parseInt(quoteForm.vendorId),
        UnitPrice: parseFloat(quoteForm.unitPrice), DeliveryDays: parseInt(quoteForm.deliveryDays) || 0,
        Notes: quoteForm.notes,
      });
      setQuoteForm(null);
      const updated = await api.getRFQ(detail.rfq.RFQHeaderID);
      setDetail(updated);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSavingQuote(false); }
  };

  const handleAward = async (quoteId: number) => {
    if (!detail || !confirm('Award this quote?')) return;
    try {
      await api.awardQuote(detail.rfq.RFQHeaderID, quoteId);
      const updated = await api.getRFQ(detail.rfq.RFQHeaderID);
      setDetail(updated);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const handleDelete = async (rfq: RFQHeader) => {
    if (!confirm(`Delete RFQ "${rfq.RFQNumber}"?`)) return;
    try { await api.deleteRFQ(rfq.RFQHeaderID); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const getLineQuotes = (lineId: number) => detail?.quotes.filter(q => q.RFQLineID === lineId) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{lang === 'ar' ? 'طلبات الأسعار' : 'Request for Quotation'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} RFQs</p>
        </div>
        {canEdit && (
          <button onClick={() => { setShowForm(true); setRfqLines([{ description: '', unit: '', quantity: 1 }]); }}
            className="btn-primary flex items-center gap-2 self-start text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            New RFQ
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        <ChipFilter chips={chips} active={statusFilter} onChange={setStatusFilter} />
        <input type="text" placeholder="Search..." value={search}
          onChange={e => setSearch(e.target.value)} className="input-field w-48 text-sm sm:ms-auto" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['RFQ Number', 'Project', 'Title', 'Date', 'Due Date', 'Lines', 'Status', ''].map(h => (
                    <th key={h} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.RFQHeaderID} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-700 font-medium">{r.RFQNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{r.ProjectCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{r.Title}</td>
                    <td className="px-4 py-3 text-gray-500">{r.RFQDate}</td>
                    <td className="px-4 py-3 text-gray-500">{r.DueDate || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{r.LineCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.Status] || 'bg-gray-100 text-gray-600'}`}>{r.Status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openDetail(r)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">View</button>
                        {canEdit && r.Status === 'Draft' && (
                          <button onClick={() => handleStatusChange(r, 'Sent')} className="text-xs text-green-600 hover:text-green-800 font-medium">Send</button>
                        )}
                        {canEdit && ['Draft', 'Cancelled'].includes(r.Status) && (
                          <button onClick={() => handleDelete(r)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={8} className="text-center py-10 text-gray-400">No RFQs found</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map(r => (
              <div key={r.RFQHeaderID} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{r.RFQNumber}</p>
                    <p className="text-xs text-gray-500">{r.ProjectCode} · {r.RFQDate}</p>
                    <p className="text-sm text-gray-700">{r.Title}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.Status] || 'bg-gray-100 text-gray-600'}`}>{r.Status}</span>
                </div>
                <button onClick={() => openDetail(r)} className="btn-secondary text-xs">View Details</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="font-semibold text-lg">{detail.rfq.RFQNumber} — {detail.rfq.Title}</h2>
                <p className="text-sm text-gray-500">{detail.rfq.ProjectCode} · {detail.rfq.RFQDate}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[detail.rfq.Status] || 'bg-gray-100 text-gray-600'}`}>{detail.rfq.Status}</span>
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <div className="p-6 space-y-6" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {detail.lines.map(line => {
                const lineQuotes = getLineQuotes(line.RFQLineID);
                const best = lineQuotes.reduce((b: VendorQuote | null, q) => (!b || q.UnitPrice < b.UnitPrice) ? q : b, null);
                return (
                  <div key={line.RFQLineID} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-900 text-sm">{line.Description}</span>
                        <span className="text-xs text-gray-500 ms-2">{line.Quantity} {line.Unit}</span>
                      </div>
                      {canEdit && ['Sent', 'QuotesReceived'].includes(detail.rfq.Status) && (
                        <button
                          onClick={() => setQuoteForm({ rfqLineId: line.RFQLineID, vendorId: '', unitPrice: '', deliveryDays: '', notes: '' })}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add Quote</button>
                      )}
                    </div>
                    {lineQuotes.length > 0 ? (
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-t">
                          <tr>
                            {['Vendor', 'Unit Price', 'Total', 'Delivery', 'Notes', ''].map(h => (
                              <th key={h} className="text-start px-3 py-1.5 text-gray-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {lineQuotes.map(q => (
                            <tr key={q.QuoteID} className={q.IsAwarded ? 'bg-green-50' : q === best ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                              <td className="px-3 py-2 font-medium">{q.VendorName}</td>
                              <td className="px-3 py-2">{fmt(q.UnitPrice)}</td>
                              <td className="px-3 py-2 font-medium">{fmt(q.TotalAmount)}</td>
                              <td className="px-3 py-2">{q.DeliveryDays ? `${q.DeliveryDays}d` : '—'}</td>
                              <td className="px-3 py-2 text-gray-500">{q.Notes || '—'}</td>
                              <td className="px-3 py-2">
                                {q.IsAwarded ? (
                                  <span className="text-green-600 font-medium">✓ Awarded</span>
                                ) : canAward && detail.rfq.Status === 'QuotesReceived' ? (
                                  <button onClick={() => handleAward(q.QuoteID)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Award</button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-gray-400 px-4 py-3">No quotes yet</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              {canEdit && detail.rfq.Status === 'Draft' && (
                <button onClick={() => handleStatusChange(detail.rfq, 'Sent')} className="btn-primary text-sm">Mark Sent</button>
              )}
              {canEdit && detail.rfq.Status !== 'Cancelled' && detail.rfq.Status !== 'Awarded' && (
                <button onClick={() => handleStatusChange(detail.rfq, 'Cancelled')} className="btn-secondary text-sm text-red-600">Cancel RFQ</button>
              )}
              <button onClick={() => setDetail(null)} className="btn-secondary text-sm ms-auto">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Quote Modal */}
      {quoteForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold">Add Vendor Quote</h3>
              <button onClick={() => setQuoteForm(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                <select className="input-field" value={quoteForm.vendorId} onChange={e => setQuoteForm(p => p && ({ ...p, vendorId: e.target.value }))}>
                  <option value="">Select vendor...</option>
                  {vendors.map(v => <option key={v.VendorID} value={String(v.VendorID)}>{v.VendorName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price *</label>
                <input type="number" step="0.01" className="input-field" value={quoteForm.unitPrice}
                  onChange={e => setQuoteForm(p => p && ({ ...p, unitPrice: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Days</label>
                <input type="number" className="input-field" value={quoteForm.deliveryDays}
                  onChange={e => setQuoteForm(p => p && ({ ...p, deliveryDays: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input type="text" className="input-field" value={quoteForm.notes}
                  onChange={e => setQuoteForm(p => p && ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button className="btn-primary flex-1" onClick={handleSaveQuote} disabled={savingQuote}>
                {savingQuote ? 'Saving...' : 'Save Quote'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setQuoteForm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* New RFQ Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">New RFQ</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RFQ Number *</label>
                  <input className="input-field" value={form.rfqNumber} onChange={e => setForm(p => ({ ...p, rfqNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                  <select className="input-field" value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}>
                    <option value="">Select...</option>
                    {projects.map(p => <option key={p.ProjectID} value={String(p.ProjectID)}>{p.ProjectCode}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input className="input-field" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RFQ Date *</label>
                  <input type="date" className="input-field" value={form.rfqDate} onChange={e => setForm(p => ({ ...p, rfqDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" className="input-field" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Line Items</label>
                  <button onClick={() => setRfqLines(p => [...p, { description: '', unit: '', quantity: 1 }])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add Line</button>
                </div>
                <div className="space-y-2">
                  {rfqLines.map((ln, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <input className="input-field flex-1 text-sm" placeholder="Description"
                        value={ln.description} onChange={e => setRfqLines(p => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                      <input className="input-field w-16 text-sm" placeholder="Unit"
                        value={ln.unit} onChange={e => setRfqLines(p => p.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} />
                      <input type="number" className="input-field w-16 text-sm" placeholder="Qty"
                        value={ln.quantity} onChange={e => setRfqLines(p => p.map((x, j) => j === i ? { ...x, quantity: parseFloat(e.target.value) || 1 } : x))} />
                      {rfqLines.length > 1 && (
                        <button onClick={() => setRfqLines(p => p.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 mt-2">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create RFQ'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
