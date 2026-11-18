import { supabase } from './supabase';

/**
 * Convierte un Data URL (base64) a un Blob de JS
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Sube una imagen de board (1920x1080) al bucket 'boards' de Supabase Storage
 * y devuelve la URL pública permanente.
 */
export async function subirBoardStorage(
  dataUrlOrBlob: string | Blob,
  nombreSugerido: string = 'board'
): Promise<string> {
  const blob = typeof dataUrlOrBlob === 'string' ? dataUrlToBlob(dataUrlOrBlob) : dataUrlOrBlob;
  const cleanName = nombreSugerido
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 30);
  const fileName = `${Date.now()}-${cleanName}.jpg`;

  const { data, error } = await supabase.storage
    .from('boards')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error al subir board a Supabase Storage:', error);
    throw error;
  }

  const { data: publicData } = supabase.storage.from('boards').getPublicUrl(data.path);
  return publicData.publicUrl;
}

/**
 * Sube un archivo PDF al bucket 'documentos' de Supabase Storage
 */
export async function subirDocumentoStorage(
  dataUrlOrBlob: string | Blob,
  nombreSugerido: string = 'caso'
): Promise<string> {
  const blob = typeof dataUrlOrBlob === 'string' ? dataUrlToBlob(dataUrlOrBlob) : dataUrlOrBlob;
  const cleanName = nombreSugerido
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 30);
  const fileName = `${Date.now()}-${cleanName}.pdf`;

  const { data, error } = await supabase.storage
    .from('documentos')
    .upload(fileName, blob, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error al subir documento a Supabase Storage:', error);
    throw error;
  }

  const { data: publicData } = supabase.storage.from('documentos').getPublicUrl(data.path);
  return publicData.publicUrl;
}

export interface ProyectoSupabaseData {
  id?: string;
  alumnoId: string;
  titulo: string;
  descripcion: string;
  boardUrl: string;
  pdfUrl?: string;
  videoUrl?: string;
  categorias: string[];
}

/**
 * Guarda o actualiza un proyecto en la base de datos PostgreSQL de Supabase
 */
export async function guardarProyectoSupabase(p: ProyectoSupabaseData) {
  const payload: any = {
    alumno_id: p.alumnoId,
    titulo: p.titulo,
    descripcion: p.descripcion,
    board_url: p.boardUrl,
    pdf_url: p.pdfUrl || null,
    video_url: p.videoUrl || null,
    estado: 'inscripto',
  };

  if (p.id && !p.id.startsWith('proj-')) {
    payload.id = p.id;
  }

  const { data: guardado, error } = await supabase
    .from('proyectos')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error al guardar proyecto en BD:', error);
    throw error;
  }

  return guardado;
}

/**
 * Obtiene proyectos de Supabase con información de sus autores
 */
export async function getProyectosDesdeSupabase() {
  const { data, error } = await supabase
    .from('proyectos')
    .select('*, perfiles:alumno_id(nombre, apellido, email, rol, turno)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al consultar proyectos en BD:', error);
    return [];
  }
  return data || [];
}
