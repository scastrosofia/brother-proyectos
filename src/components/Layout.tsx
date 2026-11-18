import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getHomeRouteForRol, useSession } from '../context/SessionContext';
import {
  getCursoById,
  getNotificacionesUsuario,
  getUsuariosByRol,
} from '../lib/store';
import { getUsuariosPendientes } from '../lib/auth';
import type { Rol } from '../types/models';

interface NavItem {
  label: string;
  to: string;
}

const NAV_BY_ROL: Record<Rol, NavItem[]> = {
  alumno: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Mis proyectos', to: '/mis-proyectos' },
    { label: 'Festivales', to: '/festivales' },
    { label: 'Mis inscripciones', to: '/mis-inscripciones' },
  ],
  profesor: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Proyectos', to: '/proyectos' },
    { label: 'Festivales', to: '/festivales' },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard' },
    { label: 'Solicitudes', to: '/admin/solicitudes' },
    { label: 'Festivales', to: '/admin/festivales' },
    { label: 'Profesores', to: '/admin/profesores' },
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
    authUser,
    perfilReal,
    iniciarSesionGoogle,
    cerrarSesionGoogle,
  } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [solicitudesCount, setSolicitudesCount] = useState(0);

  useEffect(() => {
    if (usuario.rol === 'admin') {
      getUsuariosPendientes().then((res) => setSolicitudesCount(res.length));
    }
  }, [usuario.rol, location.pathname]);

  const usuariosDelRol = getUsuariosByRol(usuario.rol);
  const navItems = NAV_BY_ROL[usuario.rol];
  const notificacionesCount =
    usuario.rol === 'alumno' || usuario.rol === 'profesor'
      ? getNotificacionesUsuario(usuario.id).length
      : 0;
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

  const initials = perfilReal
    ? `${perfilReal.nombre?.charAt(0) || 'U'}${perfilReal.apellido?.charAt(0) || ''}`.toUpperCase()
    : `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();
  const cursoAlumno = usuario.cursoId ? getCursoById(usuario.cursoId) : undefined;

  return (
    <div>
      {/* Banda fina de modo demo o sesión activa */}
      <div className="demo-banner" role="region" aria-label="Aviso de modo demo">
        <div className="demo-banner__text">
          {authUser ? (
            <span>
              Sesión activa con Google ({authUser.email}) · Rol:{' '}
              <strong style={{ color: 'var(--accent-yellow)', textTransform: 'uppercase' }}>
                {perfilReal?.rol || usuario.rol}
              </strong>
            </span>
          ) : (
            <span>
              Modo demo · Podés iniciar sesión con Google para usar tu cuenta real
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {authUser ? (
            <button
              type="button"
              className="demo-banner__reset-btn"
              onClick={cerrarSesionGoogle}
              style={{ color: '#ff6677', borderColor: '#ff6677' }}
            >
              Cerrar sesión de Google
            </button>
          ) : (
            <button
              type="button"
              className="demo-banner__reset-btn"
              onClick={() => setConfirmResetOpen(true)}
            >
              Reiniciar demo
            </button>
          )}
        </div>
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
              {item.to === '/dashboard' && notificacionesCount > 0 && (
                <span className="topbar__badge">{notificacionesCount}</span>
              )}
              {item.to === '/admin/solicitudes' && solicitudesCount > 0 && (
                <span className="topbar__badge" style={{ background: 'var(--accent-pink)', color: '#000000' }}>
                  {solicitudesCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="topbar__switcher">
          {!authUser ? (
            <>
              <button
                type="button"
                onClick={iniciarSesionGoogle}
                className="btn"
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: 'none',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                Ingresar con Google
              </button>

              <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 4px' }} />

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
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                  {perfilReal?.nombre || usuario.nombre} {perfilReal?.apellido || usuario.apellido}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-yellow)', textTransform: 'uppercase' }}>
                  {perfilReal?.rol || usuario.rol}
                </div>
              </div>
            </div>
          )}

          <span
            className="topbar__avatar"
            title={
              authUser
                ? `${perfilReal?.nombre} ${perfilReal?.apellido} (${authUser.email})`
                : `${usuario.nombre} ${usuario.apellido}${cursoAlumno ? ` (${cursoAlumno.nombre})` : ''}`
            }
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
              to="/admin/dashboard"
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/solicitudes"
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Solicitudes</span>
              {solicitudesCount > 0 && (
                <span
                  style={{
                    background: 'var(--accent-pink)',
                    color: '#000000',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: 10,
                  }}
                >
                  {solicitudesCount}
                </span>
              )}
            </NavLink>
            <NavLink
              to="/admin/festivales"
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
            >
              Festivales
            </NavLink>
            <NavLink
              to="/admin/profesores"
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
            >
              Profesores
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
