/** Cuenta del jugador: sesión, entrada con correo o Google y copia del progreso en la nube. */
import { useSyncExternalStore } from 'react';
import { auth, CloudError, getToken, googleLoginUrl, logoutUrl, saves, setToken, type CloudUser, type SaveRecord } from './api';
import { adoptSave, applySave, decodeSave, emptySave, encodeSave, hasProgress, localSave, mergeSaves, sameSave, solvedCount, type SaveData } from './save';
import { load, remove, save } from '../state/storage';
import { getStore, resetAll, subscribeProgress, wasSolved } from '../state/progress';
import { resetAchievements, subscribeAchievements } from '../state/achievements';
import { getSettings, setSetting, subscribeSettings } from '../state/settings';

export interface Player {
  id: string;
  email: string;
  name: string;
  method: 'password' | 'google';
}

export type SyncState = 'idle' | 'syncing' | 'ok' | 'offline' | 'error';

export interface AccountState {
  /** guest: sin cuenta · checking: comprobando la sesión guardada · in: dentro · expired: hay que volver a entrar */
  status: 'guest' | 'checking' | 'in' | 'expired';
  player: Player | null;
  sync: SyncState;
  lastSync: number | null;
  /** En este dispositivo hay progreso sin cuenta y la cuenta ya tiene el suyo: el jugador decide. */
  choice: { device: number; account: number } | null;
  /** Aviso que se enseña una vez (progreso juntado, fallo al volver de Google…). */
  notice: { text: string; tone: 'ok' | 'warn' } | null;
}

const cachedPlayer = load<Player | null>('account', null);

let state: AccountState = {
  status: getToken() ? 'checking' : cachedPlayer ? 'expired' : 'guest',
  player: cachedPlayer,
  sync: 'idle',
  lastSync: load<{ at?: number }>('sync', {}).at ?? null,
  choice: null,
  notice: null,
};
const listeners = new Set<() => void>();

function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const getAccount = () => state;

export function useAccount(): AccountState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, getAccount, getAccount);
}

export const clearNotice = () => set({ notice: null });

// ------------------------------------------------------------ sincronización

/** Mientras se pone en el dispositivo lo que llega de la nube, esos cambios no cuentan como nuevos. */
let applying = false;
function quietly(fn: () => void) {
  applying = true;
  try {
    fn();
  } finally {
    applying = false;
  }
}

/** Cambios locales hechos y cambios ya guardados en la nube. */
let seq = 0;
let syncedSeq = 0;
let recordId: string | null = load<{ id?: string }>('sync', {}).id ?? null;
/** Última copia que se sabe que hay en la nube. */
let lastCloud: SaveData | null = null;
/** Copia de la cuenta mientras el jugador decide qué hacer con el progreso de este dispositivo. */
let pendingCloud: SaveData | null = null;
let timer = 0;
let due = 0;
let failures = 0;
let inflight: Promise<boolean> | null = null;
let again = false;

/** Al resolver un caso o conseguir un logro se guarda enseguida; las jugadas sueltas, cada poco. */
const SOON = 1500;
const LATER = 60_000;

const isOwner = () => !!state.player && load<string>('owner', '') === state.player.email;
const isDirty = () => seq !== syncedSeq || load<boolean>('dirty', false);

function schedule(ms: number) {
  if (state.status !== 'in') return;
  const at = Date.now() + ms;
  if (timer && due <= at) return;
  window.clearTimeout(timer);
  due = at;
  timer = window.setTimeout(() => {
    timer = 0;
    void syncNow();
  }, ms);
}

function localChanged(urgent: boolean) {
  if (applying) return;
  seq++;
  if (state.status === 'guest') return;
  if (!load<boolean>('dirty', false)) save('dirty', true);
  schedule(urgent ? SOON : LATER);
}

/** Lee todas las copias de la cuenta y las junta (normalmente hay una). */
async function pull(email: string): Promise<{ cloud: SaveData | null; records: SaveRecord[] }> {
  const records = await saves.list(email);
  let cloud: SaveData | null = null;
  for (const r of records) {
    const d = await decodeSave(r.data);
    if (!d) throw new CloudError('No se puede leer la copia de la nube', -1);
    cloud = cloud ? mergeSaves(cloud, d) : d;
  }
  return { cloud, records };
}

/** Junta lo de este dispositivo con la nube y guarda el resultado en los dos sitios. */
export function syncNow(): Promise<boolean> {
  if (inflight) {
    again = true;
    return inflight;
  }
  inflight = doSync().finally(() => {
    inflight = null;
    if (again) {
      again = false;
      void syncNow();
    }
  });
  return inflight;
}

async function doSync(): Promise<boolean> {
  const p = state.player;
  if (state.status !== 'in' || !p || state.choice) return false;
  window.clearTimeout(timer);
  timer = 0;
  set({ sync: 'syncing' });
  try {
    // Lo primero tras entrar: decidir qué hacer con el progreso que hubiera en el dispositivo.
    if (!isOwner() && !(await claimDevice(p))) return false;
    const start = seq;
    const { cloud, records } = await pull(p.email);
    const local = localSave();
    const merged = cloud ? mergeSaves(local, cloud) : local;
    if (!sameSave(merged, local)) quietly(() => applySave(merged));
    if (!cloud || !sameSave(merged, cloud) || records.length !== 1) {
      const fields = { data: await encodeSave(merged), updated: Date.now(), solved: solvedCount(merged) };
      const rec = records[0] ? await saves.update(records[0].id, fields) : await saves.create(fields);
      recordId = rec?.id ?? records[0]?.id ?? null;
      for (const extra of records.slice(1)) await saves.remove(extra.id).catch(() => undefined);
    } else {
      recordId = records[0].id;
    }
    lastCloud = merged;
    syncedSeq = start;
    failures = 0;
    const now = Date.now();
    save('sync', { id: recordId, at: now });
    if (seq === start) remove('dirty');
    else schedule(LATER);
    set({ sync: 'ok', lastSync: now });
    return true;
  } catch (e) {
    return failed(e);
  }
}

function failed(e: unknown): boolean {
  const status = e instanceof CloudError ? e.status : -1;
  if (status === 401) {
    expire();
    return false;
  }
  failures++;
  set({ sync: status === 0 ? 'offline' : 'error' });
  // Sin conexión se espera a recuperarla (evento «online»); si falla otra cosa, se reintenta cada vez más tarde.
  schedule(Math.min(300_000, 15_000 * 2 ** Math.min(failures, 5)));
  return false;
}

/** Al salir de la página o pasar a otra app: guardado rápido de lo último que se ha jugado. */
async function flushOnHide() {
  const p = state.player;
  if (state.status !== 'in' || !p || !isOwner() || !isDirty()) return;
  if (!recordId || !lastCloud) {
    void syncNow();
    return;
  }
  const start = seq;
  const merged = mergeSaves(localSave(), lastCloud);
  const data = await encodeSave(merged);
  if (data.length > 60_000) {
    void syncNow();
    return;
  }
  try {
    await saves.update(recordId, { data, updated: Date.now(), solved: solvedCount(merged) }, true);
    lastCloud = merged;
    syncedSeq = start;
    if (seq === start) remove('dirty');
  } catch {
    /* se reintentará al volver */
  }
}

// ------------------------------------------------------------ sesión

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

function toPlayer(u: CloudUser, method: Player['method']): Player {
  const email = (u.email ?? '').toLowerCase();
  return { id: u.id, email, name: (u.full_name ?? '').trim() || email.split('@')[0], method };
}

function expire() {
  setToken(null);
  window.clearTimeout(timer);
  timer = 0;
  set({ status: 'expired', sync: 'idle' });
}

async function signedIn(u: CloudUser, method: Player['method']) {
  const player = toPlayer(u, method);
  save('account', player);
  set({ status: 'in', player });
  if (!getSettings().playerName && u.full_name) setSetting('playerName', firstName(u.full_name).slice(0, 24));
  await syncNow();
}

/**
 * El progreso de este dispositivo aún no es de esta cuenta (se jugó sin cuenta o con otra):
 * sin nada que conservar se usa el de la cuenta; si la cuenta está vacía, se le pasa el del dispositivo;
 * si los dos tienen, se pregunta. Devuelve si el dispositivo ya queda unido a la cuenta.
 */
async function claimDevice(player: Player): Promise<boolean> {
  const { cloud } = await pull(player.email);
  const local = localSave();
  if (!hasProgress(local)) {
    quietly(() => applySave(cloud ?? emptySave()));
  } else if (!cloud || !hasProgress(cloud)) {
    quietly(() => applySave(cloud ? mergeSaves(adoptSave(local, cloud.r), cloud) : adoptSave(local)));
    seq++;
    set({ notice: { text: 'Listo: el progreso de este dispositivo ya está guardado en tu cuenta.', tone: 'ok' } });
  } else {
    pendingCloud = cloud;
    set({ sync: 'idle', choice: { device: solvedCount(local), account: solvedCount(cloud) } });
    return false;
  }
  save('owner', player.email);
  return true;
}

/** Respuesta a «¿qué hacemos con el progreso de este dispositivo?». */
export async function resolveChoice(join: boolean) {
  const player = state.player;
  if (!player || !state.choice) return;
  const cloud = pendingCloud ?? emptySave();
  quietly(() => applySave(join ? mergeSaves(adoptSave(localSave(), cloud.r), cloud) : cloud));
  pendingCloud = null;
  save('owner', player.email);
  seq++;
  set({ choice: null, notice: join ? { text: 'Hecho: hemos juntado el progreso de este dispositivo con el de tu cuenta.', tone: 'ok' } : null });
  await syncNow();
}

/** Arranque: recoge la vuelta del inicio de sesión con Google y comprueba la sesión guardada. */
export function initAccount() {
  const q = new URLSearchParams(location.search);
  const fromGoogle = q.get('access_token');
  if (fromGoogle) {
    setToken(fromGoogle);
    q.delete('access_token');
    q.delete('is_new_user');
    const rest = q.toString();
    history.replaceState(history.state, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
  }
  // Al volver de Google se regresa a la página en la que se estaba.
  const google = load<{ t?: number; hash?: string }>('google-pending', {});
  remove('google-pending');
  if (fromGoogle && google.hash && google.hash !== location.hash && Date.now() - (google.t ?? 0) < 15 * 60_000) {
    history.replaceState(history.state, '', `${location.pathname}${location.search}${google.hash}`);
  }

  if (getToken()) {
    set({ status: 'checking' });
    void auth.me().then(
      (u) => signedIn(u, fromGoogle ? 'google' : (cachedPlayer?.method ?? 'password')),
      (e: unknown) => {
        if (e instanceof CloudError && (e.status === 401 || e.status === 403)) expire();
        else if (cachedPlayer) set({ status: 'in', player: cachedPlayer, sync: 'offline' });
        else expire();
      },
    );
  } else if (google.t && Date.now() - google.t < 15 * 60_000) {
    set({ notice: { text: 'No se ha completado la entrada con Google. Puedes volver a intentarlo cuando quieras.', tone: 'warn' } });
  }

  let solvedSig = signature();
  subscribeProgress(() => {
    const sig = signature();
    const urgent = sig !== solvedSig;
    solvedSig = sig;
    localChanged(urgent);
  });
  subscribeAchievements(() => localChanged(true));
  let lastName = getSettings().playerName;
  subscribeSettings(() => {
    const name = getSettings().playerName;
    if (name === lastName) return;
    lastName = name;
    if (applying) return;
    save('name-at', Date.now());
    localChanged(true);
  });

  document.addEventListener('visibilitychange', () => {
    if (state.status !== 'in') return;
    if (document.hidden) void flushOnHide();
    else if (Date.now() - (state.lastSync ?? 0) > 20_000) void syncNow();
  });
  window.addEventListener('pagehide', () => void flushOnHide());
  window.addEventListener('online', () => {
    if (state.status === 'in' && (isDirty() || state.sync !== 'ok')) void syncNow();
  });
}

/** Resumen de lo resuelto: si cambia, se guarda enseguida. */
function signature() {
  return Object.entries(getStore())
    .filter(([, c]) => wasSolved(c))
    .map(([id, c]) => `${id}:${c.stars ?? 1}:${c.bestTime ?? ''}`)
    .join('|');
}

// ------------------------------------------------------------ entrar, registrarse y salir

/** Registro a medias: falta el código que llega por correo. */
let pendingSignup: { email: string; password: string; name: string } | null = null;

export const signupEmail = () => pendingSignup?.email ?? '';

export async function loginWithPassword(email: string, password: string) {
  const mail = email.trim().toLowerCase();
  try {
    const res = await auth.login(mail, password);
    if (!res?.access_token) throw new CloudError('Sin sesión', 500);
    setToken(res.access_token);
    await signedIn(res.user ?? (await auth.me()), 'password');
  } catch (e) {
    // Cuenta creada pero sin confirmar: se manda otro código y se pide.
    if (e instanceof CloudError && e.status === 403 && /verif|confirm|otp|activ/i.test(e.message)) {
      pendingSignup = { email: mail, password, name: '' };
      await auth.resend(mail).catch(() => undefined);
      throw new CloudError('unverified', 403, 'unverified');
    }
    throw e;
  }
}

export async function register(name: string, email: string, password: string) {
  const mail = email.trim().toLowerCase();
  await auth.register(mail, password, name.trim() || undefined);
  pendingSignup = { email: mail, password, name: name.trim() };
}

export async function verifyCode(code: string) {
  const s = pendingSignup;
  if (!s) throw new CloudError('Sin registro pendiente', 400);
  const res = await auth.verify(s.email, code.replace(/\s+/g, ''));
  let token = res?.access_token;
  let user = res?.user;
  if (!token) {
    const login = await auth.login(s.email, s.password);
    token = login?.access_token;
    user = login?.user;
  }
  if (!token) throw new CloudError('Sin sesión', 500);
  setToken(token);
  let u = user ?? (await auth.me());
  if (s.name && !u.full_name) u = await auth.updateMe({ full_name: s.name }).catch(() => u);
  pendingSignup = null;
  await signedIn(u, 'password');
}

export async function resendCode() {
  if (pendingSignup) await auth.resend(pendingSignup.email);
}

export function loginWithGoogle() {
  save('google-pending', { t: Date.now(), hash: location.hash });
  // Va primero al puente del dominio de Base44: Base44 toma el dominio de la página que pide la entrada
  // y, al volver de Google, rechaza github.io («Domain is not valid»).
  location.href = googleLoginUrl();
}

export const requestPasswordReset = (email: string) => auth.forgot(email.trim().toLowerCase());

export const resetPassword = (token: string, password: string) => auth.reset(token, password);

/** ¿Queda progreso de este dispositivo sin guardar en la cuenta? */
export const hasUnsaved = () => (state.status === 'in' || state.status === 'expired') && isOwner() && isDirty();

/**
 * Cierra la sesión. El progreso se queda en la cuenta y este dispositivo vuelve a empezar de cero
 * (así, en un móvil compartido, la otra persona no hereda tus casos).
 */
export async function logout(force = false): Promise<'ok' | 'unsaved'> {
  if (state.status === 'in' && isDirty()) await syncNow();
  if (!force && hasUnsaved()) return 'unsaved';
  const google = state.player?.method === 'google';
  setToken(null);
  for (const k of ['account', 'owner', 'sync', 'dirty', 'name-at', 'reset-at']) remove(k);
  window.clearTimeout(timer);
  timer = 0;
  recordId = null;
  lastCloud = null;
  pendingCloud = null;
  pendingSignup = null;
  set({ status: 'guest', player: null, sync: 'idle', lastSync: null, choice: null, notice: null });
  quietly(() => {
    resetAll();
    resetAchievements();
    setSetting('playerName', '');
  });
  seq = syncedSeq = 0;
  if (google) location.href = logoutUrl();
  return 'ok';
}

/** «Borrar mi progreso»: con cuenta, se borra también en la nube y en los demás dispositivos. */
export function resetEverything() {
  save('reset-at', Date.now());
  resetAll();
  resetAchievements();
  if (state.status === 'in') void syncNow();
}
