import { useEffect, useState } from 'react';
import { api, Expense, ExpenseInput, Project, EXPENSE_CATEGORIES } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { tr } from '../translations';
import ChipFilter from '../components/ChipFilter';
import { files } from '../services/files';

const EMPTY: Partial<Expense> = {
  ProjectID: undefined, ExpenseDate: new Date().toISOString().slice(0, 10),
  Category: 'Materials', Description: '', Amount: 0, VATAmount: 0,
  Vendor: '', ReferenceNo: '', Notes: '',
};

const CATEGORY_COLOR: Record<string, string> = {
  Materials:     'bg-blue-100 text-blue-700',
  Equipment:     'bg-purple-100 text-purple-700',
  Subcontractor: 'bg-orange-100 text-orange-700',
  Labor:         'bg-green-100 text-green-700',
  Transport:     'bg-cyan-100 text-cyan-700',
  Other:         'bg-gray-100 text-gray-600',
};

function downloadCSV(expenses: Expense[], sar: string) {
  const headers = ['Date', 'Project', 'Category', 'Description', 'Vendor', 'Ref', `Amount (${sar})`, `VAT (${sar})`, `Total (${sar})`];
  const rows = expenses.map(e => [
    e.ExpenseDate, e.ProjectCode || '', e.Category, `"${e.Description}"`,
    e.Vendor || '', e.ReferenceNo || '',
    Number(e.Amount).toFixed(2), Number(e.VATAmount).toFixed(2),
    (Number(e.Amount) + Number(e.VATAmount)).toFixed(2),
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  files.downloadCSV(csv, `Expenses_${new Date().toISOString().slice(0, 10)}.csv`);
}

export default function ExpensesView() {
  const { can } = useAuth();
  const { lang } = useLang();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = (k: any) => tr('expenses', k, lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = (k: any) => tr('common', k, lang);
  const sar = C('sar');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Expense>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Server-side filters (trigger reload)
  const [filterProject, setFilterProject] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  // Client-side chip filter
  const [filterCategory, setFilterCategory] = useState('');

  const canEdit   = can('Admin', 'Finance', 'PM');
  const canDelete = can('Admin', 'Finance');

  const load = () => {
    setLoading(true);
    const params = {
      projectId: filterProject ? parseInt(filterProject) : undefined,
      from:      filterFrom || undefined,
      to:        filterTo   || undefined,
    };
    Promise.all([api.getExpenses(params), api.getProjects()])
      .then(([er, pr]) => { setExpenses(er.expenses); setProjects(pr.projects); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew  = () => { setForm(EMPTY); setEditId(null); setShowForm(true); };
  const openEdit = (e: Expense) => { setForm({ ...e }); setEditId(e.ExpenseID!); setShowForm(true); };

  const handleSave = async () => {
    if (!form.ExpenseDate || !form.Category || !form.Description || !form.Amount) {
      alert(T('required')); return;
    }
    setSaving(true);
    try {
      const payload: ExpenseInput = {
        projectID:   form.ProjectID || undefined,
        expenseDate: form.ExpenseDate!,
        category:    form.Category!,
        description: form.Description!,
        amount:      Number(form.Amount),
        vatAmount:   Number(form.VATAmount || 0),
        vendor:      form.Vendor || '',
        referenceNo: form.ReferenceNo || '',
        notes:       form.Notes || '',
      };
      if (editId) await api.updateExpense(editId, payload);
      else await api.createExpense(payload);
      setShowForm(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(T('deleteConfirm'))) return;
    try { await api.deleteExpense(id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const filteredExpenses = filterCategory
    ? expenses.filter(e => e.Category === filterCategory)
    : expenses;

  const categoryChips = EXPENSE_CATEGORIES.map(cat => ({
    value: cat, label: cat,
    count: expenses.filter(e => e.Category === cat).length,
  })).filter(c => c.count > 0);

  const grandTotal = filteredExpenses.reduce((s, e) => s + Number(e.Amount) + Number(e.VATAmount), 0);
  const sf = (k: keyof Expense) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: ev.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{T('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredExpenses.length}{filterCategory ? `/${expenses.length}` : ''} {C('records')} —&nbsp;
            <span className="font-medium text-gray-800">{T('grandTotal')}: {Number(grandTotal).toLocaleString()} {sar}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => downloadCSV(expenses, sar)}>⬇ CSV</button>
          {canEdit && <button className="btn-primary" onClick={openNew}>{T('newBtn')}</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <select className="input-field max-w-[180px]" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">{T('filterProject')}</option>
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
        <ChipFilter chips={categoryChips} active={filterCategory} onChange={setFilterCategory} />
      </div>

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
                  {[T('date'), T('project'), T('category'), T('description'), T('vendor'), T('ref'), T('amount'), T('vat'), T('total'), C('actions')].map(h => (
                    <th key={h} className="px-3 py-3 text-start font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredExpenses.map(e => (
                  <tr key={e.ExpenseID} className="hover:bg-gray-50/50">
                    <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{e.ExpenseDate}</td>
                    <td className="px-3 py-3 text-xs text-brand-600 font-mono">{e.ProjectCode || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLOR[e.Category] || 'bg-gray-100 text-gray-600'}`}>
                        {e.Category}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-800 max-w-[200px] truncate" title={e.Description}>{e.Description}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{e.Vendor || '—'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs font-mono">{e.ReferenceNo || '—'}</td>
                    <td className="px-3 py-3 font-medium">{Number(e.Amount).toLocaleString()}</td>
                    <td className="px-3 py-3 text-gray-500">{Number(e.VATAmount).toLocaleString()}</td>
                    <td className="px-3 py-3 font-bold text-emerald-700">{(Number(e.Amount) + Number(e.VATAmount)).toLocaleString()} {sar}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {canEdit   && <button onClick={() => openEdit(e)} className="text-brand-600 hover:underline text-xs">{C('edit')}</button>}
                        {canDelete && <button onClick={() => handleDelete(e.ExpenseID!)} className="text-red-500 hover:underline text-xs">{C('delete')}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-400">{T('noData')}</td></tr>
                )}
              </tbody>
              {filteredExpenses.length > 0 && (
                <tfoot className="bg-gray-50 border-t font-semibold">
                  <tr>
                    <td colSpan={6} className="px-3 py-3 text-gray-700">{T('grandTotal')}</td>
                    <td className="px-3 py-3">{filteredExpenses.reduce((s,e) => s+Number(e.Amount),0).toLocaleString()}</td>
                    <td className="px-3 py-3">{filteredExpenses.reduce((s,e) => s+Number(e.VATAmount),0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-emerald-700">{grandTotal.toLocaleString()} {sar}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filteredExpenses.map(e => (
              <div key={e.ExpenseID} className="card">
                <div className="flex justify-between mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLOR[e.Category] || ''}`}>{e.Category}</span>
                  <p className="text-xs text-gray-500">{e.ExpenseDate}</p>
                </div>
                <p className="font-medium text-gray-900 truncate">{e.Description}</p>
                <p className="text-xs text-brand-600 font-mono mt-0.5">{e.ProjectCode || '—'} {e.Vendor ? `· ${e.Vendor}` : ''}</p>
                <p className="font-bold text-emerald-700 mt-1">{(Number(e.Amount) + Number(e.VATAmount)).toLocaleString()} {sar}</p>
                {canEdit && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => openEdit(e)} className="btn-secondary text-xs flex-1">{C('edit')}</button>
                    {canDelete && <button onClick={() => handleDelete(e.ExpenseID!)} className="btn-danger text-xs flex-1">{C('delete')}</button>}
                  </div>
                )}
              </div>
            ))}
            {expenses.length === 0 && <p className="text-center py-12 text-gray-400">{T('noData')}</p>}
          </div>
        </>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-lg">{editId ? T('editTitle') : T('formTitle')}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('date')}*</label>
                <input type="date" className="input-field" value={form.ExpenseDate || ''} onChange={sf('ExpenseDate')} />
              </div>
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('category')}*</label>
                <select className="input-field" value={form.Category || 'Materials'} onChange={sf('Category')}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* Project */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('project')}</label>
                <select className="input-field" value={form.ProjectID || ''} onChange={e => setForm(p => ({ ...p, ProjectID: e.target.value ? parseInt(e.target.value) : undefined }))}>
                  <option value="">{lang === 'ar' ? '— بدون مشروع —' : '— No Project —'}</option>
                  {projects.map(p => <option key={p.ProjectID} value={p.ProjectID}>{p.ProjectCode} — {p.ProjectName.slice(0, 40)}</option>)}
                </select>
              </div>
              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('description')}*</label>
                <input type="text" className="input-field" value={form.Description || ''} onChange={sf('Description')} />
              </div>
              {/* Amount + VAT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('amount')}* ({sar})</label>
                <input type="number" step="0.01" className="input-field" value={form.Amount || 0}
                  onChange={e => setForm(p => ({ ...p, Amount: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('vat')} ({sar})</label>
                <input type="number" step="0.01" className="input-field" value={form.VATAmount || 0}
                  onChange={e => setForm(p => ({ ...p, VATAmount: parseFloat(e.target.value) || 0 }))} />
              </div>
              {/* Vendor + Ref */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('vendor')}</label>
                <input type="text" className="input-field" value={form.Vendor || ''} onChange={sf('Vendor')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('ref')}</label>
                <input type="text" className="input-field" value={form.ReferenceNo || ''} onChange={sf('ReferenceNo')} />
              </div>
              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{C('notes')}</label>
                <textarea className="input-field" rows={2} value={form.Notes || ''} onChange={sf('Notes')} />
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
    </div>
  );
}
