import { Platform } from 'react-native';

// Para un dispositivo físico definir EXPO_PUBLIC_API_URL con la IP de la PC (ej. http://192.168.1.10:3000)
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export type Rol = 'Profesor' | 'Apoderado' | 'Administrador';
export type Usuario = { id: number; nombre: string; email: string; rol: Rol };
export type Curso = { id: number; nombre: string };
export type Alumno = { id: number; nombre: string; curso_id?: number; curso?: string };
export type EstadoAsistencia = 'presente' | 'ausente' | 'atrasado' | 'justificado';
export type TipoAnotacion = 'positiva' | 'negativa' | 'observacion';
export type Calificacion = { id: number; asignatura: string; descripcion: string; nota: number; fecha: string };
export type Anotacion = { id: number; tipo: TipoAnotacion; descripcion: string; fecha: string };
export type Comentario = { id: number; autor: string; contenido: string; creado_en: string };
export type Anuncio = {
  id: number;
  titulo: string;
  contenido: string;
  autor: string;
  creado_en: string;
  confirmaciones: number;
  confirmado: boolean;
  comentarios: Comentario[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setToken = (value: string | null) => {
  token = value;
};
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor.', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.();
    throw new ApiError(data.mensaje ?? 'Error inesperado.', response.status);
  }
  return data as T;
}

type Lista<T> = { datos: T[] };

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; usuario: Usuario }>('POST', '/auth/login', { email, password }),
  me: () => request<{ usuario: Usuario }>('GET', '/auth/me'),

  cursos: () => request<Lista<Curso>>('GET', '/cursos').then((r) => r.datos),
  alumnosDeCurso: (cursoId: number) => request<Lista<Alumno>>('GET', `/cursos/${cursoId}/alumnos`).then((r) => r.datos),
  pupilos: () => request<Lista<Alumno>>('GET', '/apoderado/alumnos').then((r) => r.datos),

  asistenciaCurso: (cursoId: number, fecha: string) =>
    request<Lista<{ alumno_id: number; nombre: string; estado: EstadoAsistencia | null }>>(
      'GET',
      `/cursos/${cursoId}/asistencia?fecha=${fecha}`,
    ).then((r) => r.datos),
  guardarAsistencia: (cursoId: number, fecha: string, registros: { alumno_id: number; estado: EstadoAsistencia }[]) =>
    request<unknown>('PUT', `/cursos/${cursoId}/asistencia`, { fecha, registros }),
  asistenciaAlumno: (alumnoId: number) =>
    request<{ porcentaje: number | null } & Lista<{ fecha: string; estado: EstadoAsistencia }>>(
      'GET',
      `/alumnos/${alumnoId}/asistencia`,
    ),

  calificaciones: (alumnoId: number) =>
    request<{ promedio: number | null } & Lista<Calificacion>>('GET', `/alumnos/${alumnoId}/calificaciones`),
  crearCalificacion: (alumnoId: number, data: { asignatura: string; descripcion: string; nota: number }) =>
    request<unknown>('POST', `/alumnos/${alumnoId}/calificaciones`, data),
  editarCalificacion: (id: number, data: { nota: number }) => request<unknown>('PUT', `/calificaciones/${id}`, data),

  anotaciones: (alumnoId: number) => request<Lista<Anotacion>>('GET', `/alumnos/${alumnoId}/anotaciones`).then((r) => r.datos),
  crearAnotacion: (alumnoId: number, data: { tipo: TipoAnotacion; descripcion: string }) =>
    request<unknown>('POST', `/alumnos/${alumnoId}/anotaciones`, data),

  anuncios: (cursoId: number) => request<Lista<Anuncio>>('GET', `/cursos/${cursoId}/anuncios`).then((r) => r.datos),
  crearAnuncio: (cursoId: number, data: { titulo: string; contenido: string }) =>
    request<unknown>('POST', `/cursos/${cursoId}/anuncios`, data),
  confirmarAnuncio: (id: number) => request<unknown>('POST', `/anuncios/${id}/confirmar`),
  comentarAnuncio: (id: number, contenido: string) => request<unknown>('POST', `/anuncios/${id}/comentarios`, { contenido }),
};
