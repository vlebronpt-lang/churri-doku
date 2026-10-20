import { useEffect, useState } from 'react';
import type { Puzzle } from '../engine/types';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { useSettings } from '../state/settings';
import { getStore, importProgress, summarize, type CaseProgress } from '../state/progress';
import { challengeUrl, decodeProgress, progressUrl, shareOrCopy, siteUrl, type Challenge } from '../share';
import { formatTime } from '../game/useGame';
import { navigate } from '../router';
import { caseRoute } from '../data/labels';
import { recordEvent } from '../state/achievements';

const stars = (n: number) => '⭐'.repeat(Math.max(1, Math.min(3, n)));

/** Diálogo para retar a alguien con tu resultado en un caso. */
export function ChallengeDialog({ p, progress, onClose }: { p: Puzzle; progress: CaseProgress; onClose: () => void }) {
  const { settings, set } = useSettings();
  const [name, setName] = useState(settings.playerName);
  const [done, setDone] = useState<'shared' | 'copied' | 'failed' | null>(null);
  const time = progress.bestTime ?? progress.time;
  const c: Challenge = { n: name.trim() || 'Alguien', t: time, s: progress.stars ?? 1, h: progress.hints };
  const url = challengeUrl(caseRoute(p), c);
  const text = `💘 ${c.n} te reta en Churri-doku: «${p.title}» (${p.franchise}) resuelto en ${formatTime(time)} ${stars(c.s)}. ¿Lo superas?`;
  const send = async () => {
    if (name.trim()) set('playerName', name.trim());
    const r = await shareOrCopy(text, url);
    if (r !== 'failed') recordEvent((e) => ({ challengesSent: (e.challengesSent ?? 0) + 1 }));
    setDone(r);
  };
  return (
    <Modal title="Retar a mi churri" onClose={onClose} labelledBy="challenge-title" className="share-dialog">
      <p className="muted">Mándale este caso con tu marca. Lo abrirá en su ordenador o en el móvil, sin instalar nada, y verá tu tiempo antes de empezar.</p>
      <label className="field">
        <span>Tu nombre</span>
        <input className="input" value={name} maxLength={24} placeholder="Escribe tu nombre" onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <div className="share-preview" aria-label="Vista previa del mensaje">
        <p>{text}</p>
        <code>{url.length > 70 ? `${url.slice(0, 70)}…` : url}</code>
      </div>
      <div className="row gap wrap">
        <button className="btn btn--primary" onClick={send}><Icon name="share" size={18} /> Enviar reto</button>
        <button className="btn btn--ghost" onClick={onClose}>Ahora no</button>
      </div>
      {done === 'copied' && <p className="share-ok" role="status">Enlace copiado. Pégalo en WhatsApp, Telegram o donde quieras.</p>}
      {done === 'shared' && <p className="share-ok" role="status">¡Reto enviado! Que empiece el duelo.</p>}
      {done === 'failed' && <p className="share-ok share-ok--warn" role="status">No he podido compartirlo. Copia el enlace a mano: {url}</p>}
    </Modal>
  );
}

/** Aviso del reto recibido (en el expediente, antes de empezar). */
export function ChallengeIntro({ challenge }: { challenge: Challenge }) {
  return (
    <div className="duel duel--intro">
      <span className="duel__icon" aria-hidden="true">💘</span>
      <div>
        <strong>{challenge.n} te reta</strong>
        <span>Lo resolvió en {formatTime(challenge.t)} {stars(challenge.s)}. ¿Lo superas?</span>
      </div>
    </div>
  );
}

/** Comparación con un reto recibido (en la pantalla final). */
export function ChallengeResult({ challenge, myTime }: { challenge: Challenge; myTime: number }) {
  const diff = Math.abs(myTime - challenge.t);
  const win = myTime < challenge.t;
  const tie = myTime === challenge.t;
  return (
    <div className={`duel${win ? ' duel--win' : tie ? '' : ' duel--lose'}`}>
      <span className="duel__icon" aria-hidden="true">{win ? '🏆' : tie ? '🤝' : '💘'}</span>
      <div>
        <strong>{win ? `¡Has ganado a ${challenge.n}!` : tie ? `¡Empate con ${challenge.n}!` : `${challenge.n} sigue ganando…`}</strong>
        <span>Tú {formatTime(myTime)} · {challenge.n} {formatTime(challenge.t)}{tie ? '' : ` (${win ? '−' : '+'}${formatTime(diff)})`}</span>
      </div>
    </div>
  );
}

/** Pantalla de importación al abrir un enlace de progreso. */
export function ImportProgressModal({ payload }: { payload: string }) {
  const [data, setData] = useState<Record<string, unknown> | null | undefined>(undefined);
  useEffect(() => {
    void decodeProgress(payload).then(setData);
  }, [payload]);
  const close = () => navigate('/');
  if (data === undefined) return null;
  if (data === null) {
    return (
      <Modal title="Enlace de progreso" onClose={close} labelledBy="imp-title">
        <p>Este enlace está incompleto o dañado. Pide que te lo vuelvan a enviar.</p>
        <button className="btn" onClick={close}>Volver a los casos</button>
      </Modal>
    );
  }
  const inc = summarize(data);
  const mine = summarize(getStore() as Record<string, unknown>);
  const apply = (mode: 'merge' | 'replace') => {
    importProgress(data, mode);
    close();
  };
  return (
    <Modal title="Traer progreso a este dispositivo" onClose={close} labelledBy="imp-title" className="share-dialog">
      <p>El enlace trae <strong>{inc.solved} {inc.solved === 1 ? 'caso resuelto' : 'casos resueltos'}</strong>{inc.playing ? ` y ${inc.playing} en curso` : ''}. En este navegador tienes {mine.solved} resuelto{mine.solved === 1 ? '' : 's'}.</p>
      <div className="row gap wrap">
        <button className="btn btn--primary" onClick={() => apply('merge')}>Combinar con el mío</button>
        <button className="btn" onClick={() => apply('replace')}>Sustituir el mío</button>
        <button className="btn btn--ghost" onClick={close}>Cancelar</button>
      </div>
      <p className="muted small">«Combinar» se queda con lo mejor de cada caso: los resueltos, los mejores tiempos y las partidas más avanzadas.</p>
    </Modal>
  );
}

/** Botón de Ajustes: copia un enlace con todo tu progreso. */
export function ProgressLinkButton() {
  const [state, setState] = useState<'idle' | 'copied' | 'shared' | 'failed'>('idle');
  const go = async () => {
    const url = await progressUrl(getStore());
    setState(await shareOrCopy('Mi progreso en Churri-doku (ábrelo en el otro dispositivo):', url));
  };
  return (
    <div className="setting setting--stack">
      <span className="setting__text">
        <span className="setting__label">Pasar mi progreso a otro dispositivo</span>
        <span className="setting__hint">Sin cuenta: crea un enlace con tus casos resueltos y en curso, y ábrelo en el otro ordenador o móvil. Con tu cuenta no hace falta, se pasa solo.</span>
      </span>
      <button className="btn btn--sm" onClick={go}><Icon name="share" size={16} /> Copiar enlace</button>
      {state === 'copied' && <span className="share-ok" role="status">Enlace copiado.</span>}
      {state === 'shared' && <span className="share-ok" role="status">Enlace compartido.</span>}
      {state === 'failed' && <span className="share-ok share-ok--warn" role="status">No se pudo copiar.</span>}
    </div>
  );
}

/** Botón para mandar el enlace del juego a otra persona. */
export function InviteButton({ className = 'btn' }: { className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'shared' | 'failed'>('idle');
  const go = async () => {
    setState(await shareOrCopy('💘 Juega conmigo a Churri-doku: sudokus con asesinato y los personajes de nuestras series favoritas.', siteUrl()));
  };
  return (
    <>
      <button className={className} onClick={go}><Icon name="share" size={18} /> Invitar a mi churri</button>
      {state === 'copied' && <span className="share-ok" role="status">Enlace copiado: pégalo en WhatsApp.</span>}
      {state === 'failed' && <span className="share-ok share-ok--warn" role="status">Copia esta dirección: {siteUrl()}</span>}
    </>
  );
}
