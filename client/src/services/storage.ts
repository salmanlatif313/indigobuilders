/**
 * Storage service — abstracts localStorage for future Capacitor Preferences plugin.
 * Browser: delegates to localStorage.
 * Mobile (Capacitor): swap implementation to @capacitor/preferences.
 */

export const storage = {
  get(key: string): string | null {
    return localStorage.getItem(key);
  },

  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    localStorage.clear();
  },
};
