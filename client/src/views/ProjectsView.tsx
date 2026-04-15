import { useEffect, useState } from 'react';
import { api, Project, ProjectFinancials, UserRow } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { tr } from '../translations';

const STATUS_OPTIONS = ['Active', 'Completed', 'OnHold', 'Cancelled'];

function statusBadge(s: string) {
  const cls: Record<string, string> = { Active: 'badge-active', Completed: 'badge-inactive', OnHold: 'badge-draft', Cancelled: 'badge-rejected' };
  return <span className={cls[s] || 'badge-inactive'}>{s}</span>;
}

const EMPTY: Partial<Project> = { ProjectCode: '', ProjectName: '', ClientName: '', ContractValue: 0, Status: 'Active', Location: '', Notes: '' };

export default function ProjectsView() {
  const { can } = useAuth();
  const { lang } = useLang();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Project>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [financials, setFinancials] = useState<{ project: Project; data: ProjectFinancials } | null>(null);
  const [loadingFin, setLoadingFin] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);

  const load = () => {
    setLoading(true);
    api.getProjects()
      .then(pr => setProjects(pr.projects))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
    api.getUsers()
      .then(us => setUsers(us.users.filter(u => u.IsActive)))
      .catch(() => {}); // non-Admin roles get 403 — silent fail
  };

  useEffect(() => { load(); }, []);

  const canEdit = can('Admin', 'PM');
  const canDelete = can('Admin');

  const filtered = projects.filter(p =>
    p.ProjectName.toLowerCase().includes(search.toLowerCase()) ||
    p.ProjectCode.toLowerCase().includes(search.toLowerCase()) ||
    (p.ClientName || '').toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm(EMPTY); setEditId(null); setShowForm(true); };
  const openEdit = (p: Project) => { setForm({ ...p }); setEditId(p.ProjectID!); setShowForm(true); };

  const openFinancials = async (p: Project) => {
    setLoadingFin(true);
    setFinancials({ project: p, data: null as unknown as ProjectFinancials });
    try {
      const data = await api.getProjectFinancials(p.ProjectID!);
      setFinancials({ project: p, data });
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); setFinancials(null); }
    finally { setLoadingFin(false); }
  };

  const handleSave = async () => {
    if (!form.ProjectCode || !form.ProjectName) { alert(tr('projects', 'codeRequired', lang)); return; }
    setSaving(true);
    try {
      if (editId) await api.updateProject(editId, form);
      else await api.createProject(form);
      setShowForm(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tr('projects', 'deleteConfirm', lang))) return;
    try { await api.deleteProject(id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = (k: any) => tr('projects', k, lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = (k: any) => tr('common', k, lang);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{T('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} {C('records')}</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={openNew}>{T('newBtn')}</button>}
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
                  {[T('code'), T('name'), T('client'), T('value'), C('status'), T('labor'), T('invoices'), C('actions')].map(h => (
                    <th key={h} className="px-4 py-3 text-start font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.ProjectID} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-600">{p.ProjectCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.ProjectName.slice(0, 50)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.ClientName || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(p.ContractValue).toLocaleString()} {C('sar')}</td>
                    <td className="px-4 py-3">{statusBadge(p.Status)}</td>
                    <td className="px-4 py-3 text-center">{p.ActiveLabor}</td>
                    <td className="px-4 py-3 text-center">{p.InvoiceCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openFinancials(p)} className="text-emerald-600 hover:underline text-xs">{tr('projectFinancials', 'title', lang)}</button>
                        {canEdit && <button onClick={() => openEdit(p)} className="text-brand-600 hover:underline text-xs">{C('edit')}</button>}
                        {canDelete && <button onClick={() => handleDelete(p.ProjectID!)} className="text-red-500 hover:underline text-xs">{C('delete')}</button>}
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
            {filtered.map(p => (
              <div key={p.ProjectID} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{p.ProjectName.slice(0, 50)}</p>
                    <p className="text-xs text-brand-600 font-mono">{p.ProjectCode}</p>
                  </div>
                  {statusBadge(p.Status)}
                </div>
                <p className="text-sm text-gray-500">{p.ClientName || '—'}</p>
                <p className="text-sm font-medium text-gray-800 mt-1">{Number(p.ContractValue).toLocaleString()} {C('sar')}</p>
                {canEdit && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => openEdit(p)} className="btn-secondary text-xs flex-1">{C('edit')}</button>
                    {canDelete && <button onClick={() => handleDelete(p.ProjectID!)} className="btn-danger text-xs flex-1">{C('delete')}</button>}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center py-12 text-gray-400">{C('noData')}</p>}
          </div>
        </>
      )}

      {/* Project Financials modal */}
      {financials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="font-semibold text-lg">{tr('projectFinancials','title',lang)} — {financials.project.ProjectCode}</h2>
                <p className="text-sm text-gray-500">{financials.project.ProjectName.slice(0,60)}</p>
              </div>
              <button onClick={() => setFinancials(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {loadingFin || !financials.data ? (
              <div className="text-center py-16 text-gray-400">{C('loading')}</div>
            ) : (() => {
              const s = financials.data.summary;
              const sar = C('sar');
              const F = (k: string) => tr('projectFinancials', k as Parameters<typeof tr>[1], lang);
              return (
                <div className="p-6 space-y-6">
                  {/* KPI grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: F('contractValue'),  val: s.contractValue,  color: 'bg-brand-50 text-brand-700' },
                      { label: F('totalInvoiced'),  val: s.totalInvoiced,  color: 'bg-blue-50 text-blue-700' },
                      { label: F('totalCollected'), val: s.totalCollected, color: 'bg-emerald-50 text-emerald-700' },
                      { label: F('totalExpenses'),  val: s.totalExpenses,  color: 'bg-orange-50 text-orange-700' },
                      { label: F('grossMargin'),    val: s.grossMargin,    color: s.grossMargin >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700' },
                      { label: F('remaining'),      val: s.remaining,      color: 'bg-gray-50 text-gray-700' },
                    ].map(k => (
                      <div key={k.label} className={`rounded-xl p-3 ${k.color}`}>
                        <p className="text-xs mb-0.5 opacity-70">{k.label}</p>
                        <p className="font-bold">{Number(k.val).toLocaleString()} {sar}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{F('invoiced')} {s.invoicedPct}%</span>
                        <span>{Number(s.totalInvoiced).toLocaleString()} {tr('projectFinancials','of',lang)} {Number(s.contractValue).toLocaleString()} {sar}</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-3">
                        <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${Math.min(s.invoicedPct,100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{F('totalExpenses')} {s.expensePct}%</span>
                        <span>{Number(s.totalExpenses).toLocaleString()} {sar}</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-3">
                        <div className={`h-3 rounded-full ${s.expensePct > 80 ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${Math.min(s.expensePct,100)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Labor + Expense breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">{F('monthlyLabor')}</p>
                      <p className="font-bold text-xl text-gray-900">{Number(s.monthlyLabor).toLocaleString()} {sar}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.headCount} {F('headCount')}</p>
                    </div>
                    {financials.data.expenseBreakdown.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">{F('byCategory')}</p>
                        <div className="space-y-1">
                          {financials.data.expenseBreakdown.map(e => (
                            <div key={e.Category} className="flex justify-between text-xs">
                              <span className="text-gray-600">{e.Category}</span>
                              <span className="font-medium">{Number(e.Total).toLocaleString()} {sar}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recent items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">{F('recentInvoices')}</p>
                      {financials.data.recentInvoices.length === 0
                        ? <p className="text-gray-400 text-sm">{F('noInvoices')}</p>
                        : financials.data.recentInvoices.map(i => (
                          <div key={i.InvoiceNumber} className="flex justify-between py-1.5 border-b border-gray-100 text-sm last:border-0">
                            <span className="font-mono text-xs text-brand-600">{i.InvoiceNumber}</span>
                            <span className="font-medium">{Number(i.TotalAmount).toLocaleString()} {sar}</span>
                          </div>
                        ))
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">{F('recentExpenses')}</p>
                      {financials.data.recentExpenses.length === 0
                        ? <p className="text-gray-400 text-sm">{F('noExpenses')}</p>
                        : financials.data.recentExpenses.map((e, i) => (
                          <div key={i} className="flex justify-between py-1.5 border-b border-gray-100 text-sm last:border-0">
                            <span className="text-gray-600 truncate max-w-[140px]">{e.Description}</span>
                            <span className="font-medium">{Number(e.Amount).toLocaleString()} {sar}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="flex p-6 border-t">
              <button onClick={() => setFinancials(null)} className="btn-secondary ms-auto">{C('close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-lg">{editId ? T('editTitle') : T('formTitle')}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: `${T('code')}*`, key: 'ProjectCode', disabled: !!editId },
                { label: `${T('name')}*`, key: 'ProjectName' },
                { label: T('client'), key: 'ClientName' },
                { label: T('location'), key: 'Location' },
              ].map(({ label, key, disabled }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input className="input-field" disabled={disabled} value={(form as Record<string, unknown>)[key] as string || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('contractValue')}</label>
                <input type="number" className="input-field" value={form.ContractValue || 0}
                  onChange={e => setForm(f => ({ ...f, ContractValue: parseFloat(e.target.value) }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('startDate')}</label>
                  <input type="date" className="input-field" value={form.StartDate || ''}
                    onChange={e => setForm(f => ({ ...f, StartDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('endDate')}</label>
                  <input type="date" className="input-field" value={form.EndDate || ''}
                    onChange={e => setForm(f => ({ ...f, EndDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('manager')}</label>
                <select className="input-field" value={form.ManagerUserID || ''}
                  onChange={e => setForm(f => ({ ...f, ManagerUserID: e.target.value ? parseInt(e.target.value) : undefined }))}>
                  <option value="">{lang === 'ar' ? '— بدون مدير —' : '— No Manager —'}</option>
                  {users.map(u => <option key={u.UserID} value={u.UserID}>{u.FullName} ({u.RoleName})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{C('status')}</label>
                <select className="input-field" value={form.Status || 'Active'}
                  onChange={e => setForm(f => ({ ...f, Status: e.target.value }))}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {users.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{T('manager')}</label>
                  <select className="input-field" value={form.ManagerUserID || ''}
                    onChange={e => setForm(f => ({ ...f, ManagerUserID: e.target.value ? Number(e.target.value) : undefined }))}>
                    <option value="">{lang === 'ar' ? '— اختر —' : '— Select —'}</option>
                    {users.map(u => <option key={u.UserID} value={u.UserID}>{u.FullName}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{C('notes')}</label>
                <textarea className="input-field" rows={3} value={form.Notes || ''}
                  onChange={e => setForm(f => ({ ...f, Notes: e.target.value }))} />
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
