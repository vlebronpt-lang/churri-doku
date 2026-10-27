import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import qrcode from 'qrcode-generator';
import type { Puzzle } from '../../engine/types';
import { boardSize, CELL, renderBoard } from '../../render/board';
import { clueSentences, displayName, roomPhrase, withPrep } from '../../engine/text';
import { compilePuzzle } from '../../engine/puzzle';
import { TUTORIAL } from '../../data/tutorial';
import { TECH_NAME } from '../game/HintPanel';
import { solveLogically } from '../../engine/logic';
import { levelInfo, PUZZLES, LEVELS } from '../../data/puzzles';
import { Portrait, charColor } from '../Portrait';
import { Logo } from '../Logo';
import { legendIconSvg, objectLegend } from '../../render/legend';

/*
 * Versión para imprimir, en formato libro (A4 vertical):
 *  - cada caso: portada, doble página (izquierda: personajes y objetos; derecha: el plano y su QR) y contraportada;
 *  - la solución aparte: el asesino y el paso a paso, en las páginas que haga falta;
 *  - el libro: portada, cómo se juega, un ejemplo resuelto, la web (con QR), índice, los casos en doble página,
 *    las soluciones con el paso a paso, notas y contraportada.
 */

type Kind = 'color' | 'bn' | 'solucion';
const SITE = 'vlebronpt-lang.github.io/churri-doku';
const SITE_URL = `https://${SITE}/`;
const caseUrl = (p: Puzzle) => `${SITE_URL}#/caso/${p.id}`;
const BASE = import.meta.env.BASE_URL;
const num = (p: Puzzle) => String(p.num).padStart(2, '0');

/** En el libro, tras portada, cómo se juega, ejemplo, web e índice: página izquierda de cada caso (siempre par). */
export const BOOK_FIRST_CASE = 6;
export const bookCasePage = (k: number) => BOOK_FIRST_CASE + 2 * k;

function Page({ className = '', page, children }: { className?: string; page?: number; children: ReactNode }) {
  return (
    <section className={`page ${className}`}>
      {children}
      {page !== undefined && <span className={`page__num${page % 2 ? ' is-right' : ''}`}>{page}</span>}
    </section>
  );
}

/**
 * Si el contenido no cabe en la página, se encoge un poco (hasta dos veces). Se mide cuando las fuentes ya
 * están cargadas (con la provisional todo ocupa más) y se prueban los tamaños de mayor a menor.
 */
function useFit(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    let alive = true;
    const fit = () => {
      const inner = ref.current;
      const pg = inner?.parentElement;
      if (!alive || !inner || !pg) return;
      for (const level of [0, 1, 2]) {
        pg.classList.remove('is-tight1', 'is-tight2');
        if (level) pg.classList.add(`is-tight${level}`);
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
        <span className="page__kicker"><span className="lvl-dot" style={{ ['--lvl' as string]: lvl.color }} />Nº {num(p)} · {p.franchise} · {lvl.name} · {p.size}×{p.size}</span>
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

/** Página izquierda del caso: la historia, los sospechosos con sus pistas y los objetos del plano. */
export function CaseLeftPage({ p, bw, page }: { p: Puzzle; bw: boolean; page?: number }) {
  const ref = useFit([p.id, bw]);
  return (
    <Page className={`case-left${bw ? ' is-bw' : ''}`} page={page}>
      <div className="page__inner" ref={ref}>
        <CaseHead p={p} />
        <p className="case-left__story">{p.story.intro}</p>
        <h2 className="page__section">Sospechosos</h2>
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
                <span className="ps__clue">{ch.victim && <span className="ps__victim">Víctima. </span>}<ClueLine p={p} ch={ch} /></span>
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

/** Página derecha del caso: el plano grande, la respuesta, un recordatorio de las reglas, sitio para notas y el QR del caso. */
export function CaseRightPage({ p, bw, page }: { p: Puzzle; bw: boolean; page?: number }) {
  const svg = useMemo(() => renderBoard(p, { coords: true, bw, vectorFloors: true, idp: `pr-${p.id}-${bw ? 'bn' : 'c'}-${page ?? 0}` }), [p, bw, page]);
  return (
    <Page className={`case-right${bw ? ' is-bw' : ''}`} page={page}>
      <CaseHead p={p} small />
      <div className="print-board" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="case-right__answer">El asesino es: <span className="case-right__blank" /></div>
      <p className="case-right__rules"><b>Reglas:</b> una persona por fila y por columna · solo en casillas sin objetos que lo impidan (sillas, camas, alfombras… sí) · <b>junto a</b> = casilla contigua en la misma zona · la víctima estaba <b>a solas</b> con el asesino.</p>
      <div className="case-right__notes"><span>Notas</span></div>
      <footer className="case-right__foot">
        <QR url={caseUrl(p)} size={19} />
        <span><b>Juega este caso en la web</b>, con pistas que te explican cada paso: escanea el código o entra en <b>{SITE}</b>.</span>
      </footer>
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
        <p>Marca con una X las casillas donde no hay nadie y apunta a lápiz las posibilidades. Hay una única solución y se llega sin adivinar.</p>
      </div>
      <div className="case-back__cast" aria-label="Personajes de este caso">
        {p.cast.map((ch) => (
          <span key={ch.id} className={`case-back__who${ch.victim ? ' is-victim' : ''}`}>
            <Portrait p={p} ch={ch} variant={bw ? 'print-bn' : 'print'} className="case-back__face" />
            <span>{displayName(ch)}</span>
          </span>
        ))}
      </div>
      <p className="case-back__sol">La solución de «{p.title}», con el paso a paso y el asesino, está en su archivo aparte.</p>
      <div className="case-back__web">
        <QR url={SITE_URL} size={26} />
        <p><b>Un caso nuevo cada día en la web</b>, con pistas paso a paso y modo pareja en directo.<br /><span>{SITE}</span></p>
      </div>
      <p className="case-back__fan">Proyecto fan, gratuito y sin ánimo de lucro. Los personajes pertenecen a sus propietarios; las ilustraciones se han creado con IA para este proyecto.</p>
    </Page>
  );
}

function SolutionBoard({ p, width }: { p: Puzzle; width?: number }) {
  const svg = useMemo(() => {
    const base = renderBoard(p, { coords: true, bw: false, vectorFloors: true, idp: `sol-${p.id}` });
    const { off } = boardSize(p, true);
    let tokens = '';
    for (const ch of p.cast) {
      const i = p.solution[ch.id];
      const x = off + (i % p.size) * CELL + CELL / 2, y = off + Math.floor(i / p.size) * CELL + CELL / 2;
      const fill = ch.victim ? '#e23d6b' : ch.id === p.murderer ? '#f3b53f' : '#ffffff';
      tokens += `<circle cx="${x}" cy="${y}" r="33" fill="${fill}" stroke="#251a37" stroke-width="6"/><text x="${x}" y="${y + 11}" text-anchor="middle" font-family="Bungee, Archivo Black, sans-serif" font-size="${ch.tag.length > 1 ? 24 : 32}" fill="${ch.victim ? '#fff' : '#251a37'}">${ch.tag}</text>`;
    }
    return base.replace('</svg>', `${tokens}</svg>`);
  }, [p]);
  return <div className="print-board" style={width ? { width: `${width}mm` } : undefined} dangerouslySetInnerHTML={{ __html: svg }} />;
}

// Reparto del paso a paso en páginas: se mide en el navegador (con las fuentes ya cargadas) y se pasa a la
// página siguiente cuando un paso no cabe. Mientras quede alguno por repartir, la hoja no está lista para imprimir.
let pendingFlows = 0;
let flowWaiters: (() => void)[] = [];
const flowsSettled = () => new Promise<void>((resolve) => { if (pendingFlows) flowWaiters.push(resolve); else resolve(); });
function flowDone() {
  pendingFlows = Math.max(0, pendingFlows - 1);
  if (!pendingFlows) { const w = flowWaiters; flowWaiters = []; w.forEach((f) => f()); }
}

const cellName = (p: Puzzle, i: number) => `F${Math.floor(i / p.size) + 1}·C${(i % p.size) + 1}`;

/**
 * La solución de un caso, en las páginas que haga falta: el plano resuelto, quién es el asesino, el epílogo y
 * el paso a paso completo para llegar a ella (cada deducción con su explicación).
 */
export function SolutionPages({ p, page, onPages }: { p: Puzzle; page?: number; onPages?: (n: number) => void }) {
  const steps = useMemo(() => solveLogically(p).steps, [p]);
  const [splits, setSplits] = useState<number[]>([0]);
  const [fontsReady, setFontsReady] = useState(false);
  const lists = useRef<(HTMLOListElement | null)[]>([]);
  const settled = useRef(false);
  useLayoutEffect(() => {
    // En desarrollo React monta, desmonta y vuelve a montar: cada montaje cuenta (y se descuenta) una vez.
    settled.current = false;
    pendingFlows++;
    let alive = true;
    (document.fonts?.ready ?? Promise.resolve()).then(() => { if (alive) setFontsReady(true); }).catch(() => setFontsReady(true));
    return () => { alive = false; if (!settled.current) { settled.current = true; flowDone(); } };
  }, []);
  useLayoutEffect(() => {
    if (!fontsReady || settled.current) return;
    const last = splits.length - 1;
    const list = lists.current[last];
    if (!list) return;
    const limit = list.getBoundingClientRect().bottom;
    const over = ([...list.children] as HTMLElement[]).findIndex((el) => el.getBoundingClientRect().bottom > limit + 0.5);
    if (over >= 0) {
      const next = splits[last] + Math.max(1, over);
      if (next < steps.length) { setSplits([...splits, next]); return; }
    }
    settled.current = true;
    onPages?.(splits.length);
    flowDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsReady, splits]);

  const murderer = p.cast.find((c) => c.id === p.murderer)!;
  const victim = p.cast.find((c) => c.victim)!;
  const room = p.rooms[p.cells[p.solution[victim.id]].room];
  const lvl = levelInfo(p.level);
  const item = (k: number) => {
    const d = steps[k];
    return (
      <li key={k} className={d.place ? 'is-place' : ''}>
        <span className="step__n">{k + 1}</span>
        <span className="step__t">
          <span className="step__tech">{TECH_NAME[d.tech] ?? 'Deducción'}.</span> {d.text}
          {d.place && <b className="step__put"> → {displayName(p.cast[d.place.k])} en {cellName(p, d.place.i)}</b>}
        </span>
      </li>
    );
  };
  return (
    <>
      {splits.map((from, j) => {
        const to = splits[j + 1] ?? steps.length;
        const ks = Array.from({ length: to - from }, (_, x) => from + x);
        return (
          <Page key={j} className={`solution${j ? ' solution--more' : ''}`} page={page !== undefined ? page + j : undefined}>
            <header className="page__head page__head--small">
              <span className="page__logo"><Logo compact /></span>
              <div className="page__title">
                <span className="page__kicker">Solución · Nº {num(p)} · {p.franchise} · {lvl.name}{j ? ' · continuación' : ''}</span>
                <h1>{p.title}</h1>
              </div>
            </header>
            {j === 0 && (
              <div className="solution__top">
                <SolutionBoard p={p} />
                <div className="solution__verdict">
                  <span className="solution__label">El asesino es</span>
                  <div className="solution__who">
                    <Portrait p={p} ch={murderer} variant="print" className="solution__face" />
                    <strong>{displayName(murderer)}</strong>
                  </div>
                  <p>Estaba a solas con {withPrep('', victim)} {roomPhrase(room, 'en')} ({cellName(p, p.solution[murderer.id])}).</p>
                  <p className="solution__epilogue">{p.story.epilogue}</p>
                </div>
              </div>
            )}
            <h3 className="solution__h">{j === 0 ? `Paso a paso (${steps.length} deducciones; las colocaciones, resaltadas)` : 'Paso a paso (continuación)'}</h3>
            <ol className="solution__steps" ref={(el) => { lists.current[j] = el; }}>{ks.map(item)}</ol>
          </Page>
        );
      })}
    </>
  );
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

export function BookCover() {
  return (
    <Page className="book-cover">
      <div className="book-cover__logo"><Logo /></div>
      <p className="book-cover__sub">Sudoku con asesinato. Y con tus series favoritas.</p>
      <div className="book-cover__grid">
        {PUZZLES.map((q) => (
          <img key={q.id} src={`${BASE}img/print/covers/${q.id}-s.jpg`} alt="" style={{ ['--lvl' as string]: levelInfo(q.level).color }} />
        ))}
      </div>
      <p className="book-cover__foot">{PUZZLES.length} casos · {LEVELS.length} temporadas · de Muy fácil a Experto</p>
    </Page>
  );
}

/** Cómo se juega: objetivo, reglas, palabras clave, cómo marcar el plano y consejos. */
export function PrintRules({ page }: { page?: number }) {
  return (
    <Page className="rules" page={page}>
      <h1>Cómo se juega</h1>
      <p className="rules__lead">Cada caso es un asesinato en un lugar de una serie o película. Tienes el plano del lugar, a los sospechosos y una pista de cada uno. Tu trabajo: <b>colocar a cada persona en su casilla</b> y descubrir quién estaba a solas con la víctima.</p>
      <h3>Las reglas</h3>
      <ul>
        <li><b>Una persona por fila y una por columna.</b> Hay tantas personas como filas, así que cada fila y cada columna tiene exactamente una.</li>
        <li>Solo se puede estar en casillas libres o en <b>objetos ocupables</b>: sillas, sillones, bancos, camas, alfombras, barcas… Nunca encima de mesas, estanterías, plantas, árboles o estatuas. La leyenda «En el plano hay…» de cada caso lo dice con ✓ y ✕.</li>
        <li>Las pistas siempre dicen la verdad. Cada caso tiene <b>una única solución</b> y se llega sin adivinar.</li>
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
        <li>Si sabes en qué zona está alguien pero no la casilla, escribe su letra en esa zona.</li>
      </ul>
      <h3>Cómo se avanza</h3>
      <p>Empieza por las pistas que señalan pocas casillas («estaba sentado en el trono»). Después cruza pistas: si A está al este de B y B ya está colocado, A solo puede estar a su derecha. Cuando te atasques, <b>supón</b>: «si C estuviera aquí…» y sigue las consecuencias; si llevan a algo imposible, esa casilla queda descartada. En la página siguiente tienes un ejemplo resuelto paso a paso.</p>
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
      <p className="example__tip">Los casos del libro son más grandes y más difíciles, pero se resuelven igual: una deducción detrás de otra. Al final del libro tienes el paso a paso de cada uno.</p>
    </Page>
  );
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
          <li>Cada caso ocupa una <b>doble página</b>: a la izquierda, la historia, los sospechosos con sus pistas y los objetos del plano; a la derecha, el plano para resolverlo.</li>
          <li>Debajo de cada plano hay un <b>código QR</b> para jugar ese mismo caso en la web, con pistas.</li>
          <li>Al final están las <b>soluciones</b>: el asesino de cada caso y el paso a paso para llegar a él.</li>
          <li>Los casos van de <b>Muy fácil a Experto</b>, en cinco temporadas. Si es tu primera vez, empieza por el principio.</li>
        </ul>
      </div>
    </Page>
  );
}

export function BookIndex({ page, solPages }: { page?: number; solPages: (number | undefined)[] }) {
  return (
    <Page className="book-index" page={page}>
      <h1>Índice</h1>
      <p className="book-index__front">Cómo se juega · 2 &nbsp;·&nbsp; Un ejemplo resuelto · 3 &nbsp;·&nbsp; Juega también en la web · 4</p>
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
                <span className="book-index__sol">{solPages[k] !== undefined ? `sol. ${solPages[k]}` : ''}</span>
              </li>
            ) : null))}
          </ol>
        </section>
      ))}
      <p className="book-index__solh">Soluciones y paso a paso <span className="book-index__dots" /> {solPages[0] ?? ''}</p>
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

export function BookBack() {
  return (
    <Page className="book-back">
      <div className="book-back__logo"><Logo /></div>
      <p className="book-back__blurb">{PUZZLES.length} casos de lógica con asesinato y personajes de tus series y películas favoritas. Coloca a cada sospechoso en el plano sin repetir fila ni columna y averigua quién se quedó a solas con la víctima. Sin adivinar: todo sale con lógica.</p>
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
 * El libro completo. Las soluciones ocupan las páginas que haga falta; cuando todas han dicho cuántas, se numeran
 * y se añaden las notas justas para que la contraportada caiga en página par y cierre el libro.
 */
function Book() {
  const [counts, setCounts] = useState<(number | undefined)[]>(() => PUZZLES.map(() => undefined));
  const known = counts.every((c) => c !== undefined);
  const solPages: (number | undefined)[] = [];
  let next = bookCasePage(PUZZLES.length);
  for (const c of counts) {
    solPages.push(known ? next : undefined);
    next += c ?? 1;
  }
  // next: primera página tras las soluciones. La contraportada tiene que caer en par; mínimo una página de notas.
  const notes = (next + 1) % 2 === 0 ? 1 : 2;
  return (
    <>
      <BookCover />
      <PrintRules page={2} />
      <ExamplePage page={3} />
      <WebPage page={4} />
      <BookIndex page={5} solPages={solPages} />
      {PUZZLES.map((q, k) => [
        <CaseLeftPage key={`l-${q.id}`} p={q} bw={false} page={bookCasePage(k)} />,
        <CaseRightPage key={`r-${q.id}`} p={q} bw={false} page={bookCasePage(k) + 1} />,
      ])}
      {PUZZLES.map((q, k) => (
        <SolutionPages key={`s-${q.id}`} p={q} page={solPages[k]} onPages={(n) => setCounts((cur) => (cur[k] === n ? cur : cur.map((c, j) => (j === k ? n : c))))} />
      ))}
      {Array.from({ length: notes }, (_, j) => <NotesPage key={`n-${j}`} page={known ? next + j : undefined} />)}
      <BookBack />
    </>
  );
}

export default function PrintPage({ p, kind }: { p: Puzzle | null; kind: Kind | 'portada' | 'reglas' | 'libro' }) {
  useEffect(() => {
    document.documentElement.classList.add('print-mode');
    // Señal para el generador de PDF: todo cargado (fuentes, imágenes y el reparto de las soluciones en páginas).
    const done = async () => {
      try { await document.fonts.ready; } catch { /* sin API de fuentes */ }
      const imgs = Array.from(document.images);
      await Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = r; im.onerror = r; }))));
      await flowsSettled();
      // Una vuelta más para que los últimos ajustes (números de página, «no cabe, encoge») se pinten antes de imprimir.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await Promise.all(Array.from(document.images).map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = r; im.onerror = r; }))));
      document.body.setAttribute('data-print-ready', '1');
    };
    void done();
    return () => document.documentElement.classList.remove('print-mode');
  }, []);
  if (kind === 'portada') return <BookCover />;
  if (kind === 'reglas') return <><PrintRules /><ExamplePage /><WebPage /></>;
  if (kind === 'libro') return <Book />;
  if (!p) return <p style={{ padding: 40 }}>Caso no encontrado.</p>;
  if (kind === 'solucion') return <SolutionPages p={p} />;
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
