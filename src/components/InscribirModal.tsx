import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { resolveAssetUrl } from '../lib/assets';
import {
  getFestivales,
  getInscripciones,
  getProyectosByAlumno,
  inscribirProyectoEnFestival,
} from '../lib/store';
import { getProyectoCategorias } from '../types/models';

interface InscribirModalProps {
  open: boolean;
  initialFestivalId?: string;
  initialProyectoId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InscribirModal: React.FC<InscribirModalProps> = ({
  open,
  initialFestivalId,
  initialProyectoId,
  onClose,
  onSuccess,
}) => {
  const { usuario } = useSession();

  const festivalesAbiertos = useMemo(
    () => getFestivales().filter((f) => f.estado === 'abierto'),
    [open]
  );
  const misProyectos = useMemo(
    () => getProyectosByAlumno(usuario.id),
    [usuario.id, open]
  );

  const [festivalId, setFestivalId] = useState<string>('');
  const [proyectoId, setProyectoId] = useState<string>('');
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);
  const [aceptoReglas, setAceptoReglas] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const defaultFest =
      initialFestivalId &&
      festivalesAbiertos.some((f) => f.id === initialFestivalId)
        ? initialFestivalId
        : festivalesAbiertos[0]?.id ?? '';
    const defaultProj =
      initialProyectoId && misProyectos.some((p) => p.id === initialProyectoId)
        ? initialProyectoId
        : misProyectos[0]?.id ?? '';

    setFestivalId(defaultFest);
    setProyectoId(defaultProj);
    setSelectedCategorias([]);
    setAceptoReglas(false);
    setErrorMsg(null);
  }, [open, initialFestivalId, initialProyectoId, festivalesAbiertos, misProyectos]);

  if (!open) return null;

  const festivalActual = festivalesAbiertos.find((f) => f.id === festivalId);
  const proyectoActual = misProyectos.find((p) => p.id === proyectoId);

  const inscripcionExistente =
    festivalActual && proyectoActual
      ? getInscripciones({
          festivalId: festivalActual.id,
          proyectoId: proyectoActual.id,
        })[0]
      : undefined;

  const yaInscriptasSet = new Set(inscripcionExistente?.categoriaIds ?? []);
  const categoriasDisponibles = festivalActual
    ? festivalActual.categorias.filter((c) => !yaInscriptasSet.has(c.id))
    : [];
  const todasSeleccionadas =
    categoriasDisponibles.length > 0 &&
    categoriasDisponibles.every((c) => selectedCategorias.includes(c.id));

  const toggleTodasCategorias = () => {
    if (!proyectoActual || categoriasDisponibles.length === 0) return;
    if (todasSeleccionadas) {
      setSelectedCategorias([]);
    } else {
      setSelectedCategorias(categoriasDisponibles.map((c) => c.id));
    }
    setErrorMsg(null);
  };

  const toggleCategoria = (catId: string) => {
    if (yaInscriptasSet.has(catId)) return;
    setSelectedCategorias((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
    setErrorMsg(null);
  };

  const handleChangeProyecto = (nextId: string) => {
    setProyectoId(nextId);
    setSelectedCategorias([]);
    setErrorMsg(null);
  };

  const handleChangeFestival = (nextId: string) => {
    setFestivalId(nextId);
    setSelectedCategorias([]);
    setErrorMsg(null);
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!festivalActual) {
      setErrorMsg('Elegí un festival abierto.');
      return;
    }
    if (!proyectoActual) {
      setErrorMsg('Necesitás elegir uno de tus proyectos para inscribirte.');
      return;
    }
    if (selectedCategorias.length === 0) {
      setErrorMsg('Seleccioná una o más categorías disponibles.');
      return;
    }
    if (!aceptoReglas) {
      setErrorMsg('Marcá la casilla confirmando que leíste las reglas del festival.');
      return;
    }

    inscribirProyectoEnFestival({
      proyectoId: proyectoActual.id,
      festivalId: festivalActual.id,
      categoriaIds: selectedCategorias,
    });
    onSuccess?.();
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inscribir-modal-title"
      onClick={onClose}
    >
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2 id="inscribir-modal-title" style={{ fontSize: 22 }}>
              {festivalActual
                ? `Inscribir en ${festivalActual.nombre}`
                : 'Inscribir proyecto en festival'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar modal"
            className="btn"
            style={{ minHeight: 38, width: 38, padding: 0, borderRadius: '50%' }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {festivalesAbiertos.length === 0 ? (
          <div className="empty-state" style={{ padding: 28 }}>
            <p style={{ marginBottom: 16 }}>
              En este momento no hay festivales con inscripción abierta.
            </p>
            <button type="button" className="btn" onClick={onClose}>
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirm}>
            {/* Si se abre desde Mis proyectos o Detalle de proyecto, permitir elegir entre los festivales abiertos */}
            {!initialFestivalId && festivalesAbiertos.length > 1 && (
              <div className="form-group">
                <label className="form-label" htmlFor="modal-select-festival">
                  Elegí el festival
                </label>
                <select
                  id="modal-select-festival"
                  className="select"
                  value={festivalId}
                  onChange={(e) => handleChangeFestival(e.target.value)}
                >
                  {festivalesAbiertos.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre} (cierra {f.deadline})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Elegí el proyecto + miniatura */}
            <div className="form-group">
              <label className="form-label" htmlFor="modal-select-proyecto">
                Elegí el proyecto
              </label>

              {misProyectos.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {proyectoActual && (
                    <img
                      src={resolveAssetUrl(proyectoActual.boardImg)}
                      alt={proyectoActual.nombre}
                      style={{
                        width: 88,
                        aspectRatio: '16 / 9',
                        objectFit: 'cover',
                        borderRadius: 4,
                        border: '1px solid var(--border-color)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <select
                    id="modal-select-proyecto"
                    className="select"
                    value={proyectoId}
                    onChange={(e) => handleChangeProyecto(e.target.value)}
                  >
                    {misProyectos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — {getProyectoCategorias(p).join(' / ')}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  Todavía no tenés proyectos cargados a tu nombre.
                </div>
              )}

              <div className="form-hint" style={{ marginTop: 4 }}>
                ¿No ves tu proyecto?{' '}
                <Link to="/proyecto/nuevo" onClick={onClose}>
                  Cargalo acá
                </Link>
              </div>
            </div>

            {/* Tabla de categorías */}
            {festivalActual && (
              <div className="form-group">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <span className="form-label">
                    Elegí una o más categorías para participar
                  </span>
                  {proyectoActual && categoriasDisponibles.length > 1 && (
                    <button
                      type="button"
                      onClick={toggleTodasCategorias}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--accent-blue)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {todasSeleccionadas
                        ? 'Desmarcar todas'
                        : 'Seleccionar todas'}
                    </button>
                  )}
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}></th>
                        <th>Categoría</th>
                        <th>Qué piden</th>
                      </tr>
                    </thead>
                    <tbody>
                      {festivalActual.categorias.map((cat) => {
                        const isAlready = yaInscriptasSet.has(cat.id);
                        const isChecked =
                          isAlready || selectedCategorias.includes(cat.id);
                        return (
                          <tr
                            key={cat.id}
                            style={{
                              opacity: isAlready ? 0.58 : 1,
                              cursor: isAlready || !proyectoActual ? 'default' : 'pointer',
                            }}
                            onClick={() => {
                              if (!isAlready && proyectoActual) {
                                toggleCategoria(cat.id);
                              }
                            }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isAlready || !proyectoActual}
                                onChange={() => toggleCategoria(cat.id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={cat.nombre}
                                style={{ width: 18, height: 18 }}
                              />
                            </td>
                            <td style={{ fontWeight: 600 }}>{cat.nombre}</td>
                            <td style={{ color: 'var(--text-muted)' }}>
                              {isAlready ? (
                                <span className="chip">Ya inscripto</span>
                              ) : (
                                cat.descripcion || 'Board de presentación'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Casilla obligatoria de reglas */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              <input
                type="checkbox"
                checked={aceptoReglas}
                onChange={(e) => {
                  setAceptoReglas(e.target.checked);
                  setErrorMsg(null);
                }}
                style={{ width: 18, height: 18 }}
              />
              <span>Leí las reglas del festival y el proyecto cumple con las bases.</span>
            </label>

            {errorMsg && (
              <div className="alert-banner alert-banner--error" role="alert">
                <span>{errorMsg}</span>
              </div>
            )}

            <div
              style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {selectedCategorias.length}{' '}
                {selectedCategorias.length === 1
                  ? 'categoría seleccionada'
                  : 'categorías seleccionadas'}
              </span>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn" onClick={onClose}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={!proyectoActual}
                >
                  Confirmar inscripción
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
