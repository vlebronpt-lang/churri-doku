import { useSyncExternalStore } from 'react';
import { recordEvent } from './achievements';
import { PUZZLES } from '../data/puzzles';
import { loadDailyIndex } from '../data/daily';

/** Instalación de la app (PWA) y descarga para jugar sin conexión. */
interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setupPwa() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    recordEvent({ installed: true });
    emit();
  });
  if (isStandalone()) recordEvent({ installed: true });
  void navigator.serviceWorker.register('./sw.js').catch(() => {});
}

export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: minimal-ui)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function useCanInstall(): boolean {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => !!deferred, () => false);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  emit();
  return choice.outcome === 'accepted';
}

/** Lista de todo lo necesario para jugar sin conexión (imágenes y casos del día publicados). */
export async function offlineUrls(): Promise<string[]> {
  const base = import.meta.env.BASE_URL;
  const urls: string[] = [];
  for (const p of PUZZLES) {
    urls.push(`${base}img/covers/${p.id}.webp`);
    for (const ch of p.cast) urls.push(`${base}img/portraits/${p.id}/${ch.id}.webp`);
  }
  urls.push(`${base}img/ui/desk.webp`, `${base}img/ui/files.webp`, `${base}img/ui/board.webp`);
  const idx = await loadDailyIndex();
  if (idx) {
    urls.push(`${base}daily/index.json`);
    for (const m of idx.months) urls.push(`${base}daily/${m}.json`);
  }
  return urls;
}

/** Pide al service worker que guarde todo. `onProgress` recibe (hechos, total). */
export async function downloadForOffline(onProgress: (done: number, total: number) => void): Promise<boolean> {
  const reg = await navigator.serviceWorker?.ready;
  if (!reg?.active) return false;
  const urls = await offlineUrls();
  const onMsg = (e: MessageEvent) => {
    if (e.data?.type === 'precache-progress') onProgress(e.data.done, e.data.total);
  };
  navigator.serviceWorker.addEventListener('message', onMsg);
  reg.active.postMessage({ type: 'precache', urls });
  onProgress(0, urls.length);
  return true;
}

/** Recordatorio diario para el calendario (.ics): sustituye a las notificaciones, que necesitan servidor. */
export function reminderIcs(hour: number, minute: number): Blob {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute);
  const fmtLocal = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const url = `${location.origin}${location.pathname}#/diario`;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Churri-doku//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:churri-doku-caso-del-dia-${stamp}@churri-doku`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${fmtLocal(start)}`,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:🔎 Caso del día de Churri-doku',
    `DESCRIPTION:Hay un caso nuevo esperándote: ${url}`,
    `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Caso del día de Churri-doku', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return new Blob([lines.join('\r\n')], { type: 'text/calendar' });
}
