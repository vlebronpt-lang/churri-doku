import { useState } from 'react';
import type { CharacterDef, Puzzle } from '../engine/types';

const BASE = import.meta.env.BASE_URL;

const PALETTE = ['#f4a3b5', '#9fc5f8', '#ffd27a', '#a6e3c5', '#c9b6f2', '#ffb48a', '#8fd3d6', '#f7c6e0', '#b8d98f', '#e8b8a0'];

export function portraitUrl(p: Puzzle, ch: CharacterDef, variant: 'web' | 'print' | 'print-bn' = 'web') {
  if (variant === 'print') return `${BASE}img/print/${p.id}/${ch.id}.jpg`;
  if (variant === 'print-bn') return `${BASE}img/print/${p.id}/${ch.id}-bn.jpg`;
  return `${BASE}img/portraits/${p.id}/${ch.id}.webp`;
}

export function charColor(p: Puzzle, ch: CharacterDef) {
  if (ch.color) return ch.color;
  const k = p.cast.findIndex((c) => c.id === ch.id);
  return PALETTE[k % PALETTE.length];
}

/** Retrato del personaje; si aún no hay imagen, avatar con iniciales. */
export function Portrait({ p, ch, className = '', variant = 'web' }: { p: Puzzle; ch: CharacterDef; className?: string; variant?: 'web' | 'print' | 'print-bn' }) {
  const [failed, setFailed] = useState(false);
  const bg = charColor(p, ch);
  if (!failed) {
    return (
      <img
        className={`portrait ${className}`}
        src={portraitUrl(p, ch, variant)}
        alt=""
        loading={variant === 'web' ? 'lazy' : 'eager'}
        draggable={false}
        style={{ background: bg }}
        onError={() => setFailed(true)}
      />
    );
  }
  const initials = ch.name.replace(/^(Sr\.|Sra\.)\s*/, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <svg className={`portrait portrait--ph ${className}`} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" fill={bg} />
      <circle cx="50" cy="40" r="20" fill="#fff" opacity=".55" />
      <path d="M14 100 Q14 66 50 66 Q86 66 86 100 Z" fill="#fff" opacity=".55" />
      <text x="50" y="47" textAnchor="middle" fontFamily="Bungee, sans-serif" fontSize="20" fill="#251a37">{initials}</text>
    </svg>
  );
}
