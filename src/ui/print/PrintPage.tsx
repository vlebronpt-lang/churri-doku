import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import qrcode from 'qrcode-generator';
import type { Puzzle } from '../../engine/types';
import { boardSize, CELL, renderBoard } from '../../render/board';
import { renderSolvedBoard, tokenSvg } from '../../render/solved';
import { clueSentences, displayName, roomPhrase, withPrep } from '../../engine/text';
import { compilePuzzle } from '../../engine/puzzle';
import { solveLogically, type Deduction } from '../../engine/logic';
import { TUTORIAL } from '../../data/tutorial';
import FINAL_INPUT from '../../data/final';
import { GRUDGES } from '../../data/grudges';
import { LESSONS, lessonPuzzle, type Lesson } from '../../data/academy';
import { TECH_NAME } from '../game/HintPanel';
import { levelInfo, PUZZLES, LEVELS } from '../../data/puzzles';
import { DEDICATION_KEY, type Dedication } from '../../downloads';
import { load } from '../../state/storage';
import { navigate } from '../../router';
import { Portrait, charColor } from '../Portrait';
import { Logo } from '../Logo';
import { legendIconSvg, objectLegend } from '../../render/legend';

/*
 * Versión para imprimir, en formato libro (A4 vertical):
 *  - cada caso: portada, doble página (izquierda: historia, sospechosos con su pista y su móvil, y objetos;
 *    derecha: el plano, la cuadrícula de deducción y su QR) y contraportada;
 *  - la solución de cada caso cabe en media página: plano resuelto, perfil del asesino y orden de colocación;
 *  - el libro: portada, dedicatoria, cómo se juega, un ejemplo resuelto, la escuela de detectives, la web,
 *    índice, los casos en doble página, el caso final (exclusivo: su solución se desbloquea en la web con un
 *    código), las soluciones de dos en dos, notas y contraportada. Con ?encuadernar=1 lleva margen de lomo y
 *    con ?dedicado=1, la dedicatoria que se preparó en Descargas.
 */

type Kind = 'color' | 'bn' | 'solucion';
const SITE = 'vlebronpt-lang.github.io/churri-doku';
const SITE_URL = `https://${SITE}/`;
const caseUrl = (p: Puzzle) => `${SITE_URL}#/caso/${p.id}`;
const BASE = import.meta.env.BASE_URL;
const num = (p: Puzzle) => String(p.num).padStart(2, '0');
const FINAL = compilePuzzle(FINAL_INPUT);
const isFinal = (p: Puzzle) => p.id === FINAL.id;

const chunk = <T,>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, j) => xs.slice(j * n, j * n + n));

/** Libro: portada (1), dedicatoria (2), cómo se juega (3), ejemplo (4), escuela, web e índice; los casos empiezan en par. */
const SCHOOL_PAGES = Math.ceil(LESSONS.length / 3);
const FRONT = 6 + SCHOOL_PAGES;
const FRONT_PAD = (FRONT + 1) % 2;
export const BOOK_FIRST_CASE = FRONT + 1 + FRONT_PAD;
export const bookCasePage = (k: number) => BOOK_FIRST_CASE + 2 * k;

function Page({ className = '', page, showNum = true, children }: { className?: string; page?: number; showNum?: boolean; children: ReactNode }) {
  // Recto (impar) y verso (par): en la versión para encuadernar, el margen del lomo cambia de lado.
  const side = page === undefined ? '' : page % 2 ? ' is-recto' : ' is-verso';
  return (
    <section className={`page ${className}${side}`}>
      {children}
      {page !== undefined && showNum && <span className={`page__num${page % 2 ? ' is-right' : ''}`}>{page}</span>}
    </section>
  );
}

/**
 * Si el contenido no cabe en su caja, se encoge un poco (hasta `max` veces): las clases is-tightN van en la caja
 * que lo contiene. Se mide cuando las fuentes ya están cargadas (con la provisional todo ocupa más) y se prueban
 * los tamaños de mayor a menor.
 */
function useFit(deps: unknown[], max = 2) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    let alive = true;
    const classes = Array.from({ length: max }, (_, j) => `is-tight${j + 1}`);
    const fit = () => {
      const inner = ref.current;
      const box = inner?.parentElement;
      if (!alive || !inner || !box) return;
      for (let level = 0; level <= max; level++) {
        box.classList.remove(...classes);
        if (level) box.classList.add(`is-tight${level}`);
        if (inner.scrollHeight <= inner.clientHeight + 1) break;
      }
    };
    fit();
    (document.fonts?.ready ?? Promise.resolve()).then(fit).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function ClueLine({ p, ch }: { p: Puzzle; ch: Puzzle['cast'][number] }) {
  const sents = clueSentences(p, ch, {});
  return (
    <span>
      {sents.map((segs, i) => (
        <span key={i}>{segs.map((s, j) => (s.b ? <b key={j}>{s.text}</b> : <span key={j}>{s.text}</span>))}{i < sents.length - 1 ? ' ' : ''}</span>
      ))}
    </span>
  );
}

function CaseHead({ p, small = false }: { p: Puzzle; small?: boolean }) {
  const lvl = levelInfo(p.level);
  return (
    <header className={`page__head${small ? ' page__head--small' : ''}`}>
      <span className="page__logo"><Logo compact /></span>
      <div className="page__title">
        <span className="page__kicker"><span className="lvl-dot" style={{ ['--lvl' as string]: lvl.color }} />{isFinal(p) ? 'Caso final · Exclusivo del libro' : `Nº ${num(p)}`} · {p.franchise} · {lvl.name} · {p.size}×{p.size}</span>
        <h1>{p.title}</h1>
      </div>
    </header>
  );
}

/** Portada de un caso: su ilustración, el número de expediente y el título. */
export function CaseCoverPage({ p, bw }: { p: Puzzle; bw: boolean }) {
  const lvl = levelInfo(p.level);
  return (
    <Page className={`case-cover${bw ? ' is-bw' : ''}`}>
      <div className="case-cover__top">
        <Logo />
        <span className="case-cover__file">Expediente Nº {num(p)}</span>
      </div>
      <div className="case-cover__art" style={{ ['--lvl' as string]: lvl.color }}>
        <img src={`${BASE}img/print/covers/${p.id}${bw ? '-bn' : ''}.jpg`} alt="" />
        <span className="case-cover__tape">Escena del crimen · No pasar</span>
      </div>
      <div className="case-cover__text">
        <span className="case-cover__kicker">{p.franchise} · {lvl.season} · {lvl.name} · {p.size}×{p.size}</span>
        <h1>{p.title}</h1>
        <p>{p.story.intro}</p>
      </div>
      <p className="case-cover__foot">Sudoku con asesinato · {SITE}</p>
    </Page>
  );
}

/** Página izquierda del caso: la historia, los sospechosos con su pista y su móvil, y los objetos del plano. */
export function CaseLeftPage({ p, bw, page }: { p: Puzzle; bw: boolean; page?: number }) {
  const ref = useFit([p.id, bw], 3);
  const grudges = GRUDGES[p.id] ?? {};
  return (
    <Page className={`case-left${bw ? ' is-bw' : ''}${isFinal(p) ? ' is-final' : ''}`} page={page}>
      <div className="page__inner" ref={ref}>
        <CaseHead p={p} />
        <p className="case-left__story">{p.story.intro}</p>
        <h2 className="page__section">Sospechosos <span>· su pista y su móvil</span></h2>
        <div className="case-left__suspects">
          {p.cast.map((ch) => (
            <div key={ch.id} className={`ps${ch.victim ? ' ps--victim' : ''}`}>
              <div className="ps__photo" style={{ background: bw ? '#ddd' : charColor(p, ch) }}>
                <Portrait p={p} ch={ch} variant={bw ? 'print-bn' : 'print'} />
                <span className="ps__tag">{ch.tag}</span>
                <span className="ps__gender">{ch.gender === 'f' ? '♀' : '♂'}</span>
              </div>
              <div className="ps__text">
                <span className="ps__name">{displayName(ch)}</span>
                <span className="ps__clue">{ch.victim ? <><span className="ps__victim">La víctima.</span> Estaba <b>a solas con el asesino</b>.</> : <ClueLine p={p} ch={ch} />}</span>
                {!ch.victim && grudges[ch.id] && <span className="ps__motive"><b>Móvil:</b> {grudges[ch.id]}</span>}
              </div>
            </div>
          ))}
        </div>
        <PrintLegend p={p} bw={bw} />
      </div>
    </Page>
  );
}

/** Código QR (vectorial, se imprime nítido) que lleva a una dirección de la web. */
function QR({ url, size }: { url: string; size: number }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    const q = 2;
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#251a37"/></svg>`;
  }, [url]);
  return <span className="qr" style={{ width: `${size}mm`, height: `${size}mm` }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Cuadrícula de deducción: cada persona frente a las filas y las columnas, para ir tachando con lápiz. */
function DeductionGrid({ p }: { p: Puzzle }) {
  const n = Array.from({ length: p.size }, (_, i) => i + 1);
  return (
    <div className="dgrid">
      <p className="dgrid__head"><b>Cuadrícula de deducción</b> Marca ✕ en las filas y columnas donde no puede estar cada persona, y ● cuando lo sepas seguro.</p>
      <table className="dgrid__table">
        <thead>
          <tr>
            <th className="dgrid__corner" rowSpan={2} />
            <th className="dgrid__block" colSpan={p.size}>Fila</th>
            <th className="dgrid__block is-cols" colSpan={p.size}>Columna</th>
          </tr>
          <tr>
            {n.map((i) => <th key={`f${i}`} className="dgrid__n">{i}</th>)}
            {n.map((i) => <th key={`c${i}`} className={`dgrid__n${i === 1 ? ' is-cols' : ''}`}>{i}</th>)}
          </tr>
        </thead>
        <tbody>
          {p.cast.map((ch) => (
            <tr key={ch.id} className={ch.victim ? 'is-victim' : ''}>
              <th className="dgrid__who"><span className="dgrid__tag">{ch.tag}</span><span className="dgrid__name">{displayName(ch)}</span></th>
              {n.map((i) => <td key={`f${i}`} />)}
              {n.map((i) => <td key={`c${i}`} className={i === 1 ? 'is-cols' : undefined} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** El código del caso final: la columna de cada persona, en el orden de la lista (la décima se escribe 0). */
function FinalCode({ p }: { p: Puzzle }) {
  return (
    <div className="final-code">
      <p className="final-code__head"><b>El código secreto.</b> Escribe, en el orden de la lista, la columna de cada persona (la 10 se escribe 0).</p>
      <div className="final-code__boxes">
        {p.cast.map((ch) => <span key={ch.id} className="final-code__box"><i>{ch.tag}</i></span>)}
      </div>
      <footer className="final-code__web">
        <QR url={`${SITE_URL}#/secreto`} size={17} />
        <span><b>Escríbelo en {SITE}/#/secreto</b>: si es correcto, verás quién lo hizo y por qué, y ganarás un logro secreto. La solución de este caso no está en el libro.</span>
      </footer>
    </div>
  );
}

/** Página derecha del caso: el plano, la cuadrícula de deducción, la respuesta y el QR del caso. */
export function CaseRightPage({ p, bw, page }: { p: Puzzle; bw: boolean; page?: number }) {
  const svg = useMemo(() => renderBoard(p, { coords: true, bw, vectorFloors: true, idp: `pr-${p.id}-${bw ? 'bn' : 'c'}-${page ?? 0}` }), [p, bw, page]);
  return (
    <Page className={`case-right${bw ? ' is-bw' : ''}${isFinal(p) ? ' is-final' : ''}`} page={page}>
      <CaseHead p={p} small />
      <div className="print-board" dangerouslySetInnerHTML={{ __html: svg }} />
      <DeductionGrid p={p} />
      <div className="case-right__answer">El asesino es: <span className="case-right__blank" /></div>
      {isFinal(p) ? <FinalCode p={p} /> : (
        <footer className="case-right__foot">
          <QR url={caseUrl(p)} size={17} />
          <span><b>Juega este caso en la web</b>, con pistas que te explican cada paso: escanea el código o entra en <b>{SITE}</b>.</span>
        </footer>
      )}
    </Page>
  );
}

/** Contraportada de un caso: cómo se juega, la galería de sospechosos y el QR de la web. */
export function CaseBackPage({ p, bw }: { p: Puzzle; bw: boolean }) {
  return (
    <Page className={`case-back${bw ? ' is-bw' : ''}`}>
      <div className="case-back__logo"><Logo /></div>
      <p className="case-back__sub">Sudoku con asesinato. Y con tus series favoritas.</p>
      <div className="case-back__box">
        <h2>Cómo se juega</h2>
        <ul>
          <li>Coloca a todas las personas en el plano usando sus pistas: <b>una por fila y una por columna</b>.</li>
          <li>Solo se puede estar en casillas libres o en objetos ocupables (sillas, camas, alfombras…), nunca sobre mesas, plantas o estanterías.</li>
          <li><b>Junto a</b>: casilla contigua en la misma zona. <b>Con</b>: en la misma zona. <b>Al norte de</b>: en cualquier fila más arriba.</li>
          <li>El asesino es <b>la única persona que estaba a solas con la víctima</b> en su zona.</li>
        </ul>
        <p>Marca con una X las casillas donde no hay nadie y apunta a lápiz las posibilidades; la cuadrícula de deducción te ayuda a no perder la cuenta. Hay una única solución y se llega sin adivinar.</p>
      </div>
      <div className="case-back__cast" aria-label="Personajes de este caso">
        {p.cast.map((ch) => (
          <span key={ch.id} className={`case-back__who${ch.victim ? ' is-victim' : ''}`}>
            <Portrait p={p} ch={ch} variant={bw ? 'print-bn' : 'print'} className="case-back__face" />
            <span>{displayName(ch)}</span>
          </span>
        ))}
      </div>
      <p className="case-back__sol">La solución de «{p.title}» (el plano resuelto, el perfil del asesino y el orden en que se coloca a cada uno) está en su archivo aparte.</p>
      <div className="case-back__web">
        <QR url={SITE_URL} size={26} />
        <p><b>Un caso nuevo cada día en la web</b>, con pistas paso a paso y modo pareja en directo.<br /><span>{SITE}</span></p>
      </div>
      <p className="case-back__fan">Proyecto fan, gratuito y sin ánimo de lucro. Los personajes pertenecen a sus propietarios; las ilustraciones se han creado con IA para este proyecto.</p>
    </Page>
  );
}

function SolutionBoard({ p }: { p: Puzzle }) {
  const svg = useMemo(() => renderSolvedBoard(p, { bw: false, vectorFloors: true, idp: `sol-${p.id}` }), [p]);
  return <div className="print-board" dangerouslySetInnerHTML={{ __html: svg }} />;
}

const cellName = (p: Puzzle, i: number) => `F${Math.floor(i / p.size) + 1}·C${(i % p.size) + 1}`;

/** Por qué se coloca a alguien, en pocas palabras (a partir del paso que lo coloca y de los anteriores). */
function placeWhy(p: Puzzle, d: Deduction, since: Deduction[]) {
  const { k, i } = d.place!;
  const ch = p.cast[k];
  if (d.tech === 'rowSingle') return `la única persona que cabe en la fila ${Math.floor(i / p.size) + 1}`;
  if (d.tech === 'colSingle') return `la única persona que cabe en la columna ${(i % p.size) + 1}`;
  if (d.text.includes('es la única casilla del plano que cumple su pista')) return 'la única casilla que cumple su pista';
  if (since.some((x) => x.tech === 'room' && x.text.includes(`La única persona que puede estar`) && x.text.includes(ch.name))) return 'la única que pudo quedarse a solas con la víctima';
  const trials = since.filter((x) => x.tech === 'trial' && x.focus.chars[0] === ch.id).length;
  if (trials) return trials === 1 ? 'su última casilla: la otra se descarta suponiendo' : `su última casilla, tras descartar ${trials} suponiendo`;
  if (since.some((x) => x.tech === 'relation' && x.focus.chars[0] === ch.id)) return 'su última casilla al cruzar su pista con otra';
  return 'la única casilla que le queda';
}

/** Orden en que se coloca a cada persona al resolverlo con lógica, con el motivo de cada colocación. */
function placements(p: Puzzle) {
  const steps = solveLogically(p).steps;
  const list: { k: number; i: number; why: string }[] = [];
  let since: Deduction[] = [];
  for (const d of steps) {
    if (!d.place) { since.push(d); continue; }
    list.push({ ...d.place, why: placeWhy(p, d, since) });
    since = [];
  }
  return { list, total: steps.length, trials: steps.filter((d) => d.tech === 'trial').length };
}

/** El crimen, sin el resto del epílogo (dónde estaba cada uno ya lo dice el plano resuelto). */
const murderHow = (text: string) => {
  const at = text.search(/\s(Mientras( tanto)?,|Nadie se enteró:|Nadie oyó nada:)/);
  return at > 0 ? text.slice(0, at) : text;
};

/**
 * La solución de un caso en media página: el plano resuelto, el perfil del asesino (móvil, lo que pasó y lo que
 * lo delata) y el orden en que se coloca a cada persona.
 */
export function SolutionHalf({ p }: { p: Puzzle }) {
  const ref = useFit([p.id], 3);
  const { list, total, trials } = useMemo(() => placements(p), [p]);
  const murderer = p.cast.find((c) => c.id === p.murderer)!;
  const victim = p.cast.find((c) => c.victim)!;
  const room = p.rooms[p.cells[p.solution[victim.id]].room];
  const lvl = levelInfo(p.level);
  return (
    <div className="sol-half">
      <div className="sol-half__inner" ref={ref}>
        <header className="sol-half__head">
          <span className="page__kicker"><span className="lvl-dot" style={{ ['--lvl' as string]: lvl.color }} />Solución · Nº {num(p)} · {p.franchise} · {lvl.name}</span>
          <h2>{p.title}</h2>
        </header>
        <div className="sol-half__body">
          <SolutionBoard p={p} />
          <div className="sol-profile">
            <div className="sol-profile__id">
              <Portrait p={p} ch={murderer} variant="print" className="sol-profile__face" />
              <div>
                <span className="sol-profile__label">{murderer.gender === 'f' ? 'La asesina es' : 'El asesino es'}</span>
                <strong>{displayName(murderer)}</strong>
              </div>
            </div>
            <p><b>Móvil.</b> {GRUDGES[p.id]?.[murderer.id]}</p>
            <p><b>Lo que pasó.</b> {murderHow(p.story.epilogue)}</p>
            <p><b>Lo delata.</b> Estaba a solas con {withPrep('', victim)} {roomPhrase(room, 'en')} ({cellName(p, p.solution[murderer.id])}).</p>
          </div>
        </div>
        <div className="sol-order">
          <h3>Orden de colocación <span>· {total} deducciones{trials ? `, ${trials} de ellas suponiendo` : ''}</span></h3>
          <ol>
            {list.map((x, j) => <li key={j}><b>{displayName(p.cast[x.k])}</b> {cellName(p, x.i)} <span>· {x.why}</span></li>)}
          </ol>
        </div>
      </div>
    </div>
  );
}

/** Media página del caso final en las soluciones: su solución se descubre en la web con el código. */
function FinalSlot() {
  return (
    <div className="sol-half sol-final">
      <div className="sol-final__box">
        <span className="page__kicker"><span className="lvl-dot" style={{ ['--lvl' as string]: levelInfo(FINAL.level).color }} />Solución · Caso final · Exclusivo del libro</span>
        <h2>{FINAL.title}</h2>
        <p>La solución de este caso no está en el libro: está guardada en la web. Cuando tengas el código (la columna de cada persona, en el orden de la lista), escríbelo en <b>{SITE}/#/secreto</b> o escanea el código.</p>
        <QR url={`${SITE_URL}#/secreto`} size={34} />
        <p>Si es correcto, verás quién lo hizo y por qué, y ganarás un logro secreto.</p>
      </div>
    </div>
  );
}

/** Media página que acompaña a la solución suelta de un caso: para apuntar cuándo se cerró y repasarlo en la web. */
function ClosedCard({ p }: { p: Puzzle }) {
  return (
    <div className="sol-half sol-closed">
      <span className="sol-closed__stamp">Caso cerrado</span>
      <div className="sol-closed__lines">
        <p>Resuelto por <span className="sol-closed__line" /></p>
        <p>el día <span className="sol-closed__line is-short" /> en <span className="sol-closed__line is-short" /> minutos.</p>
        <p>¿Te ha costado? <span className="sol-closed__stars">☆ ☆ ☆ ☆ ☆</span></p>
      </div>
      <div className="sol-closed__web">
        <QR url={caseUrl(p)} size={24} />
        <p><b>¿Te atascaste en algún paso?</b> Juega este caso en la web y pide pistas: te explican cada deducción, una a una.<span>{SITE}</span></p>
      </div>
      <p className="sol-closed__fan">Proyecto fan, gratuito y sin ánimo de lucro. Los personajes pertenecen a sus propietarios.</p>
    </div>
  );
}

function SolutionSheet({ page, children }: { page?: number; children: ReactNode }) {
  return <Page className="sol-sheet" page={page}>{children}</Page>;
}

/** Leyenda de objetos: dibujo, nombre y si se puede estar. */
function PrintLegend({ p, bw }: { p: Puzzle; bw: boolean }) {
  const items = useMemo(() => objectLegend(p), [p]);
  return (
    <div className="print-legend">
      <div className="print-legend__head">
        <span className="print-legend__title">En el plano hay…</span>
        <span className="print-legend__note">✓ se puede estar · ✕ no se puede estar</span>
      </div>
      <ul>
        {items.map((it) => (
          <li key={it.key} className={it.occupiable ? 'is-ok' : 'is-no'}>
            <span className="print-legend__icon" dangerouslySetInnerHTML={{ __html: legendIconSvg(it.def, bw) }} />
            <span className="print-legend__name">{it.name}</span>
            <span className="print-legend__rule">{it.occupiable ? '✓' : '✕'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ libro

export function BookCover({ dedication }: { dedication?: Dedication | null }) {
  return (
    <Page className="book-cover" page={1} showNum={false}>
      <div className="book-cover__logo"><Logo /></div>
      <p className="book-cover__sub">Sudoku con asesinato. Y con tus series favoritas.</p>
      {dedication && <p className="book-cover__for">Edición especial para <b>{dedication.para}</b></p>}
      <div className="book-cover__grid">
        {PUZZLES.map((q) => (
          <img key={q.id} src={`${BASE}img/print/covers/${q.id}-s.jpg`} alt="" style={{ ['--lvl' as string]: levelInfo(q.level).color }} />
        ))}
      </div>
      <p className="book-cover__foot">{PUZZLES.length} casos y un caso final secreto · {LEVELS.length} temporadas · de Muy fácil a Experto</p>
    </Page>
  );
}

const today = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

/** Dedicatoria (la que se escribió en Descargas o, si no, para escribirla a mano) y el carné de detective. */
function DedicationPage({ d }: { d: Dedication | null }) {
  return (
    <Page className={`dedication${d ? ' is-personal' : ''}`} page={2} showNum={false}>
      <div className="dedication__logo"><Logo /><span>Sudoku con asesinato</span></div>
      {d ? (
        <div className="dedication__text">
          <p className="dedication__para">Para {d.para}</p>
          {d.msg && <p className="dedication__msg">{d.msg}</p>}
          <p className="dedication__de">De {d.de}</p>
          <p className="dedication__date">{today()}</p>
        </div>
      ) : (
        <div className="dedication__text is-blank">
          <p className="dedication__kicker">Dedicatoria</p>
          <p className="dedication__row">Para <span className="dedication__line" /></p>
          <div className="dedication__lines" />
          <p className="dedication__row">De <span className="dedication__line" /></p>
        </div>
      )}
      <div className="dedication__card">
        <span className="dedication__photo">Pega aquí tu foto</span>
        <div className="dedication__fields">
          <span className="dedication__title">Carné de detective</span>
          <p>Nombre: <span className="dedication__field">{d?.para ?? ''}</span></p>
          <p>Fecha de alta: <span className="dedication__field">{d ? today() : ''}</span></p>
          <p className="dedication__solved">Casos resueltos (táchalos):</p>
          <div className="dedication__boxes">
            {PUZZLES.map((q) => <span key={q.id}>{q.num}</span>)}
            <span className="is-final">★</span>
          </div>
        </div>
      </div>
    </Page>
  );
}

/** Cómo se juega: objetivo, reglas, palabras clave, cómo marcar el plano y consejos. */
export function PrintRules({ page }: { page?: number }) {
  return (
    <Page className="rules" page={page}>
      <h1>Cómo se juega</h1>
      <p className="rules__lead">Cada caso es un asesinato en un lugar de una serie o película. Tienes el plano del lugar, a los sospechosos (con su pista y su móvil) y la víctima. Tu trabajo: <b>colocar a cada persona en su casilla</b> y descubrir quién estaba a solas con la víctima.</p>
      <h3>Las reglas</h3>
      <ul>
        <li><b>Una persona por fila y una por columna.</b> Hay tantas personas como filas, así que cada fila y cada columna tiene exactamente una.</li>
        <li>Solo se puede estar en casillas libres o en <b>objetos ocupables</b>: sillas, sillones, bancos, camas, alfombras, barcas… Nunca encima de mesas, estanterías, plantas, árboles o estatuas. La leyenda «En el plano hay…» de cada caso lo dice con ✓ y ✕.</li>
        <li>Las pistas siempre dicen la verdad. Cada caso tiene <b>una única solución</b> y se llega sin adivinar. Los móviles no dan pistas: todos tenían motivos.</li>
        <li>El asesino es <b>la única persona que estaba a solas con la víctima</b> en su zona (habitación).</li>
      </ul>
      <h3>Qué significan las pistas</h3>
      <ul className="rules__keys">
        <li><b>junto a:</b> en una casilla contigua (arriba, abajo, izquierda o derecha) dentro de la misma zona.</li>
        <li><b>con:</b> en la misma zona. <b>a solas con:</b> esas dos personas y nadie más en la zona.</li>
        <li><b>solo / sola:</b> nadie más en su zona, ni siquiera la víctima.</li>
        <li><b>al norte de:</b> en cualquier fila más arriba (sur = más abajo, este = más a la derecha, oeste = más a la izquierda).</li>
        <li><b>exactamente dos filas al norte:</b> justo esa distancia, ni una más ni una menos.</li>
        <li><b>esquina:</b> casilla donde se juntan dos paredes de su zona. <b>alguien / persona:</b> incluye a la víctima.</li>
      </ul>
      <h3>Cómo marcar el plano</h3>
      <ul>
        <li><b>X</b> en las casillas donde seguro que no hay nadie. Al colocar a alguien, tacha el resto de su fila y de su columna.</li>
        <li><b>Letras pequeñas</b> (a lápiz) con las personas que podrían estar en una casilla.</li>
        <li>En la <b>cuadrícula de deducción</b>, bajo cada plano, tacha las filas y columnas que ya no le valen a cada persona: cuando a alguien le quede una sola, márcala.</li>
      </ul>
      <h3>Cómo se avanza</h3>
      <p>Empieza por las pistas que señalan pocas casillas («estaba sentado en el trono»). Después cruza pistas: si A está al este de B y B ya está colocado, A solo puede estar a su derecha. Cuando te atasques, <b>supón</b>: «si C estuviera aquí…» y sigue las consecuencias; si llevan a algo imposible, esa casilla queda descartada. En la página siguiente tienes un ejemplo resuelto y, después, la Escuela de detectives con todas las técnicas.</p>
    </Page>
  );
}

/** Un ejemplo resuelto paso a paso: el minicaso del tutorial de la web. */
export function ExamplePage({ page }: { page?: number }) {
  const t = useMemo(() => compilePuzzle(TUTORIAL), []);
  const steps = useMemo(() => solveLogically(t).steps, [t]);
  const svg = useMemo(() => renderBoard(t, { coords: true, bw: false, vectorFloors: true, idp: 'ejemplo' }), [t]);
  const murderer = t.cast.find((c) => c.id === t.murderer)!;
  const victim = t.cast.find((c) => c.victim)!;
  const room = t.rooms[t.cells[t.solution[victim.id]].room];
  return (
    <Page className="example" page={page}>
      <h1>Un ejemplo resuelto</h1>
      <p className="example__story"><b>«{t.title}».</b> {t.story.intro}</p>
      <div className="example__top">
        <div className="print-board example__board" dangerouslySetInnerHTML={{ __html: svg }} />
        <ul className="example__cast">
          {t.cast.map((ch) => (
            <li key={ch.id}>
              <Portrait p={t} ch={ch} variant="print" className="example__face" />
              <span><b>{displayName(ch)}</b> <span className="example__clue">{ch.victim ? 'Víctima. Estaba a solas con el asesino.' : <ClueLine p={t} ch={ch} />}</span></span>
            </li>
          ))}
        </ul>
      </div>
      <h3>Así se resuelve</h3>
      <ol className="example__steps">
        {steps.map((d, k) => (
          <li key={k}>
            <span className="step__tech">{TECH_NAME[d.tech] ?? 'Deducción'}.</span> {d.text}
            {d.place && <b className="step__put"> → {displayName(t.cast[d.place.k])} en {cellName(t, d.place.i)}</b>}
          </li>
        ))}
      </ol>
      <p className="example__verdict"><b>¿Quién es el asesino?</b> En {roomPhrase(room, '')} están {withPrep('', victim)} y {withPrep('', murderer)}, y nadie más: <b>{displayName(murderer)}</b> estaba a solas con la víctima, así que es {murderer.gender === 'f' ? 'la asesina' : 'el asesino'}.</p>
      <p className="example__tip">Los casos del libro son más grandes y más difíciles, pero se resuelven igual: una deducción detrás de otra. Al final del libro tienes la solución de cada uno, con el orden en que se coloca a cada persona.</p>
    </Page>
  );
}

/** El paso del minicaso de una lección que mejor enseña su técnica, y quién estaba ya colocado antes de él. */
function lessonExample(l: Lesson, p: Puzzle) {
  const steps = solveLogically(p).steps;
  const want = (d: Deduction) => (!l.focusTech.length || l.focusTech.includes(d.tech)) && (d.tech !== 'single' || d.text.startsWith('Por su pista'));
  const j = Math.max(0, steps.findIndex(want));
  const placed = new Map<number, number>();
  for (const d of steps.slice(0, j)) if (d.place) placed.set(d.place.k, d.place.i);
  return { step: steps[j], placed };
}

/** Minitablero de la lección: lo ya colocado, lo tachado, dónde mirar (amarillo) y la conclusión del paso. */
function lessonSvg(p: Puzzle, idp: string, step: Deduction, placed: Map<number, number>) {
  const base = renderBoard(p, { coords: true, bw: false, vectorFloors: true, idp });
  const { off } = boardSize(p, true);
  const s = p.size;
  const x = (i: number) => off + (i % s) * CELL, y = (i: number) => off + Math.floor(i / s) * CELL;
  const band = (bx: number, by: number, w: number, h: number) => `<rect x="${bx}" y="${by}" width="${w}" height="${h}" fill="#ffd54a" fill-opacity=".3"/>`;
  const cross = (i: number, color: string, w = 7) => `<path d="M${x(i) + 30} ${y(i) + 30}L${x(i) + 70} ${y(i) + 70}M${x(i) + 70} ${y(i) + 30}L${x(i) + 30} ${y(i) + 70}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
  let o = '';
  for (const r of step.focus.rows) o += band(off, off + r * CELL, s * CELL, CELL);
  for (const c of step.focus.cols) o += band(off + c * CELL, off, CELL, s * CELL);
  for (const room of step.focus.rooms) p.cells.forEach((cell, i) => { if (cell.room === room) o += band(x(i), y(i), CELL, CELL); });
  const taken = new Set(placed.values());
  const rows = new Set([...taken].map((i) => Math.floor(i / s))), cols = new Set([...taken].map((i) => i % s));
  p.cells.forEach((cell, i) => {
    if (cell.occupiable && !taken.has(i) && (rows.has(Math.floor(i / s)) || cols.has(i % s))) o += cross(i, '#9b91ad', 6);
  });
  for (const i of step.focus.cells) if (!taken.has(i)) o += `<rect x="${x(i) + 4}" y="${y(i) + 4}" width="${CELL - 8}" height="${CELL - 8}" rx="8" fill="#ffd54a" fill-opacity=".55" stroke="#d99a00" stroke-width="6"/>`;
  const who = p.cast.findIndex((c) => c.id === step.focus.chars[0]);
  if (!step.place && who >= 0 && step.focus.cells.length) {
    // Apuntes a lápiz: las casillas que le quedan a esa persona.
    for (const i of step.focus.cells) o += `<text x="${x(i) + 50}" y="${y(i) + 62}" text-anchor="middle" font-family="Kalam, 'Comic Sans MS', cursive" font-size="40" fill="#5a4e70">${p.cast[who].tag}</text>`;
  } else if (!step.place) {
    // Lo que descarta el paso, en rojo.
    for (const i of new Set(step.elim.map(([, c]) => c))) if (!taken.has(i)) o += cross(i, '#d8364f');
  }
  for (const [k, i] of placed) o += tokenSvg(p, i, p.cast[k].tag, '#ffffff');
  if (step.place) o += tokenSvg(p, step.place.i, p.cast[step.place.k].tag, '#f3b53f', '#251a37', '#1f8f6e');
  return base.replace('</svg>', `${o}</svg>`);
}

/** La explicación de una lección sin las frases que hablan de la web («Lápiz», Ajustes…): en papel no hay botones. */
const WEB_ONLY = /«(Lápiz|Tachar|Ocupada)»|Ajustes|[Ee]l juego|toca su retrato|herramienta/;
const paperExplain = (l: Lesson) => l.explain
  .map((par) => par.split(/(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«])/).filter((sen) => !WEB_ONLY.test(sen)).join(' '))
  .filter(Boolean)
  .slice(0, 2);

function SchoolLesson({ l, n }: { l: Lesson; n: number }) {
  const p = useMemo(() => lessonPuzzle(l), [l]);
  const ex = useMemo(() => lessonExample(l, p), [l, p]);
  const svg = useMemo(() => lessonSvg(p, `esc-${l.id}`, ex.step, ex.placed), [p, l.id, ex]);
  return (
    <article className="school__item">
      <figure className="school__fig">
        <div className="print-board school__board" dangerouslySetInnerHTML={{ __html: svg }} />
        <figcaption>{p.cast.map((ch) => <span key={ch.id}><b>{ch.tag}</b> {displayName(ch)}{ch.victim ? ' (víctima)' : ''}</span>)}</figcaption>
      </figure>
      <div className="school__text">
        <h2><span className="school__n">{n}</span>{l.title}</h2>
        <p className="school__skill">{l.skill}</p>
        {paperExplain(l).map((par, j) => <p key={j}>{par}</p>)}
        <p className="school__ex"><b>En el ejemplo.</b> {ex.step.text}</p>
        <p className="school__tip"><b>Truco.</b> {l.tip}</p>
      </div>
    </article>
  );
}

function SchoolPage({ lessons, index, page }: { lessons: Lesson[]; index: number; page?: number }) {
  const ref = useFit([index], 2);
  return (
    <Page className="school" page={page}>
      <div className="page__inner" ref={ref}>
        {index === 0 ? (
          <header className="school__head">
            <div>
              <h1>Escuela de detectives</h1>
              <p className="school__lead">Las técnicas para resolver cualquier caso, de la más sencilla a la más avanzada, cada una con un minicaso de la Academia de la web. En los dibujos, lo amarillo es dónde hay que mirar; lo dorado, a quién se coloca, y las letras a lápiz, dónde puede estar aún alguien.</p>
            </div>
            <figure className="school__qr">
              <QR url={`${SITE_URL}#/academia`} size={20} />
              <figcaption>Practícalas en la Academia</figcaption>
            </figure>
          </header>
        ) : <p className="school__more">Escuela de detectives · {index + 1} de {SCHOOL_PAGES}</p>}
        {lessons.map((l, j) => <SchoolLesson key={l.id} l={l} n={index * 3 + j + 1} />)}
      </div>
    </Page>
  );
}

/** La escuela de detectives: las técnicas de la Academia, tres por página, con su ejemplo dibujado. */
function SchoolPages({ first }: { first?: number }) {
  return <>{chunk(LESSONS, 3).map((ls, j) => <SchoolPage key={j} lessons={ls} index={j} page={first !== undefined ? first + j : undefined} />)}</>;
}

/** La web: un caso nuevo cada día, pistas paso a paso, modo pareja… y cómo usar este libro. */
export function WebPage({ page }: { page?: number }) {
  return (
    <Page className="web" page={page}>
      <h1>Juega también en la web</h1>
      <p className="web__lead">Este libro es solo el principio: en la web hay <b>un caso nuevo cada día</b> y los casos se van actualizando.</p>
      <div className="web__qrs">
        <figure>
          <QR url={SITE_URL} size={56} />
          <figcaption><b>Churri-doku</b>Todos los casos, con pistas</figcaption>
        </figure>
        <figure>
          <QR url={`${SITE_URL}#/diario`} size={56} />
          <figcaption><b>El caso del día</b>Uno nuevo cada mañana</figcaption>
        </figure>
      </div>
      <p className="web__url">{SITE}</p>
      <ul className="web__list">
        <li><b>Pistas que te explican el razonamiento:</b> primero un empujoncito, luego la explicación completa y, a la tercera, dónde está uno de los personajes.</li>
        <li><b>Modo pareja en directo:</b> resolved el mismo caso juntos desde dos móviles, o echad un duelo a ver quién lo resuelve antes.</li>
        <li><b>Tu progreso en tu cuenta</b>, en el móvil y en el ordenador, con logros, rachas y la Academia para aprender las técnicas.</li>
      </ul>
      <div className="web__how">
        <h3>Cómo usar este libro</h3>
        <ul>
          <li>Cada caso ocupa una <b>doble página</b>: a la izquierda, la historia y los sospechosos con su pista y su móvil; a la derecha, el plano y la cuadrícula de deducción.</li>
          <li>Debajo de cada plano hay un <b>código QR</b> para jugar ese mismo caso en la web, con pistas.</li>
          <li>Al final están las <b>soluciones</b>, dos por página: el plano resuelto, el perfil del asesino y el orden en que se coloca a cada persona.</li>
          <li>Los casos van de <b>Muy fácil a Experto</b>, en cinco temporadas. El último, el <b>caso final</b>, solo está en el libro y su solución se desbloquea en la web.</li>
        </ul>
      </div>
    </Page>
  );
}

export function BookIndex({ page, solPage, finalPage }: { page?: number; solPage: (k: number) => number; finalPage: number }) {
  return (
    <Page className="book-index" page={page}>
      <h1>Índice</h1>
      <p className="book-index__front">Cómo se juega · 3 &nbsp;·&nbsp; Un ejemplo resuelto · 4 &nbsp;·&nbsp; Escuela de detectives · 5 &nbsp;·&nbsp; Juega también en la web · {5 + SCHOOL_PAGES}</p>
      {LEVELS.map((l) => (
        <section key={l.level} className="book-index__level" style={{ ['--lvl' as string]: l.color }}>
          <h2><span className="lvl-dot" />{l.season} · {l.name}</h2>
          <ol>
            {PUZZLES.map((q, k) => (q.level === l.level ? (
              <li key={q.id}>
                <span className="book-index__num">Nº {num(q)}</span>
                <span className="book-index__name">{q.title} <i>· {q.franchise}</i></span>
                <span className="book-index__dots" />
                <span className="book-index__page">{bookCasePage(k)}</span>
                <span className="book-index__sol">sol. {solPage(k)}</span>
              </li>
            ) : null))}
          </ol>
        </section>
      ))}
      <section className="book-index__level is-final">
        <h2><span className="lvl-dot" />Caso final · Exclusivo del libro</h2>
        <ol>
          <li>
            <span className="book-index__num">★</span>
            <span className="book-index__name">{FINAL.title} <i>· {FINAL.franchise}</i></span>
            <span className="book-index__dots" />
            <span className="book-index__page">{finalPage}</span>
            <span className="book-index__sol">en la web</span>
          </li>
        </ol>
      </section>
      <p className="book-index__solh">Soluciones <span className="book-index__dots" /> {solPage(0)}</p>
    </Page>
  );
}

function NotesPage({ page }: { page?: number }) {
  return (
    <Page className="notes" page={page}>
      <h1>Notas</h1>
      <div className="notes__lines" />
    </Page>
  );
}

export function BookBack({ page }: { page?: number }) {
  return (
    <Page className="book-back" page={page} showNum={false}>
      <div className="book-back__logo"><Logo /></div>
      <p className="book-back__blurb">{PUZZLES.length} casos de lógica con asesinato y personajes de tus series y películas favoritas, y un caso final que solo está en este libro. Coloca a cada sospechoso en el plano sin repetir fila ni columna y averigua quién se quedó a solas con la víctima. Sin adivinar: todo sale con lógica.</p>
      <ul className="book-back__levels">
        {LEVELS.map((l) => (
          <li key={l.level} style={{ borderColor: l.color }}>
            <strong>{l.season} · {l.name}</strong>
            <span>{PUZZLES.filter((q) => q.level === l.level).map((q) => q.franchise).join(' · ')}</span>
          </li>
        ))}
      </ul>
      <div className="book-back__web">
        <QR url={SITE_URL} size={34} />
        <p><b>Un caso nuevo cada día en la web</b>, con pistas paso a paso y modo pareja en directo.<span>{SITE}</span></p>
      </div>
      <p className="book-back__fan">Proyecto fan, gratuito y sin ánimo de lucro. Los personajes pertenecen a sus propietarios; las ilustraciones se han creado con IA para este proyecto.</p>
    </Page>
  );
}

/**
 * El libro completo. Las soluciones van de dos en dos (la última media página es la del caso final) y al final
 * hay las notas justas para que la contraportada caiga en página par y cierre el libro.
 */
function Book({ dedication }: { dedication: Dedication | null }) {
  const finalPage = bookCasePage(PUZZLES.length);
  const solStart = finalPage + 2;
  const solPage = (k: number) => solStart + Math.floor(k / 2);
  const sheets = chunk([...PUZZLES.map((q) => <SolutionHalf key={q.id} p={q} />), <FinalSlot key="final" />], 2);
  const next = solStart + sheets.length;
  const notes = (next + 1) % 2 === 0 ? 1 : 2;
  return (
    <>
      <BookCover dedication={dedication} />
      <DedicationPage d={dedication} />
      <PrintRules page={3} />
      <ExamplePage page={4} />
      <SchoolPages first={5} />
      <WebPage page={5 + SCHOOL_PAGES} />
      <BookIndex page={6 + SCHOOL_PAGES} solPage={solPage} finalPage={finalPage} />
      {FRONT_PAD ? <NotesPage page={FRONT + 1} /> : null}
      {PUZZLES.map((q, k) => [
        <CaseLeftPage key={`l-${q.id}`} p={q} bw={false} page={bookCasePage(k)} />,
        <CaseRightPage key={`r-${q.id}`} p={q} bw={false} page={bookCasePage(k) + 1} />,
      ])}
      <CaseLeftPage p={FINAL} bw={false} page={finalPage} />
      <CaseRightPage p={FINAL} bw={false} page={finalPage + 1} />
      {sheets.map((pair, j) => <SolutionSheet key={j} page={solStart + j}>{pair}</SolutionSheet>)}
      {Array.from({ length: notes }, (_, j) => <NotesPage key={`n-${j}`} page={next + j} />)}
      <BookBack page={next + notes} />
    </>
  );
}

/** Barra (solo en pantalla) para imprimir o guardar en PDF desde el navegador el libro dedicado o para encuadernar. */
function PrintToolbar({ bound, dedicated }: { bound: boolean; dedicated: boolean }) {
  const go = (b: boolean) => navigate(`/imprimir/libro?${[dedicated ? 'dedicado=1' : '', b ? 'encuadernar=1' : ''].filter(Boolean).join('&')}`);
  return (
    <div className="print-toolbar">
      <a className="print-toolbar__back" href="#/descargas">← Descargas</a>
      <p><b>{dedicated ? 'Tu libro dedicado está listo.' : 'El libro está listo.'}</b> Para guardarlo en PDF: «Imprimir», destino «Guardar como PDF», papel A4, márgenes «Ninguno» y con «Gráficos de fondo».</p>
      <label className="print-toolbar__check"><input type="checkbox" checked={bound} onChange={(e) => go(e.target.checked)} /> Con margen para encuadernar</label>
      <button className="print-toolbar__go" onClick={() => window.print()}>Imprimir o guardar en PDF</button>
    </div>
  );
}

function readDedication(): Dedication | null {
  const d = load<Dedication | null>(DEDICATION_KEY, null);
  return d && d.para?.trim() && d.de?.trim() ? { para: d.para.trim(), de: d.de.trim(), msg: d.msg?.trim() || undefined } : null;
}

export default function PrintPage({ p, kind, query }: { p: Puzzle | null; kind: Kind | 'portada' | 'reglas' | 'libro'; query?: URLSearchParams }) {
  const bound = kind === 'libro' && query?.get('encuadernar') === '1';
  const dedicated = kind === 'libro' && query?.get('dedicado') === '1';
  const dedication = useMemo(() => (dedicated ? readDedication() : null), [dedicated]);
  useEffect(() => {
    document.documentElement.classList.add('print-mode');
    // Señal para el generador de PDF: todo cargado (fuentes, imágenes y los ajustes de tamaño).
    const done = async () => {
      try { await document.fonts.ready; } catch { /* sin API de fuentes */ }
      const imgs = () => Promise.all(Array.from(document.images).map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = r; im.onerror = r; }))));
      await imgs();
      // Una vuelta más para que los últimos ajustes («no cabe, encoge») se pinten antes de imprimir.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await imgs();
      document.body.setAttribute('data-print-ready', '1');
    };
    void done();
    return () => document.documentElement.classList.remove('print-mode');
  }, []);
  if (kind === 'portada') return <BookCover />;
  if (kind === 'reglas') return <><PrintRules /><ExamplePage /><SchoolPages /><WebPage /></>;
  if (kind === 'libro') {
    // El margen del lomo tiene que estar desde el primer pintado (cada página mide si su contenido cabe al montarse);
    // al cambiarlo, el libro se vuelve a montar para medirlo otra vez.
    return (
      <div key={bound ? 'b' : 'n'} className={bound ? 'print-bound' : undefined}>
        <PrintToolbar bound={bound} dedicated={dedicated} />
        <Book dedication={dedication} />
      </div>
    );
  }
  if (!p) return <p style={{ padding: 40 }}>Caso no encontrado.</p>;
  if (kind === 'solucion') return <SolutionSheet><SolutionHalf p={p} /><ClosedCard p={p} /></SolutionSheet>;
  const bw = kind === 'bn';
  return (
    <>
      <CaseCoverPage p={p} bw={bw} />
      <CaseLeftPage p={p} bw={bw} />
      <CaseRightPage p={p} bw={bw} />
      <CaseBackPage p={p} bw={bw} />
    </>
  );
}
