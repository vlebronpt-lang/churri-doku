import type { Puzzle } from '../../engine/types';
import { displayName, withPrep } from '../../engine/text';
import { levelInfo } from '../../data/puzzles';
import type { CaseProgress } from '../../state/progress';
import { formatTime } from '../../game/useGame';
import { Modal } from '../Modal';
import { Portrait } from '../Portrait';
import { Icon } from '../Icon';
import { navigate } from '../../router';
import { downloadName } from '../../downloads';
import type { Challenge } from '../../share';
import { ChallengeIntro, ChallengeResult } from '../ShareDialogs';
import { ObjectLegend } from './ObjectLegend';

const BASE = import.meta.env.BASE_URL;

export function IntroModal({ p, challenge, onStart, onHelp }: { p: Puzzle; challenge?: Challenge; onStart: () => void; onHelp: () => void }) {
  const lvl = levelInfo(p.level);
  const victim = p.cast.find((c) => c.victim)!;
  const suspects = p.cast.filter((c) => !c.victim);
  return (
    <Modal onClose={onStart} className="dossier" labelledBy="dossier-title">
      <div className="dossier__tab">Expediente Nº {String(p.num).padStart(2, '0')}</div>
      <div className="dossier__grid">
        <div className="dossier__photo">
          <div className="polaroid polaroid--tilt">
            <Portrait p={p} ch={victim} />
            <span className="polaroid__name">{displayName(victim)}</span>
          </div>
          <span className="tag tag--victim">Víctima</span>
        </div>
        <div className="dossier__text">
          <p className="eyebrow"><span className="lvl-chip" style={{ background: lvl.color }}>{lvl.name}</span> {p.franchise} · {p.size}×{p.size}</p>
          <h2 id="dossier-title" className="dossier__title">{p.title}</h2>
          <p className="typewriter">{p.story.intro}</p>
          <p className="dossier__suspects"><strong>Sospechosos:</strong> {suspects.map((c) => withPrep('', c)).join(', ')}.</p>
          {challenge && <ChallengeIntro challenge={challenge} />}
        </div>
      </div>
      <section className="dossier__objects" aria-labelledby="dossier-objects">
        <h3 id="dossier-objects" className="dossier__subtitle">En el plano hay…</h3>
        <ObjectLegend p={p} compact />
      </section>
      <div className="row gap wrap dossier__actions">
        <button className="btn btn--primary btn--lg" onClick={onStart}><Icon name="search" size={20} /> Abrir el caso</button>
        <button className="btn btn--ghost" onClick={() => { onStart(); onHelp(); }}><Icon name="help" size={18} /> Cómo se juega</button>
      </div>
    </Modal>
  );
}

export function AccuseModal({ p, onAccuse, onClose }: { p: Puzzle; onAccuse: (id: string) => void; onClose: () => void }) {
  return (
    <Modal title="¿Quién es el culpable?" onClose={onClose} wide labelledBy="accuse-title">
      <p className="muted">El asesino es la única persona que estaba a solas con la víctima en su zona. Señálalo:</p>
      <div className="accuse">
        {p.cast.filter((c) => !c.victim).map((ch, k) => (
          <button key={ch.id} className="polaroid polaroid--btn" style={{ ['--tilt' as string]: `${((k * 37) % 5) - 2}deg` }} onClick={() => onAccuse(ch.id)}>
            <Portrait p={p} ch={ch} />
            <span className="polaroid__name">{displayName(ch)}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function ResultModal({ p, progress, next, onClose, onReplay, onChallenge }: {
  p: Puzzle;
  progress: CaseProgress;
  next: Puzzle | null;
  onClose: () => void;
  onReplay: () => void;
  onChallenge: () => void;
}) {
  const murderer = p.cast.find((c) => c.id === p.murderer)!;
  const victim = p.cast.find((c) => c.victim)!;
  const stars = progress.stars ?? 1;
  const time = progress.time;
  return (
    <Modal onClose={onClose} wide className="result" labelledBy="result-title">
      <div className="result__grid">
        <div className="result__photo">
          <div className="polaroid polaroid--big">
            <Portrait p={p} ch={murderer} />
            <span className="polaroid__name">{displayName(murderer)}</span>
            <span className="stamp stamp--slam">Culpable</span>
          </div>
        </div>
        <div className="result__text">
          <p className="eyebrow">Caso cerrado · Nº {String(p.num).padStart(2, '0')}</p>
          <h2 id="result-title" className="result__title">¡{displayName(murderer)} mató {withPrep('a', victim)}!</h2>
          <p className="typewriter">{p.story.epilogue}</p>
          <dl className="stats">
            <div><dt>Tiempo</dt><dd>{formatTime(time)}</dd></div>
            <div><dt>Pistas</dt><dd>{progress.hints}</dd></div>
            <div><dt>Errores</dt><dd>{progress.mistakes}</dd></div>
            <div><dt>Nota</dt><dd className="stars" aria-label={`${stars} de 3 estrellas`}>{[1, 2, 3].map((k) => <Icon key={k} name="star" size={20} className={k <= stars ? 'on' : ''} />)}</dd></div>
          </dl>
          {progress.challenge && <ChallengeResult challenge={progress.challenge} myTime={time} />}
        </div>
      </div>
      <div className="row gap wrap result__actions">
        {next ? (
          <button className="btn btn--primary" onClick={() => { onClose(); navigate(`/caso/${next.id}`); }}>Siguiente caso <Icon name="next" size={18} /></button>
        ) : (
          <button className="btn btn--primary" onClick={() => { onClose(); navigate('/'); }}>Ver todos los casos</button>
        )}
        <button className="btn" onClick={onChallenge}><span aria-hidden="true">💘</span> {progress.challenge ? 'Responder al reto' : 'Retar a mi churri'}</button>
        <a className="btn btn--ghost" href={`${BASE}downloads/${downloadName(p, 'color')}`} download><Icon name="download" size={18} /> PDF</a>
        <button className="btn btn--ghost" onClick={onReplay}><Icon name="refresh" size={18} /> Volver a jugar</button>
      </div>
    </Modal>
  );
}

