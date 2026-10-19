import { useState } from 'react';
import { addFeedback, REASONS, type FeedbackReason } from '../../state/feedback';
import { shareOrCopy } from '../../share';
import { Modal } from '../Modal';

/** «Esta pista me confunde»: se guarda para el informe de juego y se puede enviar en el momento. */
export function FeedbackDialog({ caseId, charId, who, text, onClose }: { caseId: string; charId?: string; who: string; text: string; onClose: () => void }) {
  const [reason, setReason] = useState<FeedbackReason>('no-entiendo');
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState<'saved' | 'shared' | 'copied' | 'failed' | null>(null);
  const item = () => ({ c: caseId, ch: charId, text, reason, comment: comment.trim() || undefined, at: Date.now() });
  const keep = () => { addFeedback(item()); setSaved('saved'); };
  const sendNow = async () => {
    addFeedback(item());
    const label = REASONS.find((r) => r.id === reason)!.label;
    const msg = `🕵️ Churri-doku · aviso sobre una pista\nCaso: ${caseId} · ${who}\n«${text}»\nProblema: ${label}${comment.trim() ? `\nComentario: ${comment.trim()}` : ''}`;
    setSaved(await shareOrCopy(msg));
  };
  return (
    <Modal title="¿Qué te confunde?" onClose={onClose} labelledBy="fb-title" className="feedback-dialog">
      <p className="muted small">{who}</p>
      <blockquote className="feedback-quote">{text}</blockquote>
      <div className="seg seg--wrap" role="radiogroup" aria-label="Qué pasa con la pista">
        {REASONS.map((r) => (
          <button key={r.id} role="radio" aria-checked={reason === r.id} className={reason === r.id ? 'is-on' : ''} onClick={() => setReason(r.id)}>{r.label}</button>
        ))}
      </div>
      <label className="field">
        <span>Cuéntalo con tus palabras (opcional)</span>
        <textarea className="input" rows={3} maxLength={400} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Por ejemplo: no sé si «junto a» cuenta en diagonal…" />
      </label>
      {saved ? (
        <>
          <p className="share-ok" role="status">
            {saved === 'saved' ? '¡Gracias! Se enviará en tu próximo informe de juego (Ajustes → Ayudar a mejorar).'
              : saved === 'failed' ? 'Guardado, pero no se ha podido compartir. Irá en tu informe de juego.'
              : saved === 'copied' ? 'Copiado: pégalo en un mensaje al creador del juego. ¡Gracias!'
              : '¡Enviado! Gracias por ayudar a mejorar los casos.'}
          </p>
          <button className="btn btn--primary" onClick={onClose}>Seguir jugando</button>
        </>
      ) : (
        <div className="row gap wrap">
          <button className="btn btn--primary" onClick={keep}>Guardar el aviso</button>
          <button className="btn" onClick={sendNow}>Enviarlo ahora</button>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
        </div>
      )}
    </Modal>
  );
}
