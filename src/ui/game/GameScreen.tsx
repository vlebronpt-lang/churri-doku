import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Puzzle } from '../../engine/types';
import { displayName, roomPhrase, withPrep } from '../../engine/text';
import { useSettings } from '../../state/settings';
import { getProgress, getStore, resetCase, updateProgress, useCaseProgress } from '../../state/progress';
import { streakInfo } from '../../state/streak';
import { LessonDone } from '../academy/LessonDone';
import { formatTime, useGame } from '../../game/useGame';
import { computeHint, findErrors, type HintResult } from '../../game/hints';
import { configureFx, sfx } from '../../game/sfx';
import { levelInfo, nextPuzzle } from '../../data/puzzles';
import { Board, noMarks, type BoardMarks } from './Board';
import { SuspectCard, ZoneLine } from './SuspectCard';
import { ClueText, type Highlight } from './ClueText';
import { Icon } from '../Icon';
import { Portrait } from '../Portrait';
import { HintPanel } from './HintPanel';
import { EraseDialog, erasableItems } from './EraseDialog';
import { ObjectsModal } from './ObjectLegend';
import { FeedbackDialog } from './FeedbackDialog';
import { clueText } from '../../engine/text';
import { AccuseModal, IntroModal, ResultModal } from './CaseModals';
import { navigate } from '../../router';
import { decodeChallenge } from '../../share';
import { caseRoute, caseTag } from '../../data/labels';
import { ChallengeDialog } from '../ShareDialogs';
import { DragGhost, useSuspectDrag } from './drag';

type Tool = 'place' | 'note' | 'x' | 'occ' | 'zone' | 'erase';
/** Tamaños del panel de sospechosos, de más grande a más compacto: se usa el mayor que quepa sin desplazarse. */
type Density = 'lg' | 'c2' | 'c1' | 'c2xs' | 'c1xs' | 'c2xxs';
const DENSITIES: Density[] = ['lg', 'c2', 'c1', 'c2xs', 'c1xs', 'c2xxs'];
const suspectsClass = (d: Density) => `suspects d-${d}${d === 'lg' ? '' : ' is-compact'}`;
type Outcome = { kind: 'wrong'; count: number } | { kind: 'wrongAccuse'; name: string } | null;

/** Acciones del jugador que el tutorial guiado puede permitir, bloquear y seguir. */
export type CoachEvent =
  | { t: 'intro' }
  | { t: 'select'; id: string }
  | { t: 'tool'; tool: Tool }
  | { t: 'place'; id: string; cell: number }
  | { t: 'note'; id: string; cell: number }
  | { t: 'x'; cell: number }
  | { t: 'occ'; cell: number }
  | { t: 'zone'; id: string; room: number }
  | { t: 'hint' }
  | { t: 'accuse'; id: string }
  | { t: 'solved' };
export interface Coach {
  /** true para dejar hacerlo; un texto para impedirlo y explicar por qué. */
  allow: (e: CoachEvent) => true | string;
  notify: (e: CoachEvent) => void;
}
export type { Tool };

export function GameScreen({ p, reto, onHelp, onSettings, coach, onFinished }: {
  p: Puzzle;
  reto?: string | null;
  onHelp: () => void;
  onSettings: () => void;
  /** Tutorial guiado: controla qué se puede hacer en cada paso. */
  coach?: Coach;
  /** Si se indica, sustituye a la pantalla final (lo usa el tutorial). */
  onFinished?: () => void;
}) {
  const { settings } = useSettings();
  const progress = useCaseProgress(p.id);
  // En el tutorial, las X automáticas y «tocar = colocar» siempre activos, para que lo que se explica sea lo que se ve.
  const game = useGame(p, { autoX: coach ? true : settings.autoX, noXOnBlocked: settings.noXOnBlocked });
  const tapAction = coach ? 'place' : settings.tapAction;
  const { board, posOf } = game;
  const [selected, setSelected] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('place');
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [marks, setMarks] = useState<BoardMarks>(noMarks);
  /** Sospechosos con la zona mal marcada (tras «Revisar»). */
  const [wrongZones, setWrongZones] = useState<Set<string>>(() => new Set());
  const [hint, setHint] = useState<{ res: HintResult; level: number } | null>(null);
  const incoming = useMemo(() => (reto ? decodeChallenge(reto) : null), [reto]);
  const [showIntro, setShowIntro] = useState(() => !getProgress(p.id).board || !!incoming);
  const [accusing, setAccusing] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [stamp, setStamp] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [challengeFrom, setChallengeFrom] = useState<'result' | 'banner' | null>(null);
  const [eraseTarget, setEraseTarget] = useState<{ cells: number[]; lineKey?: string; where: string } | null>(null);
  const [showObjects, setShowObjects] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState<{ charId?: string; who: string; text: string } | null>(null);
  const [zoom, setZoom] = useState(false);
  const boardWrap = useRef<HTMLDivElement>(null);
  const paint = useRef<{ value: boolean } | null>(null);
  const suspectsPanel = useRef<HTMLElement>(null);
  const suspectsList = useRef<HTMLDivElement>(null);
  const [density, setDensity] = useState<Density>('lg');
  const toastTimer = useRef<number>(0);
  const solved = progress.solved;
  const challenge = incoming ?? progress.challenge;
  const guard = (e: CoachEvent) => {
    if (!coach) return true;
    const r = coach.allow(e);
    if (r === true) return true;
    say(r);
    sfx.error();
    return false;
  };
  const tell = (e: CoachEvent) => coach?.notify(e);

  // Registro de visitas (para el informe de juego).
  useEffect(() => { updateProgress(p.id, (c) => ({ visits: (c.visits ?? 0) + 1 })); }, [p.id]);

  // Reto recibido por enlace: se guarda y se limpia la dirección.
  useEffect(() => {
    if (!reto) return;
    if (incoming) updateProgress(p.id, { challenge: incoming });
    history.replaceState(null, '', `${location.pathname}${location.search}#${caseRoute(p)}`);
  }, [reto, incoming, p]);

  useEffect(() => configureFx(settings.sound, settings.haptics), [settings.sound, settings.haptics]);

  // Que se vean todos los sospechosos a la vez: se prueba cada tamaño y se queda el mayor que cabe.
  const fitSuspects = useCallback(() => {
    const panel = suspectsPanel.current, list = suspectsList.current;
    if (!panel || !list) return;
    if (!window.matchMedia('(min-width: 761px)').matches) { setDensity('lg'); return; }
    const before = list.className;
    let best: Density = DENSITIES[DENSITIES.length - 1];
    let bestH = Infinity;
    for (const d of DENSITIES) {
      list.className = suspectsClass(d);
      if (panel.scrollHeight <= panel.clientHeight + 1) { best = d; break; }
      if (panel.scrollHeight < bestH) { bestH = panel.scrollHeight; best = d; }
    }
    list.className = before;
    setDensity(best);
  }, []);
  useLayoutEffect(fitSuspects, [fitSuspects, p.id, settings.simpleDirections, settings.clueSize, settings.genderSymbols]);
  useEffect(() => {
    let t = 0;
    const later = () => { window.clearTimeout(t); t = window.setTimeout(fitSuspects, 100); };
    window.addEventListener('resize', later);
    document.fonts?.ready.then(later).catch(() => {});
    return () => { window.removeEventListener('resize', later); window.clearTimeout(t); };
  }, [fitSuspects]);
  useEffect(() => game.setRunning(!solved && !showIntro && !revealing), [solved, showIntro, revealing, game]);

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const clearTransient = () => {
    setMarks((m) => (m.wrong.size || m.wrongX.size || m.wrongOcc.size || m.hintCells.size || m.hintX.size || m.hintRooms.size || m.hintRows.size || m.hintCols.size ? { ...noMarks(), reveal: m.reveal } : m));
    setWrongZones((z) => (z.size ? new Set() : z));
  };

  // Conflictos de fila/columna (regla objetiva, no revela la solución): personas colocadas y casillas «ocupadas».
  const conflicts = useMemo(() => {
    const out = new Set<number>();
    if (!settings.conflictWarnings) return out;
    const cells = [...new Set([...Object.keys(board.placed), ...Object.keys(board.occ ?? {})].map(Number))];
    for (const a of cells) for (const b of cells) {
      if (a === b) continue;
      if (Math.floor(a / p.size) === Math.floor(b / p.size) || a % p.size === b % p.size) out.add(a);
    }
    return out;
  }, [board.placed, board.occ, p.size, settings.conflictWarnings]);

  const allMarks = useMemo<BoardMarks>(() => ({ ...marks, conflicts }), [marks, conflicts]);

  // Zonas: en cada casilla que aún es posible dentro de la zona marcada sale la letra del sospechoso.
  const roomCells = useMemo(() => p.rooms.map((r) => p.cells.filter((c) => c.room === r.id).map((c) => c.i)), [p]);
  const zoneInfo = useMemo(() => {
    const notes = new Map<number, string[]>();
    const left: Record<string, number> = {};
    for (const [id, room] of Object.entries(board.zones ?? {})) {
      if (posOf[id] !== undefined || !roomCells[room]) continue;
      left[id] = 0;
      for (const cell of roomCells[room]) {
        if (!p.cells[cell].occupiable || board.placed[cell] !== undefined || board.xs[cell] || game.autoX.has(cell)) continue;
        left[id]++;
        notes.set(cell, [...(notes.get(cell) ?? []), id]);
      }
    }
    return { notes, left };
  }, [board, posOf, game.autoX, p, roomCells]);
  const zoneOf = (id: string) => {
    const room = board.zones?.[id];
    if (room === undefined || posOf[id] !== undefined) return undefined;
    return { label: p.rooms[room].name, left: zoneInfo.left[id] ?? 0, wrong: wrongZones.has(id), room };
  };

  const selectChar = (id: string | null) => {
    if (id && selected !== id && !guard({ t: 'select', id })) return;
    if (coach && id === selected) return;
    setSelected((cur) => (cur === id ? null : id));
    if (tool === 'x' || tool === 'occ' || tool === 'erase') setTool('place');
    sfx.select();
    if (id && selected !== id) tell({ t: 'select', id });
  };
  const pickTool = (tl: Tool) => {
    const next = tool === tl ? 'place' : tl;
    if (!guard({ t: 'tool', tool: next })) return;
    setTool(next);
    tell({ t: 'tool', tool: next });
  };

  const onTap = useCallback((cell: number, long: boolean) => {
    if (solved || revealing) return;
    clearTransient();
    const occupant = board.placed[cell];
    if (tool === 'x') {
      if (occupant) return;
      if (settings.noXOnBlocked && !p.cells[cell].occupiable) return say('Esa casilla tiene un objeto: ahí no puede haber nadie.');
      if (!guard({ t: 'x', cell })) return;
      game.toggleX(cell);
      sfx.x();
      tell({ t: 'x', cell });
      return;
    }
    if (tool === 'occ') {
      if (occupant) return say('Ahí ya has colocado a alguien.');
      if (!p.cells[cell].occupiable) return say('Esa casilla tiene un objeto: ahí no puede haber nadie.');
      if (!guard({ t: 'occ', cell })) return;
      game.toggleOcc(cell);
      sfx.note();
      tell({ t: 'occ', cell });
      return;
    }
    if (tool === 'zone') {
      if (!selected) return say('Elige primero a un sospechoso y luego toca cualquier casilla de su zona.');
      const ch = p.cast.find((c) => c.id === selected)!;
      const room = p.cells[cell].room;
      if (!guard({ t: 'zone', id: selected, room })) return;
      const removing = board.zones?.[selected] === room;
      game.toggleZone(selected, room);
      sfx.note();
      say(removing ? `Quitada la zona ${withPrep('de', ch)}.` : `${displayName(ch)} está ${roomPhrase(p.rooms[room], 'en')}: sus casillas posibles llevan su letra.`);
      tell({ t: 'zone', id: selected, room });
      return;
    }
    if (tool === 'erase') {
      // Si hay varias cosas (personas o marcas), se pregunta qué borrar.
      const items = erasableItems(board, [cell]);
      if (items.length > 1) {
        const c = p.cells[cell];
        setEraseTarget({ cells: [cell], where: `Fila ${c.r + 1}, columna ${c.c + 1} · ${p.rooms[c.room].name}` });
        return;
      }
      if (items.length === 1) { game.clearCell(cell); sfx.erase(); }
      return;
    }
    const wantNote = tool === 'note' ? !long : (tapAction === 'note' ? !long : long);
    if (!selected) {
      if (occupant) {
        if (!guard({ t: 'select', id: occupant })) return;
        setSelected(occupant);
        sfx.select();
        tell({ t: 'select', id: occupant });
        return;
      }
      return say('Primero elige a un sospechoso (toca su foto).');
    }
    if (!p.cells[cell].occupiable) return say(`Ahí hay ${p.cells[cell].obj ? `un objeto (${p.objects[p.cells[cell].obj!].name})` : 'un obstáculo'}: no se puede ocupar.`);
    if (wantNote) {
      if (occupant) return;
      if (!guard({ t: 'note', id: selected, cell })) return;
      game.toggleNote(cell, selected);
      sfx.note();
      tell({ t: 'note', id: selected, cell });
      return;
    }
    if (occupant === selected) {
      if (coach) return;
      game.unplace(selected);
      sfx.undo();
      return;
    }
    if (!guard({ t: 'place', id: selected, cell })) return;
    placeAt(selected, cell);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, game, p, say, selected, settings.noXOnBlocked, tapAction, solved, revealing, tool, coach]);

  /** Coloca a alguien (también al arrastrarlo) y apunta el primer movimiento para el informe. */
  const placeAt = (id: string, cell: number) => {
    game.place(id, cell);
    sfx.place();
    if (getProgress(p.id).firstMoveAt === undefined) updateProgress(p.id, { firstMoveAt: game.seconds });
    tell({ t: 'place', id, cell });
  };

  // Arrastrar a alguien desde su foto hasta una casilla.
  const dropOn = (id: string, cell: number) => {
    if (solved || revealing) return;
    clearTransient();
    if (!p.cells[cell].occupiable) { sfx.error(); return say(`Ahí hay ${p.cells[cell].obj ? `un objeto (${p.objects[p.cells[cell].obj!].name})` : 'un obstáculo'}: no se puede ocupar.`); }
    if (board.placed[cell] === id) return;
    if (!guard({ t: 'place', id, cell })) return;
    setSelected(id);
    if (tool !== 'place' && tool !== 'note') setTool('place');
    placeAt(id, cell);
  };
  const { drag, start: startDrag, justDropped } = useSuspectDrag(dropOn, !solved && !revealing);
  useEffect(() => {
    document.body.classList.toggle('is-dragging', !!drag);
    return () => document.body.classList.remove('is-dragging');
  }, [drag]);
  const dragChar = drag ? p.cast.find((c) => c.id === drag.id) : undefined;

  // Mover una ficha arrastrándola por el plano (si cae sobre otra, se intercambian).
  const moveToken = (from: number, to: number) => {
    const id = board.placed[from];
    if (!id || solved || revealing) return;
    clearTransient();
    if (!p.cells[to].occupiable) { sfx.error(); return say('Ahí hay un objeto: no se puede ocupar.'); }
    const other = board.placed[to];
    game.apply((b) => {
      delete b.placed[from];
      if (other) b.placed[from] = other;
      b.placed[to] = id;
      delete b.xs[to];
      if (other) delete b.xs[from];
    });
    sfx.place();
  };

  // El zoom solo existe en pantallas estrechas: si la pantalla crece (o se gira), se quita.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const off = () => { if (!mq.matches) setZoom(false); };
    mq.addEventListener?.('change', off);
    return () => mq.removeEventListener?.('change', off);
  }, []);

  // Plano ampliado (móvil, planos grandes): se centra en cuanto se aplica el cambio de tamaño.
  const toggleZoom = () => setZoom((z) => !z);
  useLayoutEffect(() => {
    const w = boardWrap.current;
    if (w) w.scrollLeft = zoom ? (w.scrollWidth - w.clientWidth) / 2 : 0;
  }, [zoom]);

  // Toque en la cabecera de una fila o columna: la herramienta se aplica a toda la línea.
  const lineCells = (axis: 'r' | 'c', i: number) => Array.from({ length: p.size }, (_, k) => (axis === 'r' ? i * p.size + k : k * p.size + i));
  const onLine = (axis: 'r' | 'c', i: number) => {
    if (solved || revealing) return;
    clearTransient();
    const cells = lineCells(axis, i);
    const key = `${axis}${i}`;
    const label = axis === 'r' ? `la fila ${i + 1}` : `la columna ${i + 1}`;
    const occ = board.occ ?? {};
    // Casillas donde todavía podría estar alguien.
    const open = (c: number) => p.cells[c].occupiable && board.placed[c] === undefined && !board.xs[c] && !game.autoX.has(c);
    if (tool === 'erase') {
      if (!erasableItems(board, cells, key).length) return say(`En ${label} no hay nada que borrar.`);
      setEraseTarget({ cells, lineKey: key, where: axis === 'r' ? `Toda la fila ${i + 1}` : `Toda la columna ${i + 1}` });
      return;
    }
    if (tool === 'x') {
      const targets = cells.filter((c) => board.placed[c] === undefined && !occ[c] && !game.autoX.has(c) && (!settings.noXOnBlocked || p.cells[c].occupiable));
      if (!targets.length) return say(`En ${label} no queda nada por tachar.`);
      const allOn = targets.every((c) => board.xs[c]);
      game.apply((b) => {
        for (const c of targets) {
          if (allOn) delete b.xs[c];
          else b.xs[c] = 'm';
        }
      });
      sfx.x();
      return;
    }
    if (tool === 'occ') {
      if (board.lines?.[key]) { game.toggleLine(key, false); sfx.undo(); return; }
      if (cells.some((c) => board.placed[c] !== undefined || occ[c])) return say(`En ${label} ya sabes dónde está su persona.`);
      const poss = cells.filter(open);
      if (!poss.length) return say(`En ${label} no queda ninguna casilla posible: repasa tus X.`);
      if (poss.length === 1) {
        game.toggleOcc(poss[0], true);
        sfx.note();
        return say(`Solo quedaba una casilla posible en ${label}: la he marcado como ocupada.`);
      }
      game.toggleLine(key, true);
      sfx.note();
      return;
    }
    // Lápiz (o colocar) con un sospechoso elegido: se anota en todas las casillas libres de la línea.
    if (!selected) return say(`Elige primero a un sospechoso para anotarlo en toda ${label}.`);
    const targets = cells.filter(open);
    if (!targets.length) return say(`En ${label} no queda ninguna casilla libre.`);
    const allOn = targets.every((c) => board.notes[c]?.includes(selected));
    game.apply((b) => {
      for (const c of targets) {
        const list = b.notes[c] ?? [];
        if (allOn) {
          const nl = list.filter((x) => x !== selected);
          if (nl.length) b.notes[c] = nl;
          else delete b.notes[c];
        } else if (!list.includes(selected)) b.notes[c] = [...list, selected];
      }
    });
    sfx.note();
  };
  const lineAction: 'note' | 'x' | 'occ' | 'erase' | null = solved || revealing || coach || tool === 'zone' ? null
    : tool === 'x' ? 'x' : tool === 'occ' ? 'occ' : tool === 'erase' ? 'erase' : selected ? 'note' : null;

  const paintMode: 'x' | 'note' | 'erase' | null = solved || tool === 'occ' || tool === 'zone' || coach ? null : tool === 'x' ? 'x' : tool === 'erase' ? 'erase' : selected ? 'note' : null;

  const onPaintStart = (cell: number) => {
    game.beginBatch();
    if (paintMode === 'x') paint.current = { value: !board.xs[cell] };
    else if (paintMode === 'note' && selected) paint.current = { value: !(board.notes[cell] ?? []).includes(selected) };
    else paint.current = { value: true };
    onPaint(cell);
  };
  const onPaint = (cell: number) => {
    const v = paint.current?.value ?? true;
    if (paintMode === 'x') { if (!board.placed[cell]) game.toggleX(cell, v); }
    else if (paintMode === 'note' && selected) { if (!board.placed[cell]) game.toggleNote(cell, selected, v); }
    else if (paintMode === 'erase') game.clearCell(cell);
  };
  const onPaintEnd = () => {
    game.endBatch();
    paint.current = null;
  };

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showIntro || accusing || showResult || challengeFrom || eraseTarget || showObjects || feedbackFor) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && (k === 'z' || k === 'y')) {
        e.preventDefault();
        if (coach) return;
        if (k === 'y' || e.shiftKey) game.redo(); else game.undo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (k === 'escape') { if (!coach) setSelected(null); setHint(null); clearTransient(); return; }
      if (k === 'x') { pickTool('x'); return; }
      if (k === 'o') { pickTool('occ'); return; }
      if (k === 'n' || k === 'l') { pickTool('note'); return; }
      if (k === 'b') { pickTool('erase'); return; }
      if (k === 'backspace' || k === 'delete') return;
      if (k === 'h' || k === '?') { askHint(); return; }
      const byTag = p.cast.find((c) => c.tag.toLowerCase() === k) ?? p.cast.find((c) => c.tag[0].toLowerCase() === k);
      if (byTag && k.length === 1 && /[a-zñ]/.test(k)) { selectChar(byTag.id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ------------------------------------------------------------- pistas
  const askHint = () => {
    if (solved) return;
    if (!guard({ t: 'hint' })) return;
    const res = computeHint(p, board);
    sfx.hint();
    setHint({ res, level: 1 });
    applyHintMarks(res, 1);
    if (res.kind === 'step' || res.kind === 'errors' || res.kind === 'reveal') {
      const entry = { t: game.seconds, tech: res.kind === 'step' ? res.d.tech : res.kind === 'reveal' ? 'revelar' : 'errores', placed: Object.keys(board.placed).length };
      updateProgress(p.id, (c) => ({ hints: c.hints + 1, hintLog: [...(c.hintLog ?? []), entry].slice(-60) }));
    }
    tell({ t: 'hint' });
  };

  const applyHintMarks = (res: HintResult, level: number) => {
    const m = noMarks();
    if (res.kind === 'errors') {
      if (level >= 2) {
        res.wrongPlaced.forEach((c) => m.wrong.add(c));
        res.wrongX.forEach((c) => m.wrongX.add(c));
        res.wrongOcc.forEach((c) => m.wrongOcc.add(c));
      }
    } else if (res.kind === 'reveal') {
      m.hintCells.add(res.cell);
    } else if (res.kind === 'step') {
      const f = res.d.focus;
      f.rows.forEach((r) => m.hintRows.add(r));
      f.cols.forEach((c) => m.hintCols.add(c));
      f.rooms.forEach((r) => m.hintRooms.add(r));
      if (level >= 2) {
        f.cells.forEach((c) => m.hintCells.add(c));
        res.xCells.forEach((c) => m.hintX.add(c));
      }
    }
    setMarks(m);
    if (res.kind === 'step' && res.d.focus.chars.length) {
      setHighlight({ cells: new Set(), rows: new Set(), cols: new Set(), rooms: new Set(), persons: new Set(res.d.focus.chars) });
    }
  };

  const hintLevelUp = () => {
    if (!hint) return;
    const level = hint.level + 1;
    setHint({ ...hint, level });
    applyHintMarks(hint.res, level);
    updateProgress(p.id, (c) => ({ hints: c.hints + 1 }));
  };

  const hintApply = () => {
    if (!hint) return;
    const res = hint.res;
    if (res.kind === 'errors') {
      game.apply((b) => {
        res.wrongPlaced.forEach((c) => delete b.placed[c]);
        res.wrongX.forEach((c) => delete b.xs[c]);
        res.wrongOcc.forEach((c) => delete b.occ?.[c]);
      });
      say('He quitado los errores. ¡Sigue así!');
    } else if (res.kind === 'step') {
      game.apply((b) => {
        res.xCells.forEach((c) => { if (b.placed[c] === undefined) b.xs[c] = 'm'; });
        const target = res.d.place ? { id: p.cast[res.d.place.k].id, cell: res.d.place.i } : res.leadsTo;
        if (target) {
          for (const [k, v] of Object.entries(b.placed)) if (v === target.id) delete b.placed[Number(k)];
          b.placed[target.cell] = target.id;
          delete b.xs[target.cell];
        }
      });
      sfx.place();
      updateProgress(p.id, (c) => ({ hints: c.hints + 1 }));
    } else if (res.kind === 'reveal') {
      game.apply((b) => {
        for (const [k, v] of Object.entries(b.placed)) if (v === res.id) delete b.placed[Number(k)];
        b.placed[res.cell] = res.id;
        delete b.xs[res.cell];
      });
      sfx.place();
    }
    setHint(null);
    setMarks(noMarks());
    setHighlight(null);
  };

  const closeHint = () => {
    setHint(null);
    setMarks(noMarks());
    setHighlight(null);
  };

  // ------------------------------------------------------------- revisar
  const check = () => {
    const { wrongPlaced, wrongX, wrongOcc, wrongZones: badZones } = findErrors(p, board);
    updateProgress(p.id, (c) => ({ checks: c.checks + 1 }));
    const m = noMarks();
    wrongPlaced.forEach((c) => m.wrong.add(c));
    wrongX.forEach((c) => m.wrongX.add(c));
    wrongOcc.forEach((c) => m.wrongOcc.add(c));
    setMarks(m);
    setWrongZones(new Set(badZones));
    const n = wrongPlaced.length + wrongX.length + wrongOcc.length + badZones.length;
    if (n === 0) {
      const any = Object.keys(board.placed).length + Object.keys(board.xs).length + Object.keys(board.occ ?? {}).length + Object.keys(board.zones ?? {}).length;
      say(any ? 'Todo correcto por ahora.' : 'Aún no hay nada que revisar.');
    } else {
      sfx.error();
      say(`${n === 1 ? 'Hay 1 error' : `Hay ${n} errores`} (marcados en rojo).`);
    }
  };

  // ------------------------------------------------------------- acusación
  const accuse = (id: string) => {
    if (!guard({ t: 'accuse', id })) return;
    tell({ t: 'accuse', id });
    setAccusing(false);
    const { wrongPlaced } = findErrors(p, board);
    if (wrongPlaced.length) {
      sfx.error();
      updateProgress(p.id, (c) => ({ mistakes: c.mistakes + 1 }));
      setOutcome({ kind: 'wrong', count: wrongPlaced.length });
      return;
    }
    if (id !== p.murderer) {
      sfx.error();
      updateProgress(p.id, (c) => ({ mistakes: c.mistakes + 1 }));
      setOutcome({ kind: 'wrongAccuse', name: withPrep('', p.cast.find((c) => c.id === id)!) });
      return;
    }
    // ¡Resuelto!
    setRevealing(true);
    setSelected(null);
    const order = p.cast.map((c) => p.solution[c.id]);
    order.forEach((cell, k) => {
      window.setTimeout(() => {
        setMarks((m) => ({ ...m, reveal: new Set([...m.reveal, cell]) }));
        sfx.ring(k);
      }, 180 * k + 100);
    });
    const t = 180 * order.length + 350;
    window.setTimeout(() => { setStamp('Caso cerrado'); sfx.stamp(); }, t);
    window.setTimeout(() => {
      const cur = getProgress(p.id);
      const stars = cur.hints === 0 && cur.mistakes === 0 && cur.checks === 0 ? 3 : cur.hints <= 2 && cur.mistakes <= 1 ? 2 : 1;
      updateProgress(p.id, {
        solved: true, solvedAt: Date.now(), firstSolvedAt: cur.firstSolvedAt ?? Date.now(), time: game.seconds,
        bestTime: cur.bestTime ? Math.min(cur.bestTime, game.seconds) : game.seconds,
        stars: Math.max(stars, cur.stars ?? 0),
      });
      sfx.win();
      setRevealing(false);
      tell({ t: 'solved' });
      if (onFinished) onFinished();
      else setShowResult(true);
    }, t + 1100);
  };

  const replay = () => {
    resetCase(p.id);
    game.clearAll();
    setStamp(null);
    setMarks(noMarks());
    setShowResult(false);
  };

  const lvl = levelInfo(p.level);
  const victim = p.cast.find((c) => c.victim)!;
  const selChar = selected ? p.cast.find((c) => c.id === selected) : null;
  const placedCount = Object.keys(posOf).length;
  const next = nextPuzzle(p.id);

  const tools = (
    <div className="tools" role="toolbar" aria-label="Herramientas">
      <button className={`tool tool--note${tool === 'note' ? ' is-on' : ''}`} onClick={() => pickTool('note')} aria-pressed={tool === 'note'} title="Lápiz: anotar posibilidades (N)">
        <Icon name="pencil" /><span>Lápiz</span>
      </button>
      <button className={`tool tool--x${tool === 'x' ? ' is-on' : ''}`} onClick={() => pickTool('x')} aria-pressed={tool === 'x'} title="Tachar casillas donde no hay nadie (X)">
        <Icon name="x" sw={3} /><span>Tachar</span>
      </button>
      <button className={`tool tool--occ${tool === 'occ' ? ' is-on' : ''}`} onClick={() => pickTool('occ')} aria-pressed={tool === 'occ'} title="Marcar que en una casilla hay alguien, aunque aún no sepas quién (O)">
        <Icon name="occupied" sw={2.4} /><span>Ocupada</span>
      </button>
      <button className={`tool tool--zone${tool === 'zone' ? ' is-on' : ''}`} onClick={() => pickTool('zone')} aria-pressed={tool === 'zone'} title="Zona: elige a un sospechoso y toca cualquier casilla de la habitación donde sabes que está">
        <Icon name="pin" /><span>Zona</span>
      </button>
      <button className={`tool tool--erase${tool === 'erase' ? ' is-on' : ''}`} onClick={() => pickTool('erase')} aria-pressed={tool === 'erase'} title="Borrar casilla (B)">
        <Icon name="eraser" /><span>Borrar</span>
      </button>
      <button className="tool tool--undo" onClick={() => { game.undo(); sfx.undo(); }} disabled={!game.canUndo || solved || !!coach} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
        <Icon name="undo" /><span>Deshacer</span>
      </button>
      <button className="tool tool--redo" onClick={() => { game.redo(); sfx.undo(); }} disabled={!game.canRedo || solved || !!coach} title="Rehacer (Ctrl+Shift+Z)">
        <Icon name="redo" /><span>Rehacer</span>
      </button>
      <button className="tool tool--check" onClick={check} disabled={solved || !placedCount && !Object.keys(board.xs).length && !Object.keys(board.occ ?? {}).length && !Object.keys(board.zones ?? {}).length} title="Revisar si hay errores">
        <Icon name="check" /><span>Revisar</span>
      </button>
      <button className="tool tool--hint" onClick={askHint} disabled={solved} title="Pista (H)">
        <Icon name="bulb" /><span>Pista</span>
      </button>
      <button className="tool tool--accuse" onClick={() => setAccusing(true)} disabled={!game.allPlaced || solved || revealing} title={game.allPlaced ? 'Acusar al culpable' : 'Coloca a todos para acusar'}>
        <Icon name="gavel" /><span>{game.allPlaced ? 'Acusar' : `${placedCount}/${p.cast.length}`}</span>
      </button>
    </div>
  );

  return (
    <div className={`game${solved ? ' is-solved' : ''}`} style={{ ['--lvl' as string]: lvl.color }}>
      <header className="game__head">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')}>
          <Icon name="back" size={18} /> <span className="hide-sm">Casos</span>
        </button>
        <div className="game__title">
          <span className="game__meta"><span className="lvl-dot" />{caseTag(p)} · {p.franchise} · {lvl.name}</span>
          <h1>{p.title}</h1>
        </div>
        <div className="game__actions">
          {settings.timer && (
            <span className={`timer${challenge && !solved && game.seconds > challenge.t ? ' timer--over' : ''}`} aria-label="Tiempo">
              <Icon name="timer" size={18} />{formatTime(game.seconds)}
              {challenge && !solved && <span className="timer__duel" title={`Tiempo de ${challenge.n}`}><span aria-hidden="true">💘</span>{formatTime(challenge.t)}</span>}
            </span>
          )}
          <button className="icon-btn" onClick={() => setShowIntro(true)} aria-label="Ver el expediente: historia, sospechosos y objetos del plano" title="Expediente (historia y objetos del plano)"><Icon name="folder" /></button>
          <button className="icon-btn" onClick={onHelp} aria-label="Cómo jugar" title="Cómo jugar"><Icon name="help" /></button>
          <button className="icon-btn" onClick={onSettings} aria-label="Ajustes" title="Ajustes"><Icon name="settings" /></button>
        </div>
      </header>

      <div className="game__body">
        <aside ref={suspectsPanel} className="game__suspects" aria-label="Sospechosos">
          <div className="panel-head">
            <h2>Sospechosos</h2>
            <span className="muted small">{tapAction === 'place' ? 'Toca una foto y luego una casilla, o arrástrala al plano' : 'Toca una foto; mantén pulsada la casilla para colocar'}</span>
          </div>
          <div ref={suspectsList} className={suspectsClass(density)}>
            {p.cast.map((ch, k) => (
              <SuspectCard
                key={ch.id}
                index={k}
                p={p}
                ch={ch}
                selected={selected === ch.id}
                placed={posOf[ch.id] !== undefined}
                simple={settings.simpleDirections}
                genderSymbols={settings.genderSymbols}
                onSelect={() => { if (!justDropped()) selectChar(ch.id); }}
                onDragStart={startDrag(ch.id)}
                onHighlight={settings.keywordHighlights ? setHighlight : () => {}}
                onFeedback={coach ? undefined : () => setFeedbackFor({ charId: ch.id, who: `Pista ${withPrep('de', ch)}`, text: clueText(p, ch) })}
                zone={zoneOf(ch.id)}
                onClearZone={() => { const z = zoneOf(ch.id); if (z) game.toggleZone(ch.id, z.room); }}
              />
            ))}
          </div>
        </aside>

        <main className="game__main">
          <div className={`board-zone${zoom ? ' is-zoomed' : ''}`}>
          <div className="board-wrap" ref={boardWrap}>
            <Board
              p={p}
              board={board}
              autoX={game.autoX}
              selected={selected}
              highlight={highlight}
              marks={allMarks}
              tokenStyle={settings.tokenStyle}
              lineAction={lineAction}
              selectedTag={selChar?.tag ?? null}
              onLine={onLine}
              shade={settings.shadeBlocked}
              paintMode={paintMode}
              onTap={onTap}
              onPaintStart={onPaintStart}
              onPaint={onPaint}
              onPaintEnd={onPaintEnd}
              stamp={stamp}
              onMove={coach ? undefined : moveToken}
              dropCell={drag?.cell ?? null}
              zoomed={zoom}
              zoneNotes={zoneInfo.notes}
              zoneRoom={selected ? zoneOf(selected)?.room ?? null : null}
              zoneMode={tool === 'zone' && !solved}
            />
          </div>
          </div>
          <div className="board-under">
            <button className="objects-link" onClick={() => setShowObjects(true)}>
              <Icon name="objects" size={18} /> ¿Qué hay en el plano?
            </button>
            {p.size >= 8 && (
              <button className={`zoom-btn${zoom ? ' is-on' : ''}`} onClick={toggleZoom} aria-pressed={zoom}>
                <Icon name={zoom ? 'zoomOut' : 'zoomIn'} size={18} /> {zoom ? 'Ver entero' : 'Ampliar plano'}
              </button>
            )}
          </div>

          {/* Tira móvil de sospechosos */}
          <div className={`strip${p.cast.length >= 8 ? ' strip--dense' : ''}`} role="listbox" aria-label="Elegir sospechoso" style={{ ['--n' as string]: p.cast.length }}>
            {p.cast.map((ch) => (
              <button
                key={ch.id}
                role="option"
                aria-selected={selected === ch.id}
                className={`chip${selected === ch.id ? ' is-selected' : ''}${posOf[ch.id] !== undefined ? ' is-placed' : ''}${ch.victim ? ' is-victim' : ''}${zoneOf(ch.id) ? ' is-zoned' : ''}${wrongZones.has(ch.id) ? ' is-zone-wrong' : ''}`}
                onClick={() => { if (!justDropped()) selectChar(ch.id); }}
                onPointerDown={startDrag(ch.id)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <Portrait p={p} ch={ch} className="chip__img" />
                <span className="chip__tag">{ch.tag}</span>
              </button>
            ))}
          </div>
          {selChar && (
            <div className="selected-clue">
              <Portrait p={p} ch={selChar} className="selected-clue__img" />
              <div>
                <strong>{displayName(selChar)}</strong>
                <ClueText p={p} ch={selChar} simple={settings.simpleDirections} onHighlight={settings.keywordHighlights ? setHighlight : undefined} />
                {zoneOf(selChar.id) && <ZoneLine zone={zoneOf(selChar.id)!} onClear={() => game.toggleZone(selChar.id, zoneOf(selChar.id)!.room)} />}
                {!coach && !selChar.victim && <button className="linkish selected-clue__fb" onClick={() => setFeedbackFor({ charId: selChar.id, who: `Pista ${withPrep('de', selChar)}`, text: clueText(p, selChar) })}>¿Te confunde esta pista?</button>}
              </div>
              {!coach && <button className="icon-btn icon-btn--sm" onClick={() => setSelected(null)} aria-label="Deseleccionar"><Icon name="close" size={18} /></button>}
            </div>
          )}
          <div className="tools-bar">{tools}</div>

          {solved && !showResult && (
            <div className="solved-banner">
              <span className="stamp stamp--sm">Resuelto</span>
              <span>en {formatTime(progress.bestTime ?? progress.time)} · {'★'.repeat(progress.stars ?? 1)}</span>
              {challenge && <DuelMini challenge={challenge} best={progress.bestTime ?? progress.time} />}
              <button className="btn btn--sm" onClick={() => setShowResult(true)}>Ver final</button>
              <button className="btn btn--sm" onClick={() => setChallengeFrom('banner')}><span aria-hidden="true">💘</span> Retar</button>
              <button className="btn btn--ghost btn--sm" onClick={replay}><Icon name="refresh" size={16} /> Volver a jugar</button>
            </div>
          )}
        </main>

        <aside className="game__side">
          {tools}
          <div className="victim-mini">
            <Portrait p={p} ch={victim} className="victim-mini__img" />
            <div><span className="eyebrow">Víctima</span><strong>{displayName(victim)}</strong></div>
          </div>
          <button className="tool tool--objects" onClick={() => setShowObjects(true)} title="Qué objetos hay en el plano y si se puede estar en ellos">
            <Icon name="objects" /><span>Objetos</span>
          </button>
        </aside>
      </div>

      {hint && <HintPanel p={p} hint={hint} onMore={hintLevelUp} onApply={hintApply} onClose={closeHint} onFeedback={coach ? undefined : (text) => setFeedbackFor({ who: 'Explicación de una pista', text })} />}
      {feedbackFor && <FeedbackDialog caseId={p.id} charId={feedbackFor.charId} who={feedbackFor.who} text={feedbackFor.text} onClose={() => setFeedbackFor(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
      {drag && dragChar && <DragGhost p={p} ch={dragChar} x={drag.x} y={drag.y} touch={drag.touch} ok={drag.cell !== null && p.cells[drag.cell].occupiable} />}

      {showIntro && <IntroModal p={p} challenge={challenge} onStart={() => { setShowIntro(false); tell({ t: 'intro' }); }} onHelp={onHelp} />}
      {accusing && <AccuseModal p={p} onAccuse={accuse} onClose={() => setAccusing(false)} />}
      {outcome && (
        <div className="outcome" role="alert">
          <div className="outcome__card">
            <span className="stamp stamp--warn">Algo no cuadra</span>
            {outcome.kind === 'wrong' ? (
              <p>Hay {outcome.count === 1 ? 'un sospechoso mal colocado' : `${outcome.count} sospechosos mal colocados`}. Repasa las pistas antes de acusar a nadie.</p>
            ) : (
              <p>Tu tablero es correcto, pero {outcome.name} no estaba a solas con la víctima. ¿Quién compartía zona con ella?</p>
            )}
            <div className="row gap">
              <button className="btn" onClick={() => setOutcome(null)}>Seguir investigando</button>
              {outcome.kind === 'wrong' && <button className="btn btn--ghost" onClick={() => { setOutcome(null); check(); }}>Marcar errores</button>}
            </div>
          </div>
        </div>
      )}
      {showResult && p.meta?.kind === 'lesson' && (
        <LessonDone p={p} progress={getProgress(p.id)} onClose={() => setShowResult(false)} onReplay={replay} />
      )}
      {showResult && p.meta?.kind !== 'lesson' && (
        <ResultModal
          p={p}
          progress={getProgress(p.id)}
          primary={p.meta?.kind === 'daily' ? { label: 'Ver el archivo', route: '/archivo' } : next ? { label: 'Siguiente caso', route: `/caso/${next.id}` } : { label: 'Ver todos los casos', route: '/' }}
          streak={p.meta?.kind === 'daily' ? streakInfo(getStore()).current : 0}
          onClose={() => setShowResult(false)}
          onReplay={replay}
          onChallenge={() => { setShowResult(false); setChallengeFrom('result'); }}
        />
      )}
      {showObjects && <ObjectsModal p={p} onClose={() => setShowObjects(false)} />}
      {eraseTarget && (
        <EraseDialog
          p={p}
          board={board}
          cells={eraseTarget.cells}
          lineKey={eraseTarget.lineKey}
          where={eraseTarget.where}
          onClose={() => setEraseTarget(null)}
          onErase={(sel) => { game.erase(eraseTarget.cells, sel); sfx.erase(); setEraseTarget(null); }}
        />
      )}
      {challengeFrom && (
        <ChallengeDialog
          p={p}
          progress={getProgress(p.id)}
          onClose={() => { if (challengeFrom === 'result') setShowResult(true); setChallengeFrom(null); }}
        />
      )}
    </div>
  );
}

function DuelMini({ challenge, best }: { challenge: { n: string; t: number }; best: number }) {
  if (best < challenge.t) return <span className="duel-mini duel-mini--win">🏆 Ganas a {challenge.n}</span>;
  if (best === challenge.t) return <span className="duel-mini">🤝 Empate con {challenge.n}</span>;
  return <span className="duel-mini duel-mini--lose">💘 {challenge.n} gana ({formatTime(challenge.t)})</span>;
}
