import { useEffect, useState } from 'react';
import { api, PurchaseOrder, POItem, CreatePOInput, Project, PO_STATUSES } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { tr } from '../translations';
import ChipFilter from '../components/ChipFilter';
import { files } from '../services/files';

const STATUS_COLOR: Record<string, string> = {
  Draft:             'bg-gray-100 text-gray-600',
  PendingApproval:   'bg-yellow-100 text-yellow-700',
  Approved:          'bg-green-100 text-green-700',
  Delivered:         'bg-blue-100 text-blue-700',
  Cancelled:         'bg-red-100 text-red-500',
  Rejected:          'bg-red-100 text-red-700',
};

const EMPTY_ITEM = { description: '', quantity: 1, unitPrice: 0, discount: 0, vatRate: 15 };

const EMPTY_FORM: Partial<CreatePOInput> = {
  poNumber: '', vendorName: '', vendorEmail: '', vendorPhone: '',
  vendorVAT: '', vendorAddress: '', orderDate: new Date().toISOString().slice(0, 10),
  expectedDeliveryDate: '', deliveryAddress: '', vatRate: 15, shippingCost: 0,
  paymentTerms: '', notes: '',
};

function downloadCSV(pos: PurchaseOrder[], sar: string) {
  const headers = ['PO Number', 'Vendor', 'Project', 'Order Date', 'Status', `Total (${sar})`];
  const rows = pos.map(p => [
    p.PONumber, `"${p.VendorName}"`, p.ProjectCode || '',
    p.OrderDate, p.Status, Number(p.TotalAmount).toFixed(2),
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  files.downloadCSV(csv, `PurchaseOrders_${new Date().toISOString().slice(0, 10)}.csv`);
}

function calcTotals(items: typeof EMPTY_ITEM[], vatRate: number, shipping: number) {
  const subTotal = items.reduce((s, it) => {
    return s + (Number(it.unitPrice) * Number(it.quantity) - Number(it.discount ?? 0));
  }, 0);
  const vatAmount  = subTotal * vatRate / 100;
  const total      = subTotal + vatAmount + Number(shipping);
  return { subTotal, vatAmount, total };
}

export default function PurchaseOrdersView() {
  const { can } = useAuth();
  const { lang } = useLang();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = (k: any) => tr('purchaseOrders', k, lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = (k: any) => tr('common', k, lang);
  const sar = C('sar');

  const canEdit   = can('Admin', 'Finance', 'PM');
  const canDelete = can('Admin', 'Finance');
  const canAdmin  = can('Admin');

  const [pos, setPos]             = useState<PurchaseOrder[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo]     = useState('');
  const [search, setSearch]         = useState('');

  // Form
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState<Partial<CreatePOInput>>({ ...EMPTY_FORM });
  const [items, setItems]         = useState([{ ...EMPTY_ITEM }]);
  const [saving, setSaving]       = useState(false);

  // Detail modal
  const [detail, setDetail]       = useState<{ po: PurchaseOrder; items: POItem[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = () => {
    setLoading(true);
    const params = {
      projectId: filterProject ? parseInt(filterProject) : undefined,
      from:      filterFrom || undefined,
      to:        filterTo   || undefined,
    };
    Promise.all([api.getPurchaseOrders(params), api.getProjects()])
      .then(([pr, pj]) => { setPos(pr.purchaseOrders); setProjects(pj.projects); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = pos.filter(p =>
    (!statusFilter || p.Status === statusFilter) &&
    (p.PONumber.toLowerCase().includes(search.toLowerCase()) ||
     p.VendorName.toLowerCase().includes(search.toLowerCase()) ||
     p.ProjectCode.toLowerCase().includes(search.toLowerCase()))
  );

  const chips = PO_STATUSES.map(s => ({
    value: s, label: T(`status${s}` as Parameters<typeof T>[0]),
    count: pos.filter(p => p.Status === s).length,
  })).filter(c => c.count > 0);

  const grandTotal = filtered.reduce((s, p) => s + Number(p.TotalAmount), 0);

  const sf = (k: keyof CreatePOInput) => (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(p => ({ ...p, [k]: ev.target.value }));

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setItems([{ ...EMPTY_ITEM }]);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = async (po: PurchaseOrder) => {
    if (po.Status !== 'Draft') { alert(T('draftOnly')); return; }
    setLoadingDetail(true);
    try {
      const d = await api.getPurchaseOrder(po.PurchaseOrderID!);
      setForm({
        poNumber: d.purchaseOrder.PONumber,
        projectID: d.purchaseOrder.ProjectID ?? undefined,
        vendorName: d.purchaseOrder.VendorName,
        vendorEmail: d.purchaseOrder.VendorEmail,
        vendorPhone: d.purchaseOrder.VendorPhone,
        vendorVAT: d.purchaseOrder.VendorVAT,
        vendorAddress: d.purchaseOrder.VendorAddress,
        orderDate: d.purchaseOrder.OrderDate,
        expectedDeliveryDate: d.purchaseOrder.ExpectedDeliveryDate,
        deliveryAddress: d.purchaseOrder.DeliveryAddress,
        vatRate: d.purchaseOrder.VATRate,
        shippingCost: d.purchaseOrder.ShippingCost,
        paymentTerms: d.purchaseOrder.PaymentTerms,
        notes: d.purchaseOrder.Notes,
      });
      setItems(d.items.map(it => ({
        description: it.Description,
        quantity:    Number(it.Quantity),
        unitPrice:   Number(it.UnitPrice),
        discount:    Number(it.Discount),
        vatRate:     Number(it.VATRate),
      })));
      setEditId(po.PurchaseOrderID!);
      setShowForm(true);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setLoadingDetail(false); }
  };

  const openDetail = async (po: PurchaseOrder) => {
    setLoadingDetail(true);
    try {
      const d = await api.getPurchaseOrder(po.PurchaseOrderID!);
      setDetail({ po: d.purchaseOrder, items: d.items });
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setLoadingDetail(false); }
  };

  const handleSave = async () => {
    if (!form.poNumber || !form.vendorName || !form.orderDate || !items.length) {
      alert(T('required')); return;
    }
    setSaving(true);
    try {
      const payload: CreatePOInput = {
        poNumber:            form.poNumber!,
        projectID:           form.projectID || undefined,
        vendorName:          form.vendorName!,
        vendorEmail:         form.vendorEmail || undefined,
        vendorPhone:         form.vendorPhone || undefined,
        vendorVAT:           form.vendorVAT   || undefined,
        vendorAddress:       form.vendorAddress || undefined,
        orderDate:           form.orderDate!,
        expectedDeliveryDate:form.expectedDeliveryDate || undefined,
        deliveryAddress:     form.deliveryAddress || undefined,
        vatRate:             Number(form.vatRate) || 15,
        shippingCost:        Number(form.shippingCost) || 0,
        paymentTerms:        form.paymentTerms || undefined,
        notes:               form.notes || undefined,
        items,
      };
      if (editId) await api.updatePurchaseOrder(editId, payload);
      else        await api.createPurchaseOrder(payload);
      setShowForm(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async (po: PurchaseOrder) => {
    if (!confirm(T('submitConfirm'))) return;
    try {
      const res = await api.submitPurchaseOrder(po.PurchaseOrderID!);
      alert(`${T('emailsSent')} (${res.emailsSent})`);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const handleDelete = async (po: PurchaseOrder) => {
    if (!confirm(T('deleteConfirm'))) return;
    try { await api.deletePurchaseOrder(po.PurchaseOrderID!); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const handleStatusChange = async (po: PurchaseOrder, status: string) => {
    try { await api.updatePOStatus(po.PurchaseOrderID!, status); load(); if (detail) setDetail(null); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const updateItem = (i: number, k: string, v: string | number) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem    = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const { subTotal, vatAmount, total } = calcTotals(items, Number(form.vatRate) || 15, Number(form.shippingCost) || 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{T('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length}{statusFilter ? `/${pos.length}` : ''} {C('records')} —&nbsp;
            <span className="font-medium text-gray-800">{T('grandTotal')}: {grandTotal.toLocaleString()} {sar}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => downloadCSV(pos, sar)}>⬇ CSV</button>
          {canEdit && <button className="btn-primary" onClick={openNew}>{T('newBtn')}</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <input
            type="text" placeholder={C('search')} className="input-field max-w-[200px]"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <select className="input-field max-w-[180px]" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">{T('project')} — {lang === 'ar' ? 'الكل' : 'All'}</option>
            {projects.map(p => <option key={p.ProjectID} value={p.ProjectID}>{p.ProjectCode}</option>)}
          </select>
          <input type="date" className="input-field max-w-[150px]" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          <input type="date" className="input-field max-w-[150px]" value={filterTo}   onChange={e => setFilterTo(e.target.value)} />
          <button className="btn-primary" onClick={load}>{lang === 'ar' ? 'بحث' : 'Search'}</button>
          {(filterProject || filterFrom || filterTo) && (
            <button className="btn-secondary" onClick={() => { setFilterProject(''); setFilterFrom(''); setFilterTo(''); }}>
              {lang === 'ar' ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
        <ChipFilter chips={chips} active={statusFilter} onChange={setStatusFilter} />
      </div>

      {error && <div className="text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>}

      {loading || loadingDetail ? (
        <div className="text-center py-16 text-gray-400">{C('loading')}</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {[T('number'), T('vendor'), T('project'), T('orderDate'), T('total'), T('status'), C('actions')].map(h => (
                    <th key={h} className="px-3 py-3 text-start font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(po => (
                  <tr key={po.PurchaseOrderID} className="hover:bg-gray-50/50">
                    <td className="px-3 py-3 font-mono text-xs text-brand-700">
                      <button onClick={() => openDetail(po)} className="hover:underline">{po.PONumber}</button>
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-800 max-w-[160px] truncate">{po.VendorName}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{po.ProjectCode || '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{po.OrderDate}</td>
                    <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {Number(po.TotalAmount).toLocaleString()} {sar}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[po.Status] || 'bg-gray-100 text-gray-600'}`}>
                        {T(`status${po.Status}` as Parameters<typeof T>[0])}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {canEdit && po.Status === 'Draft' && (
                          <button onClick={() => openEdit(po)} className="text-brand-600 hover:underline text-xs">{C('edit')}</button>
                        )}
                        {canEdit && po.Status === 'Draft' && (
                          <button onClick={() => handleSubmit(po)} className="text-yellow-600 hover:underline text-xs">{T('submitBtn')}</button>
                        )}
                        {canAdmin && po.Status === 'Approved' && (
                          <button onClick={() => handleStatusChange(po, 'Delivered')} className="text-blue-600 hover:underline text-xs">{T('markDelivered')}</button>
                        )}
                        {canAdmin && !['Cancelled', 'Delivered'].includes(po.Status) && (
                          <button onClick={() => handleStatusChange(po, 'Cancelled')} className="text-red-400 hover:underline text-xs">{T('cancel')}</button>
                        )}
                        {canDelete && ['Draft', 'Rejected', 'Cancelled'].includes(po.Status) && (
                          <button onClick={() => handleDelete(po)} className="text-red-500 hover:underline text-xs">{C('delete')}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">{T('noData')}</td></tr>
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-gray-50 border-t font-semibold">
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-gray-700">{T('grandTotal')}</td>
                    <td className="px-3 py-3 text-emerald-700">{grandTotal.toLocaleString()} {sar}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(po => (
              <div key={po.PurchaseOrderID} className="card space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-xs text-brand-700">{po.PONumber}</p>
                    <p className="font-semibold text-gray-900">{po.VendorName.slice(0, 40)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[po.Status] || 'bg-gray-100'}`}>
                    {T(`status${po.Status}` as Parameters<typeof T>[0])}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{po.ProjectCode || '—'}</span>
                  <span className="font-medium text-gray-900">{Number(po.TotalAmount).toLocaleString()} {sar}</span>
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  <button onClick={() => openDetail(po)} className="text-brand-600 text-xs hover:underline">{C('view')}</button>
                  {canEdit && po.Status === 'Draft' && (
                    <button onClick={() => openEdit(po)} className="text-brand-600 text-xs hover:underline">{C('edit')}</button>
                  )}
                  {canEdit && po.Status === 'Draft' && (
                    <button onClick={() => handleSubmit(po)} className="text-yellow-600 text-xs hover:underline">{T('submitBtn')}</button>
                  )}
                  {canDelete && ['Draft', 'Rejected', 'Cancelled'].includes(po.Status) && (
                    <button onClick={() => handleDelete(po)} className="text-red-500 text-xs hover:underline">{C('delete')}</button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center py-12 text-gray-400">{T('noData')}</p>}
          </div>
        </>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-lg">{editId ? T('editTitle') : T('formTitle')}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* PO Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('number')}*</label>
                  <input className="input-field" value={form.poNumber || ''} onChange={sf('poNumber')} disabled={!!editId} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('project')}</label>
                  <select className="input-field" value={form.projectID ?? ''} onChange={e => setForm(p => ({ ...p, projectID: e.target.value ? parseInt(e.target.value) : undefined }))}>
                    <option value="">— {lang === 'ar' ? 'اختياري' : 'Optional'} —</option>
                    {projects.map(p => <option key={p.ProjectID} value={p.ProjectID}>{p.ProjectCode} — {p.ProjectName.slice(0, 30)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('orderDate')}*</label>
                  <input type="date" className="input-field" value={form.orderDate || ''} onChange={sf('orderDate')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('deliveryDate')}</label>
                  <input type="date" className="input-field" value={form.expectedDeliveryDate || ''} onChange={sf('expectedDeliveryDate')} />
                </div>
              </div>

              {/* Vendor */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{T('vendor')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{T('vendor')}*</label>
                    <input className="input-field" value={form.vendorName || ''} onChange={sf('vendorName')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{T('vendorEmail')}</label>
                    <input type="email" className="input-field" value={form.vendorEmail || ''} onChange={sf('vendorEmail')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{T('vendorPhone')}</label>
                    <input className="input-field" value={form.vendorPhone || ''} onChange={sf('vendorPhone')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{T('vendorVAT')}</label>
                    <input className="input-field" value={form.vendorVAT || ''} onChange={sf('vendorVAT')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{T('paymentTerms')}</label>
                    <input className="input-field" value={form.paymentTerms || ''} onChange={sf('paymentTerms')} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{T('vendorAddress')}</label>
                    <input className="input-field" value={form.vendorAddress || ''} onChange={sf('vendorAddress')} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{T('deliveryAddr')}</label>
                    <input className="input-field" value={form.deliveryAddress || ''} onChange={sf('deliveryAddress')} />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{T('items')}</p>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 sm:col-span-4">
                        {i === 0 && <label className="block text-xs text-gray-500 mb-1">{T('itemDesc')}</label>}
                        <input className="input-field text-sm" placeholder={T('itemDesc')} value={it.description}
                          onChange={e => updateItem(i, 'description', e.target.value)} />
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        {i === 0 && <label className="block text-xs text-gray-500 mb-1">{T('itemQty')}</label>}
                        <input type="number" min="0" className="input-field text-sm" value={it.quantity}
                          onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        {i === 0 && <label className="block text-xs text-gray-500 mb-1">{T('itemPrice')}</label>}
                        <input type="number" min="0" className="input-field text-sm" value={it.unitPrice}
                          onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        {i === 0 && <label className="block text-xs text-gray-500 mb-1">{T('itemDiscount')}</label>}
                        <input type="number" min="0" className="input-field text-sm" value={it.discount}
                          onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        {i === 0 && <label className="block text-xs text-gray-500 mb-1">{T('itemVAT')}</label>}
                        <input type="number" min="0" className="input-field text-sm" value={it.vatRate}
                          onChange={e => updateItem(i, 'vatRate', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="col-span-8 sm:col-span-2 text-sm font-medium text-gray-700 pb-2">
                        {i === 0 && <div className="text-xs text-gray-500 mb-1">{T('itemTotal')}</div>}
                        {(Number(it.unitPrice) * Number(it.quantity) - Number(it.discount)).toLocaleString()}
                      </div>
                      <div className="col-span-4 sm:col-span-0 pb-2">
                        {items.length > 1 && (
                          <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-xs">{C('delete')}</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addItem} className="mt-2 text-brand-600 hover:underline text-sm">{T('addItem')}</button>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('vatRate')} (%)</label>
                  <input type="number" min="0" max="100" className="input-field" value={form.vatRate ?? 15}
                    onChange={e => setForm(p => ({ ...p, vatRate: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('shipping')}</label>
                  <input type="number" min="0" className="input-field" value={form.shippingCost ?? 0}
                    onChange={e => setForm(p => ({ ...p, shippingCost: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="col-span-2 bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>{T('subTotal')}</span><span>{subTotal.toLocaleString()} {sar}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{T('vatAmount')} ({form.vatRate ?? 15}%)</span><span>{vatAmount.toLocaleString()} {sar}</span>
                  </div>
                  {(form.shippingCost ?? 0) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>{T('shipping')}</span><span>{Number(form.shippingCost).toLocaleString()} {sar}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 border-t pt-1">
                    <span>{T('total')}</span><span>{total.toLocaleString()} {sar}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{C('notes')}</label>
                <textarea className="input-field" rows={2} value={form.notes || ''} onChange={sf('notes')} />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? C('saving') : C('save')}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>{C('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="font-semibold text-lg">{T('detailTitle')} — {detail.po.PONumber}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[detail.po.Status] || 'bg-gray-100'}`}>
                  {T(`status${detail.po.Status}` as Parameters<typeof T>[0])}
                </span>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  [T('vendor'),       detail.po.VendorName],
                  [T('project'),      detail.po.ProjectCode || '—'],
                  [T('orderDate'),    detail.po.OrderDate],
                  [T('deliveryDate'), detail.po.ExpectedDeliveryDate || '—'],
                  [T('vendorEmail'),  detail.po.VendorEmail || '—'],
                  [T('vendorPhone'),  detail.po.VendorPhone || '—'],
                  [T('paymentTerms'), detail.po.PaymentTerms || '—'],
                  [T('approvedBy'),   detail.po.ApprovedBy || '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-gray-500 text-xs">{label}</p>
                    <p className="font-medium text-gray-900">{val}</p>
                  </div>
                ))}
              </div>

              {/* Items table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {[T('itemDesc'), T('itemQty'), T('itemPrice'), T('itemDiscount'), T('itemVAT')+'%', T('itemTotal')].map(h => (
                        <th key={h} className="px-3 py-2 text-start text-xs font-medium text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {detail.items.map(it => (
                      <tr key={it.LineID}>
                        <td className="px-3 py-2">{it.Description}</td>
                        <td className="px-3 py-2">{it.Quantity}</td>
                        <td className="px-3 py-2">{Number(it.UnitPrice).toLocaleString()}</td>
                        <td className="px-3 py-2">{Number(it.Discount).toLocaleString()}</td>
                        <td className="px-3 py-2">{it.VATRate}%</td>
                        <td className="px-3 py-2 font-medium">{Number(it.LineTotal).toLocaleString()} {sar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600"><span>{T('subTotal')}</span><span>{Number(detail.po.SubTotal).toLocaleString()} {sar}</span></div>
                <div className="flex justify-between text-gray-600"><span>{T('vatAmount')} ({detail.po.VATRate}%)</span><span>{Number(detail.po.VATAmount).toLocaleString()} {sar}</span></div>
                {detail.po.ShippingCost > 0 && (
                  <div className="flex justify-between text-gray-600"><span>{T('shipping')}</span><span>{Number(detail.po.ShippingCost).toLocaleString()} {sar}</span></div>
                )}
                <div className="flex justify-between font-bold text-gray-900 border-t pt-1"><span>{T('total')}</span><span>{Number(detail.po.TotalAmount).toLocaleString()} {sar}</span></div>
              </div>

              {detail.po.Notes && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                  <span className="font-medium">{C('notes')}: </span>{detail.po.Notes}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap pt-2">
                {canEdit && detail.po.Status === 'Draft' && (
                  <button className="btn-primary" onClick={() => { setDetail(null); openEdit(detail.po); }}>{C('edit')}</button>
                )}
                {canEdit && detail.po.Status === 'Draft' && (
                  <button className="btn-secondary" onClick={() => { handleSubmit(detail.po); setDetail(null); }}>{T('submitBtn')}</button>
                )}
                {canAdmin && detail.po.Status === 'Approved' && (
                  <button className="btn-primary" onClick={() => handleStatusChange(detail.po, 'Delivered')}>{T('markDelivered')}</button>
                )}
                {canAdmin && !['Cancelled', 'Delivered'].includes(detail.po.Status) && (
                  <button className="btn-secondary text-red-500" onClick={() => handleStatusChange(detail.po, 'Cancelled')}>{T('cancel')}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
