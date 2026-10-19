import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Puzzle } from '../../engine/types';
import { displayName, withPrep } from '../../engine/text';
import { useSettings } from '../../state/settings';
import { getProgress, resetCase, updateProgress, useCaseProgress } from '../../state/progress';
import { formatTime, useGame } from '../../game/useGame';
import { computeHint, findErrors, type HintResult } from '../../game/hints';
import { configureFx, sfx } from '../../game/sfx';
import { levelInfo, nextPuzzle } from '../../data/puzzles';
import { Board, noMarks, type BoardMarks } from './Board';
import { SuspectCard } from './SuspectCard';
import { ClueText, type Highlight } from './ClueText';
import { Icon } from '../Icon';
import { Portrait } from '../Portrait';
import { HintPanel } from './HintPanel';
import { AccuseModal, IntroModal, ResultModal } from './CaseModals';
import { navigate } from '../../router';
import { decodeChallenge } from '../../share';
import { ChallengeDialog } from '../ShareDialogs';

type Tool = 'place' | 'note' | 'x' | 'erase';
type Outcome = { kind: 'wrong'; count: number } | { kind: 'wrongAccuse'; name: string } | null;

export function GameScreen({ p, reto, onHelp, onSettings }: { p: Puzzle; reto?: string | null; onHelp: () => void; onSettings: () => void }) {
  const { settings } = useSettings();
  const progress = useCaseProgress(p.id);
  const game = useGame(p, { autoX: settings.autoX, noXOnBlocked: settings.noXOnBlocked });
  const { board, posOf } = game;
  const [selected, setSelected] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('place');
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [marks, setMarks] = useState<BoardMarks>(noMarks);
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
  const paint = useRef<{ value: boolean } | null>(null);
  const toastTimer = useRef<number>(0);
  const solved = progress.solved;
  const challenge = incoming ?? progress.challenge;

  // Reto recibido por enlace: se guarda y se limpia la dirección.
  useEffect(() => {
    if (!reto) return;
    if (incoming) updateProgress(p.id, { challenge: incoming });
    history.replaceState(null, '', `${location.pathname}${location.search}#/caso/${p.id}`);
  }, [reto, incoming, p.id]);

  useEffect(() => configureFx(settings.sound, settings.haptics), [settings.sound, settings.haptics]);
  useEffect(() => game.setRunning(!solved && !showIntro && !revealing), [solved, showIntro, revealing, game]);

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const clearTransient = () => {
    setMarks((m) => (m.wrong.size || m.wrongX.size || m.hintCells.size || m.hintX.size || m.hintRooms.size || m.hintRows.size || m.hintCols.size ? { ...noMarks(), reveal: m.reveal } : m));
  };

  // Conflictos de fila/columna (regla objetiva, no revela la solución).
  const conflicts = useMemo(() => {
    const out = new Set<number>();
    if (!settings.conflictWarnings) return out;
    const cells = Object.keys(board.placed).map(Number);
    for (const a of cells) for (const b of cells) {
      if (a === b) continue;
      if (Math.floor(a / p.size) === Math.floor(b / p.size) || a % p.size === b % p.size) out.add(a);
    }
    return out;
  }, [board.placed, p.size, settings.conflictWarnings]);

  const allMarks = useMemo<BoardMarks>(() => ({ ...marks, conflicts }), [marks, conflicts]);

  const selectChar = (id: string | null) => {
    setSelected((cur) => (cur === id ? null : id));
    if (tool === 'x' || tool === 'erase') setTool('place');
    sfx.select();
  };

  const onTap = useCallback((cell: number, long: boolean) => {
    if (solved || revealing) return;
    clearTransient();
    const occupant = board.placed[cell];
    if (tool === 'x') {
      if (occupant) return;
      if (settings.noXOnBlocked && !p.cells[cell].occupiable) return say('Esa casilla tiene un objeto: ahí no puede haber nadie.');
      game.toggleX(cell);
      sfx.x();
      return;
    }
    if (tool === 'erase') {
      game.clearCell(cell);
      sfx.erase();
      return;
    }
    const wantNote = tool === 'note' ? !long : (settings.tapAction === 'note' ? !long : long);
    if (!selected) {
      if (occupant) { setSelected(occupant); sfx.select(); return; }
      return say('Primero elige a un sospechoso (toca su foto).');
    }
    if (!p.cells[cell].occupiable) return say(`Ahí hay ${p.cells[cell].obj ? `un objeto (${p.objects[p.cells[cell].obj!].name})` : 'un obstáculo'}: no se puede ocupar.`);
    if (wantNote) {
      if (occupant) return;
      game.toggleNote(cell, selected);
      sfx.note();
      return;
    }
    if (occupant === selected) {
      game.unplace(selected);
      sfx.undo();
      return;
    }
    game.place(selected, cell);
    sfx.place();
  }, [board.placed, game, p, say, selected, settings.noXOnBlocked, settings.tapAction, solved, revealing, tool]);

  const paintMode: 'x' | 'note' | 'erase' | null = solved ? null : tool === 'x' ? 'x' : tool === 'erase' ? 'erase' : selected ? 'note' : null;

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
      if (showIntro || accusing || showResult || challengeFrom) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) game.redo(); else game.undo(); return; }
      if ((e.metaKey || e.ctrlKey) && k === 'y') { e.preventDefault(); game.redo(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (k === 'escape') { setSelected(null); setHint(null); clearTransient(); return; }
      if (k === 'x') { setTool((tl) => (tl === 'x' ? 'place' : 'x')); return; }
      if (k === 'n' || k === 'l') { setTool((tl) => (tl === 'note' ? 'place' : 'note')); return; }
      if (k === 'b' || k === 'backspace' || k === 'delete') { if (k === 'b') setTool((tl) => (tl === 'erase' ? 'place' : 'erase')); return; }
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
    const res = computeHint(p, board);
    sfx.hint();
    setHint({ res, level: 1 });
    applyHintMarks(res, 1);
    if (res.kind === 'step' || res.kind === 'errors') updateProgress(p.id, (c) => ({ hints: c.hints + 1 }));
  };

  const applyHintMarks = (res: HintResult, level: number) => {
    const m = noMarks();
    if (res.kind === 'errors') {
      if (level >= 2) {
        res.wrongPlaced.forEach((c) => m.wrong.add(c));
        res.wrongX.forEach((c) => m.wrongX.add(c));
      }
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

  // ------------------------------------------------------------- comprobar
  const check = () => {
    const { wrongPlaced, wrongX } = findErrors(p, board);
    updateProgress(p.id, (c) => ({ checks: c.checks + 1 }));
    const m = noMarks();
    wrongPlaced.forEach((c) => m.wrong.add(c));
    wrongX.forEach((c) => m.wrongX.add(c));
    setMarks(m);
    const n = wrongPlaced.length + wrongX.length;
    if (n === 0) {
      say(Object.keys(board.placed).length ? 'Todo correcto por ahora.' : 'Aún no hay nada que comprobar.');
    } else {
      sfx.error();
      say(`${n === 1 ? 'Hay 1 error' : `Hay ${n} errores`} (marcados en rojo).`);
    }
  };

  // ------------------------------------------------------------- acusación
  const accuse = (id: string) => {
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
        solved: true, solvedAt: Date.now(), time: game.seconds,
        bestTime: cur.bestTime ? Math.min(cur.bestTime, game.seconds) : game.seconds,
        stars: Math.max(stars, cur.stars ?? 0),
      });
      sfx.win();
      setRevealing(false);
      setShowResult(true);
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
      <button className={`tool${tool === 'note' ? ' is-on' : ''}`} onClick={() => setTool(tool === 'note' ? 'place' : 'note')} aria-pressed={tool === 'note'} title="Lápiz: anotar posibilidades (N)">
        <Icon name="pencil" /><span>Lápiz</span>
      </button>
      <button className={`tool${tool === 'x' ? ' is-on' : ''}`} onClick={() => setTool(tool === 'x' ? 'place' : 'x')} aria-pressed={tool === 'x'} title="Marcar casillas descartadas (X)">
        <Icon name="x" sw={3} /><span>Descartar</span>
      </button>
      <button className={`tool${tool === 'erase' ? ' is-on' : ''}`} onClick={() => setTool(tool === 'erase' ? 'place' : 'erase')} aria-pressed={tool === 'erase'} title="Borrar casilla (B)">
        <Icon name="eraser" /><span>Borrar</span>
      </button>
      <button className="tool" onClick={() => { game.undo(); sfx.undo(); }} disabled={!game.canUndo || solved} title="Deshacer (Ctrl+Z)">
        <Icon name="undo" /><span>Deshacer</span>
      </button>
      <button className="tool" onClick={() => { game.redo(); sfx.undo(); }} disabled={!game.canRedo || solved} title="Rehacer (Ctrl+Shift+Z)">
        <Icon name="redo" /><span>Rehacer</span>
      </button>
      <button className="tool" onClick={check} disabled={solved || !placedCount && !Object.keys(board.xs).length} title="Comprobar errores">
        <Icon name="check" /><span>Comprobar</span>
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
          <span className="game__meta"><span className="lvl-dot" />Nº {String(p.num).padStart(2, '0')} · {p.franchise} · {lvl.name}</span>
          <h1>{p.title}</h1>
        </div>
        <div className="game__actions">
          {settings.timer && (
            <span className={`timer${challenge && !solved && game.seconds > challenge.t ? ' timer--over' : ''}`} aria-label="Tiempo">
              <Icon name="timer" size={18} />{formatTime(game.seconds)}
              {challenge && !solved && <span className="timer__duel" title={`Tiempo de ${challenge.n}`}><span aria-hidden="true">💘</span>{formatTime(challenge.t)}</span>}
            </span>
          )}
          <button className="icon-btn" onClick={() => setShowIntro(true)} aria-label="Ver el expediente" title="Expediente"><Icon name="folder" /></button>
          <button className="icon-btn" onClick={onHelp} aria-label="Cómo jugar" title="Cómo jugar"><Icon name="help" /></button>
          <button className="icon-btn" onClick={onSettings} aria-label="Ajustes" title="Ajustes"><Icon name="settings" /></button>
        </div>
      </header>

      <div className="game__body">
        <aside className="game__suspects" aria-label="Sospechosos">
          <div className="panel-head">
            <h2>Sospechosos</h2>
            <span className="muted small">{settings.tapAction === 'place' ? 'Toca una foto y luego una casilla' : 'Toca una foto; mantén pulsada la casilla para colocar'}</span>
          </div>
          <div className="suspects">
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
                onSelect={() => selectChar(ch.id)}
                onHighlight={settings.keywordHighlights ? setHighlight : () => {}}
              />
            ))}
          </div>
        </aside>

        <main className="game__main">
          <div className="board-wrap">
            <Board
              p={p}
              board={board}
              autoX={game.autoX}
              selected={selected}
              highlight={highlight}
              marks={allMarks}
              tokenStyle={settings.tokenStyle}
              coords={settings.coords || (hint !== null && hint.level >= 2)}
              shade={settings.shadeBlocked}
              paintMode={paintMode}
              onTap={onTap}
              onPaintStart={onPaintStart}
              onPaint={onPaint}
              onPaintEnd={onPaintEnd}
              stamp={stamp}
            />
          </div>

          {/* Tira móvil de sospechosos */}
          <div className="strip" role="listbox" aria-label="Elegir sospechoso">
            {p.cast.map((ch) => (
              <button
                key={ch.id}
                role="option"
                aria-selected={selected === ch.id}
                className={`chip${selected === ch.id ? ' is-selected' : ''}${posOf[ch.id] !== undefined ? ' is-placed' : ''}${ch.victim ? ' is-victim' : ''}`}
                onClick={() => selectChar(ch.id)}
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
              </div>
              <button className="icon-btn icon-btn--sm" onClick={() => setSelected(null)} aria-label="Deseleccionar"><Icon name="close" size={18} /></button>
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
        </aside>
      </div>

      {hint && <HintPanel p={p} hint={hint} onMore={hintLevelUp} onApply={hintApply} onClose={closeHint} />}
      {toast && <div className="toast" role="status">{toast}</div>}

      {showIntro && <IntroModal p={p} challenge={challenge} onStart={() => setShowIntro(false)} onHelp={onHelp} />}
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
      {showResult && (
        <ResultModal
          p={p}
          progress={getProgress(p.id)}
          next={next}
          onClose={() => setShowResult(false)}
          onReplay={replay}
          onChallenge={() => { setShowResult(false); setChallengeFrom('result'); }}
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
