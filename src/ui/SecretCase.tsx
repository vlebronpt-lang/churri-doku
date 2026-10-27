import { useMemo, useState, type FormEvent } from 'react';
import FINAL_INPUT from '../data/final';
import { GRUDGES } from '../data/grudges';
import { compilePuzzle } from '../engine/puzzle';
import type { Puzzle } from '../engine/types';
import { displayName, roomPhrase, withPrep } from '../engine/text';
import { renderSolvedBoard } from '../render/solved';
import { recordEvent, useEvents } from '../state/achievements';
import { navigate } from '../router';
import { Portrait } from './Portrait';

/** El código del caso final: la columna de cada persona, en el orden de la lista (la décima se escribe 0). */
const finalCode = (p: Puzzle) => p.cast.map((ch) => ((p.solution[ch.id] % p.size) + 1) % 10).join('');

/**
 * #/secreto: quien resuelve el caso final del libro (exclusivo del papel) escribe aquí su código para ver la
 * solución y llevarse un logro secreto.
 */
export function SecretCase() {
  const p = useMemo(() => compilePuzzle(FINAL_INPUT), []);
  const solved = !!useEvents().bookFinal;
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(0);
  const digits = code.replace(/\D/g, '');
  const check = (e: FormEvent) => {
    e.preventDefault();
    if (digits === finalCode(p)) recordEvent({ bookFinal: true });
    else setWrong((w) => w + 1);
  };
  return (
    <div className="secret">
      <section className="secret__intro">
        <p className="eyebrow">Exclusivo del libro</p>
        <h1 className="section-title">El caso final</h1>
        <p className="lede">«{p.title}» es el último caso del libro de Churri-doku y solo está en papel. Su solución no viene impresa: está guardada aquí.</p>
      </section>
      {solved ? <Reveal p={p} /> : (
        <form className="secret__form" onSubmit={check}>
          <label className="field">
            Tu código
            <input
              className="input input--code"
              inputMode="numeric"
              autoComplete="off"
              maxLength={20}
              placeholder="· · · · · · · · · ·"
              value={code}
              onChange={(e) => { setCode(e.target.value); setWrong(0); }}
              aria-describedby="secret-hint"
            />
            <small id="secret-hint" className="field__hint">La columna de cada persona, en el orden de la lista del caso (la columna 10 se escribe 0): diez cifras.</small>
          </label>
          {wrong > 0 && (
            <p className="secret__wrong" role="alert">
              {digits.length !== p.cast.length
                ? `Son ${p.cast.length} cifras, una por persona, y has escrito ${digits.length}.`
                : 'Ese código no es el bueno. Repasa el plano: una persona en cada fila y en cada columna, y la víctima a solas con una sola persona.'}
            </p>
          )}
          <button className="btn" type="submit" disabled={!digits.length}>Comprobar el código</button>
          <p className="secret__nobook">¿No tienes el libro? Lo puedes imprimir desde <button type="button" className="linkish" onClick={() => navigate('/descargas')}>Descargas</button>.</p>
        </form>
      )}
    </div>
  );
}

function Reveal({ p }: { p: Puzzle }) {
  const svg = useMemo(() => renderSolvedBoard(p, { idp: 'secreto' }), [p]);
  const murderer = p.cast.find((c) => c.id === p.murderer)!;
  const victim = p.cast.find((c) => c.victim)!;
  const room = p.rooms[p.cells[p.solution[victim.id]].room];
  return (
    <section className="secret__reveal" aria-live="polite">
      <p className="secret__stamp">¡Caso cerrado!</p>
      <div className="secret__grid">
        <div className="secret__board" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="secret__who">
          <div className="secret__id">
            <Portrait p={p} ch={murderer} className="secret__face" />
            <div>
              <span className="secret__label">{murderer.gender === 'f' ? 'La asesina es' : 'El asesino es'}</span>
              <strong>{displayName(murderer)}</strong>
            </div>
          </div>
          <p><b>Móvil.</b> {GRUDGES[p.id]?.[murderer.id]}</p>
          <p><b>Lo delata.</b> Estaba a solas con {withPrep('', victim)} {roomPhrase(room, 'en')}.</p>
          <p>{p.story.epilogue}</p>
          <p className="secret__badge">Has desbloqueado el logro secreto <b>«El club de las víctimas»</b>. <button type="button" className="linkish" onClick={() => navigate('/logros')}>Ver mis logros</button></p>
        </div>
      </div>
    </section>
  );
}
