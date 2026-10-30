import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useSession } from '../../context/SessionContext';
import { resolveAssetUrl } from '../../lib/assets';
import {
  getYouTubeEmbedUrl,
  readPdfAsDataUrl,
  resizeImageToDataUrl,
} from '../../lib/media';
import {
  getCursos,
  getProyectoById,
  getUsuariosByRol,
  saveProyecto,
  StorageQuotaError,
} from '../../lib/store';
import { CATEGORIAS, type Categoria } from '../../types/models';

const MAX_DESCRIPCION = 600;

export const ProyectoForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { usuario } = useSession();

  const cursos = getCursos();
  const alumnos = getUsuariosByRol('alumno');
  const existing = id ? getProyectoById(id) : undefined;

  const [nombre, setNombre] = useState(existing?.nombre ?? '');
  const [categoria, setCategoria] = useState<Categoria>(
    existing?.categoria ?? 'Film'
  );
  const [cursoId, setCursoId] = useState(
    existing?.cursoId ?? usuario.cursoId ?? ''
  );
  const [integrantes, setIntegrantes] = useState<string[]>(() => {
    const base = existing?.integrantes ?? [usuario.id];
    return base.includes(usuario.id) ? base : [usuario.id, ...base];
  });
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [descripcion, setDescripcion] = useState(existing?.descripcion ?? '');
  const [boardImg, setBoardImg] = useState(existing?.boardImg ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(existing?.youtubeUrl ?? '');
  const [imagenes, setImagenes] = useState<string[]>(existing?.imagenes ?? []);
  const [pdf, setPdf] = useState<{ nombre: string; data: string } | undefined>(
    existing?.pdf
  );

  const [dragActive, setDragActive] = useState(false);
  const [procesandoMedia, setProcesandoMedia] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);

  const boardInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Asegurar que el alumno actual siempre figure entre los integrantes
  useEffect(() => {
    if (usuario.rol === 'alumno' && !integrantes.includes(usuario.id)) {
      setIntegrantes((prev) => [usuario.id, ...prev]);
    }
  }, [usuario.id, usuario.rol, integrantes]);

  const sugerenciasAlumnos = useMemo(() => {
    const q = busquedaAlumno.trim().toLowerCase();
    return alumnos.filter((a) => {
      if (integrantes.includes(a.id)) return false;
      if (!q) return true;
      const full = `${a.nombre} ${a.apellido}`.toLowerCase();
      return full.includes(q);
    });
  }, [alumnos, busquedaAlumno, integrantes]);

  const embedUrl = getYouTubeEmbedUrl(youtubeUrl);
  const youtubeInvalido = Boolean(youtubeUrl.trim()) && !embedUrl;

  if (isEdit && !existing) {
    return (
      <Layout>
        <Link to="/mis-proyectos" className="back-link">
          ← Mis proyectos
        </Link>
        <div className="empty-state">
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>
            No encontramos este proyecto
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Puede que haya sido eliminado o que el enlace no sea válido.
          </p>
          <Link to="/mis-proyectos" className="btn btn--primary">
            Volver a Mis proyectos
          </Link>
        </div>
      </Layout>
    );
  }

  const handleBoardFile = async (file?: File) => {
    if (!file) return;
    setProcesandoMedia(true);
    setMediaNotice(null);
    try {
      const resized = await resizeImageToDataUrl(file);
      setBoardImg(resized);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.boardImg;
        return next;
      });
    } catch (err) {
      setMediaNotice(
        err instanceof Error ? err.message : 'Error al procesar la imagen.'
      );
    } finally {
      setProcesandoMedia(false);
    }
  };

  const handleGalleryFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setProcesandoMedia(true);
    setMediaNotice(null);
    try {
      const nuevas: string[] = [];
      for (const file of Array.from(fileList)) {
        const resized = await resizeImageToDataUrl(file);
        nuevas.push(resized);
      }
      setImagenes((prev) => [...prev, ...nuevas]);
    } catch (err) {
      setMediaNotice(
        err instanceof Error
          ? err.message
          : 'Error al procesar las imágenes adicionales.'
      );
    } finally {
      setProcesandoMedia(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handlePdfFile = async (file?: File) => {
    if (!file) return;
    setMediaNotice(null);
    try {
      const loaded = await readPdfAsDataUrl(file);
      setPdf(loaded);
    } catch (err) {
      setMediaNotice(
        err instanceof Error ? err.message : 'No se pudo adjuntar el PDF.'
      );
    } finally {
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const agregarIntegrante = (alumnoId: string) => {
    if (!integrantes.includes(alumnoId)) {
      setIntegrantes((prev) => [...prev, alumnoId]);
    }
    setBusquedaAlumno('');
  };

  const quitarIntegrante = (alumnoId: string) => {
    if (alumnoId === usuario.id) return;
    setIntegrantes((prev) => prev.filter((uid) => uid !== alumnoId));
  };

  const validar = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!nombre.trim()) {
      nextErrors.nombre = 'Ingresá el nombre del proyecto.';
    }
    if (!cursoId) {
      nextErrors.cursoId = 'Elegí el curso en el que hiciste el proyecto.';
    }
    if (!descripcion.trim()) {
      nextErrors.descripcion =
        'Escribí una descripción breve (insight, idea y ejecución).';
    } else if (descripcion.length > MAX_DESCRIPCION) {
      nextErrors.descripcion = `La descripción no puede superar ${MAX_DESCRIPCION} caracteres.`;
    }
    if (!boardImg) {
      nextErrors.boardImg =
        'Subí la imagen vertical del board (es obligatoria para presentar el caso).';
    }
    if (youtubeInvalido) {
      nextErrors.youtubeUrl =
        'Pegá un link válido de YouTube (ej. https://www.youtube.com/watch?v=...) o dejalo vacío.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMediaNotice(null);
    if (!validar()) return;

    try {
      const guardado = saveProyecto({
        id: existing?.id,
        nombre: nombre.trim(),
        categoria,
        boardImg,
        youtubeUrl: youtubeUrl.trim() || undefined,
        imagenes,
        pdf,
        cursoId,
        integrantes,
        descripcion: descripcion.trim(),
      });
      navigate(`/proyecto/${guardado.id}`);
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setMediaNotice(err.message);
      } else {
        setMediaNotice('Ocurrió un error al guardar el proyecto.');
      }
    }
  };

  const cursoSeleccionado = cursos.find((c) => c.id === cursoId);

  const checklistItems = [
    { label: 'Nombre', done: Boolean(nombre.trim()) },
    { label: 'Categoría', done: Boolean(categoria) },
    { label: 'Board', done: Boolean(boardImg) },
    { label: 'Curso', done: Boolean(cursoId) },
    { label: 'Alumnos', done: integrantes.length > 0 },
    {
      label: 'Descripción',
      done: Boolean(descripcion.trim()) && descripcion.length <= MAX_DESCRIPCION,
    },
  ];

  return (
    <Layout>
      <Link to="/mis-proyectos" className="back-link">
        ← Mis proyectos
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEdit ? 'Editar proyecto' : 'Cargar proyecto'}
          </h1>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="alert-banner alert-banner--error" role="alert">
          <span>Revisá los campos obligatorios marcados abajo antes de guardar.</span>
        </div>
      )}

      {mediaNotice && (
        <div className="alert-banner alert-banner--error" role="alert">
          <span>{mediaNotice}</span>
          <button
            type="button"
            className="btn"
            style={{ minHeight: 34, padding: '0 10px' }}
            onClick={() => setMediaNotice(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="two-col-form">
          {/* Columna izquierda */}
          <div>
            {/* Sección 1: Datos del proyecto */}
            <section className="card">
              <h2 style={{ fontSize: 18, marginBottom: 18 }}>
                Datos del proyecto
              </h2>

              <div className="form-group">
                <label className="form-label" htmlFor="proj-nombre">
                  Nombre del proyecto *
                </label>
                <input
                  id="proj-nombre"
                  type="text"
                  className="input"
                  placeholder="Ej: El último bondi a las tres"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    if (errors.nombre) {
                      setErrors((prev) => ({ ...prev, nombre: '' }));
                    }
                  }}
                />
                {errors.nombre && (
                  <span className="form-error">{errors.nombre}</span>
                )}
              </div>

              <div className="form-group">
                <span className="form-label">Categoría (elegí una) *</span>
                <div className="pill-group" role="radiogroup" aria-label="Categoría">
                  {CATEGORIAS.map((cat) => {
                    const active = categoria === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`pill ${active ? 'pill--active' : ''}`}
                        onClick={() => setCategoria(cat)}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            border: '2px solid currentColor',
                            background: active ? 'currentColor' : 'transparent',
                            display: 'inline-block',
                          }}
                        />
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="proj-curso">
                    Curso *
                  </label>
                  <select
                    id="proj-curso"
                    className="select"
                    value={cursoId}
                    onChange={(e) => {
                      setCursoId(e.target.value);
                      if (errors.cursoId) {
                        setErrors((prev) => ({ ...prev, cursoId: '' }));
                      }
                    }}
                  >
                    <option value="">Elegí tu curso...</option>
                    {cursos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">Lista que administra la escuela.</span>
                  {errors.cursoId && (
                    <span className="form-error">{errors.cursoId}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="proj-alumnos-search">
                    Alumnos integrantes
                  </label>
                  <input
                    id="proj-alumnos-search"
                    type="text"
                    className="input"
                    placeholder="Buscar compañero/a por nombre..."
                    value={busquedaAlumno}
                    onChange={(e) => setBusquedaAlumno(e.target.value)}
                  />

                  {sugerenciasAlumnos.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                        marginTop: 4,
                      }}
                    >
                      {sugerenciasAlumnos.map((al) => (
                        <button
                          key={al.id}
                          type="button"
                          className="btn"
                          style={{
                            minHeight: 32,
                            padding: '0 10px',
                            fontSize: 12,
                          }}
                          onClick={() => agregarIntegrante(al.id)}
                        >
                          + {al.nombre} {al.apellido}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="chip-row" style={{ marginTop: 6 }}>
                    {integrantes.map((uid) => {
                      const al = alumnos.find((a) => a.id === uid);
                      const label = al
                        ? `${al.nombre} ${al.apellido}`
                        : uid === usuario.id
                          ? `${usuario.nombre} ${usuario.apellido}`
                          : uid;
                      const esActual = uid === usuario.id;
                      return (
                        <span key={uid} className="chip">
                          {label} {esActual ? '(vos)' : ''}
                          {!esActual && (
                            <button
                              type="button"
                              className="chip__remove"
                              aria-label={`Quitar a ${label}`}
                              onClick={() => quitarIntegrante(uid)}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  <span className="form-hint">
                    Los compañeros agregados también ven y editan el proyecto.
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="proj-descripcion">
                  Descripción breve *
                </label>
                <textarea
                  id="proj-descripcion"
                  className="textarea"
                  maxLength={MAX_DESCRIPCION}
                  placeholder="Insight, idea y ejecución en pocas líneas."
                  value={descripcion}
                  onChange={(e) => {
                    setDescripcion(e.target.value);
                    if (errors.descripcion) {
                      setErrors((prev) => ({ ...prev, descripcion: '' }));
                    }
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    {errors.descripcion && (
                      <span className="form-error">{errors.descripcion}</span>
                    )}
                  </span>
                  <span className="form-hint">
                    {descripcion.length} / {MAX_DESCRIPCION} caracteres
                  </span>
                </div>
              </div>
            </section>

            {/* Sección 2: Materiales */}
            <section className="card">
              <h2 style={{ fontSize: 18, marginBottom: 18 }}>Materiales</h2>

              {/* Board obligatorio */}
              <div className="form-group">
                <span className="form-label">
                  Imagen del board *{' '}
                  <span className="chip chip--blue">obligatorio</span>
                </span>

                <input
                  ref={boardInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  data-testid="board-file-input"
                  onChange={(e) => handleBoardFile(e.target.files?.[0])}
                />

                <div
                  className={`dropzone ${dragActive ? 'dropzone--active' : ''}`}
                  onClick={() => boardInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    handleBoardFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  {boardImg ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 20,
                        flexWrap: 'wrap',
                      }}
                    >
                      <img
                        src={resolveAssetUrl(boardImg)}
                        alt="Vista previa del board"
                        style={{
                          width: 140,
                          aspectRatio: '5 / 7',
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '1px solid var(--border-color)',
                        }}
                      />
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontWeight: 600, marginBottom: 6 }}>
                          Board cargado correctamente
                        </p>
                        <p className="form-hint" style={{ marginBottom: 12 }}>
                          Hacé clic o arrastrá otra imagen si querés reemplazarlo.
                        </p>
                        <span className="btn">Cambiar imagen del board</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: 4 }}>
                        {procesandoMedia
                          ? 'Procesando imagen...'
                          : 'Arrastrá la imagen o hacé clic para subir'}
                      </p>
                      <p className="form-hint">
                        JPG / PNG · se optimiza automáticamente a máx. 1200 px · se usa como portada
                      </p>
                    </div>
                  )}
                </div>
                {errors.boardImg && (
                  <span className="form-error">{errors.boardImg}</span>
                )}
              </div>

              {/* YouTube opcional */}
              <div className="form-group">
                <label className="form-label" htmlFor="proj-youtube">
                  Link al videocaso{' '}
                  <span style={{ fontWeight: 400, color: 'var(--text-soft)' }}>
                    (opcional)
                  </span>
                </label>
                <input
                  id="proj-youtube"
                  type="url"
                  className="input"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    if (errors.youtubeUrl) {
                      setErrors((prev) => ({ ...prev, youtubeUrl: '' }));
                    }
                  }}
                />
                <span className="form-hint">
                  Al pegar un link válido de YouTube se muestra la vista previa del video.
                </span>
                {youtubeInvalido && (
                  <span className="form-error">
                    El link no parece ser un video válido de YouTube.
                  </span>
                )}
                {embedUrl && (
                  <iframe
                    className="video-embed"
                    style={{ marginTop: 10 }}
                    src={embedUrl}
                    title="Vista previa del videocaso"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>

              {/* Más imágenes opcional */}
              <div className="form-group">
                <span className="form-label">
                  Más imágenes{' '}
                  <span style={{ fontWeight: 400, color: 'var(--text-soft)' }}>
                    (opcional)
                  </span>
                </span>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  data-testid="gallery-file-input"
                  onChange={(e) => handleGalleryFiles(e.target.files)}
                />
                <div className="media-grid">
                  {imagenes.map((imgSrc, idx) => (
                    <div key={`${idx}-${imgSrc.slice(-16)}`} className="media-grid__item">
                      <img
                        src={resolveAssetUrl(imgSrc)}
                        alt={`Imagen adicional ${idx + 1}`}
                      />
                      <button
                        type="button"
                        className="media-grid__remove"
                        aria-label={`Quitar imagen ${idx + 1}`}
                        onClick={() =>
                          setImagenes((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="dropzone"
                    style={{
                      aspectRatio: '16 / 10',
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: 13,
                      color: 'var(--text-muted)',
                    }}
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* PDF opcional */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">
                  PDF{' '}
                  <span style={{ fontWeight: 400, color: 'var(--text-soft)' }}>
                    (opcional)
                  </span>
                </span>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: 'none' }}
                  data-testid="pdf-file-input"
                  onChange={(e) => handlePdfFile(e.target.files?.[0])}
                />

                {pdf ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 16px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      background: '#fafaf8',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      📄 {pdf.nombre}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => pdfInputRef.current?.click()}
                      >
                        Reemplazar
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger-outline"
                        onClick={() => setPdf(undefined)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="dropzone"
                    style={{ padding: '18px 16px' }}
                    onClick={() => pdfInputRef.current?.click()}
                  >
                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                      Subir PDF de presentación · máx. 1 MB en esta demo
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Botones inferiores */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 20,
              }}
            >
              <Link to="/mis-proyectos" className="btn">
                Cancelar
              </Link>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={procesandoMedia}
              >
                {isEdit ? 'Guardar cambios' : 'Guardar proyecto'}
              </button>
            </div>
          </div>

          {/* Columna derecha: Vista previa + Checklist */}
          <aside className="sticky-aside">
            <div className="card">
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 12,
                }}
              >
                Vista previa de la tarjeta
              </p>

              {boardImg ? (
                <img
                  src={resolveAssetUrl(boardImg)}
                  alt="Vista previa del board"
                  style={{
                    width: '100%',
                    aspectRatio: '5 / 7',
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    marginBottom: 12,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '5 / 7',
                    borderRadius: 6,
                    border: '1px dashed var(--border-strong)',
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-soft)',
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  Board
                </div>
              )}

              <h3 style={{ fontSize: 16, marginBottom: 4 }}>
                {nombre.trim() || 'Nombre del proyecto'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {categoria} · {cursoSeleccionado?.nombre ?? '[Curso]'}
              </p>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 15 }}>Checklist</h3>
              <ul className="checklist">
                {checklistItems.map((item) => (
                  <li
                    key={item.label}
                    className={
                      item.done
                        ? 'checklist__item--done'
                        : 'checklist__item--pending'
                    }
                  >
                    {item.done ? '✓' : '○'} {item.label}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </form>
    </Layout>
  );
};
