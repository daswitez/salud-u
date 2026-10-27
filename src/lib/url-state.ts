// Las pantallas con filtros guardan su estado en la URL cuando termina una carga. Si en ese
// intervalo el usuario ya pulsó un enlace interno, un replaceState tardío anula la navegación
// pendiente del router de Next; se registra esa intención y se omite la escritura.
let pending: { path: string; at: number } | null = null;

if (typeof document !== "undefined") {
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin === window.location.origin && url.pathname !== window.location.pathname) pending = { path: url.pathname, at: Date.now() };
  }, true);
}

/** Reemplaza la URL actual salvo que haya una navegación iniciada por el usuario hacia otra ruta. */
export function replaceUrl(url: string | URL) {
  if (pending && (pending.path === window.location.pathname || Date.now() - pending.at > 15_000)) pending = null;
  if (pending) return false;
  window.history.replaceState(null, "", url);
  return true;
}
