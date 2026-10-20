import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { load, save } from './storage';

export interface Settings {
  theme: 'auto' | 'light' | 'dark';
  sound: boolean;
  haptics: boolean;
  animations: boolean;
  timer: boolean;
  autoX: boolean;
  /** No permitir X en casillas no ocupables. */
  noXOnBlocked: boolean;
  genderSymbols: boolean;
  /** Cómo se ven las fichas colocadas. */
  tokenStyle: 'portrait' | 'letter';
  simpleDirections: boolean;
  coords: boolean;
  shadeBlocked: boolean;
  /** Toque rápido en una casilla: colocar (por defecto) o anotar (como el original). */
  tapAction: 'place' | 'note';
  /** Resaltar en el tablero lo que menciona una pista al pasar por encima. */
  keywordHighlights: boolean;
  /** Avisar si dos personas comparten fila o columna. */
  conflictWarnings: boolean;
  clueSize: 'sm' | 'md' | 'lg';
  /** Nombre con el que firmas los retos. */
  playerName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  sound: true,
  haptics: true,
  animations: true,
  timer: true,
  autoX: true,
  noXOnBlocked: true,
  genderSymbols: true,
  tokenStyle: 'portrait',
  simpleDirections: false,
  coords: false,
  shadeBlocked: true,
  tapAction: 'place',
  keywordHighlights: true,
  conflictWarnings: true,
  clueSize: 'md',
  playerName: '',
};

interface Ctx {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

// Los ajustes viven fuera de React para que también se puedan leer y cambiar desde la sincronización con la cuenta.
let current: Settings = { ...DEFAULT_SETTINGS, ...load<Partial<Settings>>('settings', {}) };
const listeners = new Set<() => void>();

function replaceSettings(next: Settings) {
  current = next;
  save('settings', current);
  listeners.forEach((l) => l());
}

export const getSettings = () => current;

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  if (current[key] === value) return;
  replaceSettings({ ...current, [key]: value });
}

const resetSettings = () => replaceSettings(DEFAULT_SETTINGS);

export function subscribeSettings(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getSettings);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
    root.toggleAttribute('data-no-motion', !settings.animations);
    root.setAttribute('data-clue-size', settings.clueSize);
  }, [settings]);

  const value = useMemo(() => ({ settings, set: setSetting, reset: resetSettings }), [settings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings fuera de SettingsProvider');
  return ctx;
}
