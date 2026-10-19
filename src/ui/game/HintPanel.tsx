import type { Puzzle } from '../../engine/types';
import type { HintResult } from '../../game/hints';
import { withPrep } from '../../engine/text';
import { Icon } from '../Icon';

const TECH_NAME: Record<string, string> = {
  single: 'Única casilla',
  rowSingle: 'Fila con una sola opción',
  colSingle: 'Columna con una sola opción',
  cellForcedRow: 'Casilla obligada',
  cellForcedCol: 'Casilla obligada',
  pointing: 'Alineación',
  relation: 'Relación entre pistas',
  room: 'Quién comparte zona',
  subset: 'Filas o columnas reservadas',
  trial: 'Suposición descartada',
};

export function HintPanel({ p, hint, onMore, onApply, onClose }: {
  p: Puzzle;
  hint: { res: HintResult; level: number };
  onMore: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const { res, level } = hint;
  let title = 'Pista';
  let body: React.ReactNode = null;
  let more: string | null = null;
  let apply: string | null = null;

  if (res.kind === 'errors') {
    const n = res.wrongPlaced.length;
    const x = res.wrongX.length;
    title = 'Antes de seguir…';
    body = (
      <p>
        {n > 0 && <>Hay {n === 1 ? 'una persona colocada' : `${n} personas colocadas`} donde no {n === 1 ? 'toca' : 'tocan'}. </>}
        {x > 0 && <>Has descartado {x === 1 ? 'una casilla' : `${x} casillas`} donde sí había alguien. </>}
        Las pistas siguientes partirían de un error.
      </p>
    );
    if (level < 2) more = 'Mostrar dónde';
    apply = 'Quitar los errores';
  } else if (res.kind === 'solved') {
    title = '¡Ya lo tienes!';
    body = <p>Todos están en su sitio. Pulsa «Acusar» y señala al culpable.</p>;
  } else if (res.kind === 'stuck') {
    title = 'Pista';
    body = <p>No encuentro una deducción desde aquí. Revisa tus marcas o usa «Comprobar».</p>;
  } else {
    const d = res.d;
    title = level === 1 ? 'Un empujoncito' : TECH_NAME[d.tech] ?? 'Pista';
    body = level === 1 ? <p>{d.nudge}</p> : <p>{d.text}</p>;
    if (level === 1) more = 'Explícamelo';
    const target = d.place ? { id: p.cast[d.place.k].id } : res.leadsTo;
    const who = target ? p.cast.find((c) => c.id === target.id) : null;
    if (level >= 2) apply = who ? (d.place ? `Colocar ${withPrep('a', who)}` : `Hazlo por mí (coloca ${withPrep('a', who)})`) : res.xCells.length ? 'Marcar las X' : null;
  }

  return (
    <div className="hint" role="dialog" aria-label="Pista">
      <div className="hint__head">
        <span className="hint__bulb"><Icon name="bulb" size={20} /></span>
        <h3>{title}</h3>
        <button className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Cerrar pista"><Icon name="close" size={18} /></button>
      </div>
      <div className="hint__body">{body}</div>
      <div className="hint__foot">
        {more && <button className="btn btn--sm" onClick={onMore}>{more}</button>}
        {apply && <button className="btn btn--sm btn--ghost" onClick={onApply}>{apply}</button>}
        {!more && !apply && <button className="btn btn--sm" onClick={onClose}>Entendido</button>}
      </div>
    </div>
  );
}
