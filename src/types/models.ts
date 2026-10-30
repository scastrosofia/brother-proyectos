export type Rol = 'alumno' | 'profesor' | 'admin';
export type Categoria = 'Film' | 'Activación' | 'Gráfica' | 'Digital';

export const CATEGORIAS: Categoria[] = ['Film', 'Activación', 'Gráfica', 'Digital'];

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  rol: Rol;
  cursoId?: string;
  ultimaConexion?: string;
  proyectosVistos?: string[];
}

export interface Curso {
  id: string;
  nombre: string;
}

export interface Criterio {
  id: string;
  nombre: string;
  orden: number;
}

export interface Proyecto {
  id: string;
  nombre: string; // A1
  categoria: Categoria; // A2 (una sola)
  boardImg: string; // A3 obligatorio (ruta o dataURL)
  youtubeUrl?: string; // A4 opcional
  imagenes: string[]; // A5 opcional
  pdf?: { nombre: string; data: string }; // A6 opcional
  cursoId: string; // A7
  integrantes: string[]; // A8 ids de usuarios alumnos
  descripcion: string; // A9 (máx. 600 caracteres)
  creadoEn: string;
  actualizadoEn: string;
}

export interface Evaluacion {
  id: string;
  proyectoId: string;
  profesorId: string;
  puntajes: Record<string, number>; // criterioId -> 1..10
  comentario: string;
  fecha: string;
}

export interface FestivalCategoria {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface Festival {
  id: string;
  nombre: string;
  web: string;
  deadline: string;
  logo?: string;
  estado: 'borrador' | 'abierto' | 'cerrado';
  bajada: string;
  brief: string;
  reglas: string;
  categorias: FestivalCategoria[];
  criterios: string[];
  faq: { pregunta: string; respuesta: string }[];
}

export interface Inscripcion {
  id: string;
  proyectoId: string;
  festivalId: string;
  categoriaIds: string[];
  fecha: string;
}

export interface ComentarioProyecto {
  id: string;
  proyectoId: string;
  profesorId: string;
  texto: string;
  fecha: string;
  leido: boolean;
  solucionado: boolean;
}

export interface TagProfesor {
  id: string;
  proyectoId: string;
  alumnoId: string;
  profesorId: string;
  nota?: string;
  fecha: string;
  atendido: boolean;
}

export type NotificacionTipo =
  | 'tag_profesor'
  | 'nuevo_comentario'
  | 'comentario_solucionado';

export interface Notificacion {
  id: string;
  destinatarioId: string;
  tipo: NotificacionTipo;
  proyectoId: string;
  autorId: string;
  comentarioId?: string;
  detalle?: string;
  fecha: string;
  descartada?: boolean;
}

export interface DemoStoreData {
  version: 1;
  usuarioActivoId?: string;
  usuarios: Usuario[];
  cursos: Curso[];
  criterios: Criterio[];
  proyectos: Proyecto[];
  evaluaciones: Evaluacion[];
  festivales: Festival[];
  inscripciones: Inscripcion[];
  comentarios: ComentarioProyecto[];
  tagsProfesores: TagProfesor[];
  notificaciones: Notificacion[];
}
