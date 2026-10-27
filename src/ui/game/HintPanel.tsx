import type { Puzzle } from '../../engine/types';
import type { HintResult } from '../../game/hints';
import { roomPhrase, withPrep } from '../../engine/text';
import { Icon } from '../Icon';

/** Nombre de cada técnica de deducción (pistas y paso a paso de las soluciones). */
export const TECH_NAME: Record<string, string> = {
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

/** A quién desvela la tercera pista: la persona que se coloca en este paso o a la que lleva el razonamiento. */
export function hintTarget(res: HintResult): { id: string; cell: number } | null {
  if (res.kind === 'reveal') return { id: res.id, cell: res.cell };
  if (res.kind !== 'step') return null;
  return res.leadsTo;
}

/**
 * Panel de pistas en tres escalones: 1, un empujoncito; 2, la explicación completa (con lo que se puede
 * hacer en el tablero); 3, siempre la solución de un personaje.
 */
export function HintPanel({ p, hint, onMore, onApply, onClose, onFeedback }: {
  p: Puzzle;
  hint: { res: HintResult; level: number };
  /** Siguiente escalón. */
  onMore: () => void;
  /** La acción del escalón en el tablero (tachar, marcar la zona, apuntar, colocar o quitar errores). */
  onApply: () => void;
  onClose: () => void;
  /** «No entiendo esta explicación». */
  onFeedback?: (text: string) => void;
}) {
  const { res, level } = hint;
  /** Escalón de la escalera de pistas (0 si no aplica). */
  let stepN = 0;
  let title = 'Pista';
  let body: React.ReactNode = null;
  let more: string | null = null;
  let apply: string | null = null;
  const who = (id: string) => p.cast.find((c) => c.id === id)!;
  const at = (cell: number) => {
    const c = p.cells[cell];
    return <>la fila {c.r + 1}, columna {c.c + 1} (F{c.r + 1}·C{c.c + 1}, {roomPhrase(p.rooms[c.room], 'en')})</>;
  };

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
    body = <p>No encuentro una deducción desde aquí. Repasa tus marcas o usa «Revisar».</p>;
  } else if (res.kind === 'reveal') {
    stepN = 3;
    title = 'La solución de un personaje';
    body = <p>Desde aquí haría falta un razonamiento larguísimo, así que te desvelo dónde estaba {withPrep('', who(res.id))}: en {at(res.cell)}.</p>;
    apply = `Colocar ${withPrep('a', who(res.id))}`;
  } else {
    const d = res.d;
    const target = hintTarget(res);
    if (level === 1) {
      stepN = 1;
      title = 'Un empujoncito';
      body = <p>{d.nudge}</p>;
      more = 'Pista 2: explícamelo';
    } else if (level === 2 || !target) {
      stepN = 2;
      title = TECH_NAME[d.tech] ?? 'La explicación';
      body = <p>{d.text}</p>;
      if (d.place) apply = `Colocar ${withPrep('a', p.cast[d.place.k])}`;
      else if (res.xCells.length) apply = res.xCells.length === 1 ? 'Tachar esa casilla' : `Tachar esas ${res.xCells.length} casillas`;
      else if (res.zone) apply = `Marcar la zona: ${roomPhrase(p.rooms[res.zone.room], '')}`;
      else if (res.notes) apply = 'Apuntarlo con el lápiz';
      if (target) more = 'Pista 3: dime dónde está alguien';
    } else {
      stepN = 3;
      title = 'La solución de un personaje';
      const ch = who(target.id);
      body = (
        <p>
          {d.place ? <>Es lo que has visto en la explicación: </> : <>Siguiendo este razonamiento se llega a {withPrep('', ch)}. </>}
          <strong>{withPrep('', ch).charAt(0).toUpperCase() + withPrep('', ch).slice(1)}</strong> estaba en {at(target.cell)}.
        </p>
      );
      apply = `Colocar ${withPrep('a', ch)}`;
    }
  }

  return (
    <div className="hint" role="dialog" aria-label="Pista">
      <div className="hint__head">
        <span className="hint__bulb"><Icon name="bulb" size={20} /></span>
        <h3>{stepN > 0 && <span className="hint__step">Pista {stepN} de 3 · </span>}{title}</h3>
        <button className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Cerrar pista"><Icon name="close" size={18} /></button>
      </div>
      {stepN > 0 && (
        <div className="hint__dots" aria-hidden="true">
          {[1, 2, 3].map((k) => <span key={k} className={stepN >= k ? 'is-on' : ''} />)}
        </div>
      )}
      <div className="hint__body">{body}</div>
      <div className="hint__foot">
        {more && <button className="btn btn--sm btn--primary" onClick={onMore}>{more}</button>}
        {apply && <button className={`btn btn--sm${more ? ' btn--ghost' : ' btn--primary'}`} onClick={onApply}>{apply}</button>}
        {!more && !apply && <button className="btn btn--sm" onClick={onClose}>Entendido</button>}
        {onFeedback && res.kind === 'step' && level < 3 && (
          <button className="linkish hint__fb" onClick={() => onFeedback(level === 1 ? res.d.nudge : res.d.text)}>¿No se entiende?</button>
        )}
      </div>
    </div>
  );
}
