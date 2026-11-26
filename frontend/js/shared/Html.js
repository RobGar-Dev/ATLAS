/** Escapa texto antes de insertarlo con innerHTML. */
export const esc = (text = '') =>
    String(text).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));