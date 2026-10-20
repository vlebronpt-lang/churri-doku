import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Puzzle } from '../../engine/types';
import { boardSize, CELL, renderBoard } from '../../render/board';
import type { BoardState } from '../../state/progress';
import { Portrait } from '../Portrait';
import type { Highlight } from './ClueText';
import { displayName } from '../../engine/text';
import { Icon } from '../Icon';
import { FloatingTip } from '../Tooltip';
import { occupancyText } from '../../render/legend';
import { DragGhost } from './drag';

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
  shade: boolean;
  /** Qué pasa al tocar la cabecera de una fila o columna (null: nada que hacer). */
  lineAction: 'note' | 'x' | 'occ' | 'erase' | null;
  selectedTag: string | null;
  onLine: (axis: 'r' | 'c', i: number) => void;
  /** Pinta (arrastre) en modo X/nota/borrar (la marca «ocupada» va casilla a casilla). */
  paintMode: 'x' | 'note' | 'erase' | null;
  onTap: (cell: number, long: boolean) => void;
  onPaintStart: (cell: number) => void;
  onPaint: (cell: number) => void;
  onPaintEnd: () => void;
  stamp?: string | null;
  /** Mover fichas arrastrándolas de una casilla a otra. */
  onMove?: (from: number, to: number) => void;
  /** Casilla sobre la que se está soltando a alguien desde fuera del plano. */
  dropCell?: number | null;
  /** Plano ampliado (móvil): un dedo desplaza el plano en vez de pintar. */
  zoomed?: boolean;
  /** Casilla → sospechosos con zona marcada que aún pueden estar en ella. */
  zoneNotes?: Map<number, string[]>;
  /** Zona marcada del sospechoso elegido (se resalta). */
  zoneRoom?: number | null;
  /** Herramienta «Zona»: al pasar por el plano se resalta la habitación entera. */
  zoneMode?: boolean;
}

const LONG_MS = 430;

function BoardImpl({ p, board, autoX, selected, highlight, marks, tokenStyle, shade, lineAction, selectedTag, onLine, paintMode, onTap, onPaintStart, onPaint, onPaintEnd, stamp, onMove, dropCell = null, zoomed = false, zoneNotes, zoneRoom = null, zoneMode = false }: Props) {
  const svg = useMemo(() => renderBoard(p, { shade, shadow: true, idp: `bd-${p.id}` }), [p, shade]);
  const { w: W, h: H, off } = boardSize(p, false);
  const s = p.size;
  const overlay = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [hoverLine, setHoverLine] = useState<{ axis: 'r' | 'c'; i: number } | null>(null);
  // Ficha informativa de la casilla (qué objeto hay y si se puede estar) al dejar el ratón quieto.
  const [infoCell, setInfoCell] = useState<number | null>(null);
  useEffect(() => {
    setInfoCell(null);
    if (hover === null) return;
    const t = window.setTimeout(() => setInfoCell(hover), 650);
    return () => window.clearTimeout(t);
  }, [hover]);
  const press = useRef<{ cell: number; timer: number; long: boolean; painting: boolean; last: number; x: number; y: number; token?: string; moving?: boolean } | null>(null);
  // Ficha que se está moviendo de casilla.
  const [moving, setMoving] = useState<{ id: string; from: number; x: number; y: number; cell: number | null; touch: boolean } | null>(null);
  const paint = zoomed ? null : paintMode;

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
    setInfoCell(null);
    const cell = cellAt(e.clientX, e.clientY);
    if (cell === null) return;
    overlay.current?.setPointerCapture(e.pointerId);
    const timer = window.setTimeout(() => {
      if (press.current && !press.current.painting && !press.current.moving) {
        press.current.long = true;
        onTap(press.current.cell, true);
      }
    }, LONG_MS);
    const token = onMove && !zoomed && paint !== 'x' && paint !== 'erase' ? board.placed[cell] : undefined;
    press.current = { cell, timer, long: false, painting: false, last: cell, x: e.clientX, y: e.clientY, token };
    setCursor(cell);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const cell = cellAt(e.clientX, e.clientY);
    if (e.pointerType === 'mouse') setHover(cell);
    const pr = press.current;
    // Arrastrar una ficha: sigue al puntero hasta que se suelta en otra casilla.
    if (pr?.token && (pr.moving || (cell !== pr.cell && Math.hypot(e.clientX - pr.x, e.clientY - pr.y) > 6))) {
      window.clearTimeout(pr.timer);
      pr.moving = true;
      setMoving({ id: pr.token, from: pr.cell, x: e.clientX, y: e.clientY, cell, touch: e.pointerType !== 'mouse' });
      return;
    }
    if (!pr || cell === null) return;
    if (cell !== pr.last) {
      window.clearTimeout(pr.timer);
      if (paint && !pr.long && !pr.token) {
        if (!pr.painting) {
          pr.painting = true;
          onPaintStart(pr.cell);
        }
        onPaint(cell);
      }
      pr.last = cell;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const pr = press.current;
    if (!pr) return;
    window.clearTimeout(pr.timer);
    if (pr.moving) {
      const to = cellAt(e.clientX, e.clientY);
      if (to !== null && to !== pr.cell) onMove?.(pr.cell, to);
      setMoving(null);
    } else if (pr.painting) onPaintEnd();
    else if (!pr.long) onTap(pr.cell, false);
    press.current = null;
  };

  const onPointerCancel = () => {
    const pr = press.current;
    if (pr) {
      window.clearTimeout(pr.timer);
      if (pr.painting) onPaintEnd();
    }
    setMoving(null);
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
  if (hoverLine) (hoverLine.axis === 'r' ? rows : cols).add(hoverLine.i);

  // Filas/columnas marcadas como «ocupadas»: se resaltan las casillas donde aún puede estar su persona.
  const lineOcc = new Map<number, boolean>();
  for (const key of Object.keys(board.lines ?? {})) {
    const axis = key[0], li = Number(key.slice(1));
    const line = Array.from({ length: s }, (_, k) => (axis === 'r' ? li * s + k : k * s + li));
    if (line.some((c) => board.placed[c] !== undefined || board.occ?.[c])) continue; // ya resuelta
    const poss = line.filter((c) => p.cells[c].occupiable && !board.xs[c] && !autoX.has(c));
    for (const c of poss) lineOcc.set(c, lineOcc.get(c) || poss.length === 1);
  }
  const hoverRoom = hover !== null ? p.cells[hover].room : null;

  const cells = [];
  for (let i = 0; i < s * s; i++) {
    const cell = p.cells[i];
    const placedId = board.placed[i];
    const ch = placedId ? p.cast.find((x) => x.id === placedId) : undefined;
    const manual = board.notes[i] ?? [];
    const zoned = (zoneNotes?.get(i) ?? []).filter((id) => !manual.includes(id));
    const notes = [...manual, ...zoned];
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
    if (zoneRoom !== null && zoneRoom === cell.room) cls.push('hl-zone');
    if (persons && notes?.some((n) => persons.has(n))) cls.push('hl-note');
    if (!ch && selected && notes?.includes(selected)) cls.push('hl-selnote');
    if (!ch && lineOcc.has(i)) cls.push(lineOcc.get(i) ? 'is-lineocc is-lineocc-one' : 'is-lineocc');
    const dropping = moving ? moving.cell : dropCell;
    if (dropping === i && (!moving || moving.from !== i)) cls.push(cell.occupiable ? 'is-drop' : 'is-drop is-drop-bad');
    if (moving?.from === i) cls.push('is-moving');
    const label = `Fila ${cell.r + 1}, columna ${cell.c + 1}, ${p.rooms[cell.room].name}${cell.obj ? `, ${p.objects[cell.obj].name}` : ''}${cell.floor ? `, ${p.objects[cell.floor].name}` : ''}${ch ? `: ${displayName(ch)}` : ''}${!ch && occ ? ', ocupada por alguien' : ''}${!ch && lineOcc.has(i) ? ', aquí puede estar la persona de su fila o columna' : ''}${x ? ', descartada' : ''}`;
    cells.push(
      <div key={i} className={cls.join(' ')} role="gridcell" aria-label={label}>
        {!ch && occ && <span className={`cell__occ${marks.wrongOcc.has(i) ? ' is-wrong' : ''}${marks.conflicts.has(i) ? ' is-conflict' : ''}`} aria-hidden="true" />}
        {!ch && !occ && x && <span className={`cell__x${x === 'a' ? ' cell__x--auto' : ''}${marks.wrongX.has(i) ? ' is-wrong' : ''}`} aria-hidden="true" />}
        {!ch && notes.length > 0 && (
          <span className={`cell__notes n${Math.min(notes.length, 9)}`} aria-hidden="true">
            {notes.slice(0, 9).map((n) => {
              const nc = p.cast.find((c) => c.id === n);
              return <span key={n} className={`note${zoned.includes(n) ? ' note--zone' : ''}${persons?.has(n) ? ' is-hl' : ''}${selected === n ? ' is-sel' : ''}`}>{nc?.tag ?? n}</span>;
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

  const where = (axis: 'r' | 'c', i: number) => (axis === 'r' ? `la fila ${i + 1}` : `la columna ${i + 1}`);
  const lineTitle = (axis: 'r' | 'c', i: number) => {
    switch (lineAction) {
      case 'note': return `Anotar a ${selectedTag} en toda ${where(axis, i)}`;
      case 'x': return `Tachar toda ${where(axis, i)}`;
      case 'occ': return board.lines?.[`${axis}${i}`] ? `Quitar la marca de ${where(axis, i)}` : `Marcar ${where(axis, i)}: su persona está en una de sus casillas libres`;
      case 'erase': return `Borrar en toda ${where(axis, i)}`;
      default: return `${axis === 'r' ? 'Fila' : 'Columna'} ${i + 1}: elige un sospechoso, Tachar, Ocupada o Borrar para usarla entera`;
    }
  };
  const handles = (axis: 'r' | 'c') => Array.from({ length: s }, (_, i) => {
    const key = `${axis}${i}`;
    const marked = !!board.lines?.[key];
    const hinted = axis === 'r' ? marks.hintRows.has(i) : marks.hintCols.has(i);
    const t = lineTitle(axis, i);
    return (
      <button
        key={key}
        type="button"
        className={`line-handle${marked ? ' is-marked' : ''}${hinted ? ' is-hint' : ''}`}
        onClick={() => onLine(axis, i)}
        onMouseEnter={() => setHoverLine({ axis, i })}
        onMouseLeave={() => setHoverLine(null)}
        onFocus={() => setHoverLine({ axis, i })}
        onBlur={() => setHoverLine(null)}
        title={t}
        aria-label={t}
      >
        {marked && <Icon name="occupied" size={13} sw={2.6} />}
        <span>{axis === 'r' ? `F${i + 1}` : `C${i + 1}`}</span>
      </button>
    );
  });

  // Ficha de la casilla bajo el ratón
  let info: React.ReactNode = null;
  if (infoCell !== null && overlay.current && !press.current) {
    const r0 = overlay.current.getBoundingClientRect();
    const c = p.cells[infoCell];
    const cw = r0.width / s, chh = r0.height / s;
    const rect = new DOMRect(r0.left + c.c * cw, r0.top + c.r * chh, cw, chh);
    const obj = c.obj ? p.objects[c.obj] : null;
    const floor = c.floor ? p.objects[c.floor] : null;
    const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
    const what = obj
      ? `${cap(obj.name)}${floor && obj.occupiable ? ` (sobre ${floor.name})` : ''}: ${occupancyText(obj)}`
      : floor ? `${cap(floor.name)}: ${occupancyText(floor)}` : 'Suelo libre: se puede estar';
    info = (
      <FloatingTip anchor={rect} maxWidth={250}>
        <strong>{p.rooms[c.room].name}</strong> · F{c.r + 1}·C{c.c + 1}<br />{what}
      </FloatingTip>
    );
  }

  return (
    <div className={`board-frame${lineAction ? ' has-line-action' : ''}`}>
      <div className="board-frame__top">
        <div className="line-handles line-handles--cols" style={{ left: `${(off / W) * 100}%`, width: `${((s * CELL) / W) * 100}%`, gridTemplateColumns: `repeat(${s}, minmax(0, 1fr))` }}>
          {handles('c')}
        </div>
      </div>
      <div className="board-frame__left">
        <div className="line-handles line-handles--rows" style={{ top: `${(off / H) * 100}%`, height: `${((s * CELL) / H) * 100}%`, gridTemplateRows: `repeat(${s}, minmax(0, 1fr))` }}>
          {handles('r')}
        </div>
      </div>
    <div className="board" style={{ aspectRatio: `${W} / ${H}` }}>
      <div className="board__svg" dangerouslySetInnerHTML={{ __html: svg }} />
      <div
        ref={overlay}
        className={`board__grid${paint ? ` mode-${paint}` : ''}${zoneMode ? ' mode-zone' : ''}${zoomed ? ' is-zoomed' : ''}`}
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
      {info}
      {moving && (() => {
        const ch = p.cast.find((c) => c.id === moving.id);
        return ch ? <DragGhost p={p} ch={ch} x={moving.x} y={moving.y} touch={moving.touch} ok={moving.cell !== null && p.cells[moving.cell].occupiable} /> : null;
      })()}
    </div>
  );
}

export const Board = memo(BoardImpl);
