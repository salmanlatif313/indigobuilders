import { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'ar' | 'en';

interface LangContextType {
  lang: Lang;
  toggleLang: () => void;
  dir: 'rtl' | 'ltr';
}

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('ib_lang') as Lang) || 'ar');

  const toggleLang = () => {
    setLang(l => {
      const next = l === 'ar' ? 'en' : 'ar';
      localStorage.setItem('ib_lang', next);
      document.documentElement.setAttribute('lang', next);
      document.documentElement.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr');
      return next;
    });
  };

  return (
    <LangContext.Provider value={{ lang, toggleLang, dir: lang === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LangProvider');
  return ctx;
}

// Bilingual label helper
export function t(ar: string, en: string, lang: Lang) {
  return lang === 'ar' ? ar : en;
}
