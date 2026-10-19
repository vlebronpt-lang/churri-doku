import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Puzzle } from '../../engine/types';
import { boardSize, CELL, renderBoard } from '../../render/board';
import type { BoardState } from '../../state/progress';
import { Portrait } from '../Portrait';
import type { Highlight } from './ClueText';
import { displayName } from '../../engine/text';

export interface BoardMarks {
  conflicts: Set<number>;
  wrong: Set<number>;
  wrongX: Set<number>;
  wrongOcc: Set<number>;
  hintCells: Set<number>;
  hintX: Set<number>;
  hintRows: Set<number>;
  hintCols: Set<number>;
  hintRooms: Set<number>;
  reveal: Set<number>;
}

export const noMarks = (): BoardMarks => ({
  conflicts: new Set(), wrong: new Set(), wrongX: new Set(), wrongOcc: new Set(), hintCells: new Set(), hintX: new Set(),
  hintRows: new Set(), hintCols: new Set(), hintRooms: new Set(), reveal: new Set(),
});

interface Props {
  p: Puzzle;
  board: BoardState;
  autoX: Set<number>;
  selected: string | null;
  highlight: Highlight | null;
  marks: BoardMarks;
  tokenStyle: 'portrait' | 'letter';
  coords: boolean;
  shade: boolean;
  /** Pinta (arrastre) en modo X/nota/borrar (la marca «ocupada» va casilla a casilla). */
  paintMode: 'x' | 'note' | 'erase' | null;
  onTap: (cell: number, long: boolean) => void;
  onPaintStart: (cell: number) => void;
  onPaint: (cell: number) => void;
  onPaintEnd: () => void;
  stamp?: string | null;
}

const LONG_MS = 430;

function BoardImpl({ p, board, autoX, selected, highlight, marks, tokenStyle, coords, shade, paintMode, onTap, onPaintStart, onPaint, onPaintEnd, stamp }: Props) {
  const svg = useMemo(() => renderBoard(p, { coords, shade, shadow: true, idp: `bd-${p.id}` }), [p, coords, shade]);
  const { w: W, h: H, off } = boardSize(p, coords);
  const s = p.size;
  const overlay = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const press = useRef<{ cell: number; timer: number; long: boolean; painting: boolean; last: number; x: number; y: number } | null>(null);

  const cellAt = useCallback((x: number, y: number): number | null => {
    const el = overlay.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = Math.floor(((x - r.left) / r.width) * s);
    const rr = Math.floor(((y - r.top) / r.height) * s);
    if (c < 0 || rr < 0 || c >= s || rr >= s) return null;
    return rr * s + c;
  }, [s]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell === null) return;
    overlay.current?.setPointerCapture(e.pointerId);
    const timer = window.setTimeout(() => {
      if (press.current && !press.current.painting) {
        press.current.long = true;
        onTap(press.current.cell, true);
      }
    }, LONG_MS);
    press.current = { cell, timer, long: false, painting: false, last: cell, x: e.clientX, y: e.clientY };
    setCursor(cell);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const cell = cellAt(e.clientX, e.clientY);
    if (e.pointerType === 'mouse') setHover(cell);
    const pr = press.current;
    if (!pr || cell === null) return;
    if (cell !== pr.last) {
      window.clearTimeout(pr.timer);
      if (paintMode && !pr.long) {
        if (!pr.painting) {
          pr.painting = true;
          onPaintStart(pr.cell);
        }
        onPaint(cell);
      }
      pr.last = cell;
    }
  };

  const onPointerUp = () => {
    const pr = press.current;
    if (!pr) return;
    window.clearTimeout(pr.timer);
    if (pr.painting) onPaintEnd();
    else if (!pr.long) onTap(pr.cell, false);
    press.current = null;
  };

  const onPointerCancel = () => {
    const pr = press.current;
    if (pr) {
      window.clearTimeout(pr.timer);
      if (pr.painting) onPaintEnd();
    }
    press.current = null;
  };

  useEffect(() => () => { if (press.current) window.clearTimeout(press.current.timer); }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const cur = cursor ?? 0;
    const r = Math.floor(cur / s), c = cur % s;
    let next: number | null = null;
    if (e.key === 'ArrowUp') next = Math.max(0, r - 1) * s + c;
    if (e.key === 'ArrowDown') next = Math.min(s - 1, r + 1) * s + c;
    if (e.key === 'ArrowLeft') next = r * s + Math.max(0, c - 1);
    if (e.key === 'ArrowRight') next = r * s + Math.min(s - 1, c + 1);
    if (next !== null) {
      e.preventDefault();
      setCursor(next);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTap(cur, e.shiftKey);
    }
  };

  const hl = highlight;
  const persons = hl?.persons;
  const rooms = new Set([...(hl?.rooms ?? []), ...marks.hintRooms]);
  const rows = new Set([...(hl?.rows ?? []), ...marks.hintRows]);
  const cols = new Set([...(hl?.cols ?? []), ...marks.hintCols]);
  const hoverRoom = hover !== null ? p.cells[hover].room : null;

  const cells = [];
  for (let i = 0; i < s * s; i++) {
    const cell = p.cells[i];
    const placedId = board.placed[i];
    const ch = placedId ? p.cast.find((x) => x.id === placedId) : undefined;
    const notes = board.notes[i];
    const x = board.xs[i] ? 'm' : autoX.has(i) ? 'a' : null;
    const occ = !!board.occ?.[i];
    const cls = ['cell'];
    if (!cell.occupiable) cls.push('is-blocked');
    if (!ch && !occ && x === 'a') cls.push('is-autox');
    if (rooms.has(cell.room)) cls.push('hl-room');
    if (rows.has(cell.r) || cols.has(cell.c)) cls.push('hl-line');
    if (hl?.cells.has(i)) cls.push('hl-obj');
    if (marks.hintCells.has(i)) cls.push('hl-hint');
    if (marks.hintX.has(i)) cls.push('hl-hintx');
    if (cursor === i) cls.push('is-cursor');
    if (hoverRoom !== null && hoverRoom === cell.room) cls.push('is-hover-room');
    if (persons && notes?.some((n) => persons.has(n))) cls.push('hl-note');
    const label = `Fila ${cell.r + 1}, columna ${cell.c + 1}, ${p.rooms[cell.room].name}${cell.obj ? `, ${p.objects[cell.obj].name}` : ''}${cell.floor ? `, ${p.objects[cell.floor].name}` : ''}${ch ? `: ${displayName(ch)}` : ''}${!ch && occ ? ', ocupada por alguien' : ''}${x ? ', descartada' : ''}`;
    cells.push(
      <div key={i} className={cls.join(' ')} role="gridcell" aria-label={label}>
        {!ch && occ && <span className={`cell__occ${marks.wrongOcc.has(i) ? ' is-wrong' : ''}${marks.conflicts.has(i) ? ' is-conflict' : ''}`} aria-hidden="true" />}
        {!ch && !occ && x && <span className={`cell__x${x === 'a' ? ' cell__x--auto' : ''}${marks.wrongX.has(i) ? ' is-wrong' : ''}`} aria-hidden="true" />}
        {!ch && notes && notes.length > 0 && (
          <span className={`cell__notes n${Math.min(notes.length, 9)}`} aria-hidden="true">
            {notes.slice(0, 9).map((n) => {
              const nc = p.cast.find((c) => c.id === n);
              return <span key={n} className={`note${persons?.has(n) ? ' is-hl' : ''}${selected === n ? ' is-sel' : ''}`}>{nc?.tag ?? n}</span>;
            })}
          </span>
        )}
        {ch && (
          <span
            className={`token${ch.victim ? ' token--victim' : ''}${tokenStyle === 'letter' ? ' token--letter' : ''}${selected === ch.id ? ' is-selected' : ''}${marks.conflicts.has(i) ? ' is-conflict' : ''}${marks.wrong.has(i) ? ' is-wrong' : ''}${marks.reveal.has(i) ? ' is-reveal' : ''}${persons?.has(ch.id) ? ' is-hl' : ''}`}
            aria-hidden="true"
          >
            {tokenStyle === 'portrait' ? <Portrait p={p} ch={ch} className="token__img" /> : null}
            <span className="token__tag">{ch.tag}</span>
          </span>
        )}
      </div>,
    );
  }

  return (
    <div className="board" style={{ aspectRatio: `${W} / ${H}` }}>
      <div className="board__svg" dangerouslySetInnerHTML={{ __html: svg }} />
      <div
        ref={overlay}
        className={`board__grid${paintMode ? ` mode-${paintMode}` : ''}`}
        role="grid"
        aria-label="Escena del crimen"
        tabIndex={0}
        style={{
          left: `${(off / W) * 100}%`,
          top: `${(off / H) * 100}%`,
          width: `${((s * CELL) / W) * 100}%`,
          height: `${((s * CELL) / H) * 100}%`,
          gridTemplateColumns: `repeat(${s}, 1fr)`,
          gridTemplateRows: `repeat(${s}, 1fr)`,
          ['--cells' as string]: s,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKeyDown}
        onFocus={() => cursor === null && setCursor(0)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {cells}
      </div>
      {stamp && <div className="board__stamp" aria-live="polite"><span>{stamp}</span></div>}
    </div>
  );
}

export const Board = memo(BoardImpl);
