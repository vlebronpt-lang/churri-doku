import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '../state/progress';
import { checkAchievements, useEvents, type Achievement } from '../state/achievements';
import { sfx } from '../game/sfx';
import { navigate } from '../router';

/** Vigila el progreso y avisa de los logros nuevos. */
export function AchievementToasts() {
  const store = useProgressStore();
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [bulk, setBulk] = useState(0);
  const first = useRef(true);
  const events = useEvents();
  useEffect(() => {
    const fresh = checkAchievements(store);
    if (!fresh.length) return;
    if (first.current && fresh.length > 2) {
      // Al estrenar los logros, quien ya llevaba casos resueltos recibe un aviso conjunto.
      setBulk(fresh.length);
    } else {
      setQueue((q) => [...q, ...fresh]);
      sfx.badge();
    }
  }, [store, events]);
  useEffect(() => { first.current = false; }, []);
  useEffect(() => {
    if (!queue.length && !bulk) return;
    const t = window.setTimeout(() => (bulk ? setBulk(0) : setQueue((q) => q.slice(1))), 4200);
    return () => window.clearTimeout(t);
  }, [queue, bulk]);
  const a = queue[0];
  if (!a && !bulk) return null;
  return (
    <button className="achievement-toast" role="status" onClick={() => { setQueue([]); setBulk(0); navigate('/logros'); }}>
      <span className="achievement-toast__icon" aria-hidden="true">{a ? a.icon : '🏆'}</span>
      <span className="achievement-toast__text">
        <small>{a ? 'Logro desbloqueado' : 'Logros desbloqueados'}</small>
        <strong>{a ? a.title : `Ya tienes ${bulk} logros`}</strong>
        {a && <span>{a.desc}</span>}
      </span>
    </button>
  );
}
