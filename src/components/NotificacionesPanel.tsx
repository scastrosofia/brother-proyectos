import React from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import {
  descartarNotificacion,
  getNotificacionesUsuario,
  getProyectoById,
  getUsuarioById,
  limpiarNotificacionesUsuario,
} from '../lib/store';
import type { Notificacion } from '../types/models';

const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function formatNotifFecha(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate;
  const [, month, day] = parts;
  const mes = MESES_LARGOS[month - 1] ?? '';
  return `${day} de ${mes}`;
}

export const NotificacionesPanel: React.FC<{
  emptyMessage?: string;
}> = ({
  emptyMessage = 'No tenés notificaciones pendientes.',
}) => {
  const { usuario } = useSession();
  const notificaciones = getNotificacionesUsuario(usuario.id);

  const renderIcon = (tipo: Notificacion['tipo']) => {
    if (tipo === 'tag_profesor' || tipo === 'comentario_solucionado') {
      return (
        <span className="notif-item__icon notif-item__icon--green" aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="7" y1="9" x2="11" y2="9" />
            <line x1="7" y1="13" x2="17" y2="13" />
            <line x1="7" y1="17" x2="14" y2="17" />
          </svg>
        </span>
      );
    }

    return (
      <span className="notif-item__icon notif-item__icon--blue" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </span>
    );
  };

  return (
    <section
      className="notif-panel"
      aria-label="Notificaciones"
      data-testid="notificaciones-panel"
    >
      <div className="notif-panel__header">
        <h2 className="notif-panel__title">
          Notificaciones
          {notificaciones.length > 0 && (
            <span className="notif-panel__count">{notificaciones.length}</span>
          )}
        </h2>

        <button
          type="button"
          className="notif-panel__clear-btn"
          disabled={notificaciones.length === 0}
          onClick={() => limpiarNotificacionesUsuario(usuario.id)}
        >
          Limpiar notificaciones
        </button>
      </div>

      {notificaciones.length === 0 ? (
        <div className="notif-panel__empty">{emptyMessage}</div>
      ) : (
        <div className="notif-panel__list">
          {notificaciones.map((notif) => {
            const autor = getUsuarioById(notif.autorId);
            const autorNombre = autor
              ? `${autor.nombre} ${autor.apellido}`
              : 'Un usuario';
            const proyecto = getProyectoById(notif.proyectoId);
            const proyectoNombre = proyecto?.nombre ?? 'Proyecto';
            const targetPath =
              usuario.rol === 'alumno'
                ? `/proyecto/${notif.proyectoId}`
                : `/evaluar/${notif.proyectoId}`;

            return (
              <div key={notif.id} className="notif-item">
                {renderIcon(notif.tipo)}

                <div>
                  <div className="notif-item__text">
                    {notif.tipo === 'tag_profesor' && (
                      <>
                        <strong>{autorNombre}</strong> te taggeó en el proyecto{' '}
                        <Link to={targetPath} style={{ fontWeight: 700 }}>
                          {proyectoNombre}
                        </Link>{' '}
                        para que lo revises y dejes un comentario.
                        {notif.detalle && (
                          <span className="notif-item__quote">
                            «{notif.detalle}»
                          </span>
                        )}
                      </>
                    )}

                    {notif.tipo === 'nuevo_comentario' && (
                      <>
                        <strong>{autorNombre}</strong> dejó un comentario en tu
                        proyecto{' '}
                        <Link to={targetPath} style={{ fontWeight: 700 }}>
                          {proyectoNombre}
                        </Link>
                        .
                        {notif.detalle && (
                          <span className="notif-item__quote">
                            «{notif.detalle}»
                          </span>
                        )}
                      </>
                    )}

                    {notif.tipo === 'comentario_solucionado' && (
                      <>
                        <strong>{autorNombre}</strong> marcó como{' '}
                        <strong>solucionado</strong> tu comentario en el proyecto{' '}
                        <Link to={targetPath} style={{ fontWeight: 700 }}>
                          {proyectoNombre}
                        </Link>
                        .
                        {notif.detalle && (
                          <span className="notif-item__quote">
                            «{notif.detalle}»
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="notif-item__date">
                    {formatNotifFecha(notif.fecha)}
                  </div>
                </div>

                <button
                  type="button"
                  className="notif-item__close"
                  aria-label="Descartar notificación"
                  title="Descartar notificación"
                  onClick={() => descartarNotificacion(notif.id)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
