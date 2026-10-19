import { useMemo, useState } from 'react';
import type { Puzzle } from '../engine/types';
import { levelInfo } from '../data/puzzles';
import { renderBoard } from '../render/board';
import { wasSolved, type CaseProgress } from '../state/progress';
import { formatTime } from '../game/useGame';
import { navigate } from '../router';

const BASE = import.meta.env.BASE_URL;

export function CaseCover({ p, className = '' }: { p: Puzzle; className?: string }) {
  const [failed, setFailed] = useState(false);
  const svg = useMemo(() => (failed ? renderBoard(p, { labels: false, idp: `cv-${p.id}` }) : ''), [failed, p]);
  if (!failed) {
    return <img className={`cover ${className}`} src={`${BASE}img/covers/${p.art ?? p.id}.webp`} alt="" loading="lazy" onError={() => setFailed(true)} />;
  }
  return <div className={`cover cover--board ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function CaseCard({ p, progress }: { p: Puzzle; progress: CaseProgress }) {
  const lvl = levelInfo(p.level);
  const placed = progress.board ? Object.keys(progress.board.placed).length : 0;
  const status = wasSolved(progress) ? 'solved' : progress.board && (placed > 0 || Object.keys(progress.board.xs).length > 0) ? 'playing' : 'new';
  const duel = progress.challenge;
  const best = progress.bestTime;
  return (
    <button className={`case case--${status}`} style={{ ['--lvl' as string]: lvl.color }} onClick={() => navigate(`/caso/${p.id}`)} aria-label={`Caso ${p.num}: ${p.title} (${p.franchise}, ${lvl.name})`}>
      <span className="case__tab">Nº {String(p.num).padStart(2, '0')}</span>
      <span className="case__photo">
        <CaseCover p={p} />
        {status === 'solved' && <span className="stamp stamp--card">Resuelto</span>}
        {duel && (
          <span className={`case__duel${best != null ? (best < duel.t ? ' is-win' : best > duel.t ? ' is-lose' : '') : ''}`}>
            {best == null ? `💘 Reto de ${duel.n}` : best < duel.t ? `🏆 Ganas a ${duel.n}` : best === duel.t ? `🤝 Empate con ${duel.n}` : `💘 ${duel.n} gana`}
          </span>
        )}
      </span>
      <span className="case__body">
        <span className="case__franchise">{p.franchise}</span>
        <span className="case__title">{p.title}</span>
        <span className="case__meta">
          <span className="lvl-chip" style={{ background: lvl.color }}>{lvl.name}</span>
          <span>{p.size}×{p.size}</span>
          {status === 'solved' && <span className="case__stars" aria-label={`${progress.stars ?? 1} estrellas`}>{'★'.repeat(progress.stars ?? 1)}<span className="dim">{'★'.repeat(3 - (progress.stars ?? 1))}</span> · {formatTime(progress.bestTime ?? progress.time)}</span>}
          {status === 'playing' && <span className="case__progress">En curso · {placed}/{p.size}</span>}
          {status === 'new' && <span className="case__new">Nuevo</span>}
        </span>
      </span>
    </button>
  );
}
