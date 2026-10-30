import {
  calcularPromedioEvaluacion,
  calcularResumenProyecto,
  getCriterios,
  getCursoById,
  getEvaluacionProfesor,
  getInscripciones,
  getProyectos,
  getUsuarioById,
} from './store';
import type { Categoria, Proyecto } from '../types/models';

export type OrdenProyectos =
  | 'promedio'
  | 'fecha'
  | 'nombre'
  | 'evaluaciones';

export interface RankingFilters {
  categoria: Categoria | 'Todas';
  cursoId: string;
  festivalId: string;
  busqueda: string;
  soloNoEvaluados: boolean;
  orden: OrdenProyectos;
}

export interface ProyectoEnriquecido {
  proyecto: Proyecto;
  cursoNombre: string;
  integrantesNombres: string;
  promedioGeneral: number | null;
  cantidadEvaluaciones: number;
  miPromedio: number | null;
}

export function parseRankingFilters(params: URLSearchParams): RankingFilters {
  const cat = params.get('cat');
  const validCat =
    cat === 'Film' ||
    cat === 'Activación' ||
    cat === 'Gráfica' ||
    cat === 'Digital'
      ? cat
      : 'Todas';

  const ordenParam = params.get('orden');
  const orden: OrdenProyectos =
    ordenParam === 'fecha' ||
    ordenParam === 'nombre' ||
    ordenParam === 'evaluaciones'
      ? ordenParam
      : 'promedio';

  return {
    categoria: validCat,
    cursoId: params.get('curso') ?? '',
    festivalId: params.get('fest') ?? '',
    busqueda: params.get('q') ?? '',
    soloNoEvaluados: params.get('pendientes') === '1',
    orden,
  };
}

export function buildRankingSearchParams(filters: RankingFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.categoria !== 'Todas') sp.set('cat', filters.categoria);
  if (filters.cursoId) sp.set('curso', filters.cursoId);
  if (filters.festivalId) sp.set('fest', filters.festivalId);
  if (filters.busqueda.trim()) sp.set('q', filters.busqueda.trim());
  if (filters.soloNoEvaluados) sp.set('pendientes', '1');
  if (filters.orden !== 'promedio') sp.set('orden', filters.orden);
  return sp;
}

export function getProyectosFiltradosYOrdenados(
  filters: RankingFilters,
  profesorId?: string,
  alwaysIncludeProjectId?: string
): ProyectoEnriquecido[] {
  const criterios = getCriterios();
  const inscriptosFestivalIds = filters.festivalId
    ? new Set(
        getInscripciones({ festivalId: filters.festivalId }).map(
          (i) => i.proyectoId
        )
      )
    : null;

  const query = filters.busqueda.trim().toLowerCase();

  const items: ProyectoEnriquecido[] = [];

  for (const p of getProyectos()) {
    const curso = getCursoById(p.cursoId);
    const integrantesNombres = p.integrantes
      .map((uid) => {
        const u = getUsuarioById(uid);
        return u ? `${u.nombre} ${u.apellido}` : '';
      })
      .filter(Boolean)
      .join(', ');

    const resumen = calcularResumenProyecto(p.id);
    const miEval = profesorId
      ? getEvaluacionProfesor(p.id, profesorId)
      : undefined;
    const miPromedio = miEval
      ? calcularPromedioEvaluacion(miEval, criterios)
      : null;

    if (p.id !== alwaysIncludeProjectId) {
      if (filters.categoria !== 'Todas' && p.categoria !== filters.categoria) {
        continue;
      }
      if (filters.cursoId && p.cursoId !== filters.cursoId) {
        continue;
      }
      if (inscriptosFestivalIds && !inscriptosFestivalIds.has(p.id)) {
        continue;
      }
      if (filters.soloNoEvaluados && profesorId && miPromedio !== null) {
        continue;
      }
      if (query) {
        const matchNombre = p.nombre.toLowerCase().includes(query);
        const matchAlumno = integrantesNombres.toLowerCase().includes(query);
        if (!matchNombre && !matchAlumno) continue;
      }
    }

    items.push({
      proyecto: p,
      cursoNombre: curso?.nombre ?? 'Sin curso',
      integrantesNombres,
      promedioGeneral: resumen.promedio,
      cantidadEvaluaciones: resumen.cantidadEvaluaciones,
      miPromedio,
    });
  }

  items.sort((a, b) => {
    switch (filters.orden) {
      case 'promedio': {
        // Sin evaluaciones (null) siempre al final
        if (a.promedioGeneral === null && b.promedioGeneral === null) {
          return b.proyecto.creadoEn.localeCompare(a.proyecto.creadoEn);
        }
        if (a.promedioGeneral === null) return 1;
        if (b.promedioGeneral === null) return -1;
        if (b.promedioGeneral !== a.promedioGeneral) {
          return b.promedioGeneral - a.promedioGeneral;
        }
        return b.cantidadEvaluaciones - a.cantidadEvaluaciones;
      }
      case 'fecha':
        return b.proyecto.creadoEn.localeCompare(a.proyecto.creadoEn);
      case 'nombre':
        return a.proyecto.nombre.localeCompare(b.proyecto.nombre, 'es');
      case 'evaluaciones': {
        if (b.cantidadEvaluaciones !== a.cantidadEvaluaciones) {
          return b.cantidadEvaluaciones - a.cantidadEvaluaciones;
        }
        return (b.promedioGeneral ?? -1) - (a.promedioGeneral ?? -1);
      }
    }
  });

  return items;
}
