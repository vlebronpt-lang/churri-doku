import { useState } from 'react';
import type { Puzzle } from '../../engine/types';
import { displayName } from '../../engine/text';
import type { BoardState } from '../../state/progress';
import { Modal } from '../Modal';
import { Portrait } from '../Portrait';
import { Icon } from '../Icon';
import { erasableItems } from './EraseDialog';

/** ¿Hay algo que se borraría al tachar esta casilla? (alguien colocado, notas o «ocupada») */
export const hasContent = (board: BoardState, cell: number) =>
  board.placed[cell] !== undefined || !!board.notes[cell]?.length || !!board.occ?.[cell];

/** Aviso antes de tachar casillas con algo dentro: al tacharlas, se borra lo que tienen. */
export function CrossDialog({ p, board, cells, where, onConfirm, onClose }: {
  p: Puzzle;
  board: BoardState;
  /** Casillas con algo dentro que se van a tachar. */
  cells: number[];
  /** «La casilla F2·C3», «3 casillas de la fila 4»… */
  where: string;
  /** `quiet`: no volver a avisar. */
  onConfirm: (quiet: boolean) => void;
  onClose: () => void;
}) {
  const [quiet, setQuiet] = useState(false);
  const items = erasableItems(board, cells).filter((it) => it.kind === 'placed' || it.kind === 'note' || it.kind === 'occ');
  const many = cells.length > 1;
  return (
    <Modal title={many ? '¿Tachar y vaciar estas casillas?' : '¿Tachar y vaciar esta casilla?'} onClose={onClose} labelledBy="cross-title" className="erase-dialog cross-dialog">
      <p className="muted small">{where} {many ? 'tienen' : 'tiene'} algo dentro. Si {many ? 'las tachas' : 'la tachas'}, se borrará:</p>
      <ul className="erase-list cross-list">
        {items.map((it) => {
          const ch = it.id ? p.cast.find((x) => x.id === it.id) : undefined;
          const what = it.kind === 'placed' ? 'Colocado aquí' : it.kind === 'note' ? (many && it.count! > 1 ? `Anotado a lápiz en ${it.count} casillas` : 'Anotado a lápiz') : (many && it.count! > 1 ? `${it.count} casillas` : 'Marca');
          return (
            <li key={it.key} className="erase-item cross-item">
              {ch ? (
                <Portrait p={p} ch={ch} className="erase-item__img" />
              ) : (
                <span className="erase-item__mark erase-item__mark--occ" aria-hidden="true"><Icon name="occupied" size={26} /></span>
              )}
              <span className="erase-item__text">
                <strong>{ch ? displayName(ch) : many && it.count! > 1 ? 'Casillas ocupadas' : 'Casilla ocupada'}</strong>
                <span>{what}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <label className="cross-quiet">
        <input type="checkbox" checked={quiet} onChange={(e) => setQuiet(e.target.checked)} /> No volver a avisar (puedes cambiarlo en Ajustes)
      </label>
      <div className="row gap wrap erase-actions">
        <button className="btn btn--danger" onClick={() => onConfirm(quiet)}><Icon name="x" size={18} sw={3} /> Tachar y borrar</button>
        <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  );
}
