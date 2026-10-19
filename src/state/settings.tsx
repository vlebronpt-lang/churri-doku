import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...load<Partial<Settings>>('settings', {}) }));

  useEffect(() => {
    save('settings', settings);
    const root = document.documentElement;
    if (settings.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
    root.toggleAttribute('data-no-motion', !settings.animations);
    root.setAttribute('data-clue-size', settings.clueSize);
  }, [settings]);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);
  const value = useMemo(() => ({ settings, set, reset }), [settings, set, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings fuera de SettingsProvider');
  return ctx;
}
