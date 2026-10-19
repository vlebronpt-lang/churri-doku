import { useMemo, useState } from 'react';
import { clueSentences, type Keyword, type Seg } from '../../engine/text';
import type { CharacterDef, Puzzle } from '../../engine/types';

export interface Highlight {
  cells: Set<number>;
  rows: Set<number>;
  cols: Set<number>;
  rooms: Set<number>;
  persons: Set<string>;
}

export const GLOSSARY: Partial<Record<Keyword, string>> = {
  beside: 'Junto a: en una casilla contigua (izquierda, derecha, arriba o abajo) y dentro de la misma zona. Una pared lo impide.',
  alone: 'Solo/sola: no había nadie más en su zona, ni siquiera la víctima.',
  aloneWith: 'A solas con: en esa zona solo estaban esas dos personas.',
  with: 'Con: en la misma zona.',
  corner: 'Esquina: casilla donde se juntan dos paredes de su zona.',
  diagonal: 'Misma diagonal: en línea diagonal, a cualquier distancia.',
  dir: 'Norte = más arriba, sur = más abajo, este = más a la derecha, oeste = más a la izquierda. Vale cualquier distancia y cualquier columna (o fila).',
  offset: 'Distancia exacta: ese número de filas (o columnas) en esa dirección, ni una más ni una menos.',
  row: 'Las filas son horizontales y se cuentan de arriba abajo.',
  col: 'Las columnas son verticales y se cuentan de izquierda a derecha.',
  on: 'En la misma casilla que ese objeto (se puede ocupar).',
  only: 'Nadie más en todo el tablero cumple eso.',
  count: 'Contando a todas las personas de su zona, incluida esta.',
  empty: 'En esa zona no había nadie.',
  someone: 'Alguien: cualquier persona, también la víctima.',
};

export function highlightForSentence(p: Puzzle, segs: Seg[]): Highlight {
  const h: Highlight = { cells: new Set(), rows: new Set(), cols: new Set(), rooms: new Set(), persons: new Set() };
  for (const s of segs) {
    if (s.obj) for (const c of p.cells) if (c.obj === s.obj || c.floor === s.obj) h.cells.add(c.i);
    if (s.room !== undefined) h.rooms.add(s.room);
    if (s.person) h.persons.add(s.person);
    s.rows?.forEach((r) => h.rows.add(r));
    s.cols?.forEach((c) => h.cols.add(c));
  }
  return h;
}

export function ClueText({ p, ch, simple, onHighlight, interactive = true }: {
  p: Puzzle;
  ch: CharacterDef;
  simple: boolean;
  onHighlight?: (h: Highlight | null) => void;
  interactive?: boolean;
}) {
  const sentences = useMemo(() => clueSentences(p, ch, { simple }), [p, ch, simple]);
  const [tip, setTip] = useState<{ text: string; key: string } | null>(null);
  return (
    <span className="clue">
      {sentences.map((segs, i) => (
        <span key={i} className="clue__sent">
          {segs.map((s, j) =>
            s.b ? (
              <b
                key={j}
                className={`clue__kw${s.kw ? ' clue__kw--key' : ''}${s.person ? ' clue__kw--person' : ''}`}
                onMouseEnter={interactive ? () => {
                  onHighlight?.(highlightForSentence(p, segs));
                  if (s.kw && GLOSSARY[s.kw]) setTip({ text: GLOSSARY[s.kw]!, key: `${i}-${j}` });
                } : undefined}
                onMouseLeave={interactive ? () => { onHighlight?.(null); setTip(null); } : undefined}
              >
                {s.text}
                {tip?.key === `${i}-${j}` && <span className="clue__tip" role="tooltip">{tip.text}</span>}
              </b>
            ) : (
              <span key={j}>{s.text}</span>
            ),
          )}
          {i < sentences.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}
