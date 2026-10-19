import { useState } from 'react';
import type { Puzzle } from '../../engine/types';
import { displayName } from '../../engine/text';
import type { EraseSel } from '../../game/useGame';
import type { BoardState } from '../../state/progress';
import { Modal } from '../Modal';
import { Portrait } from '../Portrait';
import { Icon } from '../Icon';

type Item = { key: string; kind: 'placed' | 'note' | 'occ' | 'x' | 'line'; id?: string; count?: number };

/** Lo que se puede borrar en unas casillas (personas colocadas, anotaciones y marcas) y en su fila/columna. */
export function erasableItems(board: BoardState, cells: number[], lineKey?: string): Item[] {
  const items: Item[] = [];
  const placed = cells.map((c) => board.placed[c]).filter(Boolean) as string[];
  for (const id of placed) items.push({ key: `p-${id}`, kind: 'placed', id });
  const noted = new Map<string, number>();
  for (const c of cells) for (const id of board.notes[c] ?? []) if (board.placed[c] !== id) noted.set(id, (noted.get(id) ?? 0) + 1);
  for (const [id, count] of noted) items.push({ key: `n-${id}`, kind: 'note', id, count });
  const occ = cells.filter((c) => board.occ?.[c]).length;
  if (occ) items.push({ key: 'occ', kind: 'occ', count: occ });
  const xs = cells.filter((c) => board.xs[c]).length;
  if (xs) items.push({ key: 'x', kind: 'x', count: xs });
  if (lineKey && board.lines?.[lineKey]) items.push({ key: 'line', kind: 'line' });
  return items;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many.replace('#', String(n)));

/** Ventana para elegir qué borrar cuando en una casilla (o en una fila o columna) hay varias cosas. */
export function EraseDialog({ p, board, cells, lineKey, where, onErase, onClose }: {
  p: Puzzle;
  board: BoardState;
  cells: number[];
  lineKey?: string;
  /** Descripción del sitio: «Fila 1, columna 1 · Salón», «Toda la columna 3»… */
  where: string;
  onErase: (sel: EraseSel) => void;
  onClose: () => void;
}) {
  const items = erasableItems(board, cells, lineKey);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const toggle = (key: string) => setPicked((cur) => {
    const next = new Set(cur);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const selOf = (list: Item[]): EraseSel => ({
    placed: list.some((it) => it.kind === 'placed'),
    notes: list.filter((it) => it.kind === 'note').map((it) => it.id!),
    occ: list.some((it) => it.kind === 'occ'),
    x: list.some((it) => it.kind === 'x'),
    line: list.some((it) => it.kind === 'line') ? lineKey : undefined,
  });
  const many = cells.length > 1;
  const n = picked.size;
  const describe = (it: Item) => {
    if (it.kind === 'placed') return 'Colocado aquí';
    if (it.kind === 'note') return many ? `Anotado a lápiz en ${plural(it.count!, '1 casilla', '# casillas')}` : 'Anotado a lápiz';
    if (it.kind === 'line') return lineKey?.startsWith('r') ? 'Marca de la fila' : 'Marca de la columna';
    return many ? plural(it.count!, '1 casilla', '# casillas') : 'Marca';
  };
  const title = (it: Item, name?: string) => {
    if (name) return name;
    if (it.kind === 'occ') return many ? 'Casillas ocupadas' : 'Casilla ocupada';
    if (it.kind === 'x') return many ? 'Casillas tachadas' : 'Casilla tachada';
    return lineKey?.startsWith('r') ? 'Fila ocupada' : 'Columna ocupada';
  };
  return (
    <Modal title="¿Qué quieres borrar?" onClose={onClose} labelledBy="erase-title" className="erase-dialog">
      <p className="muted small">{where}. Elige una o varias cosas, o bórralo todo.</p>
      <div className="erase-list" role="group" aria-label="Qué borrar">
        {items.map((it) => {
          const ch = it.id ? p.cast.find((x) => x.id === it.id) : undefined;
          const on = picked.has(it.key);
          return (
            <button key={it.key} className={`erase-item${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggle(it.key)}>
              {ch ? (
                <Portrait p={p} ch={ch} className="erase-item__img" />
              ) : (
                <span className={`erase-item__mark erase-item__mark--${it.kind}`} aria-hidden="true">
                  {it.kind === 'x' ? <Icon name="x" size={22} sw={3} /> : <Icon name="occupied" size={26} />}
                </span>
              )}
              <span className="erase-item__text">
                <strong>{title(it, ch ? displayName(ch) : undefined)}</strong>
                <span>{describe(it)}</span>
              </span>
              <span className="erase-item__check" aria-hidden="true">{on ? '✓' : ''}</span>
            </button>
          );
        })}
      </div>
      <div className="row gap wrap erase-actions">
        <button className="btn btn--primary" disabled={!n} onClick={() => onErase(selOf(items.filter((it) => picked.has(it.key))))}>
          <Icon name="eraser" size={18} /> {n ? `Borrar ${n === 1 ? 'la seleccionada' : `las ${n} seleccionadas`}` : 'Elige qué borrar'}
        </button>
        <button className="btn btn--danger" onClick={() => onErase(selOf(items))}>Borrar todo</button>
        <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  );
}
