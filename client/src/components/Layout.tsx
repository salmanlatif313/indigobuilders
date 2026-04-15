import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { api } from '../api';
import { tr } from '../translations';

interface NavItem {
  key: string;
  ar: string;
  en: string;
  icon: ReactNode;
  roles?: string[];
}

const NAV: NavItem[] = [
  {
    key: 'dashboard', ar: 'لوحة التحكم', en: 'Dashboard',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    key: 'projects', ar: 'المشاريع', en: 'Projects',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    roles: ['Admin', 'PM', 'Finance', 'Engineer'],
  },
  {
    key: 'labor', ar: 'العمالة', en: 'Labor',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    roles: ['Admin', 'Finance', 'PM'],
  },
  {
    key: 'invoices', ar: 'الفواتير', en: 'Invoices',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    roles: ['Admin', 'Finance'],
  },
  {
    key: 'wps', ar: 'رواتب WPS', en: 'WPS Payroll',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    roles: ['Admin', 'Finance'],
  },
  {
    key: 'compliance', ar: 'الامتثال', en: 'Compliance',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    roles: ['Admin', 'Finance', 'PM'],
  },
  {
    key: 'expenses', ar: 'المصروفات', en: 'Expenses',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    roles: ['Admin', 'Finance', 'PM'],
  },
  {
    key: 'reports', ar: 'التقارير', en: 'Reports',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    roles: ['Admin', 'Finance'],
  },
  {
    key: 'users', ar: 'المستخدمون', en: 'Users',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    roles: ['Admin'],
  },
];

interface LayoutProps {
  children: ReactNode;
  page: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, page, onNavigate }: LayoutProps) {
  const { user, logout, can } = useAuth();
  const { lang, toggleLang, dir } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    api.getCompliance().then(d => setAlertCount(d.totalAlerts)).catch(() => {});
  }, []);

  const visibleNav = NAV.filter(n => !n.roles || can(...n.roles));
  const label = (item: NavItem) => lang === 'ar' ? item.ar : item.en;

  const handleLogout = () => {
    if (window.confirm(lang === 'ar' ? 'هل تريد تسجيل الخروج؟' : 'Sign out?')) {
      logout();
    }
  };

  const handleChangePwd = async () => {
    if (pwdForm.next.length < 6) { alert(tr('password', 'minLength', lang)); return; }
    if (pwdForm.next !== pwdForm.confirm) { alert(tr('password', 'mismatch', lang)); return; }
    setPwdSaving(true);
    try {
      await api.changePassword(pwdForm.current, pwdForm.next);
      alert(tr('password', 'success', lang));
      setShowChangePwd(false);
      setPwdForm({ current: '', next: '', confirm: '' });
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setPwdSaving(false); }
  };

  return (
    <div className="min-h-screen flex bg-gray-50" dir={dir}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 end-0 z-30 w-64 flex flex-col transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ backgroundColor: '#0f2040' }}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <img src="/logo.png" alt="Indigo Builders" className="h-11 w-auto object-contain" />
          {/* Lang toggle */}
          <button
            onClick={toggleLang}
            title={lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
            className="text-white/70 hover:text-white text-xs font-medium bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors flex-shrink-0 ms-2"
          >
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map(item => (
            <button
              key={item.key}
              onClick={() => { onNavigate(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-start
                ${page === item.key
                  ? 'bg-gold-500/20 text-gold-400 font-semibold border-s-2 border-gold-500'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              {item.icon}
              <span className="flex-1">{label(item)}</span>
              {item.key === 'compliance' && alertCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-white/50 text-xs">{user?.roleName}</p>
            </div>
          </div>
          <button
            onClick={() => setShowChangePwd(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-red-500/20 rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="/logo.png" alt="Indigo Builders" className="h-8 w-auto object-contain flex-1" />
          <button onClick={toggleLang} className="text-xs font-medium text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors">
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600" title={lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>

      {/* Change password modal */}
      {showChangePwd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-lg">{tr('password', 'changeTitle', lang)}</h2>
              <button onClick={() => setShowChangePwd(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: tr('password', 'current', lang), key: 'current' },
                { label: tr('password', 'newPwd', lang), key: 'next' },
                { label: tr('password', 'confirmPwd', lang), key: 'confirm' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type="password" className="input-field"
                    value={(pwdForm as Record<string, string>)[key]}
                    onChange={e => setPwdForm(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              {pwdForm.next && pwdForm.confirm && pwdForm.next !== pwdForm.confirm && (
                <p className="text-red-600 text-sm">{tr('password', 'mismatch', lang)}</p>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="btn-primary flex-1" onClick={handleChangePwd} disabled={pwdSaving}>
                {pwdSaving ? tr('password', 'saving', lang) : tr('password', 'changePwdBtn', lang)}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setShowChangePwd(false)}>
                {tr('common', 'cancel', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
