/**
 * Resuelve rutas locales dentro de public/ respetando el base de Vite
 * (ej. '/brother-proyectos/') sin alterar dataURLs ni URLs absolutas.
 */
export function resolveAssetUrl(pathOrDataUrl?: string): string {
  if (!pathOrDataUrl) return '';
  if (
    pathOrDataUrl.startsWith('data:') ||
    pathOrDataUrl.startsWith('blob:') ||
    pathOrDataUrl.startsWith('http://') ||
    pathOrDataUrl.startsWith('https://')
  ) {
    return pathOrDataUrl;
  }
  const clean = pathOrDataUrl.replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${clean}`;
}

export function formatFecha(isoOrDate: string): string {
  if (!isoOrDate) return '—';
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoOrDate.trim());
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
  }
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function diasRestantes(deadline: string): number {
  const target = new Date(
    deadline.length === 10 ? `${deadline}T23:59:59` : deadline
  );
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
