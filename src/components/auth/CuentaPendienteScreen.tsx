import React, { useState } from 'react';
import type { PerfilUsuario } from '../../lib/auth';

interface CuentaPendienteScreenProps {
  perfil: PerfilUsuario;
  onRecargarPerfil: () => Promise<void>;
  onCerrarSesion: () => void;
}

export const CuentaPendienteScreen: React.FC<CuentaPendienteScreenProps> = ({
  perfil,
  onRecargarPerfil,
  onCerrarSesion,
}) => {
  const [comprobando, setComprobando] = useState(false);

  const handleComprobar = async () => {
    setComprobando(true);
    await onRecargarPerfil();
    setComprobando(false);
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: 'var(--bg-card)',
        border: '1px solid var(--accent-yellow)',
        borderRadius: 12,
        padding: '36px 32px',
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(254, 254, 61, 0.08)'
      }}>
        <div style={{ fontSize: 50, marginBottom: 12 }}>⏳</div>
        
        <div style={{
          display: 'inline-block',
          background: 'rgba(254, 254, 61, 0.12)',
          border: '1px solid var(--accent-yellow)',
          color: 'var(--accent-yellow)',
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: '0.78rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 16
        }}>
          Cuenta en Revisión
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
          ¡Hola, {perfil.nombre}!
        </h1>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 24 }}>
          Tu solicitud para ingresar como <strong>{perfil.rol === 'ALUMNO' ? 'Alumno' : 'Profesor'}</strong>{' '}
          ({perfil.turno === 'MANANA' ? 'Turno Mañana' : perfil.turno === 'NOCHE' ? 'Turno Noche' : 'Ambos Turnos'}) fue recibida y está pendiente de aprobación por el equipo directivo de Brother.
        </p>

        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: '14px 18px',
          textAlign: 'left',
          marginBottom: 28,
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-soft)' }}>Email registrado:</span>
            <span style={{ color: '#ffffff', fontWeight: 600 }}>{perfil.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-soft)' }}>Rol solicitado:</span>
            <span style={{ color: 'var(--accent-yellow)', fontWeight: 600 }}>{perfil.rol}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-soft)' }}>Turno:</span>
            <span style={{ color: '#ffffff' }}>{perfil.turno || 'Sin turno'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleComprobar}
            disabled={comprobando}
            style={{ minWidth: 170 }}
          >
            {comprobando ? 'Verificando...' : '🔄 Comprobar si ya fui aprobado'}
          </button>
          <button
            type="button"
            className="btn btn--subtle"
            onClick={onCerrarSesion}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};
