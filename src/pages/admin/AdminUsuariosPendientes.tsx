import React, { useEffect, useState } from 'react';
import type { PerfilUsuario } from '../../lib/auth';
import { getUsuariosPendientes, aprobarUsuario, rechazarUsuario } from '../../lib/auth';
import { notificarAprobacionUsuario } from '../../lib/emailService';

export const AdminUsuariosPendientes: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<PerfilUsuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cargarSolicitudes = async () => {
    setCargando(true);
    const data = await getUsuariosPendientes();
    setSolicitudes(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const handleAprobar = async (usuario: PerfilUsuario) => {
    setProcesandoId(usuario.id);
    const ok = await aprobarUsuario(usuario.id, usuario.rol, usuario.turno || undefined);
    if (ok) {
      notificarAprobacionUsuario({
        email: usuario.email,
        nombre: usuario.nombre || 'Usuario',
        rol: usuario.rol,
        turno: usuario.turno || undefined,
      }).catch(console.error);

      setMensajeExito(`¡Cuenta de ${usuario.nombre} ${usuario.apellido} aprobada como ${usuario.rol}!`);
      setSolicitudes((prev) => prev.filter((u) => u.id !== usuario.id));
      setTimeout(() => setMensajeExito(null), 4000);
    }
    setProcesandoId(null);
  };

  const handleRechazar = async (usuario: PerfilUsuario) => {
    if (!window.confirm(`¿Estás seguro de que querés rechazar la solicitud de ${usuario.nombre} ${usuario.apellido}?`)) {
      return;
    }
    setProcesandoId(usuario.id);
    const ok = await rechazarUsuario(usuario.id);
    if (ok) {
      setSolicitudes((prev) => prev.filter((u) => u.id !== usuario.id));
    }
    setProcesandoId(null);
  };

  const handleCambiarRol = (id: string, nuevoRol: 'ALUMNO' | 'PROFESOR') => {
    setSolicitudes((prev) =>
      prev.map((u) => (u.id === id ? { ...u, rol: nuevoRol } : u))
    );
  };

  const handleCambiarTurno = (id: string, nuevoTurno: 'MANANA' | 'NOCHE' | 'AMBOS') => {
    setSolicitudes((prev) =>
      prev.map((u) => (u.id === id ? { ...u, turno: nuevoTurno } : u))
    );
  };

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Solicitudes de Usuarios
            </h1>
            <span style={{
              background: solicitudes.length > 0 ? 'var(--accent-pink)' : 'var(--bg-subtle)',
              color: solicitudes.length > 0 ? '#000000' : 'var(--text-soft)',
              padding: '2px 10px',
              borderRadius: 12,
              fontSize: '0.8rem',
              fontWeight: 800
            }}>
              {solicitudes.length} pendientes
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Revisá y aprobá las cuentas de alumnos y profesores que iniciaron sesión con Google.
          </p>
        </div>

        <button
          type="button"
          className="btn btn--subtle"
          onClick={cargarSolicitudes}
          disabled={cargando}
        >
          🔄 Actualizar lista
        </button>
      </div>

      {mensajeExito && (
        <div style={{
          background: 'rgba(0, 254, 57, 0.12)',
          border: '1px solid var(--accent-green)',
          color: 'var(--accent-green)',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>✅</span>
          <span>{mensajeExito}</span>
        </div>
      )}

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Cargando solicitudes...
        </div>
      ) : solicitudes.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: '60px 24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h3 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 700, marginBottom: 6 }}>
            ¡No hay solicitudes pendientes!
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 420, margin: '0 auto' }}>
            Todas las cuentas que se registraron con Google ya fueron revisadas y aprobadas.
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          overflow: 'hidden'
        }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#141414', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Usuario</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Rol Solicitado</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Turno</th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>Contacto</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', width: 220 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((user) => {
                const enProceso = procesandoId === user.id;
                return (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                        {user.nombre} {user.apellido}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {user.email}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <select
                        className="input"
                        value={user.rol}
                        onChange={(e) => handleCambiarRol(user.id, e.target.value as any)}
                        style={{ padding: '6px 10px', fontSize: '0.85rem', width: 140 }}
                      >
                        <option value="ALUMNO">🎒 Alumno</option>
                        <option value="PROFESOR">👨‍🏫 Profesor</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <select
                        className="input"
                        value={user.turno || 'NOCHE'}
                        onChange={(e) => handleCambiarTurno(user.id, e.target.value as any)}
                        style={{ padding: '6px 10px', fontSize: '0.85rem', width: 150 }}
                      >
                        <option value="MANANA">☀️ Mañana</option>
                        <option value="NOCHE">🌙 Noche</option>
                        <option value="AMBOS">⚡ Ambos Turnos</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {user.telefono ? (
                        <a
                          href={`https://wa.me/${user.telefono.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'var(--accent-green)',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          📱 {user.telefono}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-soft)', fontSize: '0.8rem' }}>Sin teléfono</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn"
                          disabled={enProceso}
                          onClick={() => handleAprobar(user)}
                          style={{
                            background: 'var(--accent-green)',
                            color: '#000000',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            padding: '6px 14px',
                            border: 'none'
                          }}
                        >
                          {enProceso ? '...' : '✓ Aprobar'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--subtle"
                          disabled={enProceso}
                          onClick={() => handleRechazar(user)}
                          style={{
                            color: 'var(--danger)',
                            fontSize: '0.82rem',
                            padding: '6px 10px'
                          }}
                          title="Rechazar solicitud"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
