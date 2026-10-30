import { resolveAssetUrl } from './assets';

const MAX_IMAGE_SIDE = 1200;
const JPEG_QUALITY = 0.7;
export const MAX_PDF_BYTES = 1024 * 1024; // 1 MB

/**
 * Redimensiona una imagen en el navegador usando canvas a máx. 1200 px de lado
 * y exporta en formato JPG con calidad 0.7 como dataURL.
 */
export function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen válida (usá JPG, PNG o WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 800;

        if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
          if (width >= height) {
            height = Math.round((height * MAX_IMAGE_SIDE) / width);
            width = MAX_IMAGE_SIDE;
          } else {
            width = Math.round((width * MAX_IMAGE_SIDE) / height);
            height = MAX_IMAGE_SIDE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Tu navegador no soporta redimensionado con canvas.'));
          return;
        }
        // Fondo blanco por si el archivo original es PNG con transparencia
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve(dataUrl);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Valida y convierte un PDF menor a 1 MB a dataURL.
 */
export function readPdfAsDataUrl(
  file: File
): Promise<{ nombre: string; data: string }> {
  return new Promise((resolve, reject) => {
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      reject(new Error('Solo se aceptan archivos en formato PDF.'));
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      reject(
        new Error(
          `El archivo pesa ${sizeMb} MB. En esta demo hay un límite máximo de 1 MB por PDF.`
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF.'));
    reader.onload = () => {
      resolve({
        nombre: file.name,
        data: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Extrae el ID de un link de YouTube y devuelve la URL embebible, o null si no es válido.
 */
export function getYouTubeEmbedUrl(rawUrl?: string): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const trimmed = rawUrl.trim();
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    let videoId: string | null = null;

    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else if (
        url.pathname.startsWith('/embed/') ||
        url.pathname.startsWith('/shorts/') ||
        url.pathname.startsWith('/v/')
      ) {
        videoId = url.pathname.split('/')[2] ?? null;
      }
    }

    if (videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function triggerPdfDownload(pdf: { nombre: string; data: string }): void {
  const link = document.createElement('a');
  link.href = resolveAssetUrl(pdf.data);
  link.download = pdf.nombre || 'proyecto.pdf';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
