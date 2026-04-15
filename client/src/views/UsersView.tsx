import { useEffect, useState } from 'react';
import { api, UserRow, Role, CreateUserInput } from '../api';
import { useLang } from '../LangContext';
import { tr } from '../translations';

const EMPTY: CreateUserInput = { username: '', password: '', fullName: '', email: '', roleId: 1 };

export default function UsersView() {
  const { lang } = useLang();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateUserInput>({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  // Edit user
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState<{ fullName: string; email: string; roleId: number }>({ fullName: '', email: '', roleId: 1 });

  // Reset password
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = (k: any) => tr('users', k, lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = (k: any) => tr('common', k, lang);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const P = (k: any) => tr('password', k, lang);

  const load = () => {
    setLoading(true);
    Promise.all([api.getUsers(), api.getRoles()])
      .then(([u, r]) => { setUsers(u.users); setRoles(r.roles); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.username || !form.password || !form.roleId) { alert(T('required')); return; }
    setSaving(true);
    try {
      await api.createUser(form);
      setShowForm(false);
      setForm({ ...EMPTY });
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u: UserRow) => {
    try {
      await api.updateUser(u.UserID, { ...u, IsActive: !u.IsActive });
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditForm({ fullName: u.FullName || '', email: u.Email || '', roleId: roles.find(r => r.RoleName === u.RoleName)?.RoleID || 1 });
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await api.updateUser(editUser.UserID, { ...editUser, FullName: editForm.fullName, Email: editForm.email, IsActive: editUser.IsActive });
      setEditUser(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!resetUser) return;
    if (newPassword.length < 6) { alert(P('minLength')); return; }
    if (newPassword !== confirmPassword) { alert(P('mismatch')); return; }
    setResetSaving(true);
    try {
      await api.resetUserPassword(resetUser.UserID, newPassword);
      setResetUser(null);
      setNewPassword(''); setConfirmPassword('');
      alert(P('success'));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setResetSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{T('title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} {C('records')}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>{T('newBtn')}</button>
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
                  {[T('username'), T('fullName'), T('email'), T('role'), C('status'), C('actions')].map(h => (
                    <th key={h} className="px-4 py-3 text-start font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.UserID} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-sm text-brand-600">{u.Username}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.FullName || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.Email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">{u.RoleName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.IsActive ? 'badge-active' : 'badge-inactive'}>
                        {u.IsActive ? T('enabled') : T('disabled')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(u)} className="text-xs text-brand-600 hover:underline">{C('edit')}</button>
                        <button onClick={() => { setResetUser(u); setNewPassword(''); setConfirmPassword(''); }} className="text-xs text-orange-600 hover:underline">
                          {lang === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Pwd'}
                        </button>
                        <button onClick={() => toggleActive(u)} className="text-xs text-gray-500 hover:text-brand-700 hover:underline">
                          {u.IsActive ? T('disable') : T('enable')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">{C('noData')}</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {users.map(u => (
              <div key={u.UserID} className="card">
                <div className="flex justify-between mb-1">
                  <p className="font-mono text-sm text-brand-600">{u.Username}</p>
                  <span className={u.IsActive ? 'badge-active' : 'badge-inactive'}>{u.IsActive ? T('enabled') : T('disabled')}</span>
                </div>
                <p className="font-medium text-gray-900">{u.FullName || '—'}</p>
                <p className="text-xs text-gray-500">{u.Email || '—'}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">{u.RoleName}</span>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-xs text-brand-600 hover:underline">{C('edit')}</button>
                    <button onClick={() => toggleActive(u)} className="text-xs text-gray-500 hover:underline">
                      {u.IsActive ? T('disable') : T('enable')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create user modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">{T('formTitle')}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: `${T('username')}*`, key: 'username', type: 'text' },
                { label: `${T('password')}*`, key: 'password', type: 'password' },
                { label: T('fullName'), key: 'fullName', type: 'text' },
                { label: T('email'), key: 'email', type: 'email' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} className="input-field"
                    value={(form as unknown as Record<string, string>)[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('role')}*</label>
                <select className="input-field" value={form.roleId}
                  onChange={e => setForm(p => ({ ...p, roleId: parseInt(e.target.value) }))}>
                  {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
                </select>
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

      {/* Edit user modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">{lang === 'ar' ? `تعديل: ${editUser.Username}` : `Edit: ${editUser.Username}`}</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('fullName')}</label>
                <input type="text" className="input-field" value={editForm.fullName}
                  onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('email')}</label>
                <input type="email" className="input-field" value={editForm.email}
                  onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{T('role')}</label>
                <select className="input-field" value={editForm.roleId}
                  onChange={e => setEditForm(p => ({ ...p, roleId: parseInt(e.target.value) }))}>
                  {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleEditSave} disabled={saving}>
                {saving ? C('saving') : C('save')}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setEditUser(null)}>{C('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">{P('resetTitle')} — {resetUser.Username}</h2>
              <button onClick={() => setResetUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{P('newPwd')}*</label>
                <input type="password" className="input-field" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{P('confirmPwd')}*</label>
                <input type="password" className="input-field" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-600 text-sm">{P('mismatch')}</p>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleReset} disabled={resetSaving}>
                {resetSaving ? P('saving') : P('resetPwdBtn')}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setResetUser(null)}>{C('cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
