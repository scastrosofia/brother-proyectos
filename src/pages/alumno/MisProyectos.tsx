import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { InscribirModal } from '../../components/InscribirModal';
import { Layout } from '../../components/Layout';
import { useSession } from '../../context/SessionContext';
import { formatFecha, resolveAssetUrl } from '../../lib/assets';
import {
  deleteProyecto,
  getCursoById,
  getInscripciones,
  getProyectosByAlumno,
  getUsuarioById,
} from '../../lib/store';
import type { Proyecto } from '../../types/models';

export const MisProyectos: React.FC = () => {
  const { usuario } = useSession();
  const [inscribirProyectoId, setInscribirProyectoId] = useState<string | null>(
    null
  );
  const [proyectoAEliminar, setProyectoAEliminar] = useState<Proyecto | null>(
    null
  );
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const misProyectos = getProyectosByAlumno(usuario.id);

  const handleConfirmDelete = () => {
    if (!proyectoAEliminar) return;
    deleteProyecto(proyectoAEliminar.id);
    setFlashMessage(`Se eliminó el proyecto "${proyectoAEliminar.nombre}".`);
    setProyectoAEliminar(null);
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Mis proyectos{' '}
            <span className="page-title__count">({misProyectos.length})</span>
          </h1>
          <p className="page-subtitle">
            Ves los proyectos en los que figurás como integrante.
          </p>
        </div>

        <Link to="/proyecto/nuevo" className="btn btn--primary">
          + Cargar proyecto
        </Link>
      </div>

      {flashMessage && (
        <div className="alert-banner alert-banner--success" role="status">
          <span>{flashMessage}</span>
          <button
            type="button"
            className="btn"
            style={{ minHeight: 34, padding: '0 10px' }}
            onClick={() => setFlashMessage(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {misProyectos.length === 0 ? (
        <div className="empty-state">
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>
            Todavía no cargaste ningún proyecto
          </h2>
          <p
            style={{
              color: 'var(--text-muted)',
              maxWidth: 460,
              margin: '0 auto 20px',
            }}
          >
            Subí tu primer board, sumá a tu dupla si trabajaron en equipo e inscribilo en los festivales abiertos de la escuela.
          </p>
          <Link to="/proyecto/nuevo" className="btn btn--primary">
            + Cargar proyecto
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {misProyectos.map((proj) => {
            const curso = getCursoById(proj.cursoId);
            const nombresIntegrantes = proj.integrantes
              .map((uid) => {
                const u = getUsuarioById(uid);
                return u ? `${u.nombre} ${u.apellido}` : null;
              })
              .filter(Boolean)
              .join(', ');

            const inscripciones = getInscripciones({ proyectoId: proj.id });
            const totalFestivales = inscripciones.length;
            const totalCategorias = inscripciones.reduce(
              (acc, item) => acc + item.categoriaIds.length,
              0
            );

            return (
              <article key={proj.id} className="card project-row-card">
                <Link to={`/proyecto/${proj.id}`} aria-label={`Ver ${proj.nombre}`}>
                  <img
                    src={resolveAssetUrl(proj.boardImg)}
                    alt={`Board de ${proj.nombre}`}
                    className="project-row-card__thumb"
                  />
                </Link>

                <div>
                  <div className="project-row-card__top">
                    <h2 style={{ fontSize: 20 }}>
                      <Link
                        to={`/proyecto/${proj.id}`}
                        style={{ color: 'var(--text-main)' }}
                      >
                        {proj.nombre}
                      </Link>
                    </h2>
                    <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                      Actualizado {formatFecha(proj.actualizadoEn)}
                    </span>
                  </div>

                  <div className="chip-row" style={{ marginTop: 8 }}>
                    <span className="chip">{proj.categoria}</span>
                    {curso && <span className="chip">{curso.nombre}</span>}
                  </div>

                  <p
                    style={{
                      marginTop: 12,
                      fontSize: 14,
                      color: 'var(--text-muted)',
                    }}
                  >
                    <strong>Alumnos:</strong> {nombresIntegrantes}
                  </p>

                  <p
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: 'var(--text-soft)',
                    }}
                  >
                    {totalFestivales === 0
                      ? '0 inscripciones a festivales'
                      : `${totalFestivales} ${
                          totalFestivales === 1
                            ? 'inscripción a festival'
                            : 'inscripciones a festivales'
                        } (${totalCategorias} ${
                          totalCategorias === 1 ? 'categoría' : 'categorías'
                        })`}
                  </p>

                  <div className="project-row-card__actions">
                    <Link to={`/proyecto/${proj.id}`} className="btn">
                      Ver
                    </Link>
                    <Link to={`/proyecto/${proj.id}/editar`} className="btn">
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setInscribirProyectoId(proj.id)}
                    >
                      Inscribir en festival
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger-outline"
                      onClick={() => setProyectoAEliminar(proj)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal C3 de inscripción */}
      <InscribirModal
        open={Boolean(inscribirProyectoId)}
        initialProyectoId={inscribirProyectoId ?? undefined}
        onClose={() => setInscribirProyectoId(null)}
        onSuccess={() =>
          setFlashMessage('Inscripción confirmada correctamente.')
        }
      />

      {/* Modal de confirmación para eliminar proyecto */}
      {proyectoAEliminar && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-proj-title"
          onClick={() => setProyectoAEliminar(null)}
        >
          <div
            className="modal-panel"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-proj-title" style={{ fontSize: 20, marginBottom: 10 }}>
              ¿Eliminar "{proyectoAEliminar.nombre}"?
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              Esta acción borra el proyecto y también retira sus inscripciones a festivales. No se puede deshacer.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setProyectoAEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleConfirmDelete}
              >
                Eliminar proyecto
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
