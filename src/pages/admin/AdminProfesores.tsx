import React, { useMemo, useState } from 'react';
import { Layout } from '../../components/Layout';
import { formatFecha } from '../../lib/assets';
import { downloadCsv } from '../../lib/csv';
import {
  addProfesor,
  calcularPromedioEvaluacion,
  deleteProfesor,
  formatearPromedio,
  getCriterios,
  getCursoById,
  getEvaluaciones,
  getProyectoById,
  getProyectos,
  getUsuarioById,
  getUsuariosByRol,
} from '../../lib/store';
import { getProyectoCategorias, type Usuario } from '../../types/models';

type OperadorPorcentaje = '' | 'gte' | 'lte' | 'eq';

interface ProfesorStats {
  profesor: Usuario;
  vistosCount: number;
  pctVistos: number;
  evaluadosCount: number;
  pctEvaluados: number;
}

export const AdminProfesores: React.FC = () => {
  const proyectos = getProyectos();
  const evaluaciones = getEvaluaciones();
  const criterios = getCriterios();
  const profesores = getUsuariosByRol('profesor');

  const [busqueda, setBusqueda] = useState('');
  const [operadorPct, setOperadorPct] = useState<OperadorPorcentaje>('');
  const [valorPct, setValorPct] = useState<string>('50');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal: Agregar profesor
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Modal: Enviar mail
  const [mailTargets, setMailTargets] = useState<ProfesorStats[] | null>(null);
  const [mailAsunto, setMailAsunto] = useState('');
  const [mailMensaje, setMailMensaje] = useState('');

  // Modal: Eliminar profesor
  const [profesorAEliminar, setProfesorAEliminar] = useState<Usuario | null>(
    null
  );

  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  // Métricas globales superiores (estilo FilmFreeway Submissions Summary)
  const totalProyectos = proyectos.length;
  const proyectoIdsSet = useMemo(
    () => new Set(proyectos.map((p) => p.id)),
    [proyectos]
  );
  const proyectosConEvaluacion = useMemo(() => {
    const ids = new Set<string>();
    for (const ev of evaluaciones) {
      if (proyectoIdsSet.has(ev.proyectoId)) {
        ids.add(ev.proyectoId);
      }
    }
    return ids.size;
  }, [evaluaciones, proyectoIdsSet]);

  const proyectosSinEvaluar = Math.max(0, totalProyectos - proyectosConEvaluacion);
  const pctProyectosEvaluados =
    totalProyectos > 0
      ? Math.round((proyectosConEvaluacion / totalProyectos) * 100)
      : 0;

  // Métricas por profesor
  const statsPorProfesor: ProfesorStats[] = useMemo(() => {
    return profesores.map((prof) => {
      const evalsProf = evaluaciones.filter(
        (ev) => ev.profesorId === prof.id && proyectoIdsSet.has(ev.proyectoId)
      );
      const vistosSet = new Set<string>();
      for (const pid of prof.proyectosVistos ?? []) {
        if (proyectoIdsSet.has(pid)) vistosSet.add(pid);
      }
      // Todo proyecto evaluado por el profesor también cuenta como visto
      for (const ev of evalsProf) {
        vistosSet.add(ev.proyectoId);
      }

      const vistosCount = vistosSet.size;
      const evaluadosCount = evalsProf.length;
      const pctVistos =
        totalProyectos > 0
          ? Math.round((vistosCount / totalProyectos) * 100)
          : 0;
      const pctEvaluados =
        totalProyectos > 0
          ? Math.round((evaluadosCount / totalProyectos) * 100)
          : 0;

      return {
        profesor: prof,
        vistosCount,
        pctVistos,
        evaluadosCount,
        pctEvaluados,
      };
    });
  }, [profesores, evaluaciones, proyectoIdsSet, totalProyectos]);

  // Filtrado
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const umbral = Number(valorPct);

    return statsPorProfesor.filter((item) => {
      if (q) {
        const fullName = `${item.profesor.nombre} ${item.profesor.apellido}`.toLowerCase();
        const email = (item.profesor.email ?? '').toLowerCase();
        if (!fullName.includes(q) && !email.includes(q)) return false;
      }

      if (operadorPct && !Number.isNaN(umbral)) {
        if (operadorPct === 'gte' && !(item.pctVistos >= umbral)) return false;
        if (operadorPct === 'lte' && !(item.pctVistos <= umbral)) return false;
        if (operadorPct === 'eq' && item.pctVistos !== umbral) return false;
      }

      return true;
    });
  }, [statsPorProfesor, busqueda, operadorPct, valorPct]);

  const allFilteredSelected =
    filtrados.length > 0 &&
    filtrados.every((f) => selectedIds.includes(f.profesor.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filtrados.map((f) => f.profesor.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const next = new Set(selectedIds);
      for (const f of filtrados) next.add(f.profesor.id);
      setSelectedIds(Array.from(next));
    }
  };

  const toggleSelectOne = (profId: string) => {
    setSelectedIds((prev) =>
      prev.includes(profId)
        ? prev.filter((id) => id !== profId)
        : [...prev, profId]
    );
  };

  // Descargar reporte CSV de ratings y comentarios (de 1 o varios profesores)
  const exportarReporteProfesores = (targets: ProfesorStats[], filename: string) => {
    const headers = [
      'Profesor',
      'Email',
      'Última conexión',
      '% Proyectos vistos',
      'Proyecto evaluado',
      'Categoría',
      'Curso',
      'Alumnos',
      ...criterios.map((c) => c.nombre),
      'Promedio otorgado',
      'Comentario',
      'Fecha evaluación',
    ];

    const rows: (string | number)[][] = [];

    for (const item of targets) {
      const prof = item.profesor;
      const profNombre = `${prof.nombre} ${prof.apellido}`;
      const profEmail = prof.email ?? '—';
      const profUltima = prof.ultimaConexion
        ? formatFecha(prof.ultimaConexion)
        : 'Sin ingresos';

      const evalsProf = evaluaciones
        .filter((ev) => ev.profesorId === prof.id)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));

      if (evalsProf.length === 0) {
        rows.push([
          profNombre,
          profEmail,
          profUltima,
          `${item.pctVistos}% (${item.vistosCount}/${totalProyectos})`,
          'Sin evaluaciones registradas',
          '',
          '',
          '',
          ...criterios.map(() => ''),
          '',
          '',
          '',
        ]);
        continue;
      }

      for (const ev of evalsProf) {
        const proj = getProyectoById(ev.proyectoId);
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
        const prom = calcularPromedioEvaluacion(ev, criterios);

        rows.push([
          profNombre,
          profEmail,
          profUltima,
          `${item.pctVistos}% (${item.vistosCount}/${totalProyectos})`,
          proj?.nombre ?? ev.proyectoId,
          proj ? getProyectoCategorias(proj).join(' / ') : '',
          curso?.nombre ?? '',
          alumnos,
          ...criterios.map((c) => ev.puntajes[c.id] ?? ''),
          formatearPromedio(prom),
          ev.comentario || '',
          formatFecha(ev.fecha),
        ]);
      }
    }

    downloadCsv(filename, headers, rows);
    setFlashMsg(`Se descargó el reporte "${filename}".`);
  };

  // Abrir modal de envío de correo
  const abrirModalMail = (targets: ProfesorStats[]) => {
    if (targets.length === 0) return;
    setMailTargets(targets);
    setMailAsunto('Seguimiento de evaluaciones · BROTHER Proyectos');

    if (targets.length === 1) {
      const t = targets[0];
      const faltanVer = Math.max(0, totalProyectos - t.vistosCount);
      setMailMensaje(
        `Hola ${t.profesor.nombre},\n\n` +
          `Te escribimos desde coordinación de Brother. Vimos que hasta ahora revisaste ${t.vistosCount} de ${totalProyectos} proyectos (${t.pctVistos}%) y cargaste ${t.evaluadosCount} ${
            t.evaluadosCount === 1 ? 'evaluación' : 'evaluaciones'
          }.\n\n` +
          (faltanVer > 0
            ? `Cuando tengas un rato, pasate por la plataforma para mirar los ${faltanVer} proyectos restantes y dejar tu devolución.\n\n`
            : `¡Gracias por haber revisado el 100% de las carpetas cargadas!\n\n`) +
          `¡Abrazo!\nEquipo Brother`
      );
    } else {
      setMailMensaje(
        `Hola equipo docente,\n\n` +
          `Les escribimos para recordarles pasar por BROTHER · Proyectos a completar la visualización y evaluación de las carpetas pendientes antes del cierre interno.\n\n` +
          `¡Muchas gracias!\nEquipo Brother`
      );
    }
  };

  const handleSimulatedSendMail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailTargets) return;
    const destinatarios = mailTargets
      .map((t) => t.profesor.email || `${t.profesor.nombre} ${t.profesor.apellido}`)
      .join(', ');
    setMailTargets(null);
    setFlashMsg(`Correo enviado a ${destinatarios} (simulado en modo demo).`);
  };

  const buildMailtoHref = (): string => {
    if (!mailTargets || mailTargets.length === 0) return 'mailto:';
    const emails = mailTargets
      .map((t) => t.profesor.email)
      .filter(Boolean)
      .join(',');
    const params = new URLSearchParams({
      subject: mailAsunto,
      body: mailMensaje,
    });
    // URLSearchParams usa '+', que algunos clientes de correo muestran literal; reemplazamos por %20
    return `mailto:${emails}?${params.toString().replace(/\+/g, '%20')}`;
  };

  const handleAgregarProfesor = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!nuevoNombre.trim() || !nuevoApellido.trim()) {
      setAddError('Completá nombre y apellido del profesor.');
      return;
    }
    const emailClean = nuevoEmail.trim().toLowerCase();
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      setAddError('Ingresá un email válido (ej. nombre@brotherad.com).');
      return;
    }
    const duplicado = profesores.some(
      (p) => (p.email ?? '').toLowerCase() === emailClean
    );
    if (duplicado) {
      setAddError('Ya existe un profesor registrado con ese email.');
      return;
    }

    const creado = addProfesor({
      nombre: nuevoNombre,
      apellido: nuevoApellido,
      email: emailClean,
    });

    setNuevoNombre('');
    setNuevoApellido('');
    setNuevoEmail('');
    setAddModalOpen(false);
    setFlashMsg(
      `Se agregó a ${creado.nombre} ${creado.apellido}. Ya figura también en el selector "Ver como → Profesor".`
    );
  };

  const selectedStats = filtrados.filter((f) =>
    selectedIds.includes(f.profesor.id)
  );

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Profesores{' '}
            <span className="page-title__count">({profesores.length})</span>
          </h1>
          <p className="page-subtitle">
            Insights de cobertura de proyectos vistos, última conexión, descarga de reportes y contacto directo.
          </p>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setAddError(null);
            setAddModalOpen(true);
          }}
        >
          + Agregar profesor
        </button>
      </div>

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

      {/* Resumen superior + Filtros (inspirado en referencia FilmFreeway Judges) */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 28,
            alignItems: 'start',
          }}
        >
          {/* Resumen de estado global */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 15 }}>
              <strong>Total de proyectos:</strong>{' '}
              <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                {totalProyectos}
              </span>
            </div>
            <div style={{ fontSize: 15 }}>
              <strong>Proyectos evaluados:</strong>{' '}
              <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                {proyectosConEvaluacion}
              </span>
            </div>
            <div style={{ fontSize: 15 }}>
              <strong>Proyectos sin evaluar:</strong>{' '}
              <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                {proyectosSinEvaluar}
              </span>
            </div>
            <div style={{ fontSize: 15 }}>
              <strong>Porcentaje evaluado:</strong>{' '}
              <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                {pctProyectosEvaluados}%
              </span>
            </div>
          </div>

          {/* Filtros de profesores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label" htmlFor="prof-search">
                Buscar profesor
              </label>
              <input
                id="prof-search"
                type="search"
                className="input"
                style={{ marginTop: 6 }}
                placeholder="Nombre, apellido o email..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div>
              <span className="form-label">Porcentaje de proyectos vistos</span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.3fr 1fr',
                  gap: 10,
                  marginTop: 6,
                }}
              >
                <select
                  aria-label="Condición de porcentaje visto"
                  className="select"
                  value={operadorPct}
                  onChange={(e) =>
                    setOperadorPct(e.target.value as OperadorPorcentaje)
                  }
                >
                  <option value="">- Todos -</option>
                  <option value="gte">Mayor o igual a</option>
                  <option value="lte">Menor o igual a</option>
                  <option value="eq">Igual a</option>
                </select>

                <select
                  aria-label="Valor de porcentaje visto"
                  className="select"
                  disabled={!operadorPct}
                  value={valorPct}
                  onChange={(e) => setValorPct(e.target.value)}
                >
                  <option value="0">0%</option>
                  <option value="25">25%</option>
                  <option value="50">50%</option>
                  <option value="75">75%</option>
                  <option value="100">100%</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contador y barra de acciones masivas */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <p style={{ fontSize: 14 }}>
          <strong>{filtrados.length}</strong>{' '}
          {filtrados.length === 1
            ? 'profesor coincide con tu criterio'
            : 'profesores coinciden con tu criterio'}
          {selectedStats.length > 0 && (
            <span style={{ color: 'var(--accent-blue)', marginLeft: 8 }}>
              · {selectedStats.length}{' '}
              {selectedStats.length === 1 ? 'seleccionado' : 'seleccionados'}
            </span>
          )}
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            disabled={filtrados.length === 0}
            onClick={() =>
              exportarReporteProfesores(
                selectedStats.length > 0 ? selectedStats : filtrados,
                selectedStats.length > 0
                  ? 'reporte-profesores-seleccionados.csv'
                  : 'reporte-profesores-completo.csv'
              )
            }
          >
            Descargar reporte{' '}
            {selectedStats.length > 0
              ? `(${selectedStats.length})`
              : 'general'}{' '}
            CSV
          </button>

          <button
            type="button"
            className="btn"
            disabled={filtrados.length === 0}
            onClick={() =>
              abrirModalMail(selectedStats.length > 0 ? selectedStats : filtrados)
            }
          >
            Enviar mail{' '}
            {selectedStats.length > 0
              ? `a seleccionados (${selectedStats.length})`
              : 'a todos'}
          </button>
        </div>
      </div>

      {/* Tabla principal de profesores */}
      {filtrados.length === 0 ? (
        <div className="empty-state">
          <h2 style={{ fontSize: 19, marginBottom: 8 }}>
            Ningún profesor coincide con los filtros actuales
          </h2>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setBusqueda('');
              setOperadorPct('');
            }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 42 }}>
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los profesores"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    style={{ width: 17, height: 17 }}
                  />
                </th>
                <th>Nombre</th>
                <th>Vistos</th>
                <th>% Vistos</th>
                <th>Evaluados</th>
                <th>Última conexión</th>
                <th>Reporte</th>
                <th>Email / Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => {
                const { profesor } = item;
                const isSelected = selectedIds.includes(profesor.id);
                const slug = `${profesor.nombre}-${profesor.apellido}`
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-z0-9]+/g, '-');

                return (
                  <tr key={profesor.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar a ${profesor.nombre} ${profesor.apellido}`}
                        checked={isSelected}
                        onChange={() => toggleSelectOne(profesor.id)}
                        style={{ width: 17, height: 17 }}
                      />
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {profesor.nombre} {profesor.apellido}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                        {profesor.email || 'Sin email'}
                      </div>
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          color: 'var(--accent-blue)',
                          fontWeight: 600,
                        }}
                      >
                        {item.vistosCount}
                      </span>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>
                        / {totalProyectos}
                      </span>
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          minWidth: 110,
                        }}
                      >
                        <strong style={{ minWidth: 38 }}>
                          {item.pctVistos}%
                        </strong>
                        <div
                          aria-hidden="true"
                          style={{
                            flex: 1,
                            height: 6,
                            borderRadius: 999,
                            background: 'var(--bg-subtle)',
                            overflow: 'hidden',
                            maxWidth: 72,
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, item.pctVistos)}%`,
                              height: '100%',
                              background:
                                item.pctVistos >= 75
                                  ? 'var(--success)'
                                  : item.pctVistos > 0
                                    ? 'var(--accent-blue)'
                                    : 'transparent',
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>
                      <strong>{item.evaluadosCount}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>
                        / {totalProyectos} ({item.pctEvaluados}%)
                      </span>
                    </td>

                    <td>
                      {profesor.ultimaConexion ? (
                        <span
                          style={{
                            background: 'var(--bg-subtle)',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatFecha(profesor.ultimaConexion)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-soft)', fontSize: 13 }}>
                          Sin ingresos
                        </span>
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          exportarReporteProfesores(
                            [item],
                            `reporte-${slug}.csv`
                          )
                        }
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--accent-blue)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Descargar reporte
                      </button>
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => abrirModalMail([item])}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--accent-blue)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Enviar mail
                        </button>

                        {profesores.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setProfesorAEliminar(profesor)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: 'var(--danger)',
                              fontFamily: 'var(--font-sans)',
                              fontSize: 13,
                              cursor: 'pointer',
                            }}
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Agregar nuevo profesor */}
      {addModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-prof-title"
          onClick={() => setAddModalOpen(false)}
        >
          <div
            className="modal-panel"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="add-prof-title" style={{ fontSize: 20, marginBottom: 6 }}>
              Agregar usuario profesor
            </h2>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginBottom: 18,
              }}
            >
              Los profesores los da de alta administración. Una vez creado, también vas a poder seleccionarlo arriba en "Ver como → Profesor".
            </p>

            <form onSubmit={handleAgregarProfesor}>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="nuevo-prof-nombre">
                    Nombre *
                  </label>
                  <input
                    id="nuevo-prof-nombre"
                    type="text"
                    className="input"
                    placeholder="Ej: Carolina"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="nuevo-prof-apellido">
                    Apellido *
                  </label>
                  <input
                    id="nuevo-prof-apellido"
                    type="text"
                    className="input"
                    placeholder="Ej: Aguirre"
                    value={nuevoApellido}
                    onChange={(e) => setNuevoApellido(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="nuevo-prof-email">
                  Email *
                </label>
                <input
                  id="nuevo-prof-email"
                  type="email"
                  className="input"
                  placeholder="carolina.aguirre@brotherad.com"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                />
              </div>

              {addError && (
                <p className="form-error" style={{ marginBottom: 14 }}>
                  {addError}
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary">
                  Guardar profesor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enviar mail a profesor(es) */}
      {mailTargets && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mail-prof-title"
          onClick={() => setMailTargets(null)}
        >
          <div
            className="modal-panel"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="mail-prof-title" style={{ fontSize: 20, marginBottom: 14 }}>
              Enviar mail a{' '}
              {mailTargets.length === 1
                ? `${mailTargets[0].profesor.nombre} ${mailTargets[0].profesor.apellido}`
                : `${mailTargets.length} profesores`}
            </h2>

            <form onSubmit={handleSimulatedSendMail}>
              <div className="form-group">
                <span className="form-label">Para</span>
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 8,
                    fontSize: 13,
                    color: 'var(--text-main)',
                  }}
                >
                  {mailTargets
                    .map(
                      (t) =>
                        `${t.profesor.nombre} ${t.profesor.apellido} <${
                          t.profesor.email ?? 'sin-email'
                        }>`
                    )
                    .join(', ')}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mail-asunto">
                  Asunto
                </label>
                <input
                  id="mail-asunto"
                  type="text"
                  className="input"
                  value={mailAsunto}
                  onChange={(e) => setMailAsunto(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mail-mensaje">
                  Mensaje
                </label>
                <textarea
                  id="mail-mensaje"
                  className="textarea"
                  style={{ minHeight: 150 }}
                  value={mailMensaje}
                  onChange={(e) => setMailMensaje(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginTop: 18,
                }}
              >
                <a
                  href={buildMailtoHref()}
                  className="btn"
                  onClick={() => setMailTargets(null)}
                >
                  Abrir en mi app de correo ↗
                </a>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setMailTargets(null)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn--primary">
                    Enviar mail
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar quitar profesor */}
      {profesorAEliminar && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setProfesorAEliminar(null)}
        >
          <div
            className="modal-panel"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 19, marginBottom: 10 }}>
              ¿Quitar a {profesorAEliminar.nombre} {profesorAEliminar.apellido}?
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 22 }}>
              Se quitará su usuario de la lista de profesores y sus evaluaciones dejarán de contarse en el promedio.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setProfesorAEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  deleteProfesor(profesorAEliminar.id);
                  setSelectedIds((prev) =>
                    prev.filter((id) => id !== profesorAEliminar.id)
                  );
                  setFlashMsg(
                    `Se eliminó al profesor ${profesorAEliminar.nombre} ${profesorAEliminar.apellido}.`
                  );
                  setProfesorAEliminar(null);
                }}
              >
                Quitar profesor
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
