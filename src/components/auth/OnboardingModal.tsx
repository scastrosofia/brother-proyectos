import React, { useState } from 'react';
import type { PerfilUsuario } from '../../lib/auth';
import { completarOnboarding } from '../../lib/auth';

interface OnboardingModalProps {
  perfil: PerfilUsuario;
  onCompletado: (perfilActualizado: PerfilUsuario) => void;
  onCerrarSesion: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  perfil,
  onCompletado,
  onCerrarSesion,
}) => {
  const [nombre, setNombre] = useState(perfil.nombre || '');
  const [apellido, setApellido] = useState(perfil.apellido || '');
  const [rol, setRol] = useState<'ALUMNO' | 'PROFESOR'>('ALUMNO');
  const [turno, setTurno] = useState<'MANANA' | 'NOCHE' | 'AMBOS'>('NOCHE');
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim()) {
      setError('Por favor completá tu nombre y apellido.');
      return;
    }
    if (!telefono.trim()) {
      setError('Por favor ingresá tu teléfono o celular de contacto.');
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      const actualizado = await completarOnboarding(perfil.id, {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        rol,
        turno,
        telefono: telefono.trim(),
      });

      if (actualizado) {
        onCompletado(actualizado);
      } else {
        setError('No se pudo guardar la solicitud. Por favor reintentá.');
      }
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error al enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ maxWidth: 540, width: '100%', border: '1px solid var(--accent-yellow)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 40 }}>🎓</span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 8, color: '#ffffff' }}>
            ¡Te damos la bienvenida a Brother!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Para habilitar tu acceso al portal de proyectos, completá tus datos de alumno o docente.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 51, 68, 0.15)',
            border: '1px solid var(--danger)',
            color: '#ff6677',
            padding: '10px 14px',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                Nombre *
              </label>
              <input
                type="text"
                className="input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Sofía"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                Apellido *
              </label>
              <input
                type="text"
                className="input"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ej. Castro"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              ¿Cuál es tu rol en Brother? *
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className={`pill ${rol === 'ALUMNO' ? 'pill--active' : ''}`}
                style={{ flex: 1, padding: '10px 0', fontSize: '0.95rem' }}
                onClick={() => {
                  setRol('ALUMNO');
                  if (turno === 'AMBOS') setTurno('NOCHE');
                }}
              >
                🎒 Soy Alumno
              </button>
              <button
                type="button"
                className={`pill ${rol === 'PROFESOR' ? 'pill--active' : ''}`}
                style={{ flex: 1, padding: '10px 0', fontSize: '0.95rem' }}
                onClick={() => setRol('PROFESOR')}
              >
                👨‍🏫 Soy Profesor
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Turno en el que cursás o dictás clases *
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`pill ${turno === 'MANANA' ? 'pill--active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setTurno('MANANA')}
              >
                ☀️ Turno Mañana
              </button>
              <button
                type="button"
                className={`pill ${turno === 'NOCHE' ? 'pill--active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => setTurno('NOCHE')}
              >
                🌙 Turno Noche
              </button>
              {rol === 'PROFESOR' && (
                <button
                  type="button"
                  className={`pill ${turno === 'AMBOS' ? 'pill--active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setTurno('AMBOS')}
                >
                  ⚡ Ambos Turnos
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              Teléfono / WhatsApp de contacto *
            </label>
            <input
              type="tel"
              className="input"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+54 9 11 1234-5678"
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', marginTop: 4, display: 'block' }}>
              Utilizado únicamente por la administración para corroborar tu matriculación.
            </span>
          </div>

          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            padding: '12px 14px',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            lineHeight: 1.4
          }}>
            🔒 <strong>Aprobación de cuenta:</strong> Tu solicitud será enviada al equipo de administración de Brother para habilitar tu acceso.
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn--subtle"
              onClick={onCerrarSesion}
              style={{ color: 'var(--text-soft)' }}
            >
              Cerrar sesión
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={enviando}
              style={{ minWidth: 160 }}
            >
              {enviando ? 'Enviando...' : 'Enviar Solicitud ➔'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
