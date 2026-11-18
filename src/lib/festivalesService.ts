import { supabase } from './supabase';
import type { Festival, FestivalCategoria, Inscripcion } from '../types/models';
import {
  getFestivales,
  getInscripciones,
  saveFestival,
  inscribirProyectoEnFestival,
  deleteInscripcion,
} from './store';

/**
 * Sincroniza los festivales y sus categorías desde Supabase en el store local
 */
export async function sincronizarFestivalesDesdeSupabase(): Promise<Festival[]> {
  try {
    const { data: fests, error: fError } = await supabase
      .from('festivales')
      .select('*')
      .order('fecha_limite', { ascending: true });

    if (fError || !fests || fests.length === 0) {
      return getFestivales();
    }

    const { data: cats } = await supabase.from('categorias').select('*');

    for (const f of fests) {
      const categoriasFestival: FestivalCategoria[] = (cats || [])
        .filter((c: any) => c.festival_id === f.id)
        .map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          descripcion: c.descripcion || '',
        }));

      saveFestival({
        id: f.id,
        nombre: f.nombre,
        web: f.web || 'https://brotherad.com',
        deadline: f.fecha_limite?.slice(0, 10) || '',
        logo: f.logo || undefined,
        estado: (f.estado as any) || 'abierto',
        bajada: f.bajada || f.descripcion || '',
        brief: f.brief || f.descripcion || '',
        reglas: f.reglas || '',
        categorias: categoriasFestival,
        criterios: f.criterios || [],
        faq: f.faq || [],
      });
    }

    return getFestivales();
  } catch (err) {
    console.error('Error al sincronizar festivales desde Supabase:', err);
    return getFestivales();
  }
}

/**
 * Guarda una inscripción en Supabase
 */
export async function inscribirProyectoSupabase(params: {
  proyectoId: string;
  festivalId: string;
  categoriaIds: string[];
}): Promise<Inscripcion | null> {
  const { proyectoId, festivalId, categoriaIds } = params;

  // Registrar localmente siempre
  const inscripcionLocal = inscribirProyectoEnFestival({
    proyectoId,
    festivalId,
    categoriaIds,
  });

  const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(proyectoId);
  if (!esUuid) {
    return inscripcionLocal;
  }

  try {
    const { error } = await supabase
      .from('inscripciones')
      .upsert({
        proyecto_id: proyectoId,
        festival_id: festivalId,
        categoria_ids: categoriaIds,
      });

    if (error) {
      console.warn('Inscripción guardada localmente (tabla inscripciones pendiente en Supabase):', error.message);
    }
    return inscripcionLocal;
  } catch (err) {
    console.warn('Error al guardar inscripción en Supabase:', err);
    return inscripcionLocal;
  }
}

/**
 * Consulta las inscripciones desde Supabase
 */
export async function sincronizarInscripcionesSupabase(alumnoId: string): Promise<Inscripcion[]> {
  try {
    const { data, error } = await supabase
      .from('inscripciones')
      .select('*, proyectos!inner(alumno_id)');

    if (error || !data) {
      return getInscripciones({ alumnoId });
    }

    for (const row of data) {
      inscribirProyectoEnFestival({
        proyectoId: row.proyecto_id,
        festivalId: row.festival_id,
        categoriaIds: row.categoria_ids || [],
      });
    }

    return getInscripciones({ alumnoId });
  } catch (err) {
    return getInscripciones({ alumnoId });
  }
}

/**
 * Elimina una inscripción en Supabase y localmente
 */
export async function eliminarInscripcionSupabase(id: string): Promise<boolean> {
  deleteInscripcion(id);
  const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!esUuid) return true;

  try {
    const { error } = await supabase.from('inscripciones').delete().eq('id', id);
    if (error) console.error('Error al eliminar inscripción en Supabase:', error);
    return !error;
  } catch {
    return true;
  }
}
