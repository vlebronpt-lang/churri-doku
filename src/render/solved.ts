import type { Puzzle } from '../engine/types';
import { boardSize, CELL, renderBoard, type BoardOpts } from './board';

/** Ficha redonda con la etiqueta de una persona, centrada en la casilla i (en unidades del SVG del plano). */
export function tokenSvg(p: Puzzle, i: number, tag: string, fill: string, ink = '#251a37', ring = '#251a37') {
  const { off } = boardSize(p, true);
  const x = off + (i % p.size) * CELL + CELL / 2, y = off + Math.floor(i / p.size) * CELL + CELL / 2;
  return `<circle cx="${x}" cy="${y}" r="33" fill="${fill}" stroke="${ring}" stroke-width="6"/><text x="${x}" y="${y + 11}" text-anchor="middle" font-family="Bungee, Archivo Black, sans-serif" font-size="${tag.length > 1 ? 24 : 32}" fill="${ink}">${tag}</text>`;
}

/** El plano resuelto: cada persona en su casilla, con la víctima en rojo y el asesino en amarillo. */
export function renderSolvedBoard(p: Puzzle, opts: BoardOpts = {}) {
  const base = renderBoard(p, { coords: true, ...opts });
  const tokens = p.cast.map((ch) => {
    const fill = ch.victim ? '#e23d6b' : ch.id === p.murderer ? '#f3b53f' : '#ffffff';
    return tokenSvg(p, p.solution[ch.id], ch.tag, fill, ch.victim ? '#fff' : '#251a37');
  }).join('');
  return base.replace('</svg>', `${tokens}</svg>`);
}
