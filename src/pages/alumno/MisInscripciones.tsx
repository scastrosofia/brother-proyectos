import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useSession } from '../../context/SessionContext';
import { formatFecha, resolveAssetUrl } from '../../lib/assets';
import {
  deleteInscripcion,
  getFestivalById,
  getInscripciones,
  getProyectoById,
} from '../../lib/store';
import { getProyectoCategorias } from '../../types/models';

export const MisInscripciones: React.FC = () => {
  const { usuario } = useSession();
  const [flash, setFlash] = useState<string | null>(null);

  const inscripciones = getInscripciones({ alumnoId: usuario.id });

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Mis inscripciones{' '}
            <span className="page-title__count">({inscripciones.length})</span>
          </h1>
          <p className="page-subtitle">
            Inscripciones a festivales internos de los proyectos donde participás.
          </p>
        </div>

        <Link to="/festivales" className="btn btn--primary">
          Ver festivales abiertos
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

      {inscripciones.length === 0 ? (
        <div className="empty-state">
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>
            Todavía no tenés inscripciones en festivales
          </h2>
          <p
            style={{
              color: 'var(--text-muted)',
              maxWidth: 460,
              margin: '0 auto 20px',
            }}
          >
            Revisá los festivales abiertos, leé el brief y postulá tus proyectos en las categorías que correspondan.
          </p>
          <Link to="/festivales" className="btn btn--primary">
            Explorar festivales
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Festival</th>
                <th>Categorías inscriptas</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inscripciones.map((insc) => {
                const proj = getProyectoById(insc.proyectoId);
                const fest = getFestivalById(insc.festivalId);
                if (!proj || !fest) return null;

                const cats = insc.categoriaIds.map(
                  (cid) =>
                    fest.categorias.find((c) => c.id === cid)?.nombre ?? cid
                );

                return (
                  <tr key={insc.id}>
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                      >
                        <img
                          src={resolveAssetUrl(proj.boardImg)}
                          alt={proj.nombre}
                          style={{
                            width: 84,
                            aspectRatio: '16 / 9',
                            objectFit: 'cover',
                            borderRadius: 4,
                            border: '1px solid var(--border-color)',
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <Link
                            to={`/proyecto/${proj.id}`}
                            style={{ fontWeight: 600 }}
                          >
                            {proj.nombre}
                          </Link>
                          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                            {getProyectoCategorias(proj).join(' · ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Link to={`/festival/${fest.id}`} style={{ fontWeight: 600 }}>
                        {fest.nombre}
                      </Link>
                      <div>
                        <span
                          className={`chip chip--status-${fest.estado}`}
                          style={{ marginTop: 4 }}
                        >
                          {fest.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="chip-row">
                        {cats.map((cName) => (
                          <span key={cName} className="chip">
                            {cName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {formatFecha(insc.fecha)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {fest.estado === 'abierto' && (
                        <button
                          type="button"
                          className="btn btn--danger-outline"
                          onClick={() => {
                            deleteInscripcion(insc.id);
                            setFlash(
                              `Se retiró "${proj.nombre}" de ${fest.nombre}.`
                            );
                          }}
                        >
                          Retirar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};
