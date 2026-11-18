import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { PerfilUsuario } from '../lib/auth';
import {
  getPerfil,
  sincronizarPerfilGoogle,
  signInWithGoogle,
  signOutSupabase,
} from '../lib/auth';
import {
  getUsuarioActivo,
  getUsuarios,
  getUsuariosByRol,
  resetDemoData,
  setUsuarioActivo,
  subscribeQuotaError,
  subscribeStore,
  upsertUsuarioReal,
} from '../lib/store';
import type { Rol, Usuario } from '../types/models';
import { OnboardingModal } from '../components/auth/OnboardingModal';
import { CuentaPendienteScreen } from '../components/auth/CuentaPendienteScreen';

export function getHomeRouteForRol(rol: Rol): string {
  switch (rol) {
    case 'alumno':
      return '/mis-proyectos';
    case 'profesor':
      return '/proyectos';
    case 'admin':
      return '/admin/dashboard';
  }
}

interface SessionContextValue {
  usuario: Usuario;
  usuarios: Usuario[];
  storeTick: number;
  quotaErrorMessage: string | null;
  clearQuotaError: () => void;
  cambiarRol: (nuevoRol: Rol) => Usuario;
  cambiarUsuario: (usuarioId: string) => Usuario;
  reiniciarDemo: () => Usuario;

  // Supabase Auth Real
  authUser: User | null;
  perfilReal: PerfilUsuario | null;
  cargandoAuth: boolean;
  iniciarSesionGoogle: () => Promise<void>;
  cerrarSesionGoogle: () => Promise<void>;
  recargarPerfil: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [storeTick, setStoreTick] = useState(0);
  const [usuario, setUsuario] = useState<Usuario>(() => getUsuarioActivo());
  const [quotaErrorMessage, setQuotaErrorMessage] = useState<string | null>(null);

  // Estados de Supabase Auth
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [perfilReal, setPerfilReal] = useState<PerfilUsuario | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  // Función para sincronizar sesión de Supabase
  const procesarSesion = async (user: User | null) => {
    setAuthUser(user);
    if (!user) {
      setPerfilReal(null);
      setCargandoAuth(false);
      return;
    }

    try {
      const perfil = await sincronizarPerfilGoogle(user);
      setPerfilReal(perfil);

      // Si el perfil está aprobado, adaptamos el usuario activo al rol real con sus datos reales
      if (perfil.aprobado) {
        const rolMapeado: Rol = perfil.rol.toLowerCase() as Rol;
        const nombreReal = perfil.nombre || user.user_metadata?.full_name?.split(' ')[0] || 'Usuario';
        const apellidoReal = perfil.apellido || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
        const emailReal = perfil.email || user.email || '';

        const u = upsertUsuarioReal({
          id: user.id,
          nombre: nombreReal,
          apellido: apellidoReal,
          email: emailReal,
          rol: rolMapeado,
        });
        setUsuario(u);
      }
    } catch (err) {
      console.error('Error al sincronizar perfil:', err);
    } finally {
      setCargandoAuth(false);
    }
  };

  useEffect(() => {
    // 1. Escuchar cambios en store local
    const unsubStore = subscribeStore(() => {
      setUsuario(getUsuarioActivo());
      setStoreTick((t) => t + 1);
    });
    const unsubQuota = subscribeQuotaError((msg) => {
      setQuotaErrorMessage(msg);
    });

    // 2. Verificar sesión activa de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      procesarSesion(session?.user ?? null);
    });

    // 3. Suscribirse a eventos de login/logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      procesarSesion(session?.user ?? null);
    });

    return () => {
      unsubStore();
      unsubQuota();
      subscription.unsubscribe();
    };
  }, []);

  const cambiarRol = (nuevoRol: Rol): Usuario => {
    const candidatos = getUsuariosByRol(nuevoRol);
    const elegido = candidatos[0] ?? getUsuarios()[0];
    const actualizado = setUsuarioActivo(elegido.id);
    setUsuario(actualizado);
    return actualizado;
  };

  const cambiarUsuario = (usuarioId: string): Usuario => {
    const actualizado = setUsuarioActivo(usuarioId);
    setUsuario(actualizado);
    return actualizado;
  };

  const reiniciarDemo = (): Usuario => {
    resetDemoData();
    const inicial = getUsuarioActivo();
    setUsuario(inicial);
    setQuotaErrorMessage(null);
    return inicial;
  };

  const iniciarSesionGoogle = async () => {
    await signInWithGoogle();
  };

  const cerrarSesionGoogle = async () => {
    await signOutSupabase();
    setAuthUser(null);
    setPerfilReal(null);
  };

  const recargarPerfil = async () => {
    if (authUser) {
      const p = await getPerfil(authUser.id);
      if (p) setPerfilReal(p);
    }
  };

  // Determinar si debemos mostrar modal de onboarding o bloqueo por cuenta pendiente
  const necesitaOnboarding =
    authUser && perfilReal && !perfilReal.aprobado && perfilReal.rol !== 'ADMIN' && !perfilReal.telefono;

  const estaPendiente =
    authUser && perfilReal && !perfilReal.aprobado && perfilReal.rol !== 'ADMIN' && Boolean(perfilReal.telefono);

  return (
    <SessionContext.Provider
      value={{
        usuario,
        usuarios: getUsuarios(),
        storeTick,
        quotaErrorMessage,
        clearQuotaError: () => setQuotaErrorMessage(null),
        cambiarRol,
        cambiarUsuario,
        reiniciarDemo,
        authUser,
        perfilReal,
        cargandoAuth,
        iniciarSesionGoogle,
        cerrarSesionGoogle,
        recargarPerfil,
      }}
    >
      {necesitaOnboarding && perfilReal && (
        <OnboardingModal
          perfil={perfilReal}
          onCompletado={(actualizado) => setPerfilReal(actualizado)}
          onCerrarSesion={cerrarSesionGoogle}
        />
      )}

      {estaPendiente && perfilReal ? (
        <CuentaPendienteScreen
          perfil={perfilReal}
          onRecargarPerfil={recargarPerfil}
          onCerrarSesion={cerrarSesionGoogle}
        />
      ) : (
        children
      )}
    </SessionContext.Provider>
  );
};

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession debe usarse dentro de SessionProvider');
  }
  return ctx;
}
