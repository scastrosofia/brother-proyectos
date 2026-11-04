import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InscribirModal } from '../../components/InscribirModal';
import { Layout } from '../../components/Layout';
import { useSession } from '../../context/SessionContext';
import { diasRestantes, formatFecha, resolveAssetUrl } from '../../lib/assets';
import {
  getFestivalById,
  getInscripciones,
  getProyectoById,
  retirarCategoriaInscripcion,
} from '../../lib/store';

type SectionKey =
  | 'brief'
  | 'reglas'
  | 'categorias'
  | 'criterios'
  | 'faq';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'brief', label: 'Brief' },
  { key: 'reglas', label: 'Reglas / bases' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'criterios', label: 'Criterios de evaluación' },
  { key: 'faq', label: 'Preguntas frecuentes' },
];

export const FestivalDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useSession();

  const [activeSection, setActiveSection] = useState<SectionKey>('brief');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  const festival = id ? getFestivalById(id) : undefined;

  if (!festival) {
    return (
      <Layout>
        <Link to="/festivales" className="back-link">
          ← Festivales
        </Link>
        <div className="empty-state">
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>
            Festival no encontrado
          </h1>
          <Link to="/festivales" className="btn btn--primary">
            Volver a Festivales
          </Link>
        </div>
      </Layout>
    );
  }

  const esAlumno = usuario.rol === 'alumno';
  const estaAbierto = festival.estado === 'abierto';
  const dias = diasRestantes(festival.deadline);

  const misInscripcionesEnFestival = esAlumno
    ? getInscripciones({
        festivalId: festival.id,
        alumnoId: usuario.id,
      })
    : [];

  const scrollToSection = (key: SectionKey) => {
    setActiveSection(key);
    const el = document.getElementById(`fest-sec-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Layout fullBleed>
      {/* Encabezado C2 */}
      <div className="festival-detail-header">
        <div className="festival-detail-header__inner">
          {festival.logo ? (
            <img
              src={resolveAssetUrl(festival.logo)}
              alt={festival.nombre}
              style={{
                width: 120,
                height: 120,
                objectFit: 'cover',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
              }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 8,
                background: '#1f1f1d',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 16,
                textAlign: 'center',
                padding: 12,
              }}
            >
              {festival.nombre}
            </div>
          )}

          <div>
            <Link to="/festivales" className="back-link">
              ← Festivales
            </Link>
            <h1 style={{ fontSize: 32, lineHeight: 1.15, marginBottom: 8 }}>
              {festival.nombre}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-muted)' }}>
              {festival.bajada}
              {festival.web && (
                <>
                  {' · '}
                  <a
                    href={festival.web}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Web oficial ↗
                  </a>
                </>
              )}
            </p>
          </div>

          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 10,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Deadline de inscripción
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                marginTop: 2,
                marginBottom: 4,
              }}
            >
              {formatFecha(festival.deadline)}
            </div>
            <div
              style={{
                fontSize: 13,
                color: estaAbierto ? 'var(--text-muted)' : 'var(--danger)',
                marginBottom: esAlumno && estaAbierto ? 14 : 0,
              }}
            >
              {!estaAbierto
                ? 'Convocatoria cerrada'
                : dias > 1
                  ? `Faltan ${dias} días`
                  : dias === 1
                    ? 'Falta 1 día'
                    : dias === 0
                      ? 'Cierra hoy'
                      : 'Abierto para inscripción'}
            </div>

            {esAlumno && estaAbierto && (
              <button
                type="button"
                className="btn btn--primary btn--full"
                onClick={() => setModalOpen(true)}
              >
                Inscribir proyecto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cuerpo con menú lateral de anclas */}
      <div className="page-shell">
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

        <div className="festival-detail-body">
          <nav className="anchor-nav" aria-label="Secciones del festival">
            {SECTIONS.map((sec) => (
              <button
                key={sec.key}
                type="button"
                onClick={() => scrollToSection(sec.key)}
                className={`anchor-nav__link ${
                  activeSection === sec.key ? 'anchor-nav__link--active' : ''
                }`}
                style={{
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  background:
                    activeSection === sec.key ? 'var(--bg-dark)' : 'transparent',
                }}
              >
                {sec.label}
              </button>
            ))}
          </nav>

          <div>
            {/* Brief */}
            <section id="fest-sec-brief" className="card">
              <h2 style={{ fontSize: 19, marginBottom: 10 }}>Brief</h2>
              <p
                style={{
                  color: 'var(--text-muted)',
                  whiteSpace: 'pre-line',
                }}
              >
                {festival.brief || 'Sin brief cargado.'}
              </p>
            </section>

            {/* Reglas */}
            <section id="fest-sec-reglas" className="card">
              <h2 style={{ fontSize: 19, marginBottom: 10 }}>Reglas / bases</h2>
              <p
                style={{
                  color: 'var(--text-muted)',
                  whiteSpace: 'pre-line',
                }}
              >
                {festival.reglas || 'Sin reglas cargadas.'}
              </p>
            </section>

            {/* Categorías */}
            <section id="fest-sec-categorias" className="card">
              <h2 style={{ fontSize: 19, marginBottom: 14 }}>Categorías</h2>
              {festival.categorias.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>
                  No hay categorías definidas.
                </p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 14,
                  }}
                >
                  {festival.categorias.map((cat) => (
                    <div
                      key={cat.id}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <h3 style={{ fontSize: 15, marginBottom: 4 }}>
                        {cat.nombre}
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {cat.descripcion || 'Board de presentación'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Criterios de evaluación */}
            <section id="fest-sec-criterios" className="card">
              <h2 style={{ fontSize: 19, marginBottom: 12 }}>
                Criterios de evaluación
              </h2>
              {festival.criterios.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>
                  Se evalúa según la grilla general de la escuela.
                </p>
              ) : (
                <div className="chip-row">
                  {festival.criterios.map((crit, idx) => (
                    <span
                      key={`${idx}-${crit}`}
                      className="chip"
                      style={{ fontSize: 13, padding: '6px 12px' }}
                    >
                      {crit}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Preguntas frecuentes (acordeón) */}
            <section id="fest-sec-faq" className="card">
              <h2 style={{ fontSize: 19, marginBottom: 10 }}>
                Preguntas frecuentes
              </h2>
              {festival.faq.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>
                  No hay preguntas frecuentes cargadas para este festival.
                </p>
              ) : (
                <div>
                  {festival.faq.map((item, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div key={idx} className="faq-item">
                        <button
                          type="button"
                          className="faq-item__btn"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenFaqIndex(isOpen ? null : idx)
                          }
                        >
                          <span>
                            {isOpen ? '▼' : '▸'} {item.pregunta}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="faq-item__answer">
                            {item.respuesta}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Para alumnos: Tus inscripciones en este festival */}
            {esAlumno && (
              <section className="card">
                <h2 style={{ fontSize: 19, marginBottom: 12 }}>
                  Tus inscripciones en este festival
                </h2>
                {misInscripcionesEnFestival.length === 0 ? (
                  <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    Todavía no inscribiste ningún proyecto en {festival.nombre}.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {misInscripcionesEnFestival.flatMap((insc) => {
                      const proj = getProyectoById(insc.proyectoId);
                      if (!proj) return [];
                      return insc.categoriaIds.map((catId) => {
                        const catNombre =
                          festival.categorias.find((c) => c.id === catId)
                            ?.nombre ?? catId;
                        return (
                          <div
                            key={`${insc.id}-${catId}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              padding: '10px 14px',
                              border: '1px solid var(--border-color)',
                              borderRadius: 8,
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ fontSize: 14 }}>
                              <Link
                                to={`/proyecto/${proj.id}`}
                                style={{ fontWeight: 600 }}
                              >
                                {proj.nombre}
                              </Link>{' '}
                              → {catNombre} ·{' '}
                              <span style={{ color: 'var(--text-soft)' }}>
                                Inscripto el {formatFecha(insc.fecha)}
                              </span>
                            </span>

                            {estaAbierto && (
                              <button
                                type="button"
                                onClick={() => {
                                  retirarCategoriaInscripcion(insc.id, catId);
                                  setFlashMsg(
                                    `Se retiró "${proj.nombre}" de la categoría "${catNombre}".`
                                  );
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--accent-blue)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: 14,
                                }}
                              >
                                Retirar
                              </button>
                            )}
                          </div>
                        );
                      });
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Modal C3 */}
      <InscribirModal
        open={modalOpen}
        initialFestivalId={festival.id}
        onClose={() => setModalOpen(false)}
        onSuccess={() =>
          setFlashMsg(`Inscripción registrada en ${festival.nombre}.`)
        }
      />
    </Layout>
  );
};
