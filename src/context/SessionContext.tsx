import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getUsuarioActivo,
  getUsuarios,
  getUsuariosByRol,
  resetDemoData,
  setUsuarioActivo,
  subscribeQuotaError,
  subscribeStore,
} from '../lib/store';
import type { Rol, Usuario } from '../types/models';

export function getHomeRouteForRol(rol: Rol): string {
  switch (rol) {
    case 'alumno':
      return '/mis-proyectos';
    case 'profesor':
      return '/proyectos';
    case 'admin':
      return '/admin/festivales';
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
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [storeTick, setStoreTick] = useState(0);
  const [usuario, setUsuario] = useState<Usuario>(() => getUsuarioActivo());
  const [quotaErrorMessage, setQuotaErrorMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    const unsubStore = subscribeStore(() => {
      setUsuario(getUsuarioActivo());
      setStoreTick((t) => t + 1);
    });
    const unsubQuota = subscribeQuotaError((msg) => {
      setQuotaErrorMessage(msg);
    });
    return () => {
      unsubStore();
      unsubQuota();
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
      }}
    >
      {children}
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
