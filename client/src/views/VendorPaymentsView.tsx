import { useEffect, useState } from 'react';
import { api, VendorPayment, VendorBill, Vendor, VendorStatSummary, VENDOR_PAYMENT_TYPES, PAYMENT_METHODS } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';

const TYPE_COLOR: Record<string, string> = {
  Advance:        'bg-purple-100 text-purple-700',
  COD:            'bg-blue-100 text-blue-700',
  PartialPayment: 'bg-yellow-100 text-yellow-700',
  FinalPayment:   'bg-green-100 text-green-700',
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function VendorPaymentsView() {
  useLang();
  useAuth();

  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [bills, setBills]       = useState<VendorBill[]>([]);
  const [vendors, setVendors]   = useState<Vendor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterFrom, setFilterFrom]   = useState('');
  const [filterTo, setFilterTo]       = useState('');
  const [tab, setTab]           = useState<'payments' | 'bills' | 'statement'>('payments');

  // Statement
  const [statVendorId, setStatVendorId] = useState('');
  const [statement, setStatement]       = useState<{ summary: VendorStatSummary; bills: VendorBill[]; payments: VendorPayment[] } | null>(null);
  const [loadingStat, setLoadingStat]   = useState(false);

  // Payment form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    vendorId: '', vendorBillId: '', poHeaderId: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentType: 'FinalPayment', amount: '', paymentMethod: 'BankTransfer',
    referenceNo: '', notes: '',
  });
  const [vendorBills, setVendorBills] = useState<VendorBill[]>([]);
  const [saving, setSaving]     = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getVendorPayments(filterVendor ? { vendorId: parseInt(filterVendor) } : undefined),
      api.getVendorBills(),
      api.getVendors({ status: 'Approved' }),
    ])
      .then(([p, b, v]) => { setPayments(p.payments); setBills(b.bills); setVendors(v.vendors); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const filteredPayments = payments.filter(p =>
    (!filterVendor || String(p.VendorID) === filterVendor) &&
    (!filterFrom || p.PaymentDate >= filterFrom) &&
    (!filterTo   || p.PaymentDate <= filterTo)
  );

  const totalPaid = filteredPayments.reduce((s, p) => s + Number(p.Amount), 0);

  const onVendorChange = async (vendorId: string) => {
    setForm(p => ({ ...p, vendorId, vendorBillId: '' }));
    if (!vendorId) { setVendorBills([]); return; }
    const r = await api.getVendorBills({ vendorId: parseInt(vendorId) });
    setVendorBills(r.bills);
  };

  const handleCreate = async () => {
    if (!form.vendorId || !form.paymentDate || !form.amount || !form.paymentType || !form.paymentMethod) {
      alert('Vendor, Date, Amount, Type and Method are required'); return;
    }
    setSaving(true);
    try {
      await api.createVendorPayment({
        vendorId: parseInt(form.vendorId),
        vendorBillId: form.vendorBillId ? parseInt(form.vendorBillId) : undefined,
        poHeaderId: form.poHeaderId ? parseInt(form.poHeaderId) : undefined,
        paymentDate: form.paymentDate, paymentType: form.paymentType,
        amount: parseFloat(form.amount), paymentMethod: form.paymentMethod,
        referenceNo: form.referenceNo || undefined, notes: form.notes || undefined,
      });
      setShowForm(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const loadStatement = async () => {
    if (!statVendorId) return;
    setLoadingStat(true);
    try { setStatement(await api.getVendorStatement(parseInt(statVendorId))); }
    catch { setStatement(null); }
    finally { setLoadingStat(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this payment? Bill balance will be recalculated.')) return;
    try { await api.deleteVendorPayment(id); load(); if (statement) loadStatement(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vendor Payments (AP)</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredPayments.length} payments · Paid: SAR {fmt(totalPaid)}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 self-start text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Record Payment
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {[
          { key: 'payments', label: 'Payments' },
          { key: 'bills',    label: `Unpaid Bills (${bills.length})` },
          { key: 'statement', label: 'Vendor Statement' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as 'payments' | 'bills' | 'statement')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-brand-900 text-brand-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'payments' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select className="input-field text-sm" value={filterVendor} onChange={e => setFilterVendor(e.target.value)}>
              <option value="">All Vendors</option>
              {vendors.map(v => <option key={v.VendorID} value={String(v.VendorID)}>{v.VendorName}</option>)}
            </select>
            <input type="date" className="input-field text-sm w-36" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} placeholder="From" />
            <input type="date" className="input-field text-sm w-36" value={filterTo} onChange={e => setFilterTo(e.target.value)} placeholder="To" />
          </div>

          {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Vendor', 'Bill', 'Date', 'Type', 'Method', 'Reference', 'Amount', ''].map(h => (
                      <th key={h} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.map(p => (
                    <tr key={p.VendorPaymentID} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.VendorName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.BillNumber || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{p.PaymentDate}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[p.PaymentType] || 'bg-gray-100 text-gray-600'}`}>{p.PaymentType}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.PaymentMethod}</td>
                      <td className="px-4 py-3 text-gray-500">{p.ReferenceNo || '—'}</td>
                      <td className="px-4 py-3 text-end font-semibold text-gray-800">SAR {fmt(p.Amount)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(p.VendorPaymentID)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {!filteredPayments.length && <tr><td colSpan={8} className="text-center py-10 text-gray-400">No payments found</td></tr>}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                    <td className="px-4 py-3 text-end font-bold text-gray-900">SAR {fmt(totalPaid)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'bills' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['GRN', 'Vendor', 'Bill #', 'Date', 'Due Date', 'Total', 'Paid', 'Outstanding', 'Status'].map(h => (
                  <th key={h} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bills.map(b => (
                <tr key={b.VendorBillID} className={`hover:bg-gray-50 ${Number(b.Outstanding) > 0 && b.DueDate && b.DueDate < new Date().toISOString().slice(0, 10) ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3 text-xs text-gray-500">{b.GRNNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.VendorName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.BillNumber}</td>
                  <td className="px-4 py-3 text-gray-500">{b.BillDate}</td>
                  <td className="px-4 py-3 text-gray-500">{b.DueDate || '—'}</td>
                  <td className="px-4 py-3 text-end">SAR {fmt(b.TotalAmount)}</td>
                  <td className="px-4 py-3 text-end text-green-700">SAR {fmt(b.TotalPaid)}</td>
                  <td className="px-4 py-3 text-end font-semibold text-red-600">SAR {fmt(b.Outstanding)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      b.Status === 'Paid' ? 'bg-green-100 text-green-700' :
                      b.Status === 'PartiallyPaid' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-600'}`}>{b.Status}</span>
                  </td>
                </tr>
              ))}
              {!bills.length && <tr><td colSpan={9} className="text-center py-10 text-gray-400">No outstanding bills</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'statement' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Vendor</label>
              <select className="input-field" value={statVendorId} onChange={e => setStatVendorId(e.target.value)}>
                <option value="">Select vendor...</option>
                {vendors.map(v => <option key={v.VendorID} value={String(v.VendorID)}>{v.VendorName}</option>)}
              </select>
            </div>
            <button onClick={loadStatement} disabled={!statVendorId || loadingStat} className="btn-primary text-sm">
              {loadingStat ? 'Loading...' : 'Load Statement'}
            </button>
          </div>

          {statement && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Billed', value: fmt(statement.summary.TotalBilled), color: 'text-gray-900' },
                  { label: 'Total Paid', value: fmt(statement.summary.TotalPaid), color: 'text-green-700' },
                  { label: 'Outstanding', value: fmt(statement.summary.Outstanding), color: Number(statement.summary.Outstanding) > 0 ? 'text-red-600' : 'text-gray-900' },
                ].map(c => (
                  <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">{c.label}</p>
                    <p className={`text-lg font-bold mt-1 ${c.color}`}>SAR {c.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700">Bills</div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Bill #', 'Date', 'Due', 'Total', 'Paid', 'Outstanding', 'Status'].map(h => (
                        <th key={h} className="text-start px-3 py-2 text-gray-500 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {statement.bills.map((b: VendorBill) => (
                      <tr key={b.VendorBillID} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono">{b.BillNumber}</td>
                        <td className="px-3 py-2">{b.BillDate}</td>
                        <td className="px-3 py-2">{b.DueDate || '—'}</td>
                        <td className="px-3 py-2 text-end">{fmt(b.TotalAmount)}</td>
                        <td className="px-3 py-2 text-end text-green-700">{fmt(b.TotalPaid)}</td>
                        <td className="px-3 py-2 text-end font-medium text-red-600">{fmt(b.Outstanding)}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${b.Status === 'Paid' ? 'bg-green-100 text-green-700' : b.Status === 'PartiallyPaid' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>{b.Status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 text-sm font-semibold text-gray-700">Payment History</div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Date', 'Type', 'Method', 'Bill', 'Reference', 'Amount'].map(h => (
                        <th key={h} className="text-start px-3 py-2 text-gray-500 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {statement.payments.map((p: VendorPayment) => (
                      <tr key={p.VendorPaymentID} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{p.PaymentDate}</td>
                        <td className="px-3 py-2">{p.PaymentType}</td>
                        <td className="px-3 py-2">{p.PaymentMethod}</td>
                        <td className="px-3 py-2">{p.BillNumber || '—'}</td>
                        <td className="px-3 py-2">{p.ReferenceNo || '—'}</td>
                        <td className="px-3 py-2 text-end font-medium">SAR {fmt(p.Amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">Record Payment</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                <select className="input-field" value={form.vendorId} onChange={e => onVendorChange(e.target.value)}>
                  <option value="">Select vendor...</option>
                  {vendors.map(v => <option key={v.VendorID} value={String(v.VendorID)}>{v.VendorName}</option>)}
                </select>
              </div>
              {vendorBills.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link to Bill (optional)</label>
                  <select className="input-field" value={form.vendorBillId} onChange={e => setForm(p => ({ ...p, vendorBillId: e.target.value }))}>
                    <option value="">No bill link</option>
                    {vendorBills.map(b => (
                      <option key={b.VendorBillID} value={String(b.VendorBillID)}>
                        {b.BillNumber} — Outstanding: SAR {fmt(b.Outstanding)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                  <input type="date" className="input-field" value={form.paymentDate} onChange={e => setForm(p => ({ ...p, paymentDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input type="number" step="0.01" className="input-field" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
                  <select className="input-field" value={form.paymentType} onChange={e => setForm(p => ({ ...p, paymentType: e.target.value }))}>
                    {VENDOR_PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                  <select className="input-field" value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference No</label>
                  <input className="input-field" value={form.referenceNo} onChange={e => setForm(p => ({ ...p, referenceNo: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? 'Saving...' : 'Record Payment'}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
