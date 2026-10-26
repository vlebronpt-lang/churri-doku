import type { Puzzle } from '../../engine/types';
import type { HintResult } from '../../game/hints';
import { roomPhrase, withPrep } from '../../engine/text';
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

export function HintPanel({ p, hint, onMore, onApply, onShortcut, onNext, onClose, onFeedback }: {
  p: Puzzle;
  hint: { res: HintResult; level: number };
  onMore: () => void;
  /** La acción de la pista en el tablero (colocar, tachar, marcar la zona, apuntar con el lápiz o quitar errores). */
  onApply: () => void;
  /** «Hazlo por mí»: salta hasta la próxima colocación. */
  onShortcut?: () => void;
  /** Siguiente pista, partiendo de lo que esta ya ha explicado. */
  onNext?: () => void;
  onClose: () => void;
  /** «No entiendo esta explicación». */
  onFeedback?: (text: string) => void;
}) {
  const { res, level } = hint;
  let title = 'Pista';
  let body: React.ReactNode = null;
  let more: string | null = null;
  let apply: string | null = null;
  let shortcut: string | null = null;
  let next = false;
  const who = (id: string) => p.cast.find((c) => c.id === id)!;

  if (res.kind === 'errors') {
    const n = res.wrongPlaced.length;
    const x = res.wrongX.length;
    const o = res.wrongOcc.length;
    const z = res.wrongZones.length;
    title = 'Antes de seguir…';
    body = (
      <p>
        {n > 0 && <>Hay {n === 1 ? 'una persona colocada' : `${n} personas colocadas`} donde no {n === 1 ? 'toca' : 'tocan'}. </>}
        {x > 0 && <>Has descartado {x === 1 ? 'una casilla' : `${x} casillas`} donde sí había alguien. </>}
        {o > 0 && <>Has marcado como ocupada{o === 1 ? ' una casilla' : `s ${o} casillas`} donde no había nadie. </>}
        {z > 0 && <>{z === 1 ? `Has puesto ${withPrep('a', who(res.wrongZones[0]))} en una zona que no es la suya` : `Has puesto a ${z} personas en zonas que no son las suyas`}. </>}
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
    body = <p>No encuentro una deducción desde aquí. Repasa tus marcas o usa «Revisar».</p>;
  } else if (res.kind === 'reveal') {
    const c = p.cells[res.cell];
    title = 'Una ayudita extra';
    body = <p>Desde aquí haría falta un razonamiento larguísimo. Te desvelo dónde estaba {withPrep('', who(res.id))}: fila {c.r + 1}, columna {c.c + 1} ({p.rooms[c.room].name}).</p>;
    apply = `Colocar ${withPrep('a', who(res.id))}`;
  } else {
    const d = res.d;
    title = level === 1 ? 'Un empujoncito' : TECH_NAME[d.tech] ?? 'Pista';
    body = level === 1 ? <p>{d.nudge}</p> : <p>{d.text}</p>;
    if (level === 1) more = 'Explícamelo';
    else {
      if (d.place) apply = `Colocar ${withPrep('a', p.cast[d.place.k])}`;
      else if (res.xCells.length) apply = res.xCells.length === 1 ? 'Tachar esa casilla' : `Tachar esas ${res.xCells.length} casillas`;
      else if (res.zone) apply = `Marcar la zona: ${roomPhrase(p.rooms[res.zone.room], '')}`;
      else if (res.notes) apply = 'Apuntarlo con el lápiz';
      next = !d.place && !!onNext;
      if (!d.place && res.leadsTo && onShortcut) shortcut = `Hazlo por mí (coloca ${withPrep('a', who(res.leadsTo.id))})`;
    }
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
        {more && <button className="btn btn--sm btn--primary" onClick={onMore}>{more}</button>}
        {apply && <button className={`btn btn--sm${more ? ' btn--ghost' : ' btn--primary'}`} onClick={onApply}>{apply}</button>}
        {next && <button className="btn btn--sm" onClick={onNext}>Siguiente pista</button>}
        {shortcut && <button className="btn btn--sm btn--ghost" onClick={onShortcut}>{shortcut}</button>}
        {!more && !apply && !next && <button className="btn btn--sm" onClick={onClose}>Entendido</button>}
        {onFeedback && res.kind === 'step' && (
          <button className="linkish hint__fb" onClick={() => onFeedback(level === 1 ? res.d.nudge : res.d.text)}>¿No se entiende?</button>
        )}
      </div>
    </div>
  );
}
