import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import {
  deleteCurso,
  getCursos,
  getProyectos,
  saveCurso,
} from '../../lib/store';
import type { Curso } from '../../types/models';

export const AdminCursos: React.FC = () => {
  const cursos = getCursos();
  const proyectos = getProyectos();

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [cursoAEliminar, setCursoAEliminar] = useState<Curso | null>(null);

  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    saveCurso({ nombre: nuevoNombre.trim() });
    setNuevoNombre('');
  };

  const handleGuardarEdicion = (id: string) => {
    if (!editValue.trim()) return;
    saveCurso({ id, nombre: editValue.trim() });
    setEditId(null);
    setEditValue('');
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Cursos <span className="page-title__count">({cursos.length})</span>
          </h1>
          <p className="page-subtitle">
            Lista de cursos disponibles cuando los alumnos cargan sus proyectos.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleAgregar}
        className="card"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          className="input"
          style={{ flex: 1, minWidth: 240 }}
          placeholder="Nombre del nuevo curso (ej. Dirección de Arte Intensivo)..."
          aria-label="Nombre del nuevo curso"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
        />
        <button type="submit" className="btn btn--primary">
          + Agregar curso
        </button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre del curso</th>
              <th>Proyectos asociados</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cursos.map((curso) => {
              const cantProy = proyectos.filter(
                (p) => p.cursoId === curso.id
              ).length;
              const isEditing = editId === curso.id;

              return (
                <tr key={curso.id}>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          className="input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => handleGuardarEdicion(curso.id)}
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setEditId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <strong>{curso.nombre}</strong>
                    )}
                  </td>
                  <td>{cantProy}</td>
                  <td style={{ textAlign: 'right' }}>
                    {!isEditing && (
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setEditId(curso.id);
                            setEditValue(curso.nombre);
                          }}
                        >
                          Renombrar
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger-outline"
                          onClick={() => setCursoAEliminar(curso)}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {cursoAEliminar && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setCursoAEliminar(null)}
        >
          <div
            className="modal-panel"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 19, marginBottom: 10 }}>
              ¿Eliminar el curso "{cursoAEliminar.nombre}"?
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 22 }}>
              Dejará de aparecer como opción al cargar proyectos nuevos.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setCursoAEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  deleteCurso(cursoAEliminar.id);
                  setCursoAEliminar(null);
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
