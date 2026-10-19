import type { Puzzle } from '../engine/types';
import type { CaseProgress } from '../state/progress';
import { levelInfo } from '../data/puzzles';
import { caseRoute } from '../data/labels';
import { shortDate } from '../data/daily';
import { siteUrl } from '../share';
import { formatTime } from './useGame';

/** Resultado para compartir, sin destripar nada (al estilo Wordle). */
export function resultText(p: Puzzle, prog: CaseProgress, streak = 0): { text: string; url: string } {
  const stars = Math.max(1, Math.min(3, prog.stars ?? 1));
  const what = p.meta?.kind === 'daily' ? `Caso del día · ${shortDate(p.meta.date)}` : `Caso Nº ${p.num} · «${p.title}»`;
  const lines = [
    `🔎 Churri-doku · ${what}`,
    `${p.franchise} · ${levelInfo(p.level).name} · ${p.size}×${p.size}`,
    `⏱ ${formatTime(prog.time)} · ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)} · ${prog.hints ? `${prog.hints} pista${prog.hints > 1 ? 's' : ''}` : 'sin pistas'}${prog.mistakes ? ` · ${prog.mistakes} fallo${prog.mistakes > 1 ? 's' : ''}` : ''}`,
  ];
  if (streak > 1) lines.push(`🔥 Racha: ${streak} días seguidos`);
  return { text: lines.join('\n'), url: `${siteUrl()}#${caseRoute(p)}` };
}
