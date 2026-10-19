import { useState } from 'react';
import type { Puzzle } from '../../engine/types';
import { displayName } from '../../engine/text';
import type { EraseSel } from '../../game/useGame';
import type { BoardState } from '../../state/progress';
import { Modal } from '../Modal';
import { Portrait } from '../Portrait';
import { Icon } from '../Icon';

type Item = { key: string; kind: 'placed' | 'note' | 'occ' | 'x'; id?: string };

/** Lo que se puede borrar en una casilla (persona colocada, anotaciones y marcas). */
export function erasableItems(board: BoardState, cell: number): Item[] {
  const items: Item[] = [];
  const placed = board.placed[cell];
  if (placed) items.push({ key: `p-${placed}`, kind: 'placed', id: placed });
  for (const id of board.notes[cell] ?? []) if (id !== placed) items.push({ key: `n-${id}`, kind: 'note', id });
  if (board.occ?.[cell]) items.push({ key: 'occ', kind: 'occ' });
  if (board.xs[cell]) items.push({ key: 'x', kind: 'x' });
  return items;
}

/** Ventana para elegir qué borrar cuando en una casilla hay varias cosas. */
export function EraseDialog({ p, board, cell, onErase, onClose }: {
  p: Puzzle;
  board: BoardState;
  cell: number;
  onErase: (sel: EraseSel) => void;
  onClose: () => void;
}) {
  const items = erasableItems(board, cell);
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
  });
  const c = p.cells[cell];
  const n = picked.size;
  return (
    <Modal title="¿Qué quieres borrar?" onClose={onClose} labelledBy="erase-title" className="erase-dialog">
      <p className="muted small">Fila {c.r + 1}, columna {c.c + 1} · {p.rooms[c.room].name}. Elige una o varias cosas, o bórralo todo.</p>
      <div className="erase-list" role="group" aria-label="Qué borrar">
        {items.map((it) => {
          const ch = it.id ? p.cast.find((x) => x.id === it.id) : undefined;
          const on = picked.has(it.key);
          return (
            <button key={it.key} className={`erase-item${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggle(it.key)}>
              {ch ? (
                <Portrait p={p} ch={ch} className="erase-item__img" />
              ) : (
                <span className={`erase-item__mark erase-item__mark--${it.kind}`} aria-hidden="true">{it.kind === 'x' ? <Icon name="x" size={22} sw={3} /> : <Icon name="occupied" size={26} />}</span>
              )}
              <span className="erase-item__text">
                <strong>{ch ? displayName(ch) : it.kind === 'occ' ? 'Casilla ocupada' : 'Casilla descartada'}</strong>
                <span>{it.kind === 'placed' ? 'Colocado aquí' : it.kind === 'note' ? 'Anotado a lápiz' : 'Marca'}</span>
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
