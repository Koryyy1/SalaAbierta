import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setToken, setUnauthorizedHandler, type Usuario } from '@/lib/api';
import { storage } from '@/lib/storage';

const TOKEN_KEY = 'sala-abierta-token';

type AuthState = {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const cerrarSesion = useCallback(async () => {
    setToken(null);
    setUsuario(null);
    await storage.remove(TOKEN_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void cerrarSesion());
    (async () => {
      try {
        const guardado = await storage.get(TOKEN_KEY);
        if (guardado) {
          setToken(guardado);
          setUsuario((await api.me()).usuario);
        }
      } catch {
        setToken(null);
      } finally {
        setCargando(false);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [cerrarSesion]);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    const { token, usuario: u } = await api.login(email, password);
    setToken(token);
    await storage.set(TOKEN_KEY, token);
    setUsuario(u);
  }, []);

  const value = useMemo(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion }),
    [usuario, cargando, iniciarSesion, cerrarSesion],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
