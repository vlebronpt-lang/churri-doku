import type { Puzzle } from '../../engine/types';
import { getLesson, nextLesson } from '../../data/academy';
import { formatTime } from '../../game/useGame';
import type { CaseProgress } from '../../state/progress';
import { navigate } from '../../router';
import { Modal } from '../Modal';
import { Icon } from '../Icon';

/** Final de una lección de la academia. */
export function LessonDone({ p, progress, onClose, onReplay }: { p: Puzzle; progress: CaseProgress; onClose: () => void; onReplay: () => void }) {
  const id = p.meta?.kind === 'lesson' ? p.meta.lesson : '';
  const l = getLesson(id);
  const next = nextLesson(id);
  return (
    <Modal onClose={onClose} className="lesson-done" labelledBy="lesson-done-title">
      <p className="eyebrow">Academia · lección superada</p>
      <h2 id="lesson-done-title" className="result__title">¡{l?.title ?? 'Lección'}: hecho!</h2>
      <p>{l?.tip}</p>
      <p className="muted small">Resuelto en {formatTime(progress.time)}{progress.hints ? ` con ${progress.hints} pista${progress.hints > 1 ? 's' : ''}` : ' sin pistas'}.</p>
      <div className="row gap wrap result__actions">
        {next ? (
          <button className="btn btn--primary" onClick={() => { onClose(); navigate(`/academia/${next.id}`); }}>Siguiente lección: {next.title} <Icon name="next" size={18} /></button>
        ) : (
          <button className="btn btn--primary" onClick={() => { onClose(); navigate('/'); }}>¡A por los casos! <Icon name="next" size={18} /></button>
        )}
        <button className="btn" onClick={() => { onClose(); navigate('/academia'); }}>Volver a la academia</button>
        <button className="btn btn--ghost" onClick={onReplay}><Icon name="refresh" size={18} /> Repetir</button>
      </div>
    </Modal>
  );
}
