import { useMemo } from 'react';
import type { Puzzle } from '../../engine/types';
import { legendIconSvg, objectLegend } from '../../render/legend';
import { Modal } from '../Modal';

/** Leyenda de los objetos del plano: qué es cada dibujo y si se puede estar en esa casilla. */
export function ObjectLegend({ p, bw = false, compact = false }: { p: Puzzle; bw?: boolean; compact?: boolean }) {
  const items = useMemo(() => objectLegend(p), [p]);
  return (
    <ul className={`legend${compact ? ' legend--compact' : ''}`}>
      {items.map((it) => (
        <li key={it.key} className={`legend__item${it.occupiable ? ' is-ok' : ' is-no'}`}>
          <span className="legend__icon" dangerouslySetInnerHTML={{ __html: legendIconSvg(it.def, bw) }} />
          <span className="legend__text">
            <span className="legend__name">{it.name}</span>
            <span className="legend__rule">
              {it.occupiable ? <>✓ Se puede estar{it.pose ? ` (${it.pose})` : ''}</> : <>✕ No se puede estar</>}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ObjectsModal({ p, onClose }: { p: Puzzle; onClose: () => void }) {
  return (
    <Modal title="Objetos del plano" onClose={onClose} labelledBy="objects-title" className="objects-modal" wide>
      <p className="muted small">Todo lo que hay en «{p.title}». Las casillas con objetos que no se pueden ocupar salen oscurecidas en el tablero. Si pasas el ratón por una casilla, te dice qué hay en ella.</p>
      <ObjectLegend p={p} />
    </Modal>
  );
}
