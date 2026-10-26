import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Puzzle } from '../../engine/types';
import { boardSize, CELL, renderBoard } from '../../render/board';
import { clueSentences, displayName, withPrep } from '../../engine/text';
import { solveLogically } from '../../engine/logic';
import { levelInfo, PUZZLES, LEVELS } from '../../data/puzzles';
import { Portrait, charColor } from '../Portrait';
import { HeartLens, Logo } from '../Logo';
import { legendIconSvg, objectLegend } from '../../render/legend';

/*
 * Versión para imprimir, en formato libro (A4 vertical):
 *  - cada caso: portada, doble página (izquierda: personajes y objetos; derecha: el plano) y contraportada;
 *  - la solución, en una página aparte;
 *  - el libro: portada, reglas, índice, los casos en doble página, soluciones, notas y contraportada.
 */

type Kind = 'color' | 'bn' | 'solucion';
const SITE = 'vlebronpt-lang.github.io/churri-doku';
const BASE = import.meta.env.BASE_URL;
const num = (p: Puzzle) => String(p.num).padStart(2, '0');

/** En el libro: página del lado izquierdo de cada caso y de cada solución. */
export const BOOK_FIRST_CASE = 4;
export const bookCasePage = (k: number) => BOOK_FIRST_CASE + 2 * k;
export const bookSolutionPage = (k: number) => BOOK_FIRST_CASE + 2 * PUZZLES.length + k;
/** Páginas del libro: portada, reglas, índice, 2 por caso, 1 por solución, notas y contraportada. */
export const BOOK_PAGES = 3 + PUZZLES.length * 3 + 2;

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

/** Página derecha del caso: el plano grande, la respuesta, un recordatorio de las reglas y sitio para notas. */
export function CaseRightPage({ p, bw, page }: { p: Puzzle; bw: boolean; page?: number }) {
  const svg = useMemo(() => renderBoard(p, { coords: true, bw, vectorFloors: true, idp: `pr-${p.id}-${bw ? 'bn' : 'c'}-${page ?? 0}` }), [p, bw, page]);
  return (
    <Page className={`case-right${bw ? ' is-bw' : ''}`} page={page}>
      <CaseHead p={p} small />
      <div className="print-board" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="case-right__answer">El asesino es: <span className="case-right__blank" /></div>
      <p className="case-right__rules"><b>Reglas:</b> una persona por fila y por columna · solo en casillas sin objetos que lo impidan (sillas, camas, alfombras… sí) · <b>junto a</b> = casilla contigua en la misma zona · la víctima estaba <b>a solas</b> con el asesino.</p>
      <div className="case-right__notes"><span>Notas</span></div>
      <footer className="page__foot">Juega online con pistas paso a paso: <b>{SITE}</b></footer>
    </Page>
  );
}

/** Contraportada de un caso: cómo se juega, dónde está la solución y el aviso de proyecto fan. */
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
      <p className="case-back__sol">La solución de «{p.title}» está en su archivo aparte y en el juego online, con pistas que te explican cada paso.</p>
      <div className="case-back__lens"><HeartLens size={3.2} /></div>
      <p className="case-back__url">{SITE}</p>
      <p className="case-back__fan">Proyecto fan, gratuito y sin ánimo de lucro. Los personajes pertenecen a sus propietarios; las ilustraciones se han creado con IA para este proyecto.</p>
    </Page>
  );
}

function SolutionBoard({ p }: { p: Puzzle }) {
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
  return <div className="print-board" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** La solución de un caso en una página: el plano resuelto, el veredicto y el orden de colocación. */
export function SolutionPage({ p, page }: { p: Puzzle; page?: number }) {
  const L = useMemo(() => solveLogically(p), [p]);
  const placements = L.steps.filter((d) => d.place);
  const murderer = p.cast.find((c) => c.id === p.murderer)!;
  const victim = p.cast.find((c) => c.victim)!;
  const lvl = levelInfo(p.level);
  return (
    <Page className="solution" page={page}>
      <header className="page__head page__head--small">
        <span className="page__logo"><Logo compact /></span>
        <div className="page__title">
          <span className="page__kicker">Solución · Nº {num(p)} · {p.franchise} · {lvl.name}</span>
          <h1>{p.title}</h1>
        </div>
      </header>
      <SolutionBoard p={p} />
      <p className="solution__verdict"><strong>{displayName(murderer)}</strong> estaba a solas con <strong>{withPrep('', victim)}</strong>: {murderer.gender === 'f' ? 'es la asesina' : 'es el asesino'}.</p>
      <p className="solution__epilogue">{p.story.epilogue}</p>
      <h3>Cómo se llega (orden de colocación)</h3>
      <ol className="solution__steps">
        {placements.map((d, k) => {
          const ch = p.cast[d.place!.k];
          const i = d.place!.i;
          return <li key={k}><b>{displayName(ch)}</b> → F{Math.floor(i / p.size) + 1}·C{(i % p.size) + 1}</li>;
        })}
      </ol>
      <footer className="page__foot">Las pistas paso a paso, con la explicación completa, están en el juego online: <b>{SITE}</b></footer>
    </Page>
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

export function PrintRules({ page }: { page?: number }) {
  return (
    <Page className="rules" page={page}>
      <h1>Cómo se juega</h1>
      <h3>Objetivo</h3>
      <p>Coloca a todas las personas en el plano usando sus pistas. El asesino es <b>la única persona que estaba a solas con la víctima</b> en su zona.</p>
      <h3>Reglas</h3>
      <ul>
        <li><b>Una persona por fila y por columna.</b> Hay tantas personas como filas.</li>
        <li>Solo se puede estar en casillas libres o en objetos ocupables: sillas, sillones, bancos, camas, alfombras, barcas… Nunca sobre mesas, estanterías, plantas, árboles, estatuas…</li>
        <li>Las pistas siempre dicen la verdad. Cada caso tiene una única solución y se resuelve sin adivinar.</li>
        <li>En todos los niveles hay que <b>suponer y descartar</b>: «si X estuviera aquí…»; si eso lleva a algo imposible, esa casilla queda descartada.</li>
      </ul>
      <h3>Palabras clave</h3>
      <ul>
        <li><b>junto a:</b> casilla contigua (izquierda, derecha, arriba o abajo) dentro de la misma zona.</li>
        <li><b>con:</b> en la misma zona. <b>a solas con:</b> esas dos personas y nadie más.</li>
        <li><b>solo/sola:</b> nadie más en su zona, ni la víctima.</li>
        <li><b>al norte de:</b> cualquier fila por encima (sur = debajo, este = derecha, oeste = izquierda).</li>
        <li><b>exactamente dos filas al norte:</b> la distancia exacta.</li>
        <li><b>esquina:</b> casilla donde se juntan dos paredes de su zona.</li>
        <li><b>alguien / persona:</b> incluye a la víctima.</li>
      </ul>
      <h3>Cómo leer el libro</h3>
      <p>Cada caso ocupa una doble página: a la izquierda, la historia, los sospechosos con sus pistas y los objetos del plano; a la derecha, el plano para resolverlo. Las soluciones están al final.</p>
      <p className="rules__foot">Consejo: marca con una X las casillas descartadas y anota con letras pequeñas las posibilidades.</p>
    </Page>
  );
}

export function BookIndex({ page }: { page?: number }) {
  return (
    <Page className="book-index" page={page}>
      <h1>Índice</h1>
      {LEVELS.map((l) => (
        <section key={l.level} className="book-index__level" style={{ ['--lvl' as string]: l.color }}>
          <h2><span className="lvl-dot" />{l.season} · {l.name}</h2>
          <ol>
            {PUZZLES.map((q, k) => (q.level === l.level ? (
              <li key={q.id}><span className="book-index__num">Nº {num(q)}</span><span className="book-index__name">{q.title} <i>· {q.franchise}</i></span><span className="book-index__dots" /><span className="book-index__page">{bookCasePage(k)}</span></li>
            ) : null))}
          </ol>
        </section>
      ))}
      <p className="book-index__sol">Soluciones <span className="book-index__dots" /> {bookSolutionPage(0)}</p>
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
      <div className="book-back__lens"><HeartLens size={3.2} /></div>
      <p className="book-back__url">Juega online, con pistas paso a paso: {SITE}</p>
      <p className="book-back__fan">Proyecto fan, gratuito y sin ánimo de lucro. Los personajes pertenecen a sus propietarios; las ilustraciones se han creado con IA para este proyecto.</p>
    </Page>
  );
}

export default function PrintPage({ p, kind }: { p: Puzzle | null; kind: Kind | 'portada' | 'reglas' | 'libro' }) {
  useEffect(() => {
    document.documentElement.classList.add('print-mode');
    // Señal para el generador de PDF: todo cargado (fuentes e imágenes).
    const done = async () => {
      try { await document.fonts.ready; } catch { /* sin API de fuentes */ }
      const imgs = Array.from(document.images);
      await Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = r; im.onerror = r; }))));
      // Una vuelta más para que los ajustes de tamaño («no cabe, encoge») se apliquen antes de imprimir.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      document.body.setAttribute('data-print-ready', '1');
    };
    void done();
    return () => document.documentElement.classList.remove('print-mode');
  }, []);
  if (kind === 'portada') return <BookCover />;
  if (kind === 'reglas') return <PrintRules />;
  if (kind === 'libro') {
    // El libro entero en un solo documento: las fuentes se incrustan una vez y el PDF pesa mucho menos.
    return (
      <>
        <BookCover />
        <PrintRules page={2} />
        <BookIndex page={3} />
        {PUZZLES.map((q, k) => [
          <CaseLeftPage key={`l-${q.id}`} p={q} bw={false} page={bookCasePage(k)} />,
          <CaseRightPage key={`r-${q.id}`} p={q} bw={false} page={bookCasePage(k) + 1} />,
        ])}
        {PUZZLES.map((q, k) => <SolutionPage key={`s-${q.id}`} p={q} page={bookSolutionPage(k)} />)}
        <NotesPage page={bookSolutionPage(PUZZLES.length)} />
        <BookBack />
      </>
    );
  }
  if (!p) return <p style={{ padding: 40 }}>Caso no encontrado.</p>;
  if (kind === 'solucion') return <SolutionPage p={p} />;
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
