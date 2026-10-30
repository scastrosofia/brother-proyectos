import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { formatFecha } from '../../lib/assets';
import {
  deleteFestival,
  getFestivales,
  getInscripciones,
} from '../../lib/store';
import type { Festival } from '../../types/models';

const ESTADO_LABELS: Record<Festival['estado'], string> = {
  abierto: 'Abierto',
  borrador: 'Borrador',
  cerrado: 'Cerrado',
};

export const AdminFestivales: React.FC = () => {
  const [aEliminar, setAEliminar] = useState<Festival | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const festivales = getFestivales();

  const handleConfirmDelete = () => {
    if (!aEliminar) return;
    deleteFestival(aEliminar.id);
    setFlash(`Se eliminó el festival "${aEliminar.nombre}".`);
    setAEliminar(null);
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Festivales{' '}
            <span className="page-title__count">({festivales.length})</span>
          </h1>
          <p className="page-subtitle">
            Administrá las convocatorias internas, categorías, briefs e inscripciones.
          </p>
        </div>

        <Link to="/admin/festivales/nuevo" className="btn btn--primary">
          + Nuevo festival
        </Link>
      </div>

      {flash && (
        <div className="alert-banner alert-banner--success" role="status">
          <span>{flash}</span>
          <button
            type="button"
            className="btn"
            style={{ minHeight: 34, padding: '0 10px' }}
            onClick={() => setFlash(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {festivales.length === 0 ? (
        <div className="empty-state">
          <h2 style={{ fontSize: 19, marginBottom: 8 }}>
            Todavía no hay festivales cargados
          </h2>
          <Link to="/admin/festivales/nuevo" className="btn btn--primary">
            + Nuevo festival
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Festival</th>
                <th>Estado</th>
                <th>Deadline</th>
                <th>Categorías</th>
                <th>Inscripciones</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {festivales.map((fest) => {
                const inscCount = getInscripciones({
                  festivalId: fest.id,
                }).length;

                return (
                  <tr key={fest.id}>
                    <td>
                      <Link
                        to={`/admin/festivales/${fest.id}`}
                        style={{ fontWeight: 600, fontSize: 15 }}
                      >
                        {fest.nombre}
                      </Link>
                      {fest.bajada && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            marginTop: 2,
                            maxWidth: 420,
                          }}
                        >
                          {fest.bajada}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`chip chip--status-${fest.estado}`}>
                        {ESTADO_LABELS[fest.estado]}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatFecha(fest.deadline)}
                    </td>
                    <td>{fest.categorias.length}</td>
                    <td>
                      <strong>{inscCount}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Link
                          to={`/admin/festivales/${fest.id}`}
                          className="btn"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          className="btn btn--danger-outline"
                          onClick={() => setAEliminar(fest)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {aEliminar && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setAEliminar(null)}
        >
          <div
            className="modal-panel"
            style={{ maxWidth: 450 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 19, marginBottom: 10 }}>
              ¿Eliminar "{aEliminar.nombre}"?
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 22 }}>
              Se borrará el festival junto con todas las inscripciones registradas en él.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setAEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleConfirmDelete}
              >
                Eliminar festival
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
