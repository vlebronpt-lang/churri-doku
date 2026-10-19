import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { compilePuzzle } from '../../engine/puzzle';
import { TUTORIAL } from '../../data/tutorial';
import { PUZZLES } from '../../data/puzzles';
import { resetCase } from '../../state/progress';
import { recordEvent } from '../../state/achievements';
import { GameScreen, type Coach, type CoachEvent } from '../game/GameScreen';
import { navigate } from '../../router';
import { Modal } from '../Modal';
import { Icon } from '../Icon';

interface Step {
  text: string;
  /** Qué señalar: el tablero, una casilla, un sospechoso (por su posición en el reparto) o una herramienta. */
  target: { board: true } | { cell: number } | { suspect: number } | { tool: string };
  /** Acción que hace avanzar (sin ella, se avanza con «Siguiente»). */
  expect?: (e: CoachEvent) => boolean;
  /** Qué decir si se hace otra cosa. */
  wrong?: string;
}

const L = 0, H = 1, B = 2, V = 3;
const at = (r: number, c: number) => r * 4 + c;
const select = (id: string) => (e: CoachEvent) => e.t === 'select' && e.id === id;
const place = (id: string, cell: number) => (e: CoachEvent) => e.t === 'place' && e.id === id && e.cell === cell;

const STEPS: Step[] = [
  {
    text: 'Te doy la bienvenida, detective. Este plano tiene 4 filas (F1 a F4) y 4 columnas (C1 a C4). La regla de oro: en cada fila y en cada columna hay exactamente una persona. Y el culpable es quien estaba a solas con la víctima en su zona.',
    target: { board: true },
  },
  { text: 'Empieza por Lisa: toca su foto para elegirla.', target: { suspect: L }, expect: select('L'), wrong: 'Toca la foto de Lisa.' },
  {
    text: 'Su pista dice: «Estaba sentada en una silla». En el plano solo hay una silla, arriba a la derecha. Tócala para colocar a Lisa (también puedes arrastrar su foto hasta allí).',
    target: { cell: at(0, 3) }, expect: place('L', at(0, 3)), wrong: 'Busca la única silla del plano: arriba a la derecha.',
  },
  { text: '¡Eso es! Al colocarla, el resto de su fila y de su columna se tacha solo con X bien marcadas: ahí ya no puede haber nadie más.', target: { board: true } },
  { text: 'Ahora, Homer. Toca su foto.', target: { suspect: H }, expect: select('H'), wrong: 'Toca la foto de Homer.' },
  {
    text: '«Estaba junto a una estantería». «Junto a» es arriba, abajo, a la izquierda o a la derecha, y en la misma zona. Encima de la estantería está tachado y debajo empieza el Jardín, que es otra zona: solo le queda una casilla. Colócalo ahí.',
    target: { cell: at(1, 1) }, expect: place('H', at(1, 1)), wrong: 'Pon a Homer en la casilla de su misma zona que toca la estantería.',
  },
  {
    text: 'Mira la columna C3: solo le queda una casilla libre, la de abajo. Ahí hay alguien seguro, aunque aún no sepas quién. Elige la herramienta «Ocupada»…',
    target: { tool: 'occ' }, expect: (e) => e.t === 'tool' && e.tool === 'occ', wrong: 'Toca el botón «Ocupada».',
  },
  { text: '…y toca esa casilla de la columna C3.', target: { cell: at(3, 2) }, expect: (e) => e.t === 'occ' && e.cell === at(3, 2), wrong: 'Es la casilla de abajo del todo en la columna C3.' },
  {
    text: 'Al marcarla como ocupada, también se tachan su fila y su columna. Bart «estaba en la primera columna», y en C1 ya solo queda un hueco. Elige a Bart…',
    target: { suspect: B }, expect: select('B'), wrong: 'Toca la foto de Bart.',
  },
  { text: '…y colócalo en la única casilla libre de la columna C1.', target: { cell: at(2, 0) }, expect: place('B', at(2, 0)), wrong: 'En la columna C1 solo queda una casilla sin tachar.' },
  { text: 'Queda el Sr. Burns, la víctima. Elígelo…', target: { suspect: V }, expect: select('V'), wrong: 'Toca la foto del Sr. Burns.' },
  { text: '…y ponlo en la casilla que marcaste como ocupada.', target: { cell: at(3, 2) }, expect: place('V', at(3, 2)), wrong: 'Es la casilla del círculo amarillo.' },
  {
    text: '¡Todos colocados! ¿Quién estaba a solas con el Sr. Burns en el Jardín? Pulsa «Acusar» y señálalo.',
    target: { tool: 'accuse' }, expect: (e) => e.t === 'accuse' && e.id === 'B', wrong: 'Fíjate en quién comparte el Jardín con el Sr. Burns.',
  },
];

/** Pasos que avanza una acción: 1 si es la esperada; 2 si se arrastra a alguien directamente (elegir + colocar a la vez). */
function stepsFor(i: number, e: CoachEvent): number {
  const st = STEPS[i];
  if (!st?.expect) return 0;
  if (st.expect(e)) return 1;
  if (e.t === 'place' && st.expect({ t: 'select', id: e.id }) && STEPS[i + 1]?.expect?.(e)) return 2;
  return 0;
}

function findTarget(t: Step['target']): HTMLElement | null {
  const visible = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden') ?? null;
  if ('board' in t) return visible('.board-frame');
  if ('cell' in t) return visible(`.board__grid > .cell:nth-child(${t.cell + 1})`);
  if ('suspect' in t) return visible(`.strip .chip:nth-child(${t.suspect + 1})`) ?? visible(`.suspects .suspect:nth-child(${t.suspect + 1}) .suspect__photo`);
  return visible(`.tool--${t.tool}`);
}

/** Tutorial interactivo: un minicaso guiado paso a paso. */
export function Tutorial({ onHelp, onSettings }: { onHelp: () => void; onSettings: () => void }) {
  const p = useMemo(() => compilePuzzle(TUTORIAL), []);
  // El tutorial empieza siempre de cero (fuera del renderizado, para no tocar el estado de otros componentes).
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    resetCase('tutorial');
    setReady(true);
  }, []);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const stepRef = useRef(0);

  const go = (n: number) => {
    stepRef.current += n;
    setStep(stepRef.current);
  };

  const coach = useMemo<Coach>(() => ({
    allow: (e) => {
      if (e.t === 'intro' || e.t === 'solved') return true;
      if (e.t === 'hint') return 'En el tutorial te guío yo 😉';
      const st = STEPS[stepRef.current];
      if (!st) return true;
      if (!st.expect) return 'Lee el globo y pulsa «Siguiente».';
      return stepsFor(stepRef.current, e) ? true : st.wrong ?? 'Sigue las indicaciones del globo.';
    },
    notify: (e) => {
      if (e.t === 'intro') { setStarted(true); return; }
      const n = stepsFor(stepRef.current, e);
      if (n) go(n);
    },
  }), []);

  const finish = () => {
    recordEvent({ tutorialDone: true });
    setDone(true);
  };
  const first = PUZZLES[0];

  return (
    <>
      {ready && <GameScreen p={p} reto={null} onHelp={onHelp} onSettings={onSettings} coach={coach} onFinished={finish} />}
      {started && !done && step < STEPS.length && <CoachBubble step={STEPS[step]} index={step} onNext={() => go(1)} />}
      {done && (
        <Modal onClose={() => navigate('/academia')} labelledBy="tut-done" className="lesson-done">
          <p className="eyebrow">Tutorial superado</p>
          <h2 id="tut-done" className="result__title">¡Caso cerrado, detective!</h2>
          <p className="typewriter">{p.story.epilogue}</p>
          <p>Ya sabes lo básico: elegir, colocar, tachar, marcar casillas ocupadas y acusar. Las lecciones de la academia te enseñan las técnicas para los casos más difíciles.</p>
          <div className="row gap wrap result__actions">
            <button className="btn btn--primary" onClick={() => navigate(`/caso/${first.id}`)}>Jugar el caso Nº 1 <Icon name="next" size={18} /></button>
            <button className="btn" onClick={() => navigate('/academia')}>Ir a la academia</button>
            <button className="btn btn--ghost" onClick={() => navigate('/diario')}>Caso del día</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/** Globo del tutorial: señala lo que hay que tocar sin taparlo. */
function CoachBubble({ step, index, onNext }: { step: Step; index: number; onNext: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    let timer = 0;
    let first = true;
    const measure = () => {
      const el = findTarget(step.target);
      if (el && first) {
        first = false;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      const r = el?.getBoundingClientRect() ?? null;
      setRect((prev) => (prev && r && prev.x === r.x && prev.y === r.y && prev.width === r.width && prev.height === r.height ? prev : r));
    };
    const tick = () => { measure(); timer = window.setTimeout(tick, 250); };
    tick();
    window.addEventListener('scroll', measure, { passive: true, capture: true });
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', measure, { capture: true });
      window.removeEventListener('resize', measure);
    };
  }, [step]);

  useLayoutEffect(() => {
    const b = ref.current;
    if (!b) return;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const w = b.offsetWidth, h = b.offsetHeight, m = 10, gap = 14;
    const clampX = (x: number) => Math.max(m, Math.min(vw - w - m, x));
    const clampY = (y: number) => Math.max(m, Math.min(vh - h - m, y));
    if (!rect) { setPos({ left: clampX((vw - w) / 2), top: vh - h - m }); return; }
    const cx = rect.left + rect.width / 2;
    const options: { left: number; top: number }[] = [];
    const big = rect.height > vh * 0.4;
    // Para el plano entero: al lado si cabe; si no, abajo del todo.
    if (big) {
      if (rect.left - gap - w >= m) options.push({ left: rect.left - gap - w, top: clampY(rect.top + 30) });
      if (vw - rect.right - gap - w >= m) options.push({ left: rect.right + gap, top: clampY(rect.top + 30) });
      if (vh - rect.bottom - gap - h >= m) options.push({ left: clampX(cx - w / 2), top: rect.bottom + gap });
      options.push({ left: clampX(cx - w / 2), top: vh - h - m });
    } else {
      if (rect.bottom + gap + h <= vh - m) options.push({ left: clampX(cx - w / 2), top: rect.bottom + gap });
      if (rect.top - gap - h >= m) options.push({ left: clampX(cx - w / 2), top: rect.top - gap - h });
      if (rect.left - gap - w >= m) options.push({ left: rect.left - gap - w, top: clampY(rect.top + rect.height / 2 - h / 2) });
      if (vw - rect.right - gap - w >= m) options.push({ left: rect.right + gap, top: clampY(rect.top + rect.height / 2 - h / 2) });
      options.push({ left: clampX(cx - w / 2), top: clampY(rect.bottom + gap) });
    }
    setPos(options[0]);
  }, [rect, step]);

  return (
    <>
      {rect && <div className="coach-ring" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} aria-hidden="true" />}
      <div ref={ref} className="coach" role="dialog" aria-live="polite" aria-label="Tutorial" style={{ left: pos?.left ?? -9999, top: pos?.top ?? 0 }}>
        <span className="coach__step">Paso {index + 1} de {STEPS.length}</span>
        <p>{step.text}</p>
        <div className="row gap wrap">
          {!step.expect && <button className="btn btn--primary btn--sm" onClick={onNext} autoFocus>Siguiente <Icon name="next" size={16} /></button>}
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/academia')}>Salir del tutorial</button>
        </div>
      </div>
    </>
  );
}
