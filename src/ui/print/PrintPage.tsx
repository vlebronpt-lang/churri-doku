import { useEffect, useMemo } from 'react';
import type { Puzzle } from '../../engine/types';
import { boardSize, CELL, renderBoard } from '../../render/board';
import { clueSentences, displayName, withPrep } from '../../engine/text';
import { solveLogically } from '../../engine/logic';
import { levelInfo, PUZZLES, LEVELS } from '../../data/puzzles';
import { Portrait, charColor } from '../Portrait';
import { HeartLens, Logo } from '../Logo';

type Kind = 'color' | 'bn' | 'solucion';
const SITE = 'vlebronpt-lang.github.io/churri-doku';

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

function SolutionBoard({ p, bw }: { p: Puzzle; bw: boolean }) {
  const svg = useMemo(() => {
    const base = renderBoard(p, { coords: true, bw, vectorFloors: true, idp: `pr-${p.id}` });
    const { off } = boardSize(p, true);
    let tokens = '';
    for (const ch of p.cast) {
      const i = p.solution[ch.id];
      const x = off + (i % p.size) * CELL + CELL / 2, y = off + Math.floor(i / p.size) * CELL + CELL / 2;
      const fill = ch.victim ? '#e23d6b' : ch.id === p.murderer ? '#f3b53f' : '#ffffff';
      tokens += `<circle cx="${x}" cy="${y}" r="33" fill="${fill}" stroke="#251a37" stroke-width="6"/><text x="${x}" y="${y + 11}" text-anchor="middle" font-family="Bungee, Archivo Black, sans-serif" font-size="${ch.tag.length > 1 ? 24 : 32}" fill="${ch.victim ? '#fff' : '#251a37'}">${ch.tag}</text>`;
    }
    return base.replace('</svg>', `${tokens}</svg>`);
  }, [p, bw]);
  return <div className="print-board" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function PrintSheet({ p, kind }: { p: Puzzle; kind: Kind }) {
  const bw = kind === 'bn';
  const lvl = levelInfo(p.level);
  const svg = useMemo(() => renderBoard(p, { coords: true, bw, vectorFloors: true, idp: `pr-${p.id}-${kind}` }), [p, bw, kind]);
  const n = p.cast.length;
  const cols = n <= 6 ? 2 : 3;

  if (kind === 'solucion') {
    const L = solveLogically(p);
    const placements = L.steps.filter((d) => d.place);
    const murderer = p.cast.find((c) => c.id === p.murderer)!;
    const victim = p.cast.find((c) => c.victim)!;
    return (
      <section className="sheet sheet--solution">
        <header className="sheet__head">
          <span className="sheet__logo"><Logo compact /></span>
          <div className="sheet__title">
            <span className="sheet__kicker">Solución · Nº {String(p.num).padStart(2, '0')} · {p.franchise} · {lvl.name}</span>
            <h1>{p.title}</h1>
          </div>
        </header>
        <div className="sheet__sol">
          <SolutionBoard p={p} bw={false} />
          <div className="sheet__solText">
            <p className="sheet__verdict"><strong>{displayName(murderer)}</strong> estaba a solas con <strong>{withPrep('', victim)}</strong>: {murderer.gender === 'f' ? 'es la asesina' : 'es el asesino'}.</p>
            <p className="sheet__epilogue">{p.story.epilogue}</p>
            <h3>Cómo se llega (orden de colocación)</h3>
            <ol className="sheet__steps">
              {placements.map((d, k) => {
                const ch = p.cast[d.place!.k];
                const i = d.place!.i;
                return (
                  <li key={k}>
                    <b>{displayName(ch)}</b> → F{Math.floor(i / p.size) + 1}·C{(i % p.size) + 1}
                  </li>
                );
              })}
            </ol>
            <p className="sheet__note">Las pistas paso a paso con la explicación completa están en el juego online (botón «Pista»).</p>
          </div>
        </div>
        <footer className="sheet__foot">Churri-doku · {SITE}</footer>
      </section>
    );
  }

  return (
    <section className={`sheet${bw ? ' sheet--bw' : ''}`}>
      <header className="sheet__head">
        <span className="sheet__logo"><Logo compact /></span>
        <div className="sheet__title">
          <span className="sheet__kicker">Nº {String(p.num).padStart(2, '0')} · {p.franchise} · {lvl.name} · {p.size}×{p.size}</span>
          <h1>{p.title}</h1>
        </div>
        <div className="sheet__rules">
          <span><b>Reglas:</b> una persona por fila y por columna · solo en casillas sin objetos que lo impidan (sillas, camas, alfombras… sí) · <b>junto a</b> = casilla contigua en la misma zona · la víctima estaba <b>a solas</b> con el asesino.</span>
        </div>
      </header>
      <div className="sheet__body">
        <div className="sheet__suspects" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
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
        <div className="sheet__right">
          <div className="print-board" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="sheet__answer">El asesino es: <span className="sheet__blank" /></div>
        </div>
      </div>
      <footer className="sheet__foot">
        <span>{p.story.intro}</span>
        <span className="sheet__url">Juega online con pistas: {SITE}</span>
      </footer>
    </section>
  );
}

export function PrintCover() {
  return (
    <section className="sheet sheet--cover">
      <div className="cover-page">
        <div className="cover-page__logo"><Logo /></div>
        <p className="cover-page__sub">Sudoku con asesinato. Y con tus series favoritas.</p>
        <div className="cover-page__lens"><HeartLens size={6} /></div>
        <ul className="cover-page__levels">
          {LEVELS.map((l) => (
            <li key={l.level} style={{ borderColor: l.color }}>
              <strong>{l.season} · {l.name}</strong>
              <span>{PUZZLES.filter((p) => p.level === l.level).map((p) => p.franchise).join(' · ')}</span>
            </li>
          ))}
        </ul>
        <p className="cover-page__foot">{PUZZLES.length} casos · {SITE}</p>
      </div>
    </section>
  );
}

export function PrintRules() {
  return (
    <section className="sheet sheet--rules">
      <h1>Cómo se juega</h1>
      <div className="rules-cols">
        <div>
          <h3>Objetivo</h3>
          <p>Coloca a todas las personas en el plano usando sus pistas. El asesino es <b>la única persona que estaba a solas con la víctima</b> en su zona.</p>
          <h3>Reglas</h3>
          <ul>
            <li><b>Una persona por fila y por columna.</b> Hay tantas personas como filas.</li>
            <li>Solo se puede estar en casillas libres o en objetos ocupables: sillas, sillones, bancos, camas, alfombras, barcas… Nunca sobre mesas, estanterías, plantas, árboles, estatuas…</li>
            <li>Las pistas siempre dicen la verdad. Cada caso tiene una única solución y se resuelve sin adivinar.</li>
          </ul>
        </div>
        <div>
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
        </div>
      </div>
      <p className="rules-foot">Consejo: marca con una X las casillas descartadas y anota con letras pequeñas las posibilidades. Las soluciones están al final del libro.</p>
    </section>
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
      document.body.setAttribute('data-print-ready', '1');
    };
    void done();
    return () => document.documentElement.classList.remove('print-mode');
  }, []);
  if (kind === 'portada') return <PrintCover />;
  if (kind === 'reglas') return <PrintRules />;
  if (kind === 'libro') {
    // El libro entero en un solo documento: las fuentes se incrustan una vez y el PDF pesa mucho menos.
    return (
      <>
        <PrintCover />
        <PrintRules />
        {PUZZLES.map((q) => <PrintSheet key={`c-${q.id}`} p={q} kind="color" />)}
        {PUZZLES.map((q) => <PrintSheet key={`s-${q.id}`} p={q} kind="solucion" />)}
      </>
    );
  }
  if (!p) return <p style={{ padding: 40 }}>Caso no encontrado.</p>;
  return <PrintSheet p={p} kind={kind} />;
}
