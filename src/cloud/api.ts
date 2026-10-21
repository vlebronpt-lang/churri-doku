/** Conexión con Base44: cuentas de jugador y copia del progreso en la nube. */
import { load, remove, save } from '../state/storage';

export const APP_ID = '6ad7e5d5a1f2149ed0366eac';
/** Dominio de la app en Base44: allí vuelven el inicio de sesión con Google y los enlaces de los correos, y un puente los manda al juego. */
export const APP_DOMAIN = 'https://churri-doku-d0366eac.base44.app';
const API = `https://base44.app/api/apps/${APP_ID}`;

export interface CloudUser {
  id: string;
  email: string;
  full_name?: string | null;
  role?: string;
}

/** Copia guardada del progreso (una por cuenta). */
export interface SaveRecord {
  id: string;
  data: string;
  updated?: number;
  solved?: number;
  created_by?: string;
}

export class CloudError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let token: string | null = load<string | null>('token', null);

export const getToken = () => token;

export function setToken(t: string | null) {
  token = t;
  if (t) save('token', t);
  else remove('token');
}

async function call<T>(method: string, path: string, body?: unknown, opts: { auth?: boolean; keepalive?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-App-Id': APP_ID, 'X-Origin-URL': location.href };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), keepalive: opts.keepalive });
  } catch {
    throw new CloudError('Sin conexión', 0);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: { message?: string; code?: string }; message?: string; detail?: unknown; code?: string };
    const msg = d.error?.message || d.message || (typeof d.detail === 'string' ? d.detail : '') || res.statusText || 'Error';
    throw new CloudError(String(msg), res.status, d.error?.code || d.code);
  }
  return data as T;
}

export const auth = {
  login: (email: string, password: string) => call<{ access_token?: string; user?: CloudUser }>('POST', '/auth/login', { email, password }, { auth: false }),
  register: (email: string, password: string, fullName?: string) =>
    call<unknown>('POST', '/auth/register', fullName ? { email, password, full_name: fullName } : { email, password }, { auth: false }),
  verify: (email: string, code: string) => call<{ access_token?: string; user?: CloudUser } | null>('POST', '/auth/verify-otp', { email, otp_code: code }, { auth: false }),
  resend: (email: string) => call<unknown>('POST', '/auth/resend-otp', { email }, { auth: false }),
  forgot: (email: string) => call<unknown>('POST', '/auth/reset-password-request', { email }, { auth: false }),
  reset: (resetToken: string, newPassword: string) => call<unknown>('POST', '/auth/reset-password', { reset_token: resetToken, new_password: newPassword }, { auth: false }),
  me: () => call<CloudUser>('GET', '/entities/User/me'),
  updateMe: (data: Partial<CloudUser>) => call<CloudUser>('PUT', '/entities/User/me', data),
};

const SAVES = '/entities/PlayerSave';

export const saves = {
  /** Copias de la cuenta (las reglas del servidor ya solo dejan ver las propias). */
  list: (email: string) => call<SaveRecord[]>('GET', `${SAVES}?q=${encodeURIComponent(JSON.stringify({ created_by: email }))}&sort=-updated_date&limit=20`),
  create: (rec: Omit<SaveRecord, 'id'>) => call<SaveRecord>('POST', SAVES, rec),
  update: (id: string, rec: Partial<Omit<SaveRecord, 'id'>>, keepalive = false) => call<SaveRecord>('PUT', `${SAVES}/${id}`, rec, { keepalive }),
  remove: (id: string) => call<unknown>('DELETE', `${SAVES}/${id}`),
};

/** Marcador de una pareja del modo en directo (lo escribe la sala; cada jugador solo ve los suyos). */
export interface MarcadorRecord {
  id: string;
  clave: string;
  jugador_a: string;
  jugador_b: string;
  nombre_a?: string;
  nombre_b?: string;
  victorias_a?: number;
  victorias_b?: number;
  duelos?: number;
  coop?: number;
  tiempos?: string;
  ultimas?: string;
  ultima?: number;
}

export const marcadores = {
  list: () => call<MarcadorRecord[]>('GET', '/entities/MarcadorPareja?sort=-ultima&limit=20'),
};

/** Salas del modo pareja en directo (actor «SalaPareja» de Base44). */
export const ACTOR_SALA = 'SalaPareja';
export const actors = {
  /** Permiso para conectarse a una sala: Base44 lo da a quien tiene sesión y la sala sabe así quién es. */
  connectionToken: (room: string, connectionId: string) =>
    call<{ websocket_url: string; token: string }>('POST', `/actors/${ACTOR_SALA}/connection-token`, { room, connection_id: connectionId }),
  /** Camino antiguo de Base44 para los actores (si el permiso directo no está disponible). */
  proxyUrl: (room: string, connectionId: string) => {
    const q = new URLSearchParams([['_pk', connectionId], ['app_id', APP_ID], ['handler', ACTOR_SALA]]);
    if (token) q.append('token', token);
    return `wss://base44.app/parties/${ACTOR_SALA}/${encodeURIComponent(room)}?${q}`;
  },
};

/** Entrar con Google: Base44 solo devuelve a su propio dominio, y el puente de allí trae al jugador de vuelta con su sesión. */
export const googleLoginUrl = () => `${APP_DOMAIN}/api/apps/auth/login?app_id=${APP_ID}&from_url=${encodeURIComponent(`${APP_DOMAIN}/`)}`;

/** Cierra también la sesión de Google en Base44 (si no, en un dispositivo compartido entraría la cuenta anterior). */
export const logoutUrl = () => `${APP_DOMAIN}/api/apps/auth/logout?from_url=${encodeURIComponent(`${APP_DOMAIN}/`)}`;
