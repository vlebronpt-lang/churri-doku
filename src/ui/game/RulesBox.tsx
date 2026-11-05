import { useMemo } from 'react';
import { caseRuleSegs } from '../../engine/text';
import type { CharacterDef, Puzzle } from '../../engine/types';
import { Icon } from '../Icon';
import { highlightForSentence, type Highlight } from './ClueText';

/** Las reglas del caso, si las tiene: valen para todo el reparto. */
export function RulesBox({ p, mobile, onHighlight }: { p: Puzzle; mobile?: boolean; onHighlight?: (h: Highlight | null) => void }) {
  const rules = useMemo(() => caseRuleSegs(p), [p]);
  if (!rules.length) return null;
  return (
    <section className={`rules-box${mobile ? ' rules-box--mobile' : ''}`} aria-label="Reglas del caso">
      <h3 className="rules-box__title"><Icon name="gavel" size={16} /> Reglas del caso</h3>
      <ul>
        {rules.map((segs, k) => (
          <li key={k} onMouseEnter={() => onHighlight?.(highlightForSentence(p, segs))} onMouseLeave={() => onHighlight?.(null)}>
            {segs.map((s, j) => (s.b ? <b key={j}>{s.text}</b> : <span key={j}>{s.text}</span>))}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Los grupos de alguien como etiquetas («Targaryen», «1.ª clase»). */
export function GroupChips({ p, ch }: { p: Puzzle; ch: CharacterDef }) {
  if (!ch.groups?.length) return null;
  return (
    <span className="group-chips">
      {ch.groups.map((g) => (
        <span key={g} className="group-chip" style={p.groups[g].color ? { ['--group' as string]: p.groups[g].color } : undefined}>{p.groups[g].label}</span>
      ))}
    </span>
  );
}
