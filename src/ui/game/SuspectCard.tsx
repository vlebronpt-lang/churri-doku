import type { CharacterDef, Puzzle } from '../../engine/types';
import { displayName, withPrep } from '../../engine/text';
import { Portrait } from '../Portrait';
import { Icon } from '../Icon';
import { ClueText, type Highlight } from './ClueText';

export interface ZoneMark {
  /** Nombre de la habitación («Cocina»). */
  label: string;
  /** Casillas que aún son posibles dentro de la zona. */
  left: number;
  /** Mal marcada (tras «Revisar»). */
  wrong: boolean;
  room: number;
}

/** «Cocina · 3 posibles» con su botón para quitarla. */
export function ZoneLine({ zone, onClear }: { zone: ZoneMark; onClear: () => void }) {
  const status = zone.wrong ? 'zona equivocada' : zone.left === 0 ? 'ninguna casilla posible' : zone.left === 1 ? '1 casilla posible' : `${zone.left} posibles`;
  const bad = zone.wrong || zone.left === 0;
  return (
    <span className={`zone-line${bad ? ' is-bad' : zone.left === 1 ? ' is-one' : ''}`} title={bad && !zone.wrong ? 'No le queda ninguna casilla libre en su zona: revisa tus marcas.' : undefined}>
      <Icon name="pin" size={14} />
      <span><strong>{zone.label}</strong> · {status}</span>
      <button type="button" className="zone-line__x" onClick={(e) => { e.stopPropagation(); onClear(); }} aria-label={`Quitar la zona (${zone.label})`} title="Quitar la zona">
        <Icon name="close" size={13} />
      </button>
    </span>
  );
}

export function SuspectCard({ p, ch, selected, placed, simple, genderSymbols, onSelect, onHighlight, onDragStart, onFeedback, index, zone, onClearZone }: {
  p: Puzzle;
  ch: CharacterDef;
  selected: boolean;
  placed: boolean;
  simple: boolean;
  genderSymbols: boolean;
  onSelect: () => void;
  onHighlight: (h: Highlight | null) => void;
  onDragStart?: (e: React.PointerEvent) => void;
  /** «Esta pista me confunde». */
  onFeedback?: () => void;
  index: number;
  /** Zona marcada para quien aún no tiene casilla. */
  zone?: ZoneMark;
  onClearZone?: () => void;
}) {
  const tilt = ((index * 37) % 5) - 2;
  return (
    <div
      className={`suspect${selected ? ' is-selected' : ''}${placed ? ' is-placed' : ''}${ch.victim ? ' is-victim' : ''}`}
      onPointerEnter={() => onHighlight({ cells: new Set(), rows: new Set(), cols: new Set(), rooms: new Set(), persons: new Set([ch.id]) })}
      onPointerLeave={() => onHighlight(null)}
    >
      <button
        className="suspect__photo"
        style={{ ['--tilt' as string]: `${tilt * 0.6}deg` }}
        onClick={onSelect}
        onPointerDown={onDragStart}
        aria-pressed={selected}
        aria-label={`${selected ? 'Deseleccionar' : 'Seleccionar'} ${withPrep('a', ch)}${placed ? ' (colocado)' : ''}`}
      >
        <Portrait p={p} ch={ch} />
        <span className="suspect__tag">{ch.tag}</span>
        {genderSymbols && <span className={`suspect__gender suspect__gender--${ch.gender}`} aria-label={ch.gender === 'f' ? 'mujer' : 'hombre'}>{ch.gender === 'f' ? '♀' : '♂'}</span>}
        {placed && <span className="suspect__check" aria-hidden="true">✓</span>}
        <span className="suspect__name">{displayName(ch)}</span>
      </button>
      <div className="suspect__clue" onClick={onSelect}>
        <span className="suspect__cname" aria-hidden="true">{displayName(ch)}</span>
        {ch.victim && <span className="suspect__victim">Víctima</span>}
        <ClueText p={p} ch={ch} simple={simple} onHighlight={onHighlight} />
        {zone && onClearZone && <ZoneLine zone={zone} onClear={onClearZone} />}
        {onFeedback && !ch.victim && (
          <button className="clue-flag" onClick={(e) => { e.stopPropagation(); onFeedback(); }} aria-label={`La pista ${withPrep('de', ch)} me confunde`} title="¿Esta pista te confunde? Avísanos">?</button>
        )}
      </div>
    </div>
  );
}
