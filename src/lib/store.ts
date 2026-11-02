import { createSeedData } from '../data/seed';
import type {
  ComentarioProyecto,
  Criterio,
  Curso,
  DemoStoreData,
  Evaluacion,
  Festival,
  Inscripcion,
  Notificacion,
  Proyecto,
  Rol,
  TagProfesor,
  Usuario,
} from '../types/models';

export const STORAGE_KEY = 'brother-demo-v1';

export class StorageQuotaError extends Error {
  constructor(
    message = 'Se llenó el almacenamiento de este navegador (localStorage). Probá subir imágenes más livianas, quitar algún PDF adjunto o usar "Reiniciar demo" arriba a la derecha.'
  ) {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

type StoreListener = () => void;
type QuotaListener = (message: string) => void;

const listeners = new Set<StoreListener>();
const quotaListeners = new Set<QuotaListener>();

export function subscribeStore(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeQuotaError(listener: QuotaListener): () => void {
  quotaListeners.add(listener);
  return () => quotaListeners.delete(listener);
}

function notifyStoreChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

function notifyQuotaExceeded(msg: string): void {
  for (const listener of quotaListeners) {
    listener(msg);
  }
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

function hydrateLegacyStore(data: DemoStoreData): DemoStoreData {
  const seed = createSeedData();
  const seedUsersById = new Map(seed.usuarios.map((u) => [u.id, u]));
  const seedProjectsById = new Map(seed.proyectos.map((p) => [p.id, p]));
  let changed = false;

  const usuarios = data.usuarios.map((u) => {
    const seedU = seedUsersById.get(u.id);
    if (!seedU) return u;
    const nextEmail = u.email ?? seedU.email;
    const nextUltima = u.ultimaConexion ?? seedU.ultimaConexion;
    const nextVistos = u.proyectosVistos ?? seedU.proyectosVistos;
    if (
      nextEmail !== u.email ||
      nextUltima !== u.ultimaConexion ||
      nextVistos !== u.proyectosVistos
    ) {
      changed = true;
      return {
        ...u,
        email: nextEmail,
        ultimaConexion: nextUltima,
        proyectosVistos: nextVistos,
      };
    }
    return u;
  });

  const proyectos = data.proyectos.map((p) => {
    if (Array.isArray(p.categorias) && p.categorias.length > 0) {
      return p;
    }
    changed = true;
    const seedP = seedProjectsById.get(p.id);
    const fallbackCats =
      seedP?.categorias && seedP.categorias.length > 0
        ? seedP.categorias
        : p.categoria
          ? [p.categoria]
          : ['Film' as const];
    return {
      ...p,
      categoria: fallbackCats[0],
      categorias: fallbackCats,
    };
  });

  const comentarios = Array.isArray(data.comentarios)
    ? data.comentarios
    : ((changed = true), seed.comentarios);
  const tagsProfesores = Array.isArray(data.tagsProfesores)
    ? data.tagsProfesores
    : ((changed = true), seed.tagsProfesores);
  const notificaciones = Array.isArray(data.notificaciones)
    ? data.notificaciones
    : ((changed = true), seed.notificaciones);

  return changed
    ? {
        ...data,
        usuarios,
        proyectos,
        comentarios,
        tagsProfesores,
        notificaciones,
      }
    : data;
}

function readStore(): DemoStoreData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedData();
      writeStore(seed, false);
      return seed;
    }
    const parsed = JSON.parse(raw) as DemoStoreData;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.proyectos)) {
      const seed = createSeedData();
      writeStore(seed, false);
      return seed;
    }
    return hydrateLegacyStore(parsed);
  } catch {
    return createSeedData();
  }
}

function writeStore(data: DemoStoreData, emit = true): void {
  try {
    const serialized = JSON.stringify(data);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    if (emit) {
      notifyStoreChanged();
    }
  } catch (err) {
    if (isQuotaError(err)) {
      const quotaErr = new StorageQuotaError();
      notifyQuotaExceeded(quotaErr.message);
      throw quotaErr;
    }
    throw err;
  }
}

export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ============================================================================
 * Reinicio de demo
 * ========================================================================== */

export function resetDemoData(): DemoStoreData {
  const fresh = createSeedData();
  writeStore(fresh, true);
  return fresh;
}

/* ============================================================================
 * Usuarios y Profesores
 * ========================================================================== */

export function getUsuarios(): Usuario[] {
  return readStore().usuarios;
}

export function getUsuariosByRol(rol: Rol): Usuario[] {
  return readStore().usuarios.filter((u) => u.rol === rol);
}

export function getUsuarioById(id: string): Usuario | undefined {
  return readStore().usuarios.find((u) => u.id === id);
}

export function getUsuarioActivo(): Usuario {
  const data = readStore();
  if (data.usuarioActivoId) {
    const found = data.usuarios.find((u) => u.id === data.usuarioActivoId);
    if (found) return found;
  }
  return data.usuarios[0];
}

export function setUsuarioActivo(usuarioId: string): Usuario {
  const data = readStore();
  const idx = data.usuarios.findIndex((u) => u.id === usuarioId);
  const targetIdx = idx >= 0 ? idx : 0;
  const updatedUser: Usuario = {
    ...data.usuarios[targetIdx],
    ultimaConexion: todayISO(),
  };
  data.usuarios[targetIdx] = updatedUser;
  data.usuarioActivoId = updatedUser.id;
  writeStore(data);
  return updatedUser;
}

export function addProfesor(input: {
  nombre: string;
  apellido: string;
  email: string;
}): Usuario {
  const data = readStore();
  const nuevo: Usuario = {
    id: generateId('prof'),
    nombre: input.nombre.trim(),
    apellido: input.apellido.trim(),
    email: input.email.trim().toLowerCase(),
    rol: 'profesor',
    proyectosVistos: [],
  };
  data.usuarios.push(nuevo);
  writeStore(data);
  return nuevo;
}

export function deleteProfesor(profesorId: string): void {
  const data = readStore();
  const profesRestantes = data.usuarios.filter(
    (u) => u.rol === 'profesor' && u.id !== profesorId
  );
  // Mantener al menos 1 profesor en la demo para no vaciar el rol
  if (profesRestantes.length === 0) return;

  data.usuarios = data.usuarios.filter((u) => u.id !== profesorId);
  data.evaluaciones = data.evaluaciones.filter(
    (e) => e.profesorId !== profesorId
  );
  data.comentarios = data.comentarios.filter(
    (c) => c.profesorId !== profesorId
  );
  data.tagsProfesores = data.tagsProfesores.filter(
    (t) => t.profesorId !== profesorId
  );
  data.notificaciones = data.notificaciones.filter(
    (n) => n.destinatarioId !== profesorId && n.autorId !== profesorId
  );
  if (data.usuarioActivoId === profesorId) {
    data.usuarioActivoId = data.usuarios[0]?.id;
  }
  writeStore(data);
}

export function registrarVistaProyecto(
  proyectoId: string,
  profesorId: string
): void {
  const data = readStore();
  const idx = data.usuarios.findIndex(
    (u) => u.id === profesorId && u.rol === 'profesor'
  );
  if (idx < 0) return;
  const user = data.usuarios[idx];
  const vistos = new Set(user.proyectosVistos ?? []);
  const hoy = todayISO();
  if (vistos.has(proyectoId) && user.ultimaConexion === hoy) {
    return;
  }
  vistos.add(proyectoId);
  data.usuarios[idx] = {
    ...user,
    proyectosVistos: Array.from(vistos),
    ultimaConexion: hoy,
  };
  writeStore(data);
}

/* ============================================================================
 * Cursos
 * ========================================================================== */

export function getCursos(): Curso[] {
  return readStore().cursos;
}

export function getCursoById(id: string): Curso | undefined {
  return readStore().cursos.find((c) => c.id === id);
}

export function saveCurso(input: { id?: string; nombre: string }): Curso {
  const data = readStore();
  const nombre = input.nombre.trim();
  if (input.id) {
    const idx = data.cursos.findIndex((c) => c.id === input.id);
    if (idx >= 0) {
      const updated: Curso = { ...data.cursos[idx], nombre };
      data.cursos[idx] = updated;
      writeStore(data);
      return updated;
    }
  }
  const created: Curso = { id: generateId('curso'), nombre };
  data.cursos.push(created);
  writeStore(data);
  return created;
}

export function deleteCurso(id: string): void {
  const data = readStore();
  data.cursos = data.cursos.filter((c) => c.id !== id);
  writeStore(data);
}

/* ============================================================================
 * Criterios
 * ========================================================================== */

export function getCriterios(): Criterio[] {
  return [...readStore().criterios].sort((a, b) => a.orden - b.orden);
}

export function saveCriterio(input: { id?: string; nombre: string }): Criterio {
  const data = readStore();
  const nombre = input.nombre.trim();
  if (input.id) {
    const idx = data.criterios.findIndex((c) => c.id === input.id);
    if (idx >= 0) {
      const updated: Criterio = { ...data.criterios[idx], nombre };
      data.criterios[idx] = updated;
      writeStore(data);
      return updated;
    }
  }
  const maxOrden = data.criterios.reduce((max, c) => Math.max(max, c.orden), 0);
  const created: Criterio = {
    id: generateId('crit'),
    nombre,
    orden: maxOrden + 1,
  };
  data.criterios.push(created);
  writeStore(data);
  return created;
}

export function moveCriterio(id: string, direction: 'up' | 'down'): void {
  const data = readStore();
  const sorted = [...data.criterios].sort((a, b) => a.orden - b.orden);
  const idx = sorted.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return;
  const temp = sorted[idx];
  sorted[idx] = sorted[swapIdx];
  sorted[swapIdx] = temp;
  data.criterios = sorted.map((c, index) => ({ ...c, orden: index + 1 }));
  writeStore(data);
}

export function deleteCriterio(id: string): void {
  const data = readStore();
  const remaining = data.criterios
    .filter((c) => c.id !== id)
    .sort((a, b) => a.orden - b.orden)
    .map((c, index) => ({ ...c, orden: index + 1 }));
  data.criterios = remaining;
  writeStore(data);
}

/* ============================================================================
 * Proyectos
 * ========================================================================== */

export function getProyectos(): Proyecto[] {
  return readStore().proyectos;
}

export function getProyectosByAlumno(alumnoId: string): Proyecto[] {
  return readStore()
    .proyectos.filter((p) => p.integrantes.includes(alumnoId))
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
}

export function getProyectoById(id: string): Proyecto | undefined {
  return readStore().proyectos.find((p) => p.id === id);
}

export type SaveProyectoInput = Omit<
  Proyecto,
  'id' | 'categoria' | 'creadoEn' | 'actualizadoEn'
> & {
  id?: string;
  categoria?: Proyecto['categoria'];
};

export function saveProyecto(input: SaveProyectoInput): Proyecto {
  const data = readStore();
  const now = todayISO();
  const categoriasLimpias =
    input.categorias.length > 0
      ? Array.from(new Set(input.categorias))
      : [input.categoria ?? 'Film'];
  const categoriaPrincipal = categoriasLimpias[0];

  if (input.id) {
    const idx = data.proyectos.findIndex((p) => p.id === input.id);
    if (idx >= 0) {
      const updated: Proyecto = {
        ...data.proyectos[idx],
        ...input,
        categoria: categoriaPrincipal,
        categorias: categoriasLimpias,
        id: data.proyectos[idx].id,
        creadoEn: data.proyectos[idx].creadoEn,
        actualizadoEn: now,
      };
      data.proyectos[idx] = updated;
      writeStore(data);
      return updated;
    }
  }
  const created: Proyecto = {
    ...input,
    categoria: categoriaPrincipal,
    categorias: categoriasLimpias,
    id: generateId('proj'),
    creadoEn: now,
    actualizadoEn: now,
  };
  data.proyectos.unshift(created);
  writeStore(data);
  return created;
}

export function deleteProyecto(id: string): void {
  const data = readStore();
  data.proyectos = data.proyectos.filter((p) => p.id !== id);
  data.evaluaciones = data.evaluaciones.filter((e) => e.proyectoId !== id);
  data.inscripciones = data.inscripciones.filter((i) => i.proyectoId !== id);
  data.comentarios = data.comentarios.filter((c) => c.proyectoId !== id);
  data.tagsProfesores = data.tagsProfesores.filter((t) => t.proyectoId !== id);
  data.notificaciones = data.notificaciones.filter((n) => n.proyectoId !== id);
  data.usuarios = data.usuarios.map((u) =>
    u.proyectosVistos
      ? { ...u, proyectosVistos: u.proyectosVistos.filter((pid) => pid !== id) }
      : u
  );
  writeStore(data);
}

/* ============================================================================
 * Evaluaciones y reglas de cálculo
 * ========================================================================== */

export function getEvaluaciones(proyectoId?: string): Evaluacion[] {
  const all = readStore().evaluaciones;
  if (!proyectoId) return all;
  return all
    .filter((e) => e.proyectoId === proyectoId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function getEvaluacionProfesor(
  proyectoId: string,
  profesorId: string
): Evaluacion | undefined {
  return readStore().evaluaciones.find(
    (e) => e.proyectoId === proyectoId && e.profesorId === profesorId
  );
}

export function calcularPromedioEvaluacion(
  evaluacion: Pick<Evaluacion, 'puntajes'>,
  criteriosVigentes?: Criterio[]
): number | null {
  const criterios = criteriosVigentes ?? getCriterios();
  const valores: number[] = [];
  for (const c of criterios) {
    const val = evaluacion.puntajes[c.id];
    if (typeof val === 'number' && val >= 1 && val <= 10) {
      valores.push(val);
    }
  }
  if (valores.length === 0) return null;
  const suma = valores.reduce((acc, n) => acc + n, 0);
  return suma / valores.length;
}

export function calcularResumenProyecto(proyectoId: string): {
  promedio: number | null;
  cantidadEvaluaciones: number;
} {
  const data = readStore();
  const criterios = [...data.criterios].sort((a, b) => a.orden - b.orden);
  const evals = data.evaluaciones.filter((e) => e.proyectoId === proyectoId);
  if (evals.length === 0) {
    return { promedio: null, cantidadEvaluaciones: 0 };
  }
  const promedios = evals
    .map((ev) => calcularPromedioEvaluacion(ev, criterios))
    .filter((v): v is number => v !== null);
  if (promedios.length === 0) {
    return { promedio: null, cantidadEvaluaciones: 0 };
  }
  const mediaGeneral =
    promedios.reduce((acc, v) => acc + v, 0) / promedios.length;
  return {
    promedio: mediaGeneral,
    cantidadEvaluaciones: promedios.length,
  };
}

export function formatearPromedio(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return valor.toFixed(1);
}

export function saveEvaluacion(input: {
  proyectoId: string;
  profesorId: string;
  puntajes: Record<string, number>;
  comentario: string;
}): Evaluacion {
  const data = readStore();
  const fecha = todayISO();

  const profIdx = data.usuarios.findIndex((u) => u.id === input.profesorId);
  if (profIdx >= 0) {
    const vistos = new Set(data.usuarios[profIdx].proyectosVistos ?? []);
    vistos.add(input.proyectoId);
    data.usuarios[profIdx] = {
      ...data.usuarios[profIdx],
      proyectosVistos: Array.from(vistos),
      ultimaConexion: fecha,
    };
  }

  const existingIdx = data.evaluaciones.findIndex(
    (e) => e.proyectoId === input.proyectoId && e.profesorId === input.profesorId
  );
  if (existingIdx >= 0) {
    const updated: Evaluacion = {
      ...data.evaluaciones[existingIdx],
      puntajes: { ...input.puntajes },
      comentario: input.comentario.trim(),
      fecha,
    };
    data.evaluaciones[existingIdx] = updated;
    writeStore(data);
    return updated;
  }
  const created: Evaluacion = {
    id: generateId('eval'),
    proyectoId: input.proyectoId,
    profesorId: input.profesorId,
    puntajes: { ...input.puntajes },
    comentario: input.comentario.trim(),
    fecha,
  };
  data.evaluaciones.push(created);
  writeStore(data);
  return created;
}

export function deleteEvaluacion(id: string): void {
  const data = readStore();
  data.evaluaciones = data.evaluaciones.filter((e) => e.id !== id);
  writeStore(data);
}

/* ============================================================================
 * Festivales
 * ========================================================================== */

export function getFestivales(): Festival[] {
  return [...readStore().festivales].sort((a, b) =>
    a.deadline.localeCompare(b.deadline)
  );
}

export function getFestivalById(id: string): Festival | undefined {
  return readStore().festivales.find((f) => f.id === id);
}

export type SaveFestivalInput = Omit<Festival, 'id'> & { id?: string };

export function saveFestival(input: SaveFestivalInput): Festival {
  const data = readStore();
  if (input.id) {
    const idx = data.festivales.findIndex((f) => f.id === input.id);
    if (idx >= 0) {
      const updated: Festival = { ...input, id: data.festivales[idx].id };
      data.festivales[idx] = updated;
      writeStore(data);
      return updated;
    }
  }
  const created: Festival = {
    ...input,
    id: generateId('fest'),
  };
  data.festivales.push(created);
  writeStore(data);
  return created;
}

export function deleteFestival(id: string): void {
  const data = readStore();
  data.festivales = data.festivales.filter((f) => f.id !== id);
  data.inscripciones = data.inscripciones.filter((i) => i.festivalId !== id);
  writeStore(data);
}

/* ============================================================================
 * Inscripciones
 * ========================================================================== */

export function getInscripciones(filters?: {
  proyectoId?: string;
  festivalId?: string;
  alumnoId?: string;
}): Inscripcion[] {
  const data = readStore();
  let list = [...data.inscripciones];
  if (filters?.proyectoId) {
    list = list.filter((i) => i.proyectoId === filters.proyectoId);
  }
  if (filters?.festivalId) {
    list = list.filter((i) => i.festivalId === filters.festivalId);
  }
  if (filters?.alumnoId) {
    const misProyectosIds = new Set(
      data.proyectos
        .filter((p) => p.integrantes.includes(filters.alumnoId!))
        .map((p) => p.id)
    );
    list = list.filter((i) => misProyectosIds.has(i.proyectoId));
  }
  return list.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function inscribirProyectoEnFestival(params: {
  proyectoId: string;
  festivalId: string;
  categoriaIds: string[];
}): Inscripcion {
  const data = readStore();
  const fecha = todayISO();
  const existingIdx = data.inscripciones.findIndex(
    (i) =>
      i.proyectoId === params.proyectoId && i.festivalId === params.festivalId
  );
  if (existingIdx >= 0) {
    const mergedCategorias = Array.from(
      new Set([
        ...data.inscripciones[existingIdx].categoriaIds,
        ...params.categoriaIds,
      ])
    );
    const updated: Inscripcion = {
      ...data.inscripciones[existingIdx],
      categoriaIds: mergedCategorias,
      fecha,
    };
    data.inscripciones[existingIdx] = updated;
    writeStore(data);
    return updated;
  }
  const created: Inscripcion = {
    id: generateId('insc'),
    proyectoId: params.proyectoId,
    festivalId: params.festivalId,
    categoriaIds: Array.from(new Set(params.categoriaIds)),
    fecha,
  };
  data.inscripciones.push(created);
  writeStore(data);
  return created;
}

export function retirarCategoriaInscripcion(
  inscripcionId: string,
  categoriaId: string
): void {
  const data = readStore();
  const idx = data.inscripciones.findIndex((i) => i.id === inscripcionId);
  if (idx < 0) return;
  const nextCats = data.inscripciones[idx].categoriaIds.filter(
    (cid) => cid !== categoriaId
  );
  if (nextCats.length === 0) {
    data.inscripciones.splice(idx, 1);
  } else {
    data.inscripciones[idx] = {
      ...data.inscripciones[idx],
      categoriaIds: nextCats,
    };
  }
  writeStore(data);
}

export function deleteInscripcion(id: string): void {
  const data = readStore();
  data.inscripciones = data.inscripciones.filter((i) => i.id !== id);
  writeStore(data);
}

/* ============================================================================
 * Comentarios de Proyectos, Tags a Profesores y Notificaciones
 * ========================================================================== */

export function getComentariosProyecto(
  proyectoId: string,
  viewer: Usuario
): ComentarioProyecto[] {
  const data = readStore();
  return data.comentarios
    .filter((c) => {
      if (c.proyectoId !== proyectoId) return false;
      // Regla de privacidad: un profesor NUNCA ve comentarios de otros profesores
      if (viewer.rol === 'profesor') {
        return c.profesorId === viewer.id;
      }
      return true;
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
}

export function getComentariosDeMisProyectos(
  alumnoId: string
): ComentarioProyecto[] {
  const data = readStore();
  const misProyectosIds = new Set(
    data.proyectos
      .filter((p) => p.integrantes.includes(alumnoId))
      .map((p) => p.id)
  );
  return data.comentarios
    .filter((c) => misProyectosIds.has(c.proyectoId))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
}

export function addComentarioProyecto(params: {
  proyectoId: string;
  profesorId: string;
  texto: string;
}): ComentarioProyecto {
  const data = readStore();
  const fecha = todayISO();
  const textoLimpio = params.texto.trim();

  const nuevo: ComentarioProyecto = {
    id: generateId('com'),
    proyectoId: params.proyectoId,
    profesorId: params.profesorId,
    texto: textoLimpio,
    fecha,
    leido: false,
    solucionado: false,
  };
  data.comentarios.unshift(nuevo);

  // Registrar el proyecto como visto por este profesor
  const profIdx = data.usuarios.findIndex((u) => u.id === params.profesorId);
  if (profIdx >= 0) {
    const vistos = new Set(data.usuarios[profIdx].proyectosVistos ?? []);
    vistos.add(params.proyectoId);
    data.usuarios[profIdx] = {
      ...data.usuarios[profIdx],
      proyectosVistos: Array.from(vistos),
      ultimaConexion: fecha,
    };
  }

  // Marcar cualquier tag pendiente a este profesor en este proyecto como atendido
  data.tagsProfesores = data.tagsProfesores.map((t) =>
    t.proyectoId === params.proyectoId && t.profesorId === params.profesorId
      ? { ...t, atendido: true }
      : t
  );

  // Generar notificación para cada alumno integrante del proyecto
  const proyecto = data.proyectos.find((p) => p.id === params.proyectoId);
  if (proyecto) {
    const extracto =
      textoLimpio.length > 140
        ? `${textoLimpio.slice(0, 137)}...`
        : textoLimpio;
    for (const alumnoId of proyecto.integrantes) {
      const notif: Notificacion = {
        id: generateId('not'),
        destinatarioId: alumnoId,
        tipo: 'nuevo_comentario',
        proyectoId: proyecto.id,
        autorId: params.profesorId,
        comentarioId: nuevo.id,
        detalle: extracto,
        fecha,
      };
      data.notificaciones.unshift(notif);
    }
  }

  writeStore(data);
  return nuevo;
}

export function deleteComentarioProyecto(comentarioId: string): void {
  const data = readStore();
  data.comentarios = data.comentarios.filter((c) => c.id !== comentarioId);
  data.notificaciones = data.notificaciones.filter(
    (n) => n.comentarioId !== comentarioId
  );
  writeStore(data);
}

export function toggleComentarioLeido(
  comentarioId: string,
  forceValue?: boolean
): void {
  const data = readStore();
  const idx = data.comentarios.findIndex((c) => c.id === comentarioId);
  if (idx < 0) return;
  const nextVal =
    typeof forceValue === 'boolean'
      ? forceValue
      : !data.comentarios[idx].leido;
  data.comentarios[idx] = {
    ...data.comentarios[idx],
    leido: nextVal,
  };
  writeStore(data);
}

export function marcarTodosLeidosProyecto(proyectoId: string): void {
  const data = readStore();
  let changed = false;
  data.comentarios = data.comentarios.map((c) => {
    if (c.proyectoId === proyectoId && !c.leido) {
      changed = true;
      return { ...c, leido: true };
    }
    return c;
  });
  if (changed) {
    writeStore(data);
  }
}

export function toggleComentarioSolucionado(
  comentarioId: string,
  actorId: string
): void {
  const data = readStore();
  const idx = data.comentarios.findIndex((c) => c.id === comentarioId);
  if (idx < 0) return;

  const actual = data.comentarios[idx];
  const nextSolucionado = !actual.solucionado;
  data.comentarios[idx] = {
    ...actual,
    solucionado: nextSolucionado,
    leido: nextSolucionado ? true : actual.leido,
  };

  // Si un alumno marca como solucionado el comentario de un profesor, notificar al profesor
  const actor = data.usuarios.find((u) => u.id === actorId);
  if (nextSolucionado && actor?.rol === 'alumno') {
    const extracto =
      actual.texto.length > 90
        ? `${actual.texto.slice(0, 87)}...`
        : actual.texto;
    data.notificaciones.unshift({
      id: generateId('not'),
      destinatarioId: actual.profesorId,
      tipo: 'comentario_solucionado',
      proyectoId: actual.proyectoId,
      autorId: actorId,
      comentarioId: actual.id,
      detalle: extracto,
      fecha: todayISO(),
    });
  }

  writeStore(data);
}

export function getTagsProyecto(
  proyectoId: string,
  viewer: Usuario
): TagProfesor[] {
  const data = readStore();
  return data.tagsProfesores
    .filter((t) => {
      if (t.proyectoId !== proyectoId) return false;
      if (viewer.rol === 'profesor') {
        return t.profesorId === viewer.id;
      }
      return true;
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
}

export function getTagsDeMisProyectos(alumnoId: string): TagProfesor[] {
  const data = readStore();
  const misProyectosIds = new Set(
    data.proyectos
      .filter((p) => p.integrantes.includes(alumnoId))
      .map((p) => p.id)
  );
  return data.tagsProfesores.filter((t) => misProyectosIds.has(t.proyectoId));
}

export function taggearProfesorEnProyecto(params: {
  proyectoId: string;
  alumnoId: string;
  profesorId: string;
  nota?: string;
}): TagProfesor {
  const data = readStore();
  const fecha = todayISO();
  const notaLimpia = params.nota?.trim() || undefined;

  const existingIdx = data.tagsProfesores.findIndex(
    (t) =>
      t.proyectoId === params.proyectoId && t.profesorId === params.profesorId
  );

  let resultado: TagProfesor;
  if (existingIdx >= 0) {
    resultado = {
      ...data.tagsProfesores[existingIdx],
      alumnoId: params.alumnoId,
      nota: notaLimpia,
      fecha,
      atendido: false,
    };
    data.tagsProfesores[existingIdx] = resultado;
  } else {
    resultado = {
      id: generateId('tag'),
      proyectoId: params.proyectoId,
      alumnoId: params.alumnoId,
      profesorId: params.profesorId,
      nota: notaLimpia,
      fecha,
      atendido: false,
    };
    data.tagsProfesores.unshift(resultado);
  }

  data.notificaciones.unshift({
    id: generateId('not'),
    destinatarioId: params.profesorId,
    tipo: 'tag_profesor',
    proyectoId: params.proyectoId,
    autorId: params.alumnoId,
    detalle: notaLimpia,
    fecha,
  });

  writeStore(data);
  return resultado;
}

export function quitarTagProfesor(tagId: string): void {
  const data = readStore();
  data.tagsProfesores = data.tagsProfesores.filter((t) => t.id !== tagId);
  writeStore(data);
}

export function getNotificacionesUsuario(usuarioId: string): Notificacion[] {
  const data = readStore();
  return data.notificaciones
    .filter((n) => n.destinatarioId === usuarioId && !n.descartada)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
}

export function descartarNotificacion(notificacionId: string): void {
  const data = readStore();
  const idx = data.notificaciones.findIndex((n) => n.id === notificacionId);
  if (idx < 0) return;
  data.notificaciones[idx] = {
    ...data.notificaciones[idx],
    descartada: true,
  };
  writeStore(data);
}

export function limpiarNotificacionesUsuario(usuarioId: string): void {
  const data = readStore();
  let changed = false;
  data.notificaciones = data.notificaciones.map((n) => {
    if (n.destinatarioId === usuarioId && !n.descartada) {
      changed = true;
      return { ...n, descartada: true };
    }
    return n;
  });
  if (changed) {
    writeStore(data);
  }
}
