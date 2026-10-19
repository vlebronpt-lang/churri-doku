import type { SVGProps } from 'react';

/** Iconos de interfaz (trazo), dibujados a mano para no depender de librerías. */
const PATHS: Record<string, string> = {
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6L6 18',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.5 7.5 0 0 1-2.3 1.3L14.5 21h-4l-.3-2.3a7.5 7.5 0 0 1-2.3-1.3l-1.9.7-2-3.4 1.6-1.2a7.6 7.6 0 0 1 0-3l-1.6-1.2 2-3.4 1.9.7a7.5 7.5 0 0 1 2.3-1.3L10.5 3h4l.3 2.3a7.5 7.5 0 0 1 2.3 1.3l1.9-.7 2 3.4-1.6 1.2a7.6 7.6 0 0 1 0 3z',
  help: 'M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.2-1.5 2.3M12 17.5v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  undo: 'M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2',
  redo: 'M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h2',
  pencil: 'M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20zM14 7l3 3',
  x: 'M6 6l12 12M18 6L6 18',
  eraser: 'M7 20h13M5.5 15.5l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 19H8l-2.5-2.5a1.4 1.4 0 0 1 0-1z',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  download: 'M12 4v11M7 10.5l5 5 5-5M5 20h14',
  share: 'M12 15V4M8 8l4-4 4 4M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  sound: 'M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  mute: 'M4 9v6h4l5 4V5L8 9H4zM17 9l5 6M22 9l-5 6',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M9.5 2.5h5',
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5 5',
  print: 'M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z',
  book: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5zM4 20a2 2 0 0 0 2 2h13v-4',
  play: 'M7 4.5v15l12-7.5-12-7.5z',
  refresh: 'M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14 10.5V5.5a1.5 1.5 0 0 1 3 0V13M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L3.6 14a1.6 1.6 0 0 1 2.5-2L8 14',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  gavel: 'M14 4l6 6M12 6l6 6M13 5l-6 6 3 3 6-6M8.5 12.5L3 18l3 3 5.5-5.5M3 21h9',
  wand: 'M15 4V2M15 10V8M12 6h-2M20 6h-2M17.8 3.2L16.4 4.6M17.8 8.8l-1.4-1.4M3 21l11-11 2 2L5 23z',
};

export function Icon({ name, size = 22, sw = 2.2, ...rest }: { name: keyof typeof PATHS | string; size?: number; sw?: number } & Omit<SVGProps<SVGSVGElement>, 'stroke'>) {
  const d = PATHS[name] ?? PATHS.help;
  const filled = name === 'play' || name === 'star' || name === 'heart';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={d} />
    </svg>
  );
}
