import { useState } from 'react';
import { LEVELS, PUZZLES } from '../data/puzzles';
import { useProgressStore, emptyProgress, wasSolved } from '../state/progress';
import { CaseCard, CaseCover } from './CaseCard';
import { Icon } from './Icon';
import { navigate } from '../router';
import type { Level } from '../engine/types';
import { InviteButton } from './ShareDialogs';
import { DailyCard } from './daily/DailyCard';
import { useEvents } from '../state/achievements';
import { AccountNudge, openAccount } from './account/Account';
import { useAccount } from '../cloud/account';
import { abrirPareja } from './live/ParejaDialog';
import { MarcadorPareja } from './live/Marcador';
import { useMarcadores } from '../live/marcador';
import { salaAbierta } from '../live/sala';

const FEATURED = ['tronos', 'friends', 'marvel', 'titanes', 'simpson', 'vikingos', 'potter'];

export function Home({ onHelp, onSettings }: { onHelp: () => void; onSettings: () => void }) {
  const store = useProgressStore();
  const events = useEvents();
  const account = useAccount();
  const marcadores = useMarcadores();
  const sala = account.status === 'in' ? salaAbierta() : null;
  const [filter, setFilter] = useState<Level | 0>(0);
  const prog = (id: string) => store[id] ?? emptyProgress();
  const solvedCount = PUZZLES.filter((p) => wasSolved(prog(p.id))).length;
  const inProgress = PUZZLES.filter((p) => !prog(p.id).solved && prog(p.id).board && Object.keys(prog(p.id).board!.placed).length > 0)
    .sort((a, b) => (prog(b.id).time ?? 0) - (prog(a.id).time ?? 0))[0];
  const firstOpen = PUZZLES.find((p) => !wasSolved(prog(p.id))) ?? PUZZLES[0];
  const featured = [
    ...FEATURED.map((id) => PUZZLES.find((p) => p.id === id)).filter(Boolean),
    ...PUZZLES,
  ].filter((p, i, arr) => p && arr.indexOf(p) === i).slice(0, 5) as typeof PUZZLES;

  return (
    <div className="home">
      <section className="hero">
        <div className="hero__text">
          <p className="eyebrow">{PUZZLES.length} casos · 5 temporadas · gratis y en español</p>
          <h1 className="hero__title">
            Sudoku con <span className="hero__crime">asesinato</span>.
            <span className="hero__sub">Y con tus series favoritas.</span>
          </h1>
          <p className="hero__lede">
            Coloca a cada sospechoso en el plano sin repetir fila ni columna y averigua quién se quedó a solas con la víctima. No hace falta adivinar nada: todo sale con lógica.
          </p>
          <div className="row gap wrap">
            {inProgress ? (
              <button className="btn btn--primary btn--lg" onClick={() => navigate(`/caso/${inProgress.id}`)}>
                <Icon name="play" size={18} /> Continuar: {inProgress.title}
              </button>
            ) : (
              <button className="btn btn--primary btn--lg" onClick={() => navigate(`/caso/${firstOpen.id}`)}>
                <Icon name="play" size={18} /> {solvedCount ? `Jugar el caso ${firstOpen.num}` : 'Empezar el primer caso'}
              </button>
            )}
            {!solvedCount && !events.tutorialDone ? (
              <button className="btn btn--lg" onClick={() => navigate('/tutorial')}><Icon name="hand" size={20} /> Aprende en 3 minutos</button>
            ) : (
              <button className="btn btn--lg" onClick={onHelp}><Icon name="help" size={20} /> Cómo se juega</button>
            )}
          </div>
          {sala ? (
            <p className="pareja-nudge">
              <span aria-hidden="true">💘</span> Tienes una sala abierta ({sala}). <button className="linkish" onClick={() => navigate(`/sala/${sala}`)}>Volver a la sala</button>
            </p>
          ) : (
            <p className="pareja-nudge">
              <span aria-hidden="true">💘</span> <strong>En pareja y en directo:</strong> <button className="linkish" onClick={() => abrirPareja()}>crear una sala</button> o <button className="linkish" onClick={() => abrirPareja({ unirme: true })}>entrar con un código</button>
            </p>
          )}
          <div className="progress" aria-label={`${solvedCount} de ${PUZZLES.length} casos resueltos`}>
            <div className="progress__bars">
              {LEVELS.map((l) => {
                const list = PUZZLES.filter((p) => p.level === l.level);
                const done = list.filter((p) => wasSolved(prog(p.id))).length;
                return (
                  <span key={l.level} className="progress__bar" title={`${l.name}: ${done}/${list.length}`}>
                    <span style={{ width: list.length ? `${(done / list.length) * 100}%` : 0, background: l.color }} />
                  </span>
                );
              })}
            </div>
            <span className="progress__label"><strong>{solvedCount}</strong>/{PUZZLES.length} casos resueltos</span>
          </div>
          <AccountNudge />
        </div>
        <div className="hero__art" aria-hidden="true">
          {featured.map((p, k) => (
            <button key={p.id} className={`fan fan--${k}`} tabIndex={-1} onClick={() => navigate(`/caso/${p.id}`)}>
              <CaseCover p={p} />
              <span className="fan__label">{p.franchise}</span>
            </button>
          ))}
          <span className="hero__tape">Escena del crimen · no pasar</span>
        </div>
      </section>

      <DailyCard />

      <section className="cases" id="casos">
        <div className="cases__head">
          <h2 className="section-title">Elige un caso</h2>
          <div className="tabs" role="tablist" aria-label="Filtrar por nivel">
            <button role="tab" aria-selected={filter === 0} className={filter === 0 ? 'is-on' : ''} onClick={() => setFilter(0)}>Todos</button>
            {LEVELS.map((l) => (
              <button key={l.level} role="tab" aria-selected={filter === l.level} className={filter === l.level ? 'is-on' : ''} onClick={() => setFilter(l.level)} style={{ ['--lvl' as string]: l.color }}>
                <span className="lvl-dot" />{l.name}
              </button>
            ))}
          </div>
        </div>
        {LEVELS.filter((l) => !filter || l.level === filter).map((l) => {
          const list = PUZZLES.filter((p) => p.level === l.level);
          if (!list.length) return null;
          const done = list.filter((p) => wasSolved(prog(p.id))).length;
          return (
            <div key={l.level} className="season" style={{ ['--lvl' as string]: l.color }}>
              <div className="season__head">
                <h3><span className="season__num">{l.season}</span> {l.name}</h3>
                <p className="muted">{l.blurb}</p>
                <span className="season__count">{done}/{list.length}</span>
              </div>
              <div className="case-grid">
                {list.map((p) => <CaseCard key={p.id} p={p} progress={prog(p.id)} />)}
              </div>
            </div>
          );
        })}
      </section>

      <section className="couple" aria-labelledby="couple-title">
        <span className="couple__icon" aria-hidden="true">💘</span>
        <div className="couple__text">
          <h2 id="couple-title" className="section-title">Jugad en pareja</h2>
          <p><strong>En directo:</strong> crea una sala y dale el código a tu pareja (cada uno entra con su cuenta). Resolved el mismo tablero entre los dos (cooperativo) o echad un duelo con el mismo caso, cada uno en el suyo: gana quien lo resuelva antes. Vuestro marcador guarda las victorias y los mejores tiempos.</p>
          <div className="row gap wrap couple__live">
            <button className="btn btn--primary" onClick={() => abrirPareja()}><Icon name="play" size={18} /> Jugar en directo</button>
            <button className="btn" onClick={() => abrirPareja({ unirme: true })}>Tengo un código</button>
          </div>
          <p><strong>Por turnos:</strong> cuando resuelvas un caso, pulsa <strong>«Retar a mi churri»</strong> y mándale el enlace: verá tu tiempo antes de empezar y tendrá que superarlo.</p>
          {account.status === 'guest' ? (
            <p className="muted small">Sin cuenta, el progreso se queda en cada navegador. <button className="linkish" onClick={() => openAccount('register')}>Crea tu cuenta</button> y te seguirá a cualquier móvil u ordenador (también puedes pasarlo con un enlace desde <button className="linkish" onClick={onSettings}>Ajustes</button>).</p>
          ) : (
            <p className="muted small">Tu progreso va contigo: entra con tu cuenta en cualquier móvil u ordenador y lo tendrás todo.</p>
          )}
          <div className="row gap wrap"><InviteButton className="btn" /></div>
          {marcadores.length > 0 && (
            <div className="couple__marcadores">
              <h3 className="couple__subtitle">{marcadores.length === 1 ? 'Vuestro marcador' : 'Vuestros marcadores'}</h3>
              {marcadores.slice(0, 3).map((m) => <MarcadorPareja key={m.jugadores.map((j) => j.uid).join('|')} m={m} />)}
            </div>
          )}
        </div>
        <img className="couple__art" src={`${import.meta.env.BASE_URL}img/ui/desk.webp`} alt="" width="900" height="900" loading="lazy" />
      </section>
    </div>
  );
}
