import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useSession } from '../../context/SessionContext';
import { formatFecha, resolveAssetUrl } from '../../lib/assets';
import { downloadCsv } from '../../lib/csv';
import {
  buildRankingSearchParams,
  getProyectosFiltradosYOrdenados,
  parseRankingFilters,
  type OrdenProyectos,
  type RankingFilters,
} from '../../lib/ranking';
import {
  formatearPromedio,
  getCursos,
  getFestivales,
} from '../../lib/store';
import {
  CATEGORIAS,
  getProyectoCategorias,
  type Categoria,
} from '../../types/models';

export const ProyectosRanking: React.FC = () => {
  const { usuario } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const esProfesor = usuario.rol === 'profesor';
  const esAdmin = usuario.rol === 'admin';

  const filters = parseRankingFilters(searchParams);
  const cursos = getCursos();
  const festivales = getFestivales();

  const updateFilters = (patch: Partial<RankingFilters>) => {
    const next: RankingFilters = { ...filters, ...patch };
    setSearchParams(buildRankingSearchParams(next), { replace: true });
  };

  const listado = getProyectosFiltradosYOrdenados(
    filters,
    esProfesor ? usuario.id : undefined
  );

  const querySuffix = searchParams.toString()
    ? `?${searchParams.toString()}`
    : '';

  const handleExportCsv = () => {
    const headers = [
      'Posición',
      'Proyecto',
      'Alumnos',
      'Categorías',
      'Curso',
      'Promedio general',
      'Cantidad de evaluaciones',
      ...(esProfesor ? ['Mi voto'] : []),
      'Fecha de carga',
    ];

    const rows = listado.map((item, idx) => [
      idx + 1,
      item.proyecto.nombre,
      item.integrantesNombres,
      getProyectoCategorias(item.proyecto).join(' / '),
      item.cursoNombre,
      formatearPromedio(item.promedioGeneral),
      item.cantidadEvaluaciones,
      ...(esProfesor ? [formatearPromedio(item.miPromedio)] : []),
      formatFecha(item.proyecto.creadoEn),
    ]);

    downloadCsv('brother-proyectos-ranking.csv', headers, rows);
  };

  const opcionesCategorias: (Categoria | 'Todas')[] = ['Todas', ...CATEGORIAS];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Proyectos</h1>
          {esAdmin && (
            <p className="page-subtitle">
              Vista de consulta y ranking general (modo lectura para administración).
            </p>
          )}
        </div>
      </div>

      {/* Panel de filtros */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <span className="form-label">Categoría</span>
          <div className="pill-group" role="group" aria-label="Filtrar por categoría">
            {opcionesCategorias.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`pill ${filters.categoria === cat ? 'pill--active' : ''}`}
                onClick={() => updateFilters({ categoria: cat })}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
            alignItems: 'end',
          }}
        >
          <div>
            <label className="form-label" htmlFor="filter-curso">
              Curso
            </label>
            <select
              id="filter-curso"
              className="select"
              style={{ marginTop: 6 }}
              value={filters.cursoId}
              onChange={(e) => updateFilters({ cursoId: e.target.value })}
            >
              <option value="">Todos los cursos</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="filter-festival">
              Festival
            </label>
            <select
              id="filter-festival"
              className="select"
              style={{ marginTop: 6 }}
              value={filters.festivalId}
              onChange={(e) => updateFilters({ festivalId: e.target.value })}
            >
              <option value="">Todos / sin filtro</option>
              {festivales.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="filter-buscar">
              Buscar
            </label>
            <input
              id="filter-buscar"
              type="search"
              className="input"
              style={{ marginTop: 6 }}
              placeholder="Nombre de proyecto o alumno..."
              value={filters.busqueda}
              onChange={(e) => updateFilters({ busqueda: e.target.value })}
            />
          </div>

          {esProfesor && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 44,
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={filters.soloNoEvaluados}
                onChange={(e) =>
                  updateFilters({ soloNoEvaluados: e.target.checked })
                }
                style={{ width: 18, height: 18 }}
              />
              <span>Solo los que no evalué</span>
            </label>
          )}
        </div>
      </section>

      {/* Barra de resultados + Ordenar por + Exportar CSV */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <p style={{ fontSize: 14 }}>
          <strong>{listado.length}</strong>{' '}
          {listado.length === 1
            ? 'proyecto coincide'
            : 'proyectos coinciden'}{' '}
          con los filtros
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <label
            htmlFor="select-orden"
            style={{ fontSize: 13, color: 'var(--text-muted)' }}
          >
            Ordenar por
          </label>
          <select
            id="select-orden"
            className="select"
            style={{ width: 'auto', minWidth: 220 }}
            value={filters.orden}
            onChange={(e) =>
              updateFilters({ orden: e.target.value as OrdenProyectos })
            }
          >
            <option value="promedio">Promedio (mayor a menor)</option>
            <option value="fecha">Fecha de carga (más recientes)</option>
            <option value="nombre">Nombre (A–Z)</option>
            <option value="evaluaciones">Cantidad de evaluaciones</option>
          </select>

          <button type="button" className="btn" onClick={handleExportCsv}>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabla de ranking */}
      {listado.length === 0 ? (
        <div className="empty-state">
          <h2 style={{ fontSize: 19, marginBottom: 8 }}>
            No hay proyectos que coincidan con estos filtros
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
            Probá limpiar la búsqueda o cambiar la categoría seleccionada.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => setSearchParams(new URLSearchParams())}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Proyecto</th>
                <th>Categorías</th>
                <th>Curso</th>
                <th>Promedio {filters.orden === 'promedio' ? '↓' : ''}</th>
                {esProfesor && <th>Mi voto</th>}
                <th>Cargado</th>
              </tr>
            </thead>
            <tbody>
              {listado.map((item, idx) => {
                const detailLink = `/evaluar/${item.proyecto.id}${querySuffix}`;
                return (
                  <tr key={item.proyecto.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                        }}
                      >
                        <Link to={detailLink}>
                          <img
                            src={resolveAssetUrl(item.proyecto.boardImg)}
                            alt={item.proyecto.nombre}
                            style={{
                              width: 96,
                              aspectRatio: '16 / 9',
                              objectFit: 'cover',
                              borderRadius: 4,
                              border: '1px solid var(--border-color)',
                              display: 'block',
                              flexShrink: 0,
                            }}
                          />
                        </Link>
                        <div>
                          <Link
                            to={detailLink}
                            style={{ fontWeight: 600, fontSize: 15 }}
                          >
                            {item.proyecto.nombre}
                          </Link>
                          <div
                            style={{
                              fontSize: 13,
                              color: 'var(--text-muted)',
                              marginTop: 2,
                            }}
                          >
                            {item.integrantesNombres}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="chip-row">
                        {getProyectoCategorias(item.proyecto).map((cat) => (
                          <span key={cat} className="chip">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{item.cursoNombre}</td>

                    <td>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          lineHeight: 1.1,
                        }}
                      >
                        {formatearPromedio(item.promedioGeneral)}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-soft)',
                          marginTop: 2,
                        }}
                      >
                        {item.cantidadEvaluaciones === 0
                          ? 'sin evaluaciones'
                          : `${item.cantidadEvaluaciones} ${
                              item.cantidadEvaluaciones === 1
                                ? 'evaluación'
                                : 'evaluaciones'
                            }`}
                      </div>
                    </td>

                    {esProfesor && (
                      <td>
                        {item.miPromedio !== null ? (
                          <Link
                            to={detailLink}
                            style={{
                              fontWeight: 700,
                              fontSize: 15,
                              color: 'var(--text-main)',
                            }}
                            title="Editar mi evaluación"
                          >
                            {formatearPromedio(item.miPromedio)}
                          </Link>
                        ) : (
                          <Link to={detailLink} className="btn btn--primary">
                            Evaluar
                          </Link>
                        )}
                      </td>
                    )}

                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatFecha(item.proyecto.creadoEn)}
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
