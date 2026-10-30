import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useSession } from '../../context/SessionContext';
import { formatFecha, resolveAssetUrl } from '../../lib/assets';
import { getFestivales, getInscripciones } from '../../lib/store';

export const FestivalesList: React.FC = () => {
  const { usuario } = useSession();
  const [filtroEstado, setFiltroEstado] = useState<'abierto' | 'cerrado'>(
    'abierto'
  );

  // Orden por deadline más cercano primero (getFestivales ya ordena asc por deadline)
  const todos = getFestivales().filter((f) => f.estado === filtroEstado);
  const esAlumno = usuario.rol === 'alumno';

  const misInscripciones = esAlumno
    ? getInscripciones({ alumnoId: usuario.id })
    : [];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Festivales</h1>
          <p className="page-subtitle">
            {esAlumno
              ? 'Concursos internos a los que podés inscribir tus proyectos desde la plataforma.'
              : 'Convocatorias cargadas por la escuela para postulación de proyectos.'}
          </p>
        </div>
      </div>

      {/* Píldoras Abiertos / Cerrados */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div className="pill-group" role="tablist" aria-label="Estado de festivales">
          <button
            type="button"
            role="tab"
            aria-selected={filtroEstado === 'abierto'}
            className={`pill ${filtroEstado === 'abierto' ? 'pill--active' : ''}`}
            onClick={() => setFiltroEstado('abierto')}
          >
            Abiertos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filtroEstado === 'cerrado'}
            className={`pill ${filtroEstado === 'cerrado' ? 'pill--active' : ''}`}
            onClick={() => setFiltroEstado('cerrado')}
          >
            Cerrados
          </button>
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
          Ordenados por deadline más cercano
        </span>
      </div>

      {todos.length === 0 ? (
        <div className="empty-state">
          <h2 style={{ fontSize: 19, marginBottom: 6 }}>
            No hay festivales {filtroEstado === 'abierto' ? 'abiertos' : 'cerrados'}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Probá cambiar el filtro superior para consultar otras ediciones.
          </p>
        </div>
      ) : (
        <div className="festivals-grid">
          {todos.map((fest) => {
            const catsVisibles = fest.categorias.slice(0, 2);
            const catsRestantes = fest.categorias.length - catsVisibles.length;

            const cantMias = esAlumno
              ? misInscripciones.filter((i) => i.festivalId === fest.id).length
              : 0;

            return (
              <article key={fest.id} className="festival-card">
                {fest.logo ? (
                  <img
                    src={resolveAssetUrl(fest.logo)}
                    alt={fest.nombre}
                    className="festival-card__visual"
                  />
                ) : (
                  <div
                    className="festival-card__visual"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#1f1f1d',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: 22,
                      padding: 20,
                      textAlign: 'center',
                    }}
                  >
                    {fest.nombre}
                  </div>
                )}

                <div className="festival-card__body">
                  <h2 style={{ fontSize: 20 }}>{fest.nombre}</h2>
                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--text-muted)',
                      flex: 1,
                    }}
                  >
                    {fest.bajada}
                  </p>

                  <div className="chip-row">
                    {catsVisibles.map((c) => (
                      <span key={c.id} className="chip">
                        {c.nombre}
                      </span>
                    ))}
                    {catsRestantes > 0 && (
                      <span className="chip">+{catsRestantes}</span>
                    )}
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: 12,
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 13,
                    }}
                  >
                    <span>
                      <strong>Deadline:</strong> {formatFecha(fest.deadline)}
                    </span>
                    {esAlumno && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {cantMias === 0
                          ? 'Sin inscripciones'
                          : `${cantMias} ${
                              cantMias === 1
                                ? 'inscripción tuya'
                                : 'inscripciones tuyas'
                            }`}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/festival/${fest.id}`}
                    className="btn btn--primary btn--full"
                  >
                    Ver festival
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Layout>
  );
};
