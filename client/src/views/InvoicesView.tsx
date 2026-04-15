import { useEffect, useState, useRef } from 'react';
import { api, Invoice, InvoiceItem, CreateInvoiceInput, Payment, PAYMENT_METHODS, Project } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { tr } from '../translations';

function statusBadge(s: string) {
  const cls: Record<string, string> = { Draft: 'badge-draft', Reported: 'badge-reported', Cleared: 'badge-cleared', Rejected: 'badge-rejected' };
  return <span className={cls[s] || 'badge-draft'}>{s}</span>;
}

const EMPTY_FORM = {
  invoiceNumber: '', clientName: '', clientVAT: '', clientAddress: '',
  invoiceDate: new Date().toISOString().slice(0, 10), dueDate: '', vatRate: 15, retentionRate: 0, notes: '',
};

export default function InvoicesView() {
  const { can } = useAuth();
  const { lang } = useLang();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [items, setItems] = useState<Omit<InvoiceItem, 'ItemID' | 'InvoiceID' | 'LineTotal'>[]>([
    { Description: '', Quantity: 1, UnitPrice: 0, Discount: 0, VATRate: 15 },
  ]);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<{ invoice: Invoice; items: InvoiceItem[] } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ paymentDate: new Date().toISOString().slice(0, 10), amount: '', paymentMethod: 'BankTransfer', reference: '', notes: '' });
  const [paySaving, setPaySaving] = useState(false);
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | ''>('');
  const printRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = (k: any) => tr('invoices', k, lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = (k: any) => tr('common', k, lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = (k: any) => tr('payments', k, lang);
  const sar = C('sar');

  const load = () => {
    setLoading(true);
    api.getInvoices().then(r => setInvoices(r.invoices)).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.getProjects().then(r => setProjects(r.projects)).catch(() => {});
  }, []);

  const filtered = invoices.filter(i =>
    i.InvoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    (i.ClientName || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.ProjectCode || '').toLowerCase().includes(search.toLowerCase())
  );

  const openDetail = async (id: number) => {
    try {
      const [inv, pay] = await Promise.all([api.getInvoice(id), api.getPayments(id)]);
      setDetail(inv);
      setPayments(pay.payments);
      setPaymentTotal(pay.total);
      setShowPayForm(false);
      setPayForm({ paymentDate: new Date().toISOString().slice(0, 10), amount: '', paymentMethod: 'BankTransfer', reference: '', notes: '' });
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const refreshPayments = async (invoiceId: number) => {
    const pay = await api.getPayments(invoiceId);
    setPayments(pay.payments);
    setPaymentTotal(pay.total);
  };

  const handleAddPayment = async () => {
    if (!detail || !payForm.paymentDate || !payForm.amount) { alert(P('required')); return; }
    setPaySaving(true);
    try {
      await api.createPayment({
        invoiceId: detail.invoice.InvoiceID!,
        paymentDate: payForm.paymentDate,
        amount: parseFloat(payForm.amount),
        paymentMethod: payForm.paymentMethod,
        reference: payForm.reference || undefined,
        notes: payForm.notes || undefined,
      });
      setShowPayForm(false);
      setPayForm({ paymentDate: new Date().toISOString().slice(0, 10), amount: '', paymentMethod: 'BankTransfer', reference: '', notes: '' });
      await refreshPayments(detail.invoice.InvoiceID!);
      load(); // refresh list to update balance
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setPaySaving(false); }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm(P('deleteConfirm'))) return;
    try {
      await api.deletePayment(paymentId);
      await refreshPayments(detail!.invoice.InvoiceID!);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const logoUrl = `${window.location.origin}/logo.png`;
    w.document.write(`
      <html><head><title>Invoice</title>
      <style>
        body{font-family:sans-serif;padding:24px;direction:${lang === 'ar' ? 'rtl' : 'ltr'}}
        table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:start}
        th{background:#f5f5f5}h2{margin-bottom:4px}.total{font-size:1.1em;font-weight:bold}
        .print-logo{height:64px;object-fit:contain;display:block}
      </style>
      </head><body>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;border-bottom:2px solid #0c2f5c;padding-bottom:12px">
          <img src="${logoUrl}" class="print-logo" alt="Indigo Builders" />
          <div style="text-align:end;color:#555;font-size:12px">
            <div style="font-size:18px;font-weight:bold;color:#0c2f5c">Indigo Builders Company</div>
            <div>VAT: 311234567890003</div>
            <div>Riyadh, Kingdom of Saudi Arabia</div>
          </div>
        </div>
        ${content}
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  const handleSave = async () => {
    if (!form.invoiceNumber || !form.clientName || !form.invoiceDate) { alert(T('required')); return; }
    const payload: CreateInvoiceInput = { ...form, items, projectID: projectId || undefined };
    setSaving(true);
    try {
      await api.createInvoice(payload);
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setProjectId('');
      setItems([{ Description: '', Quantity: 1, UnitPrice: 0, Discount: 0, VATRate: 15 }]);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    try { await api.updateInvoiceStatus(id, status); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const deleteInvoice = async (id: number) => {
    if (!confirm(T('deleteConfirm'))) return;
    try { await api.deleteInvoice(id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const addItem = () => setItems(p => [...p, { Description: '', Quantity: 1, UnitPrice: 0, Discount: 0, VATRate: 15 }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: string, val: string | number) =>
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [key]: val } : it));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{T('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} {C('records')}</p>
        </div>
        {can('Admin', 'Finance') && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>{T('newBtn')}</button>
        )}
      </div>

      <input className="input-field max-w-sm" placeholder={C('search')} value={search} onChange={e => setSearch(e.target.value)} />

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
                  {[T('number'), T('client'), T('project'), T('date'), T('total'), P('balance'), C('status'), C('actions')].map((h, hi) => (
                    <th key={hi} className="px-4 py-3 text-start font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inv => (
                  <tr key={inv.InvoiceID} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-600">{inv.InvoiceNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{(inv.ClientName || '').slice(0, 35)}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.ProjectCode || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(inv.InvoiceDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB')}</td>
                    <td className="px-4 py-3 font-medium">{Number(inv.TotalAmount).toLocaleString()} {sar}</td>
                    <td className={`px-4 py-3 font-medium ${(inv.BalanceDue != null ? Number(inv.BalanceDue) : Number(inv.TotalAmount)) <= 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      {(inv.BalanceDue != null ? Number(inv.BalanceDue) : Number(inv.TotalAmount)) <= 0.01
                        ? '✓'
                        : `${(inv.BalanceDue != null ? Number(inv.BalanceDue) : Number(inv.TotalAmount)).toLocaleString()} ${sar}`}
                    </td>
                    <td className="px-4 py-3">{statusBadge(inv.ZatcaStatus)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openDetail(inv.InvoiceID!)} className="text-brand-600 hover:underline text-xs">{C('view')}</button>
                        {can('Admin', 'Finance') && inv.ZatcaStatus === 'Draft' && (
                          <button onClick={() => updateStatus(inv.InvoiceID!, 'Reported')} className="text-blue-600 hover:underline text-xs">{T('reportBtn')}</button>
                        )}
                        {can('Admin') && inv.ZatcaStatus === 'Draft' && (
                          <button onClick={() => deleteInvoice(inv.InvoiceID!)} className="text-red-500 hover:underline text-xs">{C('delete')}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">{C('noData')}</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map(inv => (
              <div key={inv.InvoiceID} className="card">
                <div className="flex justify-between mb-1">
                  <p className="font-mono text-xs text-brand-600">{inv.InvoiceNumber}</p>
                  {statusBadge(inv.ZatcaStatus)}
                </div>
                <p className="font-medium text-gray-900">{(inv.ClientName || '').slice(0, 45)}</p>
                <p className="text-sm text-gray-700 mt-1">{Number(inv.TotalAmount).toLocaleString()} {sar}</p>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => openDetail(inv.InvoiceID!)} className="btn-secondary text-xs flex-1">{C('view')}</button>
                  {can('Admin', 'Finance') && inv.ZatcaStatus === 'Draft' && (
                    <button onClick={() => updateStatus(inv.InvoiceID!, 'Reported')} className="btn-primary text-xs flex-1">{T('reportBtn')}</button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center py-12 text-gray-400">{C('noData')}</p>}
          </div>
        </>
      )}

      {/* Detail + Print Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">{T('detailTitle')}: {detail.invoice.InvoiceNumber}</h2>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="btn-secondary text-xs">{T('printBtn')}</button>
                {detail.invoice.ZatcaStatus !== 'Draft' && (
                  <a
                    href={`/api/invoices/${detail.invoice.InvoiceID}/xml`}
                    download={`INV-${detail.invoice.InvoiceNumber}.xml`}
                    className="btn-secondary text-xs"
                  >
                    {lang === 'ar' ? 'تحميل XML' : 'Download XML'}
                  </a>
                )}
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            {/* Printable content */}
            <div className="p-6" ref={printRef}>
              <div className="flex justify-between items-start mb-6">
                <div className="hidden print:block">
                  {/* logo injected by print handler */}
                </div>
                <div className="text-end">
                  <p className="text-lg font-bold text-gray-900">{detail.invoice.InvoiceNumber}</p>
                  <p className="text-sm text-gray-500">{new Date(detail.invoice.InvoiceDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB')}</p>
                  {statusBadge(detail.invoice.ZatcaStatus)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 text-sm mb-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">{T('client')}</p>
                  <p className="font-semibold text-gray-800">{detail.invoice.ClientName}</p>
                  {detail.invoice.ClientVAT && <p className="text-gray-600">{T('clientVAT')}: {detail.invoice.ClientVAT}</p>}
                  {detail.invoice.ClientAddress && <p className="text-gray-600">{detail.invoice.ClientAddress}</p>}
                </div>
                <div>
                  {detail.invoice.ProjectName && (
                    <><p className="text-xs text-gray-400 uppercase mb-1">{T('project')}</p>
                    <p className="font-semibold text-gray-800">{detail.invoice.ProjectName}</p></>
                  )}
                  {detail.invoice.ZatcaUUID && (
                    <p className="text-xs text-gray-400 mt-2 font-mono break-all">{T('uuid')}: {detail.invoice.ZatcaUUID}</p>
                  )}
                </div>
              </div>
              <table className="w-full text-sm border-collapse mb-4">
                <thead>
                  <tr className="bg-gray-50">
                    {[T('itemDesc'), T('itemQty'), T('itemPrice'), T('itemTotal')].map(h => (
                      <th key={h} className="border border-gray-200 px-3 py-2 text-start">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map(it => (
                    <tr key={it.ItemID}>
                      <td className="border border-gray-200 px-3 py-2">{it.Description}</td>
                      <td className="border border-gray-200 px-3 py-2">{it.Quantity}</td>
                      <td className="border border-gray-200 px-3 py-2">{Number(it.UnitPrice).toLocaleString()} {sar}</td>
                      <td className="border border-gray-200 px-3 py-2 font-medium">{Number(it.LineTotal).toLocaleString()} {sar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-72 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{T('subTotal')}</span><span>{Number(detail.invoice.SubTotal).toLocaleString()} {sar}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{T('vat')} ({detail.invoice.VATRate}%)</span><span>{Number(detail.invoice.VATAmount).toLocaleString()} {sar}</span></div>
                  {Number(detail.invoice.RetentionAmount) > 0 && (
                    <div className="flex justify-between text-orange-600"><span>{T('retention')} ({detail.invoice.RetentionRate}%)</span><span>- {Number(detail.invoice.RetentionAmount).toLocaleString()} {sar}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1.5 border-t border-gray-300">
                    <span>{T('total')}</span><span>{Number(detail.invoice.TotalAmount).toLocaleString()} {sar}</span>
                  </div>
                  <div className="flex justify-between text-green-700 pt-1"><span>{P('totalPaid')}</span><span>{paymentTotal.toLocaleString()} {sar}</span></div>
                  <div className={`flex justify-between font-semibold pt-1 border-t border-gray-200 ${Number(detail.invoice.TotalAmount) - paymentTotal <= 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{P('balance')}</span>
                    <span>{Number(detail.invoice.TotalAmount) - paymentTotal <= 0.01 ? P('paidFull') : `${(Number(detail.invoice.TotalAmount) - paymentTotal).toLocaleString()} ${sar}`}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payments Panel */}
            <div className="border-t pt-4 px-6 pb-2">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800">{P('title')}</h3>
                {can('Admin', 'Finance') && Number(detail.invoice.TotalAmount) - paymentTotal > 0.01 && (
                  <button className="btn-secondary text-xs" onClick={() => setShowPayForm(v => !v)}>{P('addBtn')}</button>
                )}
              </div>

              {showPayForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">{P('date')}*</label>
                      <input type="date" className="input-field text-sm" value={payForm.paymentDate}
                        onChange={e => setPayForm(p => ({ ...p, paymentDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">{P('amount')}*</label>
                      <input type="number" className="input-field text-sm" placeholder="0.00" value={payForm.amount}
                        onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">{P('method')}</label>
                      <select className="input-field text-sm" value={payForm.paymentMethod}
                        onChange={e => setPayForm(p => ({ ...p, paymentMethod: e.target.value }))}>
                        {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">{P('reference')}</label>
                      <input className="input-field text-sm" value={payForm.reference}
                        onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">{P('notes')}</label>
                    <input className="input-field text-sm" value={payForm.notes}
                      onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <button className="btn-primary text-sm w-full" onClick={handleAddPayment} disabled={paySaving}>
                    {paySaving ? P('saving') : P('saveBtn')}
                  </button>
                </div>
              )}

              {payments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">{P('noPayments')}</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b">
                      <th className="text-start py-1.5 font-medium">{P('date')}</th>
                      <th className="text-start py-1.5 font-medium">{P('method')}</th>
                      <th className="text-start py-1.5 font-medium">{P('reference')}</th>
                      <th className="text-end py-1.5 font-medium">{P('amount')}</th>
                      {can('Admin', 'Finance') && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(pay => (
                      <tr key={pay.PaymentID} className="border-b border-gray-50">
                        <td className="py-1.5">{pay.PaymentDate}</td>
                        <td className="py-1.5"><span className="bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">{pay.PaymentMethod}</span></td>
                        <td className="py-1.5 text-gray-500">{pay.Reference || '—'}</td>
                        <td className="py-1.5 text-end font-medium text-green-700">{Number(pay.Amount).toLocaleString()} {sar}</td>
                        {can('Admin', 'Finance') && (
                          <td className="py-1.5 text-end">
                            <button onClick={() => handleDeletePayment(pay.PaymentID)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-6 border-t flex gap-3">
              {can('Admin', 'Finance') && detail.invoice.ZatcaStatus === 'Draft' && (
                <button onClick={() => { updateStatus(detail.invoice.InvoiceID!, 'Reported'); setDetail(null); }}
                  className="btn-primary flex-1">{T('reportBtn')}</button>
              )}
              {can('Admin', 'Finance') && detail.invoice.ZatcaStatus === 'Reported' && (
                <button onClick={() => { updateStatus(detail.invoice.InvoiceID!, 'Cleared'); setDetail(null); }}
                  className="btn-primary flex-1">✓ {lang === 'ar' ? 'اعتماد' : 'Mark Cleared'}</button>
              )}
              <button onClick={() => setDetail(null)} className="btn-secondary flex-1">{C('close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">{T('formTitle')}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: `${T('number')}*`, key: 'invoiceNumber' },
                  { label: `${T('client')}*`, key: 'clientName' },
                  { label: T('clientVAT'), key: 'clientVAT' },
                  { label: T('clientAddress'), key: 'clientAddress' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input className="input-field" value={(form as Record<string, string | number>)[key] as string}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('date')}*</label>
                  <input type="date" className="input-field" value={form.invoiceDate}
                    onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('dueDate')}</label>
                  <input type="date" className="input-field" value={form.dueDate}
                    onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('project')}</label>
                  <select className="input-field" value={projectId}
                    onChange={e => setProjectId(e.target.value ? parseInt(e.target.value) : '')}>
                    <option value="">{lang === 'ar' ? '— بدون مشروع —' : '— No Project —'}</option>
                    {projects.map(p => <option key={p.ProjectID} value={p.ProjectID}>{p.ProjectCode} — {p.ProjectName.slice(0, 40)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('vatRate')}</label>
                  <input type="number" className="input-field" value={form.vatRate}
                    onChange={e => setForm(p => ({ ...p, vatRate: parseFloat(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('retentionRate')}</label>
                  <input type="number" className="input-field" value={form.retentionRate}
                    onChange={e => setForm(p => ({ ...p, retentionRate: parseFloat(e.target.value) }))} />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-800">{T('items')}</h3>
                  <button onClick={addItem} className="btn-secondary text-xs">{T('addItem')}</button>
                </div>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input className="input-field col-span-5" placeholder={T('itemDesc')} value={it.Description}
                        onChange={e => updateItem(i, 'Description', e.target.value)} />
                      <input type="number" className="input-field col-span-2" placeholder={T('itemQty')} value={it.Quantity}
                        onChange={e => updateItem(i, 'Quantity', parseFloat(e.target.value))} />
                      <input type="number" className="input-field col-span-3" placeholder={T('itemPrice')} value={it.UnitPrice}
                        onChange={e => updateItem(i, 'UnitPrice', parseFloat(e.target.value))} />
                      <button onClick={() => removeItem(i)} className="col-span-2 text-red-400 hover:text-red-600 text-xs">{T('removeItem')}</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? T('creating') : T('createBtn')}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>{C('cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
