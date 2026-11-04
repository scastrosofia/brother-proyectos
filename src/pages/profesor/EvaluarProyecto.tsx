import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Lightbox } from '../../components/Lightbox';
import { ProyectoComentariosSection } from '../../components/ProyectoComentariosSection';
import { StarRating } from '../../components/StarRating';
import { useSession } from '../../context/SessionContext';
import { formatFecha, resolveAssetUrl } from '../../lib/assets';
import { getYouTubeEmbedUrl, triggerPdfDownload } from '../../lib/media';
import {
  getProyectosFiltradosYOrdenados,
  parseRankingFilters,
} from '../../lib/ranking';
import {
  calcularPromedioEvaluacion,
  calcularResumenProyecto,
  deleteEvaluacion,
  formatearPromedio,
  getCriterios,
  getCursoById,
  getEvaluaciones,
  getEvaluacionProfesor,
  getProyectoById,
  getUsuarioById,
  registrarVistaProyecto,
  saveEvaluacion,
} from '../../lib/store';
import { getProyectoCategorias } from '../../types/models';

export const EvaluarProyecto: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { usuario } = useSession();

  const panelRef = useRef<HTMLDivElement>(null);
  const proyecto = id ? getProyectoById(id) : undefined;
  const criterios = getCriterios();
  const esProfesor = usuario.rol === 'profesor';

  const evaluacionPropia =
    proyecto && esProfesor
      ? getEvaluacionProfesor(proyecto.id, usuario.id)
      : undefined;

  const [puntajes, setPuntajes] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const [expandedEvalIds, setExpandedEvalIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (proyecto && esProfesor) {
      registrarVistaProyecto(proyecto.id, usuario.id);
    }
  }, [proyecto?.id, usuario.id, esProfesor]);

  useEffect(() => {
    if (evaluacionPropia) {
      setPuntajes({ ...evaluacionPropia.puntajes });
      setComentario(evaluacionPropia.comentario);
    } else {
      setPuntajes({});
      setComentario('');
    }
    setFormError(null);
    setFlashMsg(null);
  }, [proyecto?.id, usuario.id, evaluacionPropia?.id]);

  const querySuffix = searchParams.toString()
    ? `?${searchParams.toString()}`
    : '';

  if (!proyecto) {
    return (
      <Layout>
        <Link to={`/proyectos${querySuffix}`} className="back-link">
          ← Volver al listado
        </Link>
        <div className="empty-state">
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>
            Proyecto no encontrado
          </h1>
          <Link to={`/proyectos${querySuffix}`} className="btn btn--primary">
            Volver al listado
          </Link>
        </div>
      </Layout>
    );
  }

  // Navegación Anterior / Siguiente respetando filtros y orden de B1
  const filters = parseRankingFilters(searchParams);
  const secuencia = getProyectosFiltradosYOrdenados(
    filters,
    esProfesor ? usuario.id : undefined,
    proyecto.id
  );
  const currentIdx = secuencia.findIndex(
    (item) => item.proyecto.id === proyecto.id
  );
  const prevItem = currentIdx > 0 ? secuencia[currentIdx - 1] : undefined;
  const nextItem =
    currentIdx >= 0 && currentIdx < secuencia.length - 1
      ? secuencia[currentIdx + 1]
      : undefined;

  const curso = getCursoById(proyecto.cursoId);
  const nombresIntegrantes = proyecto.integrantes
    .map((uid) => {
      const u = getUsuarioById(uid);
      return u ? `${u.nombre} ${u.apellido}` : null;
    })
    .filter(Boolean)
    .join(', ');

  const embedUrl = getYouTubeEmbedUrl(proyecto.youtubeUrl);
  const allLightboxImages = [proyecto.boardImg, ...proyecto.imagenes];

  const resumenGeneral = calcularResumenProyecto(proyecto.id);
  const evaluacionesProyecto = getEvaluaciones(proyecto.id);
  const miPromedioEnVivo = calcularPromedioEvaluacion({ puntajes }, criterios);

  const handleSetPuntaje = (criterioId: string, val: number) => {
    setPuntajes((prev) => ({ ...prev, [criterioId]: val }));
    setFormError(null);
    setFlashMsg(null);
  };

  const handleLimpiar = () => {
    setPuntajes({});
    setComentario('');
    setFormError(null);
  };

  const handleSaveEvaluacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esProfesor) return;

    const faltantes = criterios.filter((c) => {
      const v = puntajes[c.id];
      return typeof v !== 'number' || v < 1 || v > 10;
    });

    if (faltantes.length > 0) {
      setFormError(
        `Puntuá todos los criterios antes de guardar (faltan: ${faltantes
          .map((f) => f.nombre)
          .join(', ')}).`
      );
      return;
    }

    const eraEdicion = Boolean(evaluacionPropia);
    saveEvaluacion({
      proyectoId: proyecto.id,
      profesorId: usuario.id,
      puntajes,
      comentario,
    });
    setFormError(null);
    setFlashMsg(
      eraEdicion
        ? 'Tu evaluación fue actualizada.'
        : 'Tu evaluación se guardó y ya impactó en el promedio general.'
    );
  };

  const handleDeletePropia = () => {
    if (!evaluacionPropia) return;
    deleteEvaluacion(evaluacionPropia.id);
    setPuntajes({});
    setComentario('');
    setConfirmDeleteOpen(false);
    setFlashMsg('Se eliminó tu evaluación de este proyecto.');
  };

  const toggleDesglose = (evalId: string) => {
    setExpandedEvalIds((prev) => ({ ...prev, [evalId]: !prev[evalId] }));
  };

  return (
    <Layout>
      {/* Barra superior de navegación B2 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <Link
          to={`/proyectos${querySuffix}`}
          className="back-link"
          style={{ marginBottom: 0 }}
        >
          ← Volver al listado
        </Link>

        {secuencia.length > 0 && currentIdx >= 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
            }}
          >
            {prevItem ? (
              <Link to={`/evaluar/${prevItem.proyecto.id}${querySuffix}`}>
                ← Anterior
              </Link>
            ) : (
              <span style={{ color: 'var(--text-soft)' }}>← Anterior</span>
            )}
            <span style={{ color: 'var(--text-muted)' }}>
              · {currentIdx + 1} de {secuencia.length} ·
            </span>
            {nextItem ? (
              <Link to={`/evaluar/${nextItem.proyecto.id}${querySuffix}`}>
                Siguiente →
              </Link>
            ) : (
              <span style={{ color: 'var(--text-soft)' }}>Siguiente →</span>
            )}
          </div>
        )}
      </div>

      {flashMsg && (
        <div className="alert-banner alert-banner--success" role="status">
          <span>{flashMsg}</span>
          <button
            type="button"
            className="btn"
            style={{ minHeight: 34, padding: '0 10px' }}
            onClick={() => setFlashMsg(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Grilla 2 columnas: izquierda proyecto completo · derecha promedio y panel de evaluación */}
      <div className="eval-layout">
        {/* Columna izquierda */}
        <div>
          <section className="card">
            <div style={{ marginBottom: 20 }}>
              <img
                src={resolveAssetUrl(proyecto.boardImg)}
                alt={`Board de ${proyecto.nombre}`}
                className="board-preview-large"
                onClick={() => setLightboxIndex(0)}
              />
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-soft)',
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                Board horizontal (1920 × 1080) · Clic para ampliar
              </p>
            </div>

            <div>
              <h1 style={{ fontSize: 28, lineHeight: 1.2, marginBottom: 12 }}>
                {proyecto.nombre}
              </h1>

                <div className="chip-row" style={{ marginBottom: 14 }}>
                  {getProyectoCategorias(proyecto).map((cat) => (
                    <span key={cat} className="chip">
                      {cat}
                    </span>
                  ))}
                  {curso && <span className="chip">{curso.nombre}</span>}
                </div>

                <p style={{ fontSize: 14, marginBottom: 14 }}>
                  <strong>Alumnos:</strong> {nombresIntegrantes}
                </p>

                <p
                  style={{
                    fontSize: 15,
                    color: 'var(--text-muted)',
                    whiteSpace: 'pre-line',
                    marginBottom: 20,
                  }}
                >
                  {proyecto.descripcion}
                </p>

                {proyecto.pdf && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => triggerPdfDownload(proyecto.pdf!)}
                  >
                    Abrir PDF ({proyecto.pdf.nombre})
                  </button>
                )}
            </div>
          </section>

          {embedUrl && (
            <section className="card">
              <h2 style={{ fontSize: 18, marginBottom: 14 }}>Videocaso</h2>
              <iframe
                className="video-embed"
                src={embedUrl}
                title={`Videocaso · ${proyecto.nombre}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </section>
          )}

          {proyecto.imagenes.length > 0 && (
            <section className="card">
              <h2 style={{ fontSize: 18, marginBottom: 14 }}>Más imágenes</h2>
              <div className="gallery-grid">
                {proyecto.imagenes.map((imgSrc, idx) => (
                  <img
                    key={`${idx}-${imgSrc.slice(-16)}`}
                    src={resolveAssetUrl(imgSrc)}
                    alt={`${proyecto.nombre} · imagen ${idx + 1}`}
                    className="gallery-grid__img"
                    onClick={() => setLightboxIndex(idx + 1)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Columna derecha */}
        <aside className="sticky-aside" ref={panelRef}>
          {/* Círculo oscuro con promedio general */}
          <div className="card score-circle-card">
            <div className="score-circle" data-testid="promedio-general-circle">
              {formatearPromedio(resumenGeneral.promedio)}
            </div>
            <div>
              <h2 style={{ fontSize: 16 }}>Promedio general</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {resumenGeneral.cantidadEvaluaciones === 0
                  ? 'Sin evaluaciones todavía'
                  : `Basado en ${resumenGeneral.cantidadEvaluaciones} ${
                      resumenGeneral.cantidadEvaluaciones === 1
                        ? 'evaluación'
                        : 'evaluaciones'
                    }`}
              </p>
            </div>
          </div>

          {/* Formulario Tu evaluación (solo profesores) */}
          {esProfesor ? (
            <form className="card" onSubmit={handleSaveEvaluacion}>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>Tu evaluación</h2>

              {criterios.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  No hay criterios configurados por administración.
                </p>
              ) : (
                <div>
                  {criterios.map((crit) => {
                    const currentVal = puntajes[crit.id] ?? 0;
                    return (
                      <div key={crit.id} className="criterion-row">
                        <div className="criterion-row__top">
                          <span style={{ fontSize: 14, fontWeight: 500 }}>
                            {crit.nombre}
                          </span>
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color:
                                currentVal > 0
                                  ? 'var(--accent-blue)'
                                  : 'var(--text-soft)',
                              minWidth: 24,
                              textAlign: 'right',
                            }}
                          >
                            {currentVal > 0 ? currentVal : '—'}
                          </span>
                        </div>
                        <StarRating
                          value={currentVal}
                          label={crit.nombre}
                          onChange={(val) => handleSetPuntaje(crit.id, val)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tu promedio automático */}
              <div
                style={{
                  borderTop: '2px solid var(--text-main)',
                  marginTop: 10,
                  paddingTop: 12,
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  Tu promedio (automático)
                </span>
                <span
                  style={{ fontSize: 22, fontWeight: 800 }}
                  data-testid="mi-promedio-vivo"
                >
                  {formatearPromedio(miPromedioEnVivo)}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="eval-comentario">
                  Comentario
                </label>
                <textarea
                  id="eval-comentario"
                  className="textarea"
                  placeholder="Devolución, notas, fortalezas y qué mejorar..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
              </div>

              {formError && (
                <p className="form-error" style={{ marginBottom: 12 }}>
                  {formError}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn--primary">
                  {evaluacionPropia ? 'Actualizar' : 'Guardar evaluación'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleLimpiar}
                >
                  Limpiar
                </button>
              </div>
            </form>
          ) : (
            <div className="card">
              <h2 style={{ fontSize: 16, marginBottom: 6 }}>Modo lectura</h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Estás viendo la ficha como administrador. Para puntuar el proyecto, cambiá al rol Profesor en el menú superior.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Sección de comentarios para alumnos (privada entre cada profesor y el equipo) */}
      <ProyectoComentariosSection proyecto={proyecto} />

      {/* Debajo a todo el ancho: Evaluaciones de profesores (N) */}
      <section className="card" style={{ marginTop: 24 }}>
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
          <h2 style={{ fontSize: 18 }}>
            Evaluaciones de profesores ({evaluacionesProyecto.length})
          </h2>
          <span className="chip chip--blue">
            {esProfesor
              ? 'Puntajes docentes · Comentarios de otros profesores ocultos'
              : 'Visibles para administración'}
          </span>
        </div>

        {evaluacionesProyecto.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Todavía ningún profesor evaluó este proyecto.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {evaluacionesProyecto.map((ev) => {
              const prof = getUsuarioById(ev.profesorId);
              const profNombre = prof
                ? `${prof.nombre} ${prof.apellido}`
                : 'Profesor';
              const esMia = esProfesor && ev.profesorId === usuario.id;
              const puedeVerTextoEval = usuario.rol === 'admin' || esMia;
              const promEv = calcularPromedioEvaluacion(ev, criterios);
              const isExpanded = Boolean(expandedEvalIds[ev.id]);

              return (
                <article
                  key={ev.id}
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <strong>
                        {profNombre} {esMia ? '(vos)' : ''}
                      </strong>
                      <span
                        style={{
                          color: 'var(--text-soft)',
                          fontSize: 13,
                          marginLeft: 8,
                        }}
                      >
                        · {formatFecha(ev.fecha)}
                      </span>
                    </div>

                    {promEv !== null && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <strong
                          style={{
                            color: 'var(--accent-blue)',
                            fontSize: 16,
                          }}
                        >
                          {formatearPromedio(promEv)}
                        </strong>
                        <StarRating value={promEv} readOnly />
                      </div>
                    )}
                  </div>

                  {ev.comentario && puedeVerTextoEval && (
                    <p
                      style={{
                        marginTop: 8,
                        color: 'var(--text-main)',
                        fontSize: 14,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {ev.comentario}
                    </p>
                  )}

                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => toggleDesglose(ev.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 0',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {isExpanded ? '▾' : '▸'} Ver puntaje por criterio
                    </button>

                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 12,
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 8,
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: 8,
                          fontSize: 13,
                        }}
                      >
                        {criterios.map((crit) => (
                          <div
                            key={crit.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 8,
                            }}
                          >
                            <span style={{ color: 'var(--text-muted)' }}>
                              {crit.nombre}:
                            </span>
                            <strong>{ev.puntajes[crit.id] ?? '—'}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {esMia && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 14,
                        marginTop: 8,
                        fontSize: 13,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          panelRef.current?.scrollIntoView({
                            behavior: 'smooth',
                          })
                        }
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--accent-blue)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteOpen(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal confirmar eliminar evaluación */}
      {confirmDeleteOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmDeleteOpen(false)}
        >
          <div
            className="modal-panel"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 19, marginBottom: 10 }}>
              ¿Eliminar tu evaluación?
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 22 }}>
              El promedio general del proyecto se va a recalcular con las evaluaciones restantes.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleDeletePropia}
              >
                Eliminar evaluación
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={allLightboxImages}
          activeIndex={lightboxIndex}
          title={proyecto.nombre}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={(next) => setLightboxIndex(next)}
        />
      )}
    </Layout>
  );
};
