import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { formatFecha } from '../../lib/assets';
import { downloadCsv } from '../../lib/csv';
import {
  getCursoById,
  getFestivalById,
  getFestivales,
  getInscripciones,
  getProyectoById,
  getUsuarioById,
} from '../../lib/store';

export const AdminInscripciones: React.FC = () => {
  const [festivalFiltro, setFestivalFiltro] = useState('');
  const festivales = getFestivales();

  const inscripciones = getInscripciones(
    festivalFiltro ? { festivalId: festivalFiltro } : undefined
  );

  const handleExportCsv = () => {
    const headers = [
      'Festival',
      'Proyecto',
      'Alumnos',
      'Curso',
      'Categorías',
      'Fecha',
    ];
    const rows = inscripciones.map((insc) => {
      const fest = getFestivalById(insc.festivalId);
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
          (cid) => fest?.categorias.find((c) => c.id === cid)?.nombre ?? cid
        )
        .join(' | ');
      return [
        fest?.nombre ?? '',
        proj?.nombre ?? '',
        alumnos,
        curso?.nombre ?? '',
        cats,
        formatFecha(insc.fecha),
      ];
    });
    downloadCsv('brother-inscripciones-festivales.csv', headers, rows);
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Inscripciones{' '}
            <span className="page-title__count">({inscripciones.length})</span>
          </h1>
          <p className="page-subtitle">
            Registro consolidado de proyectos postulados en todos los festivales.
          </p>
        </div>

        {inscripciones.length > 0 && (
          <button type="button" className="btn" onClick={handleExportCsv}>
            Exportar CSV
          </button>
        )}
      </div>

      <div
        className="card"
        style={{
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <label htmlFor="admin-insc-fest" className="form-label">
          Filtrar por festival:
        </label>
        <select
          id="admin-insc-fest"
          className="select"
          style={{ maxWidth: 320 }}
          value={festivalFiltro}
          onChange={(e) => setFestivalFiltro(e.target.value)}
        >
          <option value="">Todos los festivales</option>
          {festivales.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </select>
      </div>

      {inscripciones.length === 0 ? (
        <div className="empty-state">
          <p style={{ color: 'var(--text-muted)' }}>
            No hay inscripciones para el filtro seleccionado.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Festival</th>
                <th>Proyecto</th>
                <th>Alumnos</th>
                <th>Categorías</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {inscripciones.map((insc) => {
                const fest = getFestivalById(insc.festivalId);
                const proj = getProyectoById(insc.proyectoId);
                if (!fest || !proj) return null;

                const alumnos = proj.integrantes
                  .map((uid) => {
                    const u = getUsuarioById(uid);
                    return u ? `${u.nombre} ${u.apellido}` : '';
                  })
                  .filter(Boolean)
                  .join(', ');

                const cats = insc.categoriaIds
                  .map(
                    (cid) =>
                      fest.categorias.find((c) => c.id === cid)?.nombre ?? cid
                  )
                  .join(' · ');

                return (
                  <tr key={insc.id}>
                    <td style={{ fontWeight: 600 }}>
                      <Link to={`/admin/festivales/${fest.id}`}>
                        {fest.nombre}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <Link to={`/evaluar/${proj.id}`}>{proj.nombre}</Link>
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
    </Layout>
  );
};
