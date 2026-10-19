import { LESSONS } from '../../data/academy';
import { useProgressStore, wasSolved } from '../../state/progress';
import { useEvents } from '../../state/achievements';
import { navigate } from '../../router';
import { Icon } from '../Icon';

/** Academia de detectives: tutorial guiado y lecciones por técnica. */
export function Academy() {
  const store = useProgressStore();
  const events = useEvents();
  const done = LESSONS.filter((l) => wasSolved(store[`lesson-${l.id}`])).length;
  return (
    <div className="academy">
      <section className="academy__head">
        <p className="eyebrow">Aprende jugando</p>
        <h1 className="section-title">Academia de detectives</h1>
        <p className="lede">Empieza por el tutorial guiado. Después, cada lección explica una técnica y la practicas en un minicaso. Las necesitarás todas: desde «Muy fácil» hay que encadenar deducciones, y desde «Medio», suponer y descartar.</p>
      </section>
      <button className={`lesson-card lesson-card--tutorial${events.tutorialDone ? ' is-done' : ''}`} onClick={() => navigate('/tutorial')}>
        <span className="lesson-card__num" aria-hidden="true">{events.tutorialDone ? '✓' : '★'}</span>
        <span className="lesson-card__text">
          <strong>Tutorial: tu primer caso, paso a paso</strong>
          <span>Te guío paso a paso: elegir sospechosos, colocar (también arrastrando), marcar casillas ocupadas y acusar. Unos 3 minutos.</span>
        </span>
        <span className="lesson-card__go">{events.tutorialDone ? 'Repetir' : 'Empezar'} <Icon name="next" size={16} /></span>
      </button>
      <h2 className="academy__subtitle">Lecciones <span className="muted">({done}/{LESSONS.length})</span></h2>
      {LESSONS.length ? (
        <ol className="lessons">
          {LESSONS.map((l, k) => {
            const ok = wasSolved(store[`lesson-${l.id}`]);
            return (
              <li key={l.id}>
                <button className={`lesson-card${ok ? ' is-done' : ''}`} onClick={() => navigate(`/academia/${l.id}`)}>
                  <span className="lesson-card__num" aria-hidden="true">{ok ? '✓' : k + 1}</span>
                  <span className="lesson-card__text">
                    <strong>{l.title}</strong>
                    <span>{l.skill}</span>
                  </span>
                  <span className="lesson-card__go">{ok ? 'Repasar' : 'Practicar'} <Icon name="next" size={16} /></span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="muted">Las lecciones están en camino.</p>
      )}
    </div>
  );
}
