import React, { useMemo, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { formatFecha } from '../lib/assets';
import {
  addComentarioProyecto,
  deleteComentarioProyecto,
  getComentariosProyecto,
  getTagsProyecto,
  getUsuarioById,
  getUsuariosByRol,
  marcarTodosLeidosProyecto,
  quitarTagProfesor,
  taggearProfesorEnProyecto,
  toggleComentarioLeido,
  toggleComentarioSolucionado,
} from '../lib/store';
import type { Proyecto } from '../types/models';

type EstadoFiltro = 'todos' | 'sin_leer' | 'pendientes' | 'solucionados';

export const ProyectoComentariosSection: React.FC<{
  proyecto: Proyecto;
}> = ({ proyecto }) => {
  const { usuario } = useSession();

  const esAlumno = usuario.rol === 'alumno';
  const esIntegrante = esAlumno && proyecto.integrantes.includes(usuario.id);
  const esProfesor = usuario.rol === 'profesor';
  const esAdmin = usuario.rol === 'admin';

  const profesores = getUsuariosByRol('profesor');
  const comentariosVisibles = getComentariosProyecto(proyecto.id, usuario);
  const tagsVisibles = getTagsProyecto(proyecto.id, usuario);

  // Estado formulario de nuevo comentario (Profesor)
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [comentarioError, setComentarioError] = useState<string | null>(null);

  // Estado formulario de taggear profesor (Alumno)
  const [profesorTagId, setProfesorTagId] = useState<string>(
    () => profesores[0]?.id ?? ''
  );
  const [notaTag, setNotaTag] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Filtros de la sección de comentarios
  const [filtroProfesorId, setFiltroProfesorId] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('todos');

  const sinLeerCount = useMemo(
    () => comentariosVisibles.filter((c) => !c.leido).length,
    [comentariosVisibles]
  );

  const comentariosFiltrados = useMemo(() => {
    return comentariosVisibles.filter((c) => {
      if (!esProfesor && filtroProfesorId && c.profesorId !== filtroProfesorId) {
        return false;
      }
      if (filtroEstado === 'sin_leer' && c.leido) return false;
      if (filtroEstado === 'pendientes' && c.solucionado) return false;
      if (filtroEstado === 'solucionados' && !c.solucionado) return false;
      return true;
    });
  }, [comentariosVisibles, esProfesor, filtroProfesorId, filtroEstado]);

  // Contador por profesor para el dropdown de filtro (solo Alumno / Admin)
  const conteoPorProfesor = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of comentariosVisibles) {
      map.set(c.profesorId, (map.get(c.profesorId) ?? 0) + 1);
    }
    return map;
  }, [comentariosVisibles]);

  const handlePublicarComentario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esProfesor) return;
    if (!nuevoTexto.trim()) {
      setComentarioError('Escribí un comentario antes de publicarlo.');
      return;
    }
    addComentarioProyecto({
      proyectoId: proyecto.id,
      profesorId: usuario.id,
      texto: nuevoTexto,
    });
    setNuevoTexto('');
    setComentarioError(null);
    setFeedbackBanner(
      'Comentario publicado. Los alumnos del equipo ya recibieron la notificación en su dashboard.'
    );
  };

  const handleTaggearProfesor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esIntegrante || !profesorTagId) return;
    const prof = getUsuarioById(profesorTagId);
    taggearProfesorEnProyecto({
      proyectoId: proyecto.id,
      alumnoId: usuario.id,
      profesorId: profesorTagId,
      nota: notaTag,
    });
    setNotaTag('');
    setFeedbackBanner(
      prof
        ? `Taggeaste a ${prof.nombre} ${prof.apellido}. Ya le aparece el aviso en su dashboard.`
        : 'Profesor taggeado correctamente.'
    );
  };

  // Tag pendiente dirigido al profesor actual
  const miTagPendiente = esProfesor
    ? tagsVisibles.find((t) => t.profesorId === usuario.id && !t.atendido)
    : undefined;
  const alumnoQueMeTaggeo = miTagPendiente
    ? getUsuarioById(miTagPendiente.alumnoId)
    : undefined;

  return (
    <section
      id="comentarios"
      className="card"
      style={{ marginTop: 24 }}
      data-testid="proyecto-comentarios-section"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: 19 }}>
            {esProfesor
              ? `Tus comentarios en este proyecto (${comentariosVisibles.length})`
              : `Comentarios de profesores (${comentariosVisibles.length})`}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {esProfesor
              ? 'Solo vos y el equipo de alumnos ven tus comentarios. Los demás profesores no pueden verlos.'
              : 'Devoluciones puntuales de profesores, estado de lectura y seguimiento de ajustes solucionados.'}
          </p>
        </div>

        {esProfesor && (
          <span className="chip chip--blue">
            Privado entre vos y el equipo
          </span>
        )}

        {esIntegrante && sinLeerCount > 0 && (
          <button
            type="button"
            className="btn"
            style={{ minHeight: 36, fontSize: 13 }}
            onClick={() => marcarTodosLeidosProyecto(proyecto.id)}
          >
            ✓ Marcar todos como leídos ({sinLeerCount})
          </button>
        )}
      </div>

      {feedbackBanner && (
        <div
          className="alert-banner alert-banner--success"
          role="status"
          style={{ marginBottom: 16 }}
        >
          <span>{feedbackBanner}</span>
          <button
            type="button"
            className="btn"
            style={{ minHeight: 32, padding: '0 10px', fontSize: 12 }}
            onClick={() => setFeedbackBanner(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Aviso al Profesor si un alumno lo taggeó en este proyecto */}
      {miTagPendiente && (
        <div className="tag-callout">
          <strong>
            @{usuario.nombre} {usuario.apellido}:
          </strong>{' '}
          {alumnoQueMeTaggeo
            ? `${alumnoQueMeTaggeo.nombre} ${alumnoQueMeTaggeo.apellido}`
            : 'El equipo de alumnos'}{' '}
          te taggeó el {formatFecha(miTagPendiente.fecha)} para pedirte devolución
          {miTagPendiente.nota ? `: «${miTagPendiente.nota}»` : '.'}
        </div>
      )}

      {/* Bloque para Alumno integrante: Taggear a un profesor */}
      {esIntegrante && (
        <div className="tag-box">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            Taggear a un profesor para pedir feedback
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              marginBottom: 12,
            }}
          >
            Elegí un profesor para avisarle en su dashboard que revise el proyecto y te deje comentarios (los otros profesores no ven sus devoluciones).
          </p>

          <form onSubmit={handleTaggearProfesor} className="tag-form">
            <select
              aria-label="Seleccionar profesor para taggear"
              className="select"
              value={profesorTagId}
              onChange={(e) => setProfesorTagId(e.target.value)}
            >
              {profesores.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  @{prof.nombre} {prof.apellido}
                </option>
              ))}
            </select>

            <input
              type="text"
              className="input"
              placeholder="Consulta opcional (ej: ¿Cómo ves el titular del board?)"
              value={notaTag}
              onChange={(e) => setNotaTag(e.target.value)}
              maxLength={180}
            />

            <button type="submit" className="btn btn--primary">
              Taggear profesor
            </button>
          </form>

          {tagsVisibles.length > 0 && (
            <div className="chip-row" style={{ marginTop: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Taggeados:
              </span>
              {tagsVisibles.map((tag) => {
                const prof = getUsuarioById(tag.profesorId);
                if (!prof) return null;
                return (
                  <span
                    key={tag.id}
                    className={`chip ${tag.atendido ? 'chip--solved' : 'chip--blue'}`}
                    title={tag.nota ? `Nota: ${tag.nota}` : undefined}
                  >
                    @{prof.nombre} {prof.apellido} ·{' '}
                    {tag.atendido ? 'Ya comentó ✓' : 'Pendiente'}
                    {!tag.atendido && (
                      <button
                        type="button"
                        className="chip__remove"
                        aria-label={`Quitar tag de ${prof.nombre}`}
                        onClick={() => quitarTagProfesor(tag.id)}
                      >
                        ×
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Formulario para Profesor: Dejar un nuevo comentario */}
      {esProfesor && (
        <form onSubmit={handlePublicarComentario} style={{ marginBottom: 20 }}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label
              className="form-label"
              htmlFor={`nuevo-comentario-${proyecto.id}`}
            >
              Dejar un comentario para el equipo
            </label>
            <textarea
              id={`nuevo-comentario-${proyecto.id}`}
              className="textarea"
              style={{ minHeight: 88 }}
              placeholder="Escribí una observación puntual sobre la idea, el board, el copy o la edición..."
              value={nuevoTexto}
              onChange={(e) => {
                setNuevoTexto(e.target.value);
                setComentarioError(null);
              }}
            />
          </div>
          {comentarioError && (
            <p className="form-error" style={{ marginBottom: 10 }}>
              {comentarioError}
            </p>
          )}
          <button type="submit" className="btn btn--primary">
            Publicar comentario
          </button>
        </form>
      )}

      {/* Barra de filtros por profesor y por estado */}
      <div className="comments-toolbar">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <label
            htmlFor={`filtro-prof-${proyecto.id}`}
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}
          >
            Filtrar por profesor:
          </label>

          {esProfesor ? (
            <select
              id={`filtro-prof-${proyecto.id}`}
              className="select"
              style={{ width: 'auto', minWidth: 220, minHeight: 38, padding: '6px 10px' }}
              value={usuario.id}
              disabled
              title="Los comentarios de otros profesores son privados"
            >
              <option value={usuario.id}>
                {usuario.nombre} {usuario.apellido} (solo tus comentarios)
              </option>
            </select>
          ) : (
            <select
              id={`filtro-prof-${proyecto.id}`}
              aria-label="Filtrar comentarios por profesor"
              className="select"
              style={{ width: 'auto', minWidth: 230, minHeight: 38, padding: '6px 10px' }}
              value={filtroProfesorId}
              onChange={(e) => setFiltroProfesorId(e.target.value)}
            >
              <option value="">
                Todos los profesores ({comentariosVisibles.length})
              </option>
              {profesores.map((prof) => {
                const cant = conteoPorProfesor.get(prof.id) ?? 0;
                return (
                  <option key={prof.id} value={prof.id}>
                    {prof.nombre} {prof.apellido} ({cant})
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <label
            htmlFor={`filtro-estado-${proyecto.id}`}
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}
          >
            Estado:
          </label>
          <select
            id={`filtro-estado-${proyecto.id}`}
            aria-label="Filtrar comentarios por estado"
            className="select"
            style={{ width: 'auto', minWidth: 180, minHeight: 38, padding: '6px 10px' }}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoFiltro)}
          >
            <option value="todos">Todos</option>
            <option value="sin_leer">Sin leer</option>
            <option value="pendientes">Pendientes de solucionar</option>
            <option value="solucionados">Solucionados</option>
          </select>
        </div>
      </div>

      {/* Listado de comentarios */}
      {comentariosFiltrados.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 14,
          }}
        >
          {comentariosVisibles.length === 0
            ? esProfesor
              ? 'Todavía no dejaste comentarios en este proyecto.'
              : 'Todavía ningún profesor dejó comentarios en este proyecto.'
            : 'No hay comentarios que coincidan con el filtro seleccionado.'}
        </div>
      ) : (
        <div className="comment-list">
          {comentariosFiltrados.map((com) => {
            const prof = getUsuarioById(com.profesorId);
            const profNombre = prof
              ? `${prof.nombre} ${prof.apellido}`
              : 'Profesor';
            const initials = prof
              ? `${prof.nombre.charAt(0)}${prof.apellido.charAt(0)}`.toUpperCase()
              : 'PR';
            const esMio = esProfesor && com.profesorId === usuario.id;
            const puedeTogglearSolucionado =
              esIntegrante || esMio || esAdmin;

            return (
              <article
                key={com.id}
                className={`comment-card ${
                  !com.leido ? 'comment-card--unread' : ''
                } ${com.solucionado ? 'comment-card--solved' : ''}`}
              >
                <div className="comment-card__header">
                  <div className="comment-card__author">
                    <span className="comment-card__avatar">{initials}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {profNombre} {esMio ? '(vos)' : ''}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                        {formatFecha(com.fecha)}
                      </div>
                    </div>
                  </div>

                  {/* Avisos visuales de Leído y Solucionado */}
                  <div className="chip-row">
                    <span
                      className={`chip ${
                        com.leido ? 'chip--read' : 'chip--unread'
                      }`}
                    >
                      {com.leido
                        ? esProfesor
                          ? '✓ Leído por alumnos'
                          : '✓ Leído'
                        : esProfesor
                          ? '● Aún no leído'
                          : '● Nuevo · Sin leer'}
                    </span>

                    <span
                      className={`chip ${
                        com.solucionado ? 'chip--solved' : 'chip--pending'
                      }`}
                    >
                      {com.solucionado ? '✓ Solucionado' : 'Pendiente'}
                    </span>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 14.5,
                    lineHeight: 1.55,
                    color: 'var(--text-main)',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {com.texto}
                </p>

                {(esIntegrante || puedeTogglearSolucionado) && (
                  <div className="comment-card__actions">
                    {esIntegrante && (
                      <button
                        type="button"
                        className="btn"
                        style={{ minHeight: 32, padding: '0 12px', fontSize: 12.5 }}
                        onClick={() => toggleComentarioLeido(com.id)}
                      >
                        {com.leido
                          ? 'Marcar como no leído'
                          : '✓ Marcar como leído'}
                      </button>
                    )}

                    {puedeTogglearSolucionado && (
                      <button
                        type="button"
                        className={`btn ${com.solucionado ? '' : ''}`}
                        style={{
                          minHeight: 32,
                          padding: '0 12px',
                          fontSize: 12.5,
                          borderColor: com.solucionado
                            ? 'var(--border-color)'
                            : 'var(--accent-green)',
                          background: com.solucionado
                            ? 'var(--bg-card)'
                            : 'rgba(0, 254, 57, 0.12)',
                          color: com.solucionado
                            ? 'var(--text-main)'
                            : 'var(--accent-green)',
                        }}
                        onClick={() =>
                          toggleComentarioSolucionado(com.id, usuario.id)
                        }
                      >
                        {com.solucionado
                          ? 'Reabrir como pendiente'
                          : '✓ Marcar como solucionado'}
                      </button>
                    )}

                    {(esMio || esAdmin) && (
                      <button
                        type="button"
                        onClick={() => deleteComentarioProyecto(com.id)}
                        style={{
                          marginLeft: 'auto',
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
