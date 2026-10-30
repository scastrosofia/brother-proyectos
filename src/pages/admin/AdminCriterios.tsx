import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import {
  deleteCriterio,
  getCriterios,
  moveCriterio,
  saveCriterio,
} from '../../lib/store';
import type { Criterio } from '../../types/models';

export const AdminCriterios: React.FC = () => {
  const criterios = getCriterios();

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [aEliminar, setAEliminar] = useState<Criterio | null>(null);

  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    saveCriterio({ nombre: nuevoNombre.trim() });
    setNuevoNombre('');
  };

  const handleGuardarEdicion = (id: string) => {
    if (!editValue.trim()) return;
    saveCriterio({ id, nombre: editValue.trim() });
    setEditId(null);
    setEditValue('');
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Criterios de evaluación{' '}
            <span className="page-title__count">({criterios.length})</span>
          </h1>
          <p className="page-subtitle">
            Se aplican por igual a todas las categorías. Si eliminás un criterio, las evaluaciones previas lo ignoran al calcular promedios.
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
          placeholder="Nombre del nuevo criterio (ej. Síntesis visual)..."
          aria-label="Nombre del nuevo criterio"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
        />
        <button type="submit" className="btn btn--primary">
          + Agregar criterio
        </button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Orden</th>
              <th>Criterio</th>
              <th style={{ width: 140 }}>Mover</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {criterios.map((crit, idx) => {
              const isEditing = editId === crit.id;
              return (
                <tr key={crit.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                    {crit.orden}
                  </td>
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
                          onClick={() => handleGuardarEdicion(crit.id)}
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
                      <strong>{crit.nombre}</strong>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '0 12px' }}
                        disabled={idx === 0}
                        aria-label={`Subir ${crit.nombre}`}
                        onClick={() => moveCriterio(crit.id, 'up')}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '0 12px' }}
                        disabled={idx === criterios.length - 1}
                        aria-label={`Bajar ${crit.nombre}`}
                        onClick={() => moveCriterio(crit.id, 'down')}
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!isEditing && (
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setEditId(crit.id);
                            setEditValue(crit.nombre);
                          }}
                        >
                          Renombrar
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger-outline"
                          onClick={() => setAEliminar(crit)}
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

      {aEliminar && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setAEliminar(null)}
        >
          <div
            className="modal-panel"
            style={{ maxWidth: 450 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 19, marginBottom: 10 }}>
              ¿Eliminar el criterio "{aEliminar.nombre}"?
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 22 }}>
              Las evaluaciones existentes recalcularán sus promedios automáticamente ignorando este criterio.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setAEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  deleteCriterio(aEliminar.id);
                  setAEliminar(null);
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
