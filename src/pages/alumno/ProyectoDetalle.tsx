import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InscribirModal } from '../../components/InscribirModal';
import { Layout } from '../../components/Layout';
import { Lightbox } from '../../components/Lightbox';
import { ProyectoComentariosSection } from '../../components/ProyectoComentariosSection';
import { useSession } from '../../context/SessionContext';
import { formatFecha, resolveAssetUrl } from '../../lib/assets';
import { getYouTubeEmbedUrl, triggerPdfDownload } from '../../lib/media';
import {
  deleteInscripcion,
  getCursoById,
  getFestivalById,
  getInscripciones,
  getProyectoById,
  getUsuarioById,
} from '../../lib/store';
import { getProyectoCategorias } from '../../types/models';

export const ProyectoDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useSession();

  const [inscribirOpen, setInscribirOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const proyecto = id ? getProyectoById(id) : undefined;

  if (!proyecto) {
    return (
      <Layout>
        <Link to="/mis-proyectos" className="back-link">
          ← Mis proyectos
        </Link>
        <div className="empty-state">
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>
            Proyecto no encontrado
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Es posible que haya sido eliminado.
          </p>
          <Link to="/mis-proyectos" className="btn btn--primary">
            Volver a Mis proyectos
          </Link>
        </div>
      </Layout>
    );
  }

  const curso = getCursoById(proyecto.cursoId);
  const nombresIntegrantes = proyecto.integrantes
    .map((uid) => {
      const u = getUsuarioById(uid);
      return u ? `${u.nombre} ${u.apellido}` : null;
    })
    .filter(Boolean)
    .join(', ');

  const embedUrl = getYouTubeEmbedUrl(proyecto.youtubeUrl);
  const inscripciones = getInscripciones({ proyectoId: proyecto.id });

  const allLightboxImages = [proyecto.boardImg, ...proyecto.imagenes];
  const esIntegrante = proyecto.integrantes.includes(usuario.id);

  return (
    <Layout>
      <Link
        to={usuario.rol === 'alumno' ? '/mis-proyectos' : '/proyectos'}
        className="back-link"
      >
        ← {usuario.rol === 'alumno' ? 'Mis proyectos' : 'Proyectos'}
      </Link>

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

      {/* Bloque superior: Board a la izquierda + datos y acciones a la derecha */}
      <section className="project-detail-hero" style={{ marginBottom: 28 }}>
        <div>
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
            Hacé clic en el board para verlo en grande
          </p>
        </div>

        <div className="card">
          <h1 style={{ fontSize: 30, lineHeight: 1.2, marginBottom: 12 }}>
            {proyecto.nombre}
          </h1>

          <div className="chip-row" style={{ marginBottom: 16 }}>
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
              marginBottom: 24,
            }}
          >
            {proyecto.descripcion}
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {esIntegrante && (
              <>
                <Link
                  to={`/proyecto/${proyecto.id}/editar`}
                  className="btn"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setInscribirOpen(true)}
                >
                  Inscribir en festival
                </button>
              </>
            )}

            {proyecto.pdf && (
              <button
                type="button"
                className="btn"
                onClick={() => triggerPdfDownload(proyecto.pdf!)}
              >
                Descargar PDF
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Videocaso */}
      {embedUrl && (
        <section className="card" style={{ marginBottom: 20 }}>
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

      {/* Galería de imágenes */}
      {proyecto.imagenes.length > 0 && (
        <section className="card" style={{ marginBottom: 20 }}>
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

      {/* Sección de comentarios de profesores, filtro y taggeo */}
      <ProyectoComentariosSection proyecto={proyecto} />

      {/* Tabla Inscripciones a festivales (sin estados ni puntajes) */}
      <section className="card" style={{ marginTop: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <h2 style={{ fontSize: 18 }}>
            Inscripciones a festivales ({inscripciones.length})
          </h2>
          {esIntegrante && (
            <button
              type="button"
              className="btn"
              onClick={() => setInscribirOpen(true)}
            >
              + Inscribir en festival
            </button>
          )}
        </div>

        {inscripciones.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Este proyecto todavía no está inscripto en ningún festival.
          </p>
        ) : (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Festival</th>
                  <th>Categorías</th>
                  <th>Fecha</th>
                  {esIntegrante && <th></th>}
                </tr>
              </thead>
              <tbody>
                {inscripciones.map((insc) => {
                  const fest = getFestivalById(insc.festivalId);
                  const nombresCats = insc.categoriaIds
                    .map(
                      (cid) =>
                        fest?.categorias.find((c) => c.id === cid)?.nombre ?? cid
                    )
                    .join(' · ');

                  return (
                    <tr key={insc.id}>
                      <td style={{ fontWeight: 600 }}>
                        {fest ? (
                          <Link to={`/festival/${fest.id}`}>{fest.nombre}</Link>
                        ) : (
                          'Festival'
                        )}
                      </td>
                      <td>{nombresCats}</td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {formatFecha(insc.fecha)}
                      </td>
                      {esIntegrante && (
                        <td style={{ textAlign: 'right' }}>
                          {fest?.estado === 'abierto' && (
                            <button
                              type="button"
                              className="btn btn--danger-outline"
                              style={{ minHeight: 36, padding: '0 12px', fontSize: 13 }}
                              onClick={() => {
                                deleteInscripcion(insc.id);
                                setFlashMessage('Se retiró la inscripción del festival.');
                              }}
                            >
                              Retirar
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal C3 de inscripción con este proyecto preseleccionado */}
      <InscribirModal
        open={inscribirOpen}
        initialProyectoId={proyecto.id}
        onClose={() => setInscribirOpen(false)}
        onSuccess={() =>
          setFlashMessage('Proyecto inscripto correctamente en el festival.')
        }
      />

      {/* Lightbox para board y galería */}
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
