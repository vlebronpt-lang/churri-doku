import type { CharacterDef, Puzzle } from '../../engine/types';
import { displayName, withPrep } from '../../engine/text';
import { Portrait } from '../Portrait';
import { ClueText, type Highlight } from './ClueText';

export function SuspectCard({ p, ch, selected, placed, simple, genderSymbols, onSelect, onHighlight, onDragStart, index }: {
  p: Puzzle;
  ch: CharacterDef;
  selected: boolean;
  placed: boolean;
  simple: boolean;
  genderSymbols: boolean;
  onSelect: () => void;
  onHighlight: (h: Highlight | null) => void;
  onDragStart?: (e: React.PointerEvent) => void;
  index: number;
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
        {ch.victim && <span className="suspect__victim">Víctima</span>}
        <ClueText p={p} ch={ch} simple={simple} onHighlight={onHighlight} />
      </div>
    </div>
  );
}
