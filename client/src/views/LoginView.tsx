import { useState, FormEvent } from 'react';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';

const T = {
  ar: {
    tagline: 'نبني غد أفضل اليوم',
    slogan: 'إنشاء | تطوير عقاري | ابتكار القيم',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    submit: 'تسجيل الدخول',
    submitting: 'جاري تسجيل الدخول...',
    langBtn: 'English',
    error: 'فشل تسجيل الدخول',
    erp: 'نظام إدارة الموارد المؤسسية',
    signIn: 'تسجيل الدخول',
  },
  en: {
    tagline: 'WE BUILD\nTOMORROW\nTODAY',
    slogan: 'CONSTRUCTION  ·  REAL ESTATE DEVELOPMENT  ·  CREATING VALUE',
    username: 'Username',
    password: 'Password',
    submit: 'Sign In',
    submitting: 'Signing in...',
    langBtn: 'عربي',
    error: 'Login failed',
    erp: 'Enterprise Resource Planning',
    signIn: 'Sign in',
  },
};

export default function LoginView() {
  const { login } = useAuth();
  const { lang, toggleLang, dir } = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const t = T[lang];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" dir={dir}>

      {/* ── Left panel ─ brand + imagery ── */}
      <div
        className="hidden lg:flex flex-col w-1/2 relative overflow-hidden"
        style={{ backgroundColor: '#0c2f5c' }}
      >
        {/* Branding imagery — construction site overlay at low opacity for texture */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/branding.png)',
            backgroundSize: '200%',
            backgroundPosition: '5% 82%',   /* positions over the construction-site banner */
            opacity: 0.35,
          }}
        />

        {/* Dark gradient overlay — keeps text legible */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(160deg, rgba(12,47,92,0.3) 0%, rgba(12,47,92,0.65) 60%, rgba(12,47,92,0.85) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">

          {/* Logo — full panel width, no padding */}
          <div className="w-full">
            <img
              src="/logo.png"
              alt="Indigo Builders"
              className="w-full object-contain block"
              style={{ maxHeight: '220px' }}
            />
          </div>

          {/* Hero text — pushed to bottom */}
          <div className="flex-1 flex flex-col justify-end px-12 pb-14">
            {/* Gold accent bar */}
            <div className="w-14 h-1 mb-8 rounded-full" style={{ backgroundColor: '#c19f3c' }} />

            <h1
              className="font-bold text-white leading-none mb-6 whitespace-pre-line"
              style={{ fontSize: '3.5rem', letterSpacing: '-0.02em' }}
            >
              {t.tagline}
            </h1>

            <p
              className="text-xs tracking-widest font-semibold mb-12"
              style={{ color: '#c19f3c' }}
            >
              {t.slogan}
            </p>

            <p className="text-white/30 text-xs">
              © {new Date().getFullYear()} Indigo Builders Company. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel ─ login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <img src="/logo.png" alt="Indigo Builders" className="h-20 w-auto object-contain" />
        </div>

        {/* Lang toggle */}
        <div className={`w-full max-w-sm flex mb-6 ${lang === 'ar' ? 'justify-start' : 'justify-end'}`}>
          <button
            onClick={toggleLang}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t.langBtn}
          </button>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900">{t.signIn}</h2>
            <p className="text-sm text-gray-500 mt-1">{t.erp}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.username}</label>
                <input
                  type="text"
                  className="input-field"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.password}</label>
                <input
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
              <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
                {loading ? t.submitting : t.submit}
              </button>
            </form>
          </div>

          {/* Brand badge below form */}
          <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-xs">
            <span
              className="inline-block w-5 h-0.5 rounded"
              style={{ backgroundColor: '#c19f3c' }}
            />
            Powered by Indigo Builders ERP
            <span
              className="inline-block w-5 h-0.5 rounded"
              style={{ backgroundColor: '#c19f3c' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
