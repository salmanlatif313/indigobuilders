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
  },
  en: {
    tagline: 'WE BUILD TOMORROW TODAY',
    slogan: 'CONSTRUCTION | REAL ESTATE DEVELOPMENT | CREATING VALUE',
    username: 'Username',
    password: 'Password',
    submit: 'Sign In',
    submitting: 'Signing in...',
    langBtn: 'عربي',
    error: 'Login failed',
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
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ backgroundColor: '#0f2040' }}
      >
        <img src="/logo.png" alt="Indigo Builders" className="h-14 w-auto object-contain self-start" />

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-3">{t.tagline}</h1>
          <p className="text-sm tracking-widest" style={{ color: '#c9a028' }}>{t.slogan}</p>
        </div>

        <p className="text-white/30 text-xs">© {new Date().getFullYear()} Indigo Builders Company. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <img src="/logo.png" alt="Indigo Builders" className="h-12 w-auto object-contain" />
        </div>

        {/* Lang toggle */}
        <div className={`w-full max-w-sm flex mb-4 ${lang === 'ar' ? 'justify-start' : 'justify-end'}`}>
          <button
            onClick={toggleLang}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            {t.langBtn}
          </button>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900">
              {lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {lang === 'ar' ? 'نظام إدارة الموارد المؤسسية' : 'Enterprise Resource Planning'}
            </p>
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
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
                {loading ? t.submitting : t.submit}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
