/**
 * Files service — abstracts URL.createObjectURL / anchor-click downloads.
 * Browser: uses Blob + createObjectURL.
 * Mobile (Capacitor): swap to @capacitor/filesystem + Share plugin.
 */

export const files = {
  /**
   * Trigger a file download in the browser.
   * @param blob     - The file data
   * @param filename - Suggested download filename
   */
  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Download a CSV string as a file.
   */
  downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.download(blob, filename);
  },

  /**
   * Download a plain text / SIF file.
   */
  downloadText(text: string, filename: string, mimeType = 'text/plain'): void {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8;` });
    this.download(blob, filename);
  },
};
