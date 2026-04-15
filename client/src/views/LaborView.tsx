import { useEffect, useState } from 'react';
import { api, Labor, Project } from '../api';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { tr } from '../translations';

const EMPTY: Partial<Labor> = {
  IqamaNumber: '', FullName: '', FullNameAr: '', NationalityCode: 'OTH',
  IBAN: '', BankCode: '', BasicSalary: 0, HousingAllowance: 0,
  TransportAllowance: 0, OtherAllowances: 0, GOSINumber: '', JobTitle: '', IsActive: true,
};

export default function LaborView() {
  const { can } = useAuth();
  const { lang } = useLang();
  const [labor, setLabor] = useState<Labor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showWPS, setShowWPS] = useState(false);
  const [wpsMonth, setWpsMonth] = useState('');
  const [form, setForm] = useState<Partial<Labor>>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = (k: any) => tr('labor', k, lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = (k: any) => tr('common', k, lang);

  const load = () => {
    setLoading(true);
    Promise.all([api.getLabor(), api.getProjects()])
      .then(([lr, pr]) => { setLabor(lr.labor); setProjects(pr.projects); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = labor.filter(l =>
    l.FullName.toLowerCase().includes(search.toLowerCase()) ||
    l.IqamaNumber.includes(search) ||
    (l.JobTitle || '').toLowerCase().includes(search.toLowerCase())
  );

  const canEdit = can('Admin', 'Finance', 'PM');
  const canDelete = can('Admin');

  const openNew = () => { setForm(EMPTY); setEditId(null); setShowForm(true); };
  const openEdit = (l: Labor) => { setForm({ ...l }); setEditId(l.LaborID!); setShowForm(true); };

  const handleSave = async () => {
    if (!form.IqamaNumber || !form.FullName || !form.NationalityCode || !form.IBAN || !form.BasicSalary) {
      alert(T('required')); return;
    }
    setSaving(true);
    try {
      if (editId) await api.updateLabor(editId, form);
      else await api.createLabor(form);
      setShowForm(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(T('deleteConfirm'))) return;
    try { await api.deleteLabor(id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const fv = (key: keyof Labor) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{T('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} / {labor.length} {C('records')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {can('Admin', 'Finance') && (
            <button className="btn-secondary" onClick={() => setShowWPS(true)}>{T('wpsBtn')}</button>
          )}
          {canEdit && <button className="btn-primary" onClick={openNew}>{T('newBtn')}</button>}
        </div>
      </div>

      <input className="input-field max-w-sm" placeholder={T('searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />

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
                  {[T('iqama'), T('fullName'), T('jobTitle'), T('nationality'), T('project'), T('grossSalary'), T('iqamaExpiry'), C('status'), C('actions')].map(h => (
                    <th key={h} className="px-4 py-3 text-start font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(l => (
                  <tr key={l.LaborID} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-brand-600">{l.IqamaNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{l.FullName.slice(0, 50)}</td>
                    <td className="px-4 py-3 text-gray-600">{l.JobTitle || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${l.NationalityCode === 'SAU' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {l.NationalityCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{l.ProjectName || '—'}</td>
                    <td className="px-4 py-3 font-medium">{Number(l.GrossSalary).toLocaleString()} {C('sar')}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {l.IqamaExpiry ? new Date(l.IqamaExpiry).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={l.IsActive ? 'badge-active' : 'badge-inactive'}>
                        {l.IsActive ? C('active') : C('inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {canEdit && <button onClick={() => openEdit(l)} className="text-brand-600 hover:underline text-xs">{C('edit')}</button>}
                        {canDelete && <button onClick={() => handleDelete(l.LaborID!)} className="text-red-500 hover:underline text-xs">{C('delete')}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-gray-400">{C('noData')}</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map(l => (
              <div key={l.LaborID} className="card">
                <div className="flex justify-between mb-1">
                  <p className="font-semibold text-gray-900">{l.FullName.slice(0, 45)}</p>
                  <span className={l.IsActive ? 'badge-active' : 'badge-inactive'}>{l.IsActive ? C('active') : C('inactive')}</span>
                </div>
                <p className="text-xs font-mono text-brand-600">{l.IqamaNumber} · {l.NationalityCode}</p>
                <p className="text-sm text-gray-600 mt-1">{l.JobTitle || '—'}</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{Number(l.GrossSalary).toLocaleString()} {C('sar')}</p>
                {canEdit && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => openEdit(l)} className="btn-secondary text-xs flex-1">{C('edit')}</button>
                    {canDelete && <button onClick={() => handleDelete(l.LaborID!)} className="btn-danger text-xs flex-1">{C('delete')}</button>}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center py-12 text-gray-400">{C('noData')}</p>}
          </div>
        </>
      )}

      {/* Quick WPS download modal */}
      {showWPS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="font-semibold text-lg mb-4">{T('wpsTitle')}</h2>
            <label className="block text-sm font-medium text-gray-700 mb-1">{T('wpsMonth')}</label>
            <input type="month" className="input-field mb-4" value={wpsMonth} onChange={e => setWpsMonth(e.target.value)} />
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={() => {
                if (wpsMonth) { api.downloadWPS(wpsMonth); setShowWPS(false); }
              }}>{C('download')}</button>
              <button className="btn-secondary flex-1" onClick={() => setShowWPS(false)}>{C('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Labor form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-lg">{editId ? T('editTitle') : T('formTitle')}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={`${T('iqama')}*`} value={form.IqamaNumber || ''} onChange={fv('IqamaNumber')} disabled={!!editId} />
              <Field label={`${T('fullName')}*`} value={form.FullName || ''} onChange={fv('FullName')} />
              <Field label={T('fullNameAr')} value={form.FullNameAr || ''} onChange={fv('FullNameAr')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('nationality')}*</label>
                <select className="input-field" value={form.NationalityCode || 'OTH'} onChange={fv('NationalityCode')}>
                  <option value="SAU">{T('saudi')}</option>
                  <option value="OTH">{T('nonSaudi')}</option>
                </select>
              </div>
              <Field label={`${T('iban')}*`} value={form.IBAN || ''} onChange={fv('IBAN')} />
              <Field label={T('bankCode')} value={form.BankCode || ''} onChange={fv('BankCode')} />
              <Field label={`${T('basicSalary')}*`} value={String(form.BasicSalary || 0)} type="number" onChange={fv('BasicSalary')} />
              <Field label={T('housing')} value={String(form.HousingAllowance || 0)} type="number" onChange={fv('HousingAllowance')} />
              <Field label={T('transport')} value={String(form.TransportAllowance || 0)} type="number" onChange={fv('TransportAllowance')} />
              <Field label={T('other')} value={String(form.OtherAllowances || 0)} type="number" onChange={fv('OtherAllowances')} />
              <Field label={T('gosi')} value={form.GOSINumber || ''} onChange={fv('GOSINumber')} />
              <Field label={T('jobTitle')} value={form.JobTitle || ''} onChange={fv('JobTitle')} />
              <Field label={T('iqamaExpiry')} value={form.IqamaExpiry ? String(form.IqamaExpiry).slice(0, 10) : ''} type="date" onChange={fv('IqamaExpiry')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('project')}</label>
                <select className="input-field" value={form.ProjectID || ''}
                  onChange={e => setForm(p => ({ ...p, ProjectID: e.target.value ? parseInt(e.target.value) : undefined }))}>
                  <option value="">{lang === 'ar' ? '— بدون مشروع —' : '— No Project —'}</option>
                  {projects.map(pr => <option key={pr.ProjectID} value={pr.ProjectID}>{pr.ProjectCode} — {pr.ProjectName.slice(0, 40)}</option>)}
                </select>
              </div>
              {editId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{C('status')}</label>
                  <select className="input-field" value={form.IsActive ? '1' : '0'}
                    onChange={e => setForm(p => ({ ...p, IsActive: e.target.value === '1' }))}>
                    <option value="1">{C('active')}</option>
                    <option value="0">{C('inactive')}</option>
                  </select>
                </div>
              )}
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

function Field({ label, value, onChange, type = 'text', disabled }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} className="input-field" value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}
