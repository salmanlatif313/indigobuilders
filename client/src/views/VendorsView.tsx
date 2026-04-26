import { useEffect, useState } from 'react';
import { api, Vendor, VENDOR_CATEGORIES, VENDOR_PAYMENT_TERMS, VENDOR_STATUSES } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import ChipFilter from '../components/ChipFilter';

const STATUS_COLOR: Record<string, string> = {
  Pending:     'bg-yellow-100 text-yellow-700',
  Approved:    'bg-green-100 text-green-700',
  Blacklisted: 'bg-red-100 text-red-600',
};

const EMPTY: Partial<Vendor> = {
  VendorCode: '', VendorName: '', VendorNameAr: '', Category: 'Supply',
  ContactPerson: '', Phone: '', Email: '', VATNumber: '', IBAN: '',
  BankCode: '', PaymentTerms: 'Net30', ApprovalStatus: 'Pending',
  Rating: 3, Address: '', IsActive: true, Notes: '',
};

export default function VendorsView() {
  const { can } = useAuth();
  const { lang } = useLang();
  const canEdit   = can('Admin', 'Finance');
  const canDelete = can('Admin');

  const [vendors, setVendors]     = useState<Vendor[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState<Partial<Vendor>>({ ...EMPTY });
  const [saving, setSaving]       = useState(false);

  const load = () => {
    setLoading(true);
    api.getVendors()
      .then(r => setVendors(r.vendors))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = vendors.filter(v =>
    (!statusFilter || v.ApprovalStatus === statusFilter) &&
    (v.VendorName.toLowerCase().includes(search.toLowerCase()) ||
     v.VendorCode.toLowerCase().includes(search.toLowerCase()) ||
     v.Category.toLowerCase().includes(search.toLowerCase()))
  );

  const chips = VENDOR_STATUSES.map(s => ({
    value: s, label: s, count: vendors.filter(v => v.ApprovalStatus === s).length,
  })).filter(c => c.count > 0);

  const openNew = () => { setForm({ ...EMPTY }); setEditId(null); setShowForm(true); };
  const openEdit = (v: Vendor) => {
    setForm({ ...v }); setEditId(v.VendorID!); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.VendorCode || !form.VendorName) { alert('Vendor Code and Name are required'); return; }
    setSaving(true);
    try {
      if (editId) {
        await api.updateVendor(editId, form);
      } else {
        await api.createVendor(form);
      }
      setShowForm(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete vendor "${name}"?`)) return;
    try { await api.deleteVendor(id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const f = (k: keyof Vendor, v: unknown) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{lang === 'ar' ? 'الموردون' : 'Vendors'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} {lang === 'ar' ? 'مورد' : 'vendors'}
          </p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="btn-primary flex items-center gap-2 self-start">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            {lang === 'ar' ? 'مورد جديد' : 'New Vendor'}
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      {/* Chips + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <ChipFilter chips={chips} active={statusFilter} onChange={setStatusFilter} />
        <div className="sm:ms-auto">
          <input
            type="text" placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field w-48 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">{lang === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Code', 'Vendor Name', 'Category', 'Contact', 'Payment Terms', 'Status', 'Rating', ''].map(h => (
                    <th key={h} className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(v => (
                  <tr key={v.VendorID} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.VendorCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">{v.VendorName}</p>
                      {v.VendorNameAr && <p className="text-xs text-gray-400 dir-rtl">{v.VendorNameAr}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{v.Category}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{v.ContactPerson}</p>
                      <p className="text-xs text-gray-400">{v.Phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{v.PaymentTerms}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[v.ApprovalStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {v.ApprovalStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {'★'.repeat(v.Rating)}{'☆'.repeat(5 - v.Rating)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        {canEdit && (
                          <button onClick={() => openEdit(v)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(v.VendorID!, v.VendorName)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                            {lang === 'ar' ? 'حذف' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">{lang === 'ar' ? 'لا يوجد موردون' : 'No vendors found'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(v => (
              <div key={v.VendorID} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{v.VendorName}</p>
                    <p className="text-xs text-gray-500">{v.VendorCode} · {v.Category}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[v.ApprovalStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {v.ApprovalStatus}
                  </span>
                </div>
                <div className="flex gap-2 pt-1">
                  {canEdit && <button onClick={() => openEdit(v)} className="btn-secondary text-xs">{lang === 'ar' ? 'تعديل' : 'Edit'}</button>}
                  {canDelete && <button onClick={() => handleDelete(v.VendorID!, v.VendorName)} className="text-xs text-red-500 hover:text-red-700 font-medium px-2">{lang === 'ar' ? 'حذف' : 'Delete'}</button>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">{editId ? (lang === 'ar' ? 'تعديل مورد' : 'Edit Vendor') : (lang === 'ar' ? 'مورد جديد' : 'New Vendor')}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Vendor Code *', key: 'VendorCode', type: 'text' },
                { label: 'Vendor Name *', key: 'VendorName', type: 'text' },
                { label: 'Vendor Name (Arabic)', key: 'VendorNameAr', type: 'text' },
                { label: 'Contact Person', key: 'ContactPerson', type: 'text' },
                { label: 'Phone', key: 'Phone', type: 'text' },
                { label: 'Email', key: 'Email', type: 'email' },
                { label: 'VAT Number', key: 'VATNumber', type: 'text' },
                { label: 'IBAN', key: 'IBAN', type: 'text' },
                { label: 'Bank Code', key: 'BankCode', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} className="input-field"
                    value={(form as Record<string, unknown>)[key] as string || ''}
                    onChange={e => f(key as keyof Vendor, e.target.value)} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="input-field" value={form.Category || 'Supply'} onChange={e => f('Category', e.target.value)}>
                  {VENDOR_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <select className="input-field" value={form.PaymentTerms || 'Net30'} onChange={e => f('PaymentTerms', e.target.value)}>
                  {VENDOR_PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
                <select className="input-field" value={form.ApprovalStatus || 'Pending'} onChange={e => f('ApprovalStatus', e.target.value)}>
                  {VENDOR_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1–5)</label>
                <input type="number" min={1} max={5} className="input-field"
                  value={form.Rating || 3}
                  onChange={e => f('Rating', parseInt(e.target.value))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea className="input-field" rows={2}
                  value={form.Address || ''}
                  onChange={e => f('Address', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="input-field" rows={2}
                  value={form.Notes || ''}
                  onChange={e => f('Notes', e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vendorActive" checked={form.IsActive !== false}
                  onChange={e => f('IsActive', e.target.checked)} />
                <label htmlFor="vendorActive" className="text-sm font-medium text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editId ? 'Update Vendor' : 'Create Vendor')}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
