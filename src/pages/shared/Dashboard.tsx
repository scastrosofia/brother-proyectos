import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { NotificacionesPanel } from '../../components/NotificacionesPanel';
import { useSession } from '../../context/SessionContext';
import { downloadCsv } from '../../lib/csv';
import {
  getCursos,
  getFestivales,
  getInscripciones,
  getProyectos,
} from '../../lib/store';
import { CATEGORIAS, getProyectoCategorias } from '../../types/models';
import { AlumnoDashboard } from '../alumno/AlumnoDashboard';

function formatPercentage(part: number, total: number): string {
  if (total <= 0 || part <= 0) return '0%';
  const raw = (part / total) * 100;
  const rounded = Math.round(raw * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export const Dashboard: React.FC = () => {
  const { usuario } = useSession();
  const [festivalFiltroId, setFestivalFiltroId] = useState<string>('');

  const proyectos = getProyectos();
  const cursos = getCursos();
  const festivales = getFestivales();
  const todasInscripciones = getInscripciones();

  const inscripcionesFiltradas = useMemo(() => {
    if (!festivalFiltroId) return todasInscripciones;
    return todasInscripciones.filter((i) => i.festivalId === festivalFiltroId);
  }, [todasInscripciones, festivalFiltroId]);

  const proyectosById = useMemo(
    () => new Map(proyectos.map((p) => [p.id, p])),
    [proyectos]
  );

  // Conjunto de proyectos únicos que tienen al menos 1 inscripción en el alcance actual
  const proyectosInscriptosIds = useMemo(() => {
    const set = new Set<string>();
    for (const insc of inscripcionesFiltradas) {
      if (proyectosById.has(insc.proyectoId)) {
        set.add(insc.proyectoId);
      }
    }
    return set;
  }, [inscripcionesFiltradas, proyectosById]);

  const totalProyectosPlataforma = proyectos.length;
  const totalProyectosInscriptos = proyectosInscriptosIds.size;

  // Total de postulaciones sumando cada categoría elegida en cada festival
  const totalPostulacionesCategorias = useMemo(
    () =>
      inscripcionesFiltradas.reduce(
        (acc, insc) =>
          proyectosById.has(insc.proyectoId)
            ? acc + insc.categoriaIds.length
            : acc,
        0
      ),
    [inscripcionesFiltradas, proyectosById]
  );

  const festivalesAbiertosCount = festivales.filter(
    (f) => f.estado === 'abierto'
  ).length;

  // 1. Desglose por Festival (siempre muestra todos los festivales para comparar)
  const porFestival = useMemo(() => {
    const totalInscGlobal = todasInscripciones.length;
    return festivales
      .map((fest) => {
        const inscs = todasInscripciones.filter(
          (i) => i.festivalId === fest.id && proyectosById.has(i.proyectoId)
        );
        const proyUnicos = new Set(inscs.map((i) => i.proyectoId)).size;
        const postulacionesCat = inscs.reduce(
          (acc, i) => acc + i.categoriaIds.length,
          0
        );
        return {
          id: fest.id,
          nombre: fest.nombre,
          estado: fest.estado,
          proyectosInscriptos: proyUnicos,
          postulacionesCat,
          pct: formatPercentage(inscs.length, totalInscGlobal),
        };
      })
      .sort(
        (a, b) =>
          b.proyectosInscriptos - a.proyectosInscriptos ||
          b.postulacionesCat - a.postulacionesCat
      );
  }, [festivales, todasInscripciones, proyectosById]);

  // 2. Desglose por Turno / Curso
  const porCurso = useMemo(() => {
    return cursos
      .map((curso) => {
        const proysDelCurso = proyectos.filter((p) => p.cursoId === curso.id);
        const inscriptosDelCurso = proysDelCurso.filter((p) =>
          proyectosInscriptosIds.has(p.id)
        );
        return {
          id: curso.id,
          nombre: curso.nombre,
          inscriptos: inscriptosDelCurso.length,
          cargados: proysDelCurso.length,
          pct: formatPercentage(
            inscriptosDelCurso.length,
            totalProyectosInscriptos
          ),
        };
      })
      .sort(
        (a, b) => b.inscriptos - a.inscriptos || b.cargados - a.cargados
      );
  }, [cursos, proyectos, proyectosInscriptosIds, totalProyectosInscriptos]);

  // 3. Desglose por Categoría general del proyecto (Film / Activación / Gráfica / Digital)
  const porCategoriaProyecto = useMemo(() => {
    return CATEGORIAS.map((cat) => {
      const proysDeCat = proyectos.filter((p) =>
        getProyectoCategorias(p).includes(cat)
      );
      const inscriptosDeCat = proysDeCat.filter((p) =>
        proyectosInscriptosIds.has(p.id)
      );
      return {
        categoria: cat,
        inscriptos: inscriptosDeCat.length,
        cargados: proysDeCat.length,
        pct: formatPercentage(
          inscriptosDeCat.length,
          totalProyectosInscriptos
        ),
      };
    }).sort((a, b) => b.inscriptos - a.inscriptos || b.cargados - a.cargados);
  }, [proyectos, proyectosInscriptosIds, totalProyectosInscriptos]);

  // 4. Desglose por Categoría específica de cada Festival (idéntico a "Entries By Category" de referencia)
  const porCategoriaFestival = useMemo(() => {
    const festsTarget = festivalFiltroId
      ? festivales.filter((f) => f.id === festivalFiltroId)
      : festivales;

    const rows: {
      key: string;
      festivalId: string;
      label: string;
      entries: number;
      pct: string;
    }[] = [];

    for (const fest of festsTarget) {
      const inscsFest = inscripcionesFiltradas.filter(
        (i) => i.festivalId === fest.id && proyectosById.has(i.proyectoId)
      );
      for (const cat of fest.categorias) {
        const count = inscsFest.filter((i) =>
          i.categoriaIds.includes(cat.id)
        ).length;
        rows.push({
          key: `${fest.id}-${cat.id}`,
          festivalId: fest.id,
          label: festivalFiltroId
            ? cat.nombre
            : `${fest.nombre} · ${cat.nombre}`,
          entries: count,
          pct: formatPercentage(count, totalPostulacionesCategorias),
        });
      }
    }

    return rows.sort(
      (a, b) => b.entries - a.entries || a.label.localeCompare(b.label, 'es')
    );
  }, [
    festivales,
    festivalFiltroId,
    inscripcionesFiltradas,
    proyectosById,
    totalPostulacionesCategorias,
  ]);

  const festQuerySuffix = festivalFiltroId ? `&fest=${festivalFiltroId}` : '';
  const festivalSeleccionado = festivales.find(
    (f) => f.id === festivalFiltroId
  );

  const handleExportDashboardCsv = () => {
    const headers = ['Dimensión', 'Ítem', 'Porcentaje', 'Inscriptos', 'Total cargados'];
    const rows: (string | number)[][] = [];

    for (const f of porFestival) {
      rows.push([
        'Festival',
        f.nombre,
        f.pct,
        f.proyectosInscriptos,
        `${f.postulacionesCat} postulaciones en categorías`,
      ]);
    }
    for (const c of porCurso) {
      rows.push(['Turno / Curso', c.nombre, c.pct, c.inscriptos, c.cargados]);
    }
    for (const cat of porCategoriaProyecto) {
      rows.push([
        'Categoría de proyecto',
        cat.categoria,
        cat.pct,
        cat.inscriptos,
        cat.cargados,
      ]);
    }
    for (const fc of porCategoriaFestival) {
      rows.push([
        'Categoría de festival',
        fc.label,
        fc.pct,
        fc.entries,
        '',
      ]);
    }

    downloadCsv('brother-dashboard-inscripciones.csv', headers, rows);
  };

  if (usuario.rol === 'alumno') {
    return <AlumnoDashboard />;
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {usuario.rol === 'profesor'
              ? 'Dashboard de profesor'
              : 'Dashboard de inscripciones'}
          </h1>
          <p className="page-subtitle">
            {usuario.rol === 'profesor'
              ? 'Notificaciones de proyectos donde te taggearon alumnos y resumen general de inscripciones.'
              : 'Resumen de proyectos inscriptos por turno/curso, categoría y festival.'}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <select
            aria-label="Filtrar dashboard por festival"
            className="select"
            style={{ width: 'auto', minWidth: 240 }}
            value={festivalFiltroId}
            onChange={(e) => setFestivalFiltroId(e.target.value)}
          >
            <option value="">Todos los festivales</option>
            {festivales.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn"
            onClick={handleExportDashboardCsv}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Notificaciones de menciones/tags para el profesor */}
      {usuario.rol === 'profesor' && (
        <NotificacionesPanel emptyMessage="No tenés menciones ni notificaciones pendientes de alumnos." />
      )}

      {/* KPIs principales */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__label">Proyectos inscriptos</div>
          <div className="kpi-card__value">{totalProyectosInscriptos}</div>
          <div className="kpi-card__sub">
            {formatPercentage(
              totalProyectosInscriptos,
              totalProyectosPlataforma
            )}{' '}
            de los {totalProyectosPlataforma} proyectos cargados
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">Inscripciones en categorías</div>
          <div className="kpi-card__value">{totalPostulacionesCategorias}</div>
          <div className="kpi-card__sub">
            {festivalSeleccionado
              ? `En ${festivalSeleccionado.nombre}`
              : 'Sumando todas las categorías elegidas'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">Proyectos en plataforma</div>
          <div className="kpi-card__value">{totalProyectosPlataforma}</div>
          <div className="kpi-card__sub">
            Distribuidos en {cursos.length} turnos / cursos
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__label">Festivales activos</div>
          <div className="kpi-card__value">{festivalesAbiertosCount}</div>
          <div className="kpi-card__sub">
            De {festivales.length} festivales registrados
          </div>
        </div>
      </div>

      {/* Grilla de dos columnas para Turnos y Categorías generales */}
      <div className="dashboard-two-col">
        {/* Proyectos inscriptos por Turno / Curso */}
        <section className="report-section">
          <h2 className="report-section__title">Inscripciones por turno / curso</h2>
          <div className="table-wrap">
            <table className="ff-report-table">
              <thead>
                <tr>
                  <th>Turno / Curso</th>
                  <th className="col-pct">Porcentaje</th>
                  <th className="col-num">Inscriptos</th>
                </tr>
              </thead>
              <tbody>
                {porCurso.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        to={`/proyectos?curso=${row.id}${festQuerySuffix}`}
                        style={{ fontWeight: 500 }}
                      >
                        {row.nombre}
                      </Link>
                      <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                        {row.cargados}{' '}
                        {row.cargados === 1
                          ? 'proyecto cargado en el turno'
                          : 'proyectos cargados en el turno'}
                      </div>
                    </td>
                    <td className="col-pct">{row.pct}</td>
                    <td className="col-num">{row.inscriptos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Proyectos inscriptos por Categoría */}
        <section className="report-section">
          <h2 className="report-section__title">Inscripciones por categoría</h2>
          <div className="table-wrap">
            <table className="ff-report-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th className="col-pct">Porcentaje</th>
                  <th className="col-num">Inscriptos</th>
                </tr>
              </thead>
              <tbody>
                {porCategoriaProyecto.map((row) => (
                  <tr key={row.categoria}>
                    <td>
                      <Link
                        to={`/proyectos?cat=${encodeURIComponent(
                          row.categoria
                        )}${festQuerySuffix}`}
                        style={{ fontWeight: 500 }}
                      >
                        {row.categoria}
                      </Link>
                      <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                        {row.cargados} en plataforma
                      </div>
                    </td>
                    <td className="col-pct">{row.pct}</td>
                    <td className="col-num">{row.inscriptos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Inscripciones por Festival */}
      {!festivalFiltroId && (
        <section className="report-section">
          <h2 className="report-section__title">Inscripciones por festival</h2>
          <div className="table-wrap">
            <table className="ff-report-table">
              <thead>
                <tr>
                  <th>Festival</th>
                  <th className="col-pct">Porcentaje</th>
                  <th className="col-num">Proyectos inscriptos</th>
                  <th className="col-num">Postulaciones en categorías</th>
                </tr>
              </thead>
              <tbody>
                {porFestival.map((fest) => (
                  <tr key={fest.id}>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Link
                          to={`/proyectos?fest=${fest.id}`}
                          style={{ fontWeight: 500 }}
                        >
                          {fest.nombre}
                        </Link>
                        <span className={`chip chip--status-${fest.estado}`}>
                          {fest.estado === 'abierto'
                            ? 'Abierto'
                            : fest.estado === 'cerrado'
                              ? 'Cerrado'
                              : 'Borrador'}
                        </span>
                      </div>
                    </td>
                    <td className="col-pct">{fest.pct}</td>
                    <td className="col-num">{fest.proyectosInscriptos}</td>
                    <td className="col-num">{fest.postulacionesCat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Desglose exacto estilo "Entries By Category" por Categoría de cada Festival */}
      <section className="report-section" style={{ marginBottom: 0 }}>
        <h2 className="report-section__title">
          Postulaciones por categoría de festival
          {festivalSeleccionado ? ` · ${festivalSeleccionado.nombre}` : ''}
        </h2>
        <div className="table-wrap">
          <table className="ff-report-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th className="col-pct">Porcentaje</th>
                <th className="col-num">Inscripciones</th>
              </tr>
            </thead>
            <tbody>
              {porCategoriaFestival.map((item) => (
                <tr key={item.key}>
                  <td>
                    <Link
                      to={`/proyectos?fest=${item.festivalId}`}
                      style={{ fontWeight: 500 }}
                    >
                      {item.label}
                    </Link>
                  </td>
                  <td className="col-pct">{item.pct}</td>
                  <td className="col-num">{item.entries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
};
