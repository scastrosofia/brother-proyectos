import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export const SUPER_ADMIN_EMAIL = 'brotherpaginasubidas@gmail.com';

export interface PerfilUsuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: 'ALUMNO' | 'PROFESOR' | 'ADMIN';
  turno?: 'MANANA' | 'NOCHE' | 'AMBOS' | null;
  telefono?: string | null;
  aprobado: boolean;
  created_at?: string;
}

/**
 * Inicia el flujo de OAuth con Google
 */
export async function signInWithGoogle() {
  const redirectUrl = window.location.origin + window.location.pathname;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });
  if (error) {
    console.error('Error al iniciar sesión con Google:', error);
    throw error;
  }
  return data;
}

/**
 * Cierra la sesión activa en Supabase
 */
export async function signOutSupabase() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error al cerrar sesión:', error);
    throw error;
  }
}

/**
 * Obtiene el perfil de la tabla public.perfiles para un ID de auth.users
 */
export async function getPerfil(userId: string): Promise<PerfilUsuario | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener perfil:', error);
    return null;
  }
  return data as PerfilUsuario | null;
}

/**
 * Asegura o crea el perfil inicial tras el login de Google
 */
export async function sincronizarPerfilGoogle(user: User): Promise<PerfilUsuario> {
  const existing = await getPerfil(user.id);
  const esSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const parts = fullName.trim().split(' ');
  const nombre = parts[0] || (esSuperAdmin ? 'Admin' : 'Usuario');
  const apellido = parts.slice(1).join(' ') || (esSuperAdmin ? 'Brother' : '');

  if (existing) {
    // Si es super admin y por alguna razón no estaba aprobado o como admin, lo actualizamos
    if (esSuperAdmin && (existing.rol !== 'ADMIN' || !existing.aprobado)) {
      const { data } = await supabase
        .from('perfiles')
        .update({ rol: 'ADMIN', aprobado: true })
        .eq('id', user.id)
        .select()
        .single();
      if (data) return data as PerfilUsuario;
    }
    return existing;
  }

  // Si no existe perfil previo:
  const nuevoPerfil: Partial<PerfilUsuario> = {
    id: user.id,
    email: user.email || '',
    nombre,
    apellido,
    rol: esSuperAdmin ? 'ADMIN' : 'ALUMNO',
    turno: esSuperAdmin ? 'AMBOS' : 'NOCHE',
    aprobado: esSuperAdmin, // Super admin nace aprobado
  };

  const { data, error } = await supabase
    .from('perfiles')
    .insert(nuevoPerfil)
    .select()
    .single();

  if (error) {
    console.error('Error al crear perfil inicial:', error);
    // Devolvemos al menos el objeto en memoria para que no crashee
    return nuevoPerfil as PerfilUsuario;
  }

  return data as PerfilUsuario;
}

/**
 * Completa el onboarding del usuario (solicitud de rol y turno)
 */
export async function completarOnboarding(
  userId: string,
  datos: {
    nombre: string;
    apellido: string;
    rol: 'ALUMNO' | 'PROFESOR';
    turno: 'MANANA' | 'NOCHE' | 'AMBOS';
    telefono: string;
  }
): Promise<PerfilUsuario | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .update({
      nombre: datos.nombre,
      apellido: datos.apellido,
      rol: datos.rol,
      turno: datos.turno,
      telefono: datos.telefono,
      aprobado: false, // Queda a la espera de aprobación
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar onboarding:', error);
    return null;
  }
  return data as PerfilUsuario;
}

/**
 * Obtiene todos los usuarios pendientes de aprobación (para el Admin)
 */
export async function getUsuariosPendientes(): Promise<PerfilUsuario[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('aprobado', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener usuarios pendientes:', error);
    return [];
  }
  return (data || []) as PerfilUsuario[];
}

/**
 * Aprueba una cuenta de usuario asignando opcionalmente rol y turno
 */
export async function aprobarUsuario(
  userId: string,
  rol?: 'ALUMNO' | 'PROFESOR' | 'ADMIN',
  turno?: 'MANANA' | 'NOCHE' | 'AMBOS'
): Promise<boolean> {
  const updates: Partial<PerfilUsuario> = { aprobado: true };
  if (rol) updates.rol = rol;
  if (turno) updates.turno = turno;

  const { error } = await supabase
    .from('perfiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('Error al aprobar usuario:', error);
    return false;
  }
  return true;
}

/**
 * Rechaza o elimina la solicitud de un usuario
 */
export async function rechazarUsuario(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('perfiles')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('Error al rechazar usuario:', error);
    return false;
  }
  return true;
}
