/**
 * Browser service — abstracts window/dialog APIs for future Capacitor compatibility.
 * Browser: delegates to native window APIs.
 * Mobile (Capacitor): swap window.open → Browser.open, confirm → Dialog.confirm, etc.
 */

export const browser = {
  /** Open a URL or blank window. Returns the opened window (web only). */
  open(url: string, target = '_blank'): Window | null {
    return window.open(url, target);
  },

  /** Show a confirmation dialog. Returns true if user confirms. */
  confirm(message: string): boolean {
    return window.confirm(message);
  },

  /** Trigger browser print dialog on a given element's HTML. */
  print(html: string, dir: 'ltr' | 'rtl' = 'ltr', title = 'Print'): void {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title></head><body dir="${dir}">${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  },
};
