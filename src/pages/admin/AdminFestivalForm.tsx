import React, { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { formatFecha, resolveAssetUrl } from '../../lib/assets';
import { downloadCsv } from '../../lib/csv';
import { resizeImageToDataUrl } from '../../lib/media';
import {
  generateId,
  getCursoById,
  getFestivalById,
  getInscripciones,
  getProyectoById,
  getUsuarioById,
  saveFestival,
  StorageQuotaError,
} from '../../lib/store';
import type { Festival, FestivalCategoria } from '../../types/models';

export const AdminFestivalForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isNew = !id || id === 'nuevo';
  const navigate = useNavigate();

  const existing = !isNew && id ? getFestivalById(id) : undefined;

  const [activeTab, setActiveTab] = useState<'datos' | 'inscripciones'>('datos');

  const [nombre, setNombre] = useState(existing?.nombre ?? '');
  const [web, setWeb] = useState(existing?.web ?? '');
  const [deadline, setDeadline] = useState(existing?.deadline ?? '');
  const [estado, setEstado] = useState<Festival['estado']>(
    existing?.estado ?? 'abierto'
  );
  const [bajada, setBajada] = useState(existing?.bajada ?? '');
  const [logo, setLogo] = useState<string | undefined>(existing?.logo);
  const [brief, setBrief] = useState(existing?.brief ?? '');
  const [reglas, setReglas] = useState(existing?.reglas ?? '');

  const [categorias, setCategorias] = useState<FestivalCategoria[]>(
    existing?.categorias.length
      ? existing.categorias
      : [{ id: generateId('fcat'), nombre: '', descripcion: '' }]
  );

  const [criterios, setCriterios] = useState<string[]>(
    existing?.criterios.length ? existing.criterios : ['']
  );

  const [faq, setFaq] = useState<{ pregunta: string; respuesta: string }[]>(
    existing?.faq.length ? existing.faq : [{ pregunta: '', respuesta: '' }]
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  if (!isNew && !existing) {
    return (
      <Layout>
        <Link to="/admin/festivales" className="back-link">
          ← Festivales
        </Link>
        <div className="empty-state">
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>
            Festival no encontrado
          </h1>
          <Link to="/admin/festivales" className="btn btn--primary">
            Volver a Festivales
          </Link>
        </div>
      </Layout>
    );
  }

  const inscripciones = existing
    ? getInscripciones({ festivalId: existing.id })
    : [];

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    setErrorMsg(null);
    try {
      const resized = await resizeImageToDataUrl(file);
      setLogo(resized);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo cargar el logo.'
      );
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const persistFestival = (targetEstado: Festival['estado']) => {
    setErrorMsg(null);
    setFlashMsg(null);

    if (!nombre.trim()) {
      setErrorMsg('Ingresá el nombre del festival.');
      return;
    }
    if (!deadline.trim()) {
      setErrorMsg('Elegí la fecha de deadline del festival.');
      return;
    }

    const catsLimpias = categorias
      .map((c) => ({
        id: c.id || generateId('fcat'),
        nombre: c.nombre.trim(),
        descripcion: c.descripcion.trim(),
      }))
      .filter((c) => c.nombre.length > 0);

    if (targetEstado === 'abierto' && catsLimpias.length === 0) {
      setErrorMsg(
        'Agregá al menos una categoría con nombre antes de publicar el festival.'
      );
      return;
    }

    const criteriosLimpios = criterios
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const faqLimpia = faq
      .map((f) => ({
        pregunta: f.pregunta.trim(),
        respuesta: f.respuesta.trim(),
      }))
      .filter((f) => f.pregunta.length > 0 && f.respuesta.length > 0);

    try {
      const guardado = saveFestival({
        id: existing?.id,
        nombre: nombre.trim(),
        web: web.trim(),
        deadline,
        logo,
        estado: targetEstado,
        bajada:
          bajada.trim() ||
          'Convocatoria interna de Brother Escuela de Creativos.',
        brief: brief.trim(),
        reglas: reglas.trim(),
        categorias: catsLimpias,
        criterios: criteriosLimpios,
        faq: faqLimpia,
      });

      setEstado(guardado.estado);

      if (isNew) {
        navigate(`/admin/festivales/${guardado.id}`, { replace: true });
      } else {
        setFlashMsg(
          targetEstado === 'borrador'
            ? 'Borrador guardado correctamente.'
            : 'Festival publicado y actualizado.'
        );
      }
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Error al guardar el festival.');
      }
    }
  };

  const handleExportInscripcionesCsv = () => {
    if (!existing) return;
    const headers = ['Proyecto', 'Alumnos', 'Curso', 'Categorías', 'Fecha'];
    const rows = inscripciones.map((insc) => {
      const proj = getProyectoById(insc.proyectoId);
      const curso = proj ? getCursoById(proj.cursoId) : undefined;
      const alumnos = proj
        ? proj.integrantes
            .map((uid) => {
              const u = getUsuarioById(uid);
              return u ? `${u.nombre} ${u.apellido}` : '';
            })
            .filter(Boolean)
            .join(', ')
        : '';
      const cats = insc.categoriaIds
        .map(
          (cid) =>
            existing.categorias.find((c) => c.id === cid)?.nombre ?? cid
        )
        .join(' | ');
      return [
        proj?.nombre ?? insc.proyectoId,
        alumnos,
        curso?.nombre ?? '',
        cats,
        formatFecha(insc.fecha),
      ];
    });
    downloadCsv(`inscripciones-${existing.id}.csv`, headers, rows);
  };

  return (
    <Layout>
      <Link to="/admin/festivales" className="back-link">
        ← Festivales
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isNew ? 'Nuevo festival' : existing?.nombre}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {existing && (
            <Link to={`/festival/${existing.id}`} className="btn">
              Vista previa
            </Link>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => persistFestival('borrador')}
          >
            Guardar borrador
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() =>
              persistFestival(estado === 'cerrado' ? 'cerrado' : 'abierto')
            }
          >
            Publicar
          </button>
        </div>
      </div>

      {/* Pestañas Datos del festival / Inscripciones (N) */}
      <div className="tabs-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'datos' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('datos')}
        >
          Datos del festival
        </button>
        <button
          type="button"
          className={`tab-btn ${
            activeTab === 'inscripciones' ? 'tab-btn--active' : ''
          }`}
          onClick={() => setActiveTab('inscripciones')}
        >
          Inscripciones ({inscripciones.length})
        </button>
      </div>

      {errorMsg && (
        <div className="alert-banner alert-banner--error" role="alert">
          <span>{errorMsg}</span>
        </div>
      )}

      {flashMsg && (
        <div className="alert-banner alert-banner--success" role="status">
          <span>{flashMsg}</span>
        </div>
      )}

      {activeTab === 'datos' ? (
        <div>
          {/* Datos generales */}
          <section className="card">
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Datos generales</h2>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="fest-nombre">
                  Nombre *
                </label>
                <input
                  id="fest-nombre"
                  type="text"
                  className="input"
                  placeholder="Ej: OBRAR Estudiantes"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fest-web">
                  Web del festival
                </label>
                <input
                  id="fest-web"
                  type="url"
                  className="input"
                  placeholder="https://"
                  value={web}
                  onChange={(e) => setWeb(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="fest-deadline">
                  Deadline *
                </label>
                <input
                  id="fest-deadline"
                  type="date"
                  className="input"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fest-estado">
                  Estado
                </label>
                <select
                  id="fest-estado"
                  className="select"
                  value={estado}
                  onChange={(e) =>
                    setEstado(e.target.value as Festival['estado'])
                  }
                >
                  <option value="borrador">Borrador</option>
                  <option value="abierto">Abierto</option>
                  <option value="cerrado">Cerrado</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="fest-bajada">
                Bajada corta
              </label>
              <input
                id="fest-bajada"
                type="text"
                className="input"
                placeholder="Resumen de una línea para la tarjeta del listado..."
                value={bajada}
                onChange={(e) => setBajada(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <span className="form-label">Logo / key visual</span>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              />
              {logo ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <img
                    src={resolveAssetUrl(logo)}
                    alt="Logo del festival"
                    style={{
                      width: 180,
                      aspectRatio: '16 / 9',
                      objectFit: 'cover',
                      borderRadius: 6,
                      border: '1px solid var(--border-color)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      Cambiar imagen
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger-outline"
                      onClick={() => setLogo(undefined)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="dropzone"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Subir imagen de logo o key visual (opcional)
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Brief */}
          <section className="card">
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Brief</h2>
            <textarea
              aria-label="Brief del festival"
              className="textarea"
              style={{ minHeight: 140 }}
              placeholder="Escribí el brief completo de la convocatoria..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
          </section>

          {/* Reglas / bases */}
          <section className="card">
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Reglas / bases</h2>
            <textarea
              aria-label="Reglas del festival"
              className="textarea"
              style={{ minHeight: 130 }}
              placeholder="Requisitos de participación, formatos, cantidad de piezas..."
              value={reglas}
              onChange={(e) => setReglas(e.target.value)}
            />
          </section>

          {/* Categorías del festival (filas repetibles) */}
          <section className="card">
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>
              Categorías del festival
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 14,
              }}
            >
              {categorias.map((cat, idx) => (
                <div
                  key={cat.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(180px, 1fr) minmax(200px, 1.4fr) 44px',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="text"
                    className="input"
                    placeholder={`Categoría ${idx + 1} (nombre)`}
                    aria-label={`Nombre categoría ${idx + 1}`}
                    value={cat.nombre}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategorias((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, nombre: val } : item
                        )
                      );
                    }}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="Qué se presenta (ej. Board + videocaso)"
                    aria-label={`Descripción categoría ${idx + 1}`}
                    value={cat.descripcion}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategorias((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, descripcion: val } : item
                        )
                      );
                    }}
                  />
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: 0 }}
                    aria-label={`Quitar categoría ${idx + 1}`}
                    onClick={() =>
                      setCategorias((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn"
              onClick={() =>
                setCategorias((prev) => [
                  ...prev,
                  { id: generateId('fcat'), nombre: '', descripcion: '' },
                ])
              }
            >
              + Agregar categoría
            </button>
          </section>

          {/* Criterios de evaluación (filas repetibles) */}
          <section className="card">
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>
              Criterios de evaluación
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 14,
              }}
            >
              {criterios.map((crit, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 44px',
                    gap: 10,
                  }}
                >
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej: Originalidad de la idea (35%)"
                    aria-label={`Criterio ${idx + 1}`}
                    value={crit}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCriterios((prev) =>
                        prev.map((item, i) => (i === idx ? val : item))
                      );
                    }}
                  />
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: 0 }}
                    aria-label={`Quitar criterio ${idx + 1}`}
                    onClick={() =>
                      setCriterios((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn"
              onClick={() => setCriterios((prev) => [...prev, ''])}
            >
              + Agregar criterio
            </button>
          </section>

          {/* Preguntas frecuentes (filas repetibles) */}
          <section className="card">
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>
              Preguntas frecuentes
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                marginBottom: 14,
              }}
            >
              {faq.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(200px, 1fr) minmax(240px, 1.4fr) 44px',
                    gap: 10,
                    alignItems: 'start',
                  }}
                >
                  <input
                    type="text"
                    className="input"
                    placeholder="Pregunta"
                    aria-label={`Pregunta FAQ ${idx + 1}`}
                    value={item.pregunta}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFaq((prev) =>
                        prev.map((f, i) =>
                          i === idx ? { ...f, pregunta: val } : f
                        )
                      );
                    }}
                  />
                  <textarea
                    className="textarea"
                    style={{ minHeight: 72 }}
                    placeholder="Respuesta"
                    aria-label={`Respuesta FAQ ${idx + 1}`}
                    value={item.respuesta}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFaq((prev) =>
                        prev.map((f, i) =>
                          i === idx ? { ...f, respuesta: val } : f
                        )
                      );
                    }}
                  />
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: 0 }}
                    aria-label={`Quitar pregunta ${idx + 1}`}
                    onClick={() =>
                      setFaq((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn"
              onClick={() =>
                setFaq((prev) => [...prev, { pregunta: '', respuesta: '' }])
              }
            >
              + Agregar pregunta
            </button>
          </section>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={() => persistFestival('borrador')}
            >
              Guardar borrador
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() =>
                persistFestival(estado === 'cerrado' ? 'cerrado' : 'abierto')
              }
            >
              Publicar
            </button>
          </div>
        </div>
      ) : (
        /* Pestaña Inscripciones (N) */
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {inscripciones.length}{' '}
              {inscripciones.length === 1
                ? 'proyecto inscripto'
                : 'proyectos inscriptos'}{' '}
              en este festival.
            </p>
            {inscripciones.length > 0 && (
              <button
                type="button"
                className="btn"
                onClick={handleExportInscripcionesCsv}
              >
                Exportar CSV
              </button>
            )}
          </div>

          {inscripciones.length === 0 ? (
            <div className="empty-state">
              <p style={{ color: 'var(--text-muted)' }}>
                Todavía no hay proyectos inscriptos en este festival.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Alumnos</th>
                    <th>Categorías</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {inscripciones.map((insc) => {
                    const proj = getProyectoById(insc.proyectoId);
                    const alumnos = proj
                      ? proj.integrantes
                          .map((uid) => {
                            const u = getUsuarioById(uid);
                            return u ? `${u.nombre} ${u.apellido}` : '';
                          })
                          .filter(Boolean)
                          .join(', ')
                      : '—';
                    const cats = insc.categoriaIds
                      .map(
                        (cid) =>
                          existing?.categorias.find((c) => c.id === cid)
                            ?.nombre ?? cid
                      )
                      .join(' · ');

                    return (
                      <tr key={insc.id}>
                        <td style={{ fontWeight: 600 }}>
                          {proj ? (
                            <Link to={`/evaluar/${proj.id}`}>{proj.nombre}</Link>
                          ) : (
                            insc.proyectoId
                          )}
                        </td>
                        <td>{alumnos}</td>
                        <td>{cats}</td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {formatFecha(insc.fecha)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};
