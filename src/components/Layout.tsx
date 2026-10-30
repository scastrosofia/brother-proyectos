import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getHomeRouteForRol, useSession } from '../context/SessionContext';
import { getCursoById, getUsuariosByRol } from '../lib/store';
import type { Rol } from '../types/models';

interface NavItem {
  label: string;
  to: string;
}

const NAV_BY_ROL: Record<Rol, NavItem[]> = {
  alumno: [
    { label: 'Mis proyectos', to: '/mis-proyectos' },
    { label: 'Festivales', to: '/festivales' },
    { label: 'Mis inscripciones', to: '/mis-inscripciones' },
  ],
  profesor: [
    { label: 'Proyectos', to: '/proyectos' },
    { label: 'Festivales', to: '/festivales' },
  ],
  admin: [
    { label: 'Festivales', to: '/admin/festivales' },
    { label: 'Proyectos', to: '/proyectos' },
    { label: 'Cursos', to: '/admin/cursos' },
    { label: 'Criterios', to: '/admin/criterios' },
    { label: 'Inscripciones', to: '/admin/inscripciones' },
  ],
};

export const Layout: React.FC<{
  children: React.ReactNode;
  fullBleed?: boolean;
}> = ({ children, fullBleed = false }) => {
  const {
    usuario,
    quotaErrorMessage,
    clearQuotaError,
    cambiarRol,
    cambiarUsuario,
    reiniciarDemo,
  } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const usuariosDelRol = getUsuariosByRol(usuario.rol);
  const navItems = NAV_BY_ROL[usuario.rol];
  const isAdminRoute =
    usuario.rol === 'admin' && location.pathname.startsWith('/admin');

  const handleChangeRol = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoRol = e.target.value as Rol;
    const nuevoUsuario = cambiarRol(nuevoRol);
    navigate(getHomeRouteForRol(nuevoUsuario.rol));
  };

  const handleChangeUsuario = (e: React.ChangeEvent<HTMLSelectElement>) => {
    cambiarUsuario(e.target.value);
  };

  const handleConfirmReset = () => {
    const inicial = reiniciarDemo();
    setConfirmResetOpen(false);
    navigate(getHomeRouteForRol(inicial.rol));
  };

  const initials = `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();
  const cursoAlumno = usuario.cursoId ? getCursoById(usuario.cursoId) : undefined;

  return (
    <div>
      {/* Banda fina amarilla de modo demo */}
      <div className="demo-banner" role="region" aria-label="Aviso de modo demo">
        <div className="demo-banner__text">
          <span>
            Modo demo · datos de prueba · se guardan solo en este navegador
          </span>
        </div>
        <button
          type="button"
          className="demo-banner__reset-btn"
          onClick={() => setConfirmResetOpen(true)}
        >
          Reiniciar demo
        </button>
      </div>

      {/* Barra superior oscura (#1a1a1a) */}
      <header className="topbar">
        <Link
          to={getHomeRouteForRol(usuario.rol)}
          className="topbar__brand"
        >
          <strong>BROTHER</strong>
          <span>· {usuario.rol === 'admin' ? 'Admin' : 'Proyectos'}</span>
        </Link>

        <nav className="topbar__nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `topbar__link ${isActive ? 'topbar__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar__switcher">
          <span className="topbar__switcher-label">Ver como:</span>
          <select
            aria-label="Seleccionar rol"
            className="topbar__select"
            value={usuario.rol}
            onChange={handleChangeRol}
          >
            <option value="alumno">Alumno</option>
            <option value="profesor">Profesor</option>
            <option value="admin">Admin</option>
          </select>

          <select
            aria-label="Seleccionar usuario"
            className="topbar__select"
            value={usuario.id}
            onChange={handleChangeUsuario}
          >
            {usuariosDelRol.map((u) => {
              const curso = u.cursoId ? getCursoById(u.cursoId) : undefined;
              return (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido}
                  {curso ? ` · ${curso.nombre}` : ''}
                </option>
              );
            })}
          </select>

          <span
            className="topbar__avatar"
            title={`${usuario.nombre} ${usuario.apellido}${cursoAlumno ? ` (${cursoAlumno.nombre})` : ''}`}
          >
            {initials}
          </span>
        </div>
      </header>

      {/* Aviso global si se llena localStorage */}
      {quotaErrorMessage && (
        <div style={{ maxWidth: 1180, margin: '16px auto 0', padding: '0 24px' }}>
          <div className="alert-banner alert-banner--error" role="alert">
            <span>{quotaErrorMessage}</span>
            <button
              type="button"
              className="btn"
              onClick={clearQuotaError}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Contenido según contexto */}
      {isAdminRoute ? (
        <div className="admin-shell">
          <aside className="admin-sidebar" aria-label="Menú de administración">
            <div className="admin-sidebar__title">BROTHER · Admin</div>
            <NavLink
              to="/admin/festivales"
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
            >
              Festivales
            </NavLink>
            <NavLink
              to="/proyectos"
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
            >
              Proyectos
            </NavLink>
            <NavLink
              to="/admin/cursos"
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
            >
              Cursos
            </NavLink>
            <NavLink
              to="/admin/criterios"
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
            >
              Criterios de evaluación
            </NavLink>
            <NavLink
              to="/admin/inscripciones"
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
            >
              Inscripciones
            </NavLink>
          </aside>
          <main className="admin-content">{children}</main>
        </div>
      ) : fullBleed ? (
        <main>{children}</main>
      ) : (
        <main className="page-shell">{children}</main>
      )}

      {/* Modal de confirmación de Reiniciar demo */}
      {confirmResetOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          onClick={() => setConfirmResetOpen(false)}
        >
          <div
            className="modal-panel"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reset-modal-title" style={{ fontSize: 20, marginBottom: 10 }}>
              ¿Reiniciar los datos de la demo?
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              Se van a borrar los proyectos, evaluaciones, festivales e inscripciones que hayas cargado en este navegador y se van a restaurar los datos iniciales de prueba.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmResetOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleConfirmReset}
              >
                Sí, reiniciar demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
