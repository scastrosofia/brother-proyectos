import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { NotificacionesPanel } from '../../components/NotificacionesPanel';
import { useSession } from '../../context/SessionContext';
import { formatFecha } from '../../lib/assets';
import {
  getComentariosDeMisProyectos,
  getInscripciones,
  getProyectoById,
  getProyectosByAlumno,
  getTagsDeMisProyectos,
  getUsuarioById,
} from '../../lib/store';

export const AlumnoDashboard: React.FC = () => {
  const { usuario } = useSession();

  const misProyectos = getProyectosByAlumno(usuario.id);
  const comentarios = getComentariosDeMisProyectos(usuario.id);
  const tags = getTagsDeMisProyectos(usuario.id);
  const misInscripciones = getInscripciones({ alumnoId: usuario.id });

  const sinLeerCount = comentarios.filter((c) => !c.leido).length;
  const solucionadosCount = comentarios.filter((c) => c.solucionado).length;
  const tagsPendientesCount = tags.filter((t) => !t.atendido).length;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi dashboard</h1>
          <p className="page-subtitle">
            Notificaciones de comentarios de profesores y seguimiento de tus proyectos.
          </p>
        </div>

        <Link to="/mis-proyectos" className="btn btn--primary">
          Ver mis proyectos
        </Link>
      </div>

      {/* Panel de Notificaciones idéntico a la referencia */}
      <NotificacionesPanel emptyMessage="No tenés notificaciones nuevas de comentarios de profesores." />

      {/* KPIs del alumno */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Mis proyectos</div>
          <div className="kpi-card__value">{misProyectos.length}</div>
          <div className="kpi-card__sub">
            {misInscripciones.length}{' '}
            {misInscripciones.length === 1
              ? 'inscripción activa a festival'
              : 'inscripciones activas a festivales'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">Comentarios recibidos</div>
          <div className="kpi-card__value">{comentarios.length}</div>
          <div className="kpi-card__sub">
            {sinLeerCount === 0
              ? 'Todos leídos'
              : `${sinLeerCount} sin leer`}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">Comentarios solucionados</div>
          <div className="kpi-card__value">
            {solucionadosCount} / {comentarios.length}
          </div>
          <div className="kpi-card__sub">
            {comentarios.length - solucionadosCount === 0
              ? 'Sin ajustes pendientes'
              : `${comentarios.length - solucionadosCount} pendientes de resolver`}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">Profesores taggeados</div>
          <div className="kpi-card__value">{tags.length}</div>
          <div className="kpi-card__sub">
            {tagsPendientesCount === 0
              ? 'Todos respondidos'
              : `${tagsPendientesCount} esperando devolución`}
          </div>
        </div>
      </div>

      {/* Resumen rápido de comentarios en mis proyectos */}
      <section className="report-section" style={{ marginBottom: 0 }}>
        <h2 className="report-section__title">
          Comentarios recientes en mis proyectos
        </h2>

        {comentarios.length === 0 ? (
          <div className="card" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Todavía no recibiste comentarios en tus proyectos. Entrá a cualquiera de tus proyectos para taggear a un profesor y pedirle devolución.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="ff-report-table">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Profesor</th>
                  <th>Comentario</th>
                  <th>Lectura</th>
                  <th>Estado</th>
                  <th className="col-num">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {comentarios.slice(0, 10).map((com) => {
                  const proy = getProyectoById(com.proyectoId);
                  const prof = getUsuarioById(com.profesorId);
                  const profNombre = prof
                    ? `${prof.nombre} ${prof.apellido}`
                    : 'Profesor';

                  return (
                    <tr key={com.id}>
                      <td style={{ fontWeight: 600 }}>
                        {proy ? (
                          <Link to={`/proyecto/${proy.id}`}>{proy.nombre}</Link>
                        ) : (
                          'Proyecto'
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{profNombre}</td>
                      <td style={{ maxWidth: 360 }}>
                        <span
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: 14,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {com.texto}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span
                          className={`chip ${
                            com.leido ? 'chip--read' : 'chip--unread'
                          }`}
                        >
                          {com.leido ? '✓ Leído' : '● Sin leer'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span
                          className={`chip ${
                            com.solucionado ? 'chip--solved' : 'chip--pending'
                          }`}
                        >
                          {com.solucionado ? '✓ Solucionado' : 'Pendiente'}
                        </span>
                      </td>
                      <td
                        className="col-num"
                        style={{ color: 'var(--text-soft)', fontSize: 13 }}
                      >
                        {formatFecha(com.fecha)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Layout>
  );
};
