import { useState } from 'react';
import { useSettings } from '../state/settings';
import { promptInstall, useCanInstall, isIos, isStandalone, downloadForOffline, reminderIcs } from '../state/install';
import { reportUrl } from '../game/report';
import { useFeedback } from '../state/feedback';
import { decodeProgress, shareOrCopy } from '../share';
import { importProgress, summarize } from '../state/progress';
import { navigate } from '../router';
import { Icon } from './Icon';

/** Instalar la app y guardarlo todo para jugar sin conexión. */
export function AppSettings() {
  const canInstall = useCanInstall();
  const [offline, setOffline] = useState<{ done: number; total: number } | null>(null);
  const [offlineMsg, setOfflineMsg] = useState('');
  const [time, setTime] = useState('21:00');
  const installed = isStandalone();
  const download = async () => {
    const ok = await downloadForOffline((done, total) => setOffline({ done, total }));
    if (!ok) setOfflineMsg('Esta función está disponible en la web publicada, una vez cargada la página.');
  };
  const reminder = () => {
    const [h, m] = time.split(':').map(Number);
    const url = URL.createObjectURL(reminderIcs(h, m));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'churri-doku-recordatorio.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  return (
    <>
      <div className="setting setting--stack">
        <span className="setting__text">
          <span className="setting__label">Instalar Churri-doku</span>
          <span className="setting__hint">
            {installed ? 'Ya la tienes instalada. ¡Bien!'
              : canInstall ? 'Tenla como una app más, con su icono, sin abrir el navegador.'
              : isIos() ? 'En el iPhone o iPad: botón Compartir de Safari → «Añadir a pantalla de inicio».'
              : 'En el móvil: menú del navegador → «Instalar aplicación» o «Añadir a pantalla de inicio».'}
          </span>
        </span>
        {canInstall && !installed && <button className="btn btn--sm" onClick={() => void promptInstall()}><Icon name="download" size={16} /> Instalar</button>}
      </div>
      <div className="setting setting--stack">
        <span className="setting__text">
          <span className="setting__label">Jugar sin conexión</span>
          <span className="setting__hint">Guarda en este dispositivo los retratos y los casos (unos 7 MB) para jugar en el avión o en el metro.</span>
        </span>
        <button className="btn btn--sm" onClick={download} disabled={!!offline && offline.done < offline.total}><Icon name="download" size={16} /> {offline && offline.done >= offline.total ? 'Guardado' : 'Descargar todo'}</button>
        {offline && <span className="share-ok" role="status">{offline.done < offline.total ? `Guardando… ${offline.done}/${offline.total}` : '¡Listo! Ya puedes jugar sin conexión.'}</span>}
        {offlineMsg && <span className="share-ok share-ok--warn" role="status">{offlineMsg}</span>}
      </div>
      <div className="setting setting--stack">
        <span className="setting__text">
          <span className="setting__label">Recordatorio del caso del día</span>
          <span className="setting__hint">Añade a tu calendario un aviso diario con el enlace al caso de hoy.</span>
        </span>
        <span className="row gap">
          <input className="input input--time" type="time" value={time} onChange={(e) => setTime(e.target.value || '21:00')} aria-label="Hora del recordatorio" />
          <button className="btn btn--sm" onClick={reminder}><Icon name="timer" size={16} /> Añadir al calendario</button>
        </span>
      </div>
    </>
  );
}

/** Pegar un enlace de progreso (útil en la app instalada, donde no hay barra de direcciones). */
export function PasteProgress() {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const go = async () => {
    const m = text.match(/#\/progreso\/([A-Za-z0-9_-]+)/);
    const data = m ? await decodeProgress(m[1]) : null;
    if (!data) { setMsg('No reconozco ese enlace de progreso.'); return; }
    importProgress(data, 'merge');
    const s = summarize(data);
    setMsg(`Hecho: ${s.solved} caso${s.solved === 1 ? '' : 's'} resuelto${s.solved === 1 ? '' : 's'} combinado${s.solved === 1 ? '' : 's'} con lo tuyo.`);
    setText('');
  };
  return (
    <div className="setting setting--stack">
      <span className="setting__text">
        <span className="setting__label">Traer progreso desde un enlace</span>
        <span className="setting__hint">Pega aquí el enlace que copiaste en el otro dispositivo. Se combina con lo que ya tengas.</span>
      </span>
      <span className="row gap paste-row">
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="https://…#/progreso/…" aria-label="Enlace de progreso" />
        <button className="btn btn--sm" onClick={go} disabled={!text.trim()}>Traer</button>
      </span>
      {msg && <span className="share-ok" role="status">{msg}</span>}
    </div>
  );
}

/** Enviar el informe de juego (punto 9) y acceso al panel. */
export function HelpImprove() {
  const { settings } = useSettings();
  const feedback = useFeedback();
  const [state, setState] = useState<'idle' | 'shared' | 'copied' | 'failed'>('idle');
  const send = async () => {
    const url = await reportUrl(settings.playerName.trim() || undefined);
    setState(await shareOrCopy('🕵️ Mis datos de Churri-doku para mejorar los casos (ábrelo para añadirlo al panel):', url));
  };
  return (
    <>
      <div className="setting setting--stack">
        <span className="setting__text">
          <span className="setting__label">Enviar mis datos de juego</span>
          <span className="setting__hint">Tus tiempos, las pistas que pediste (y en qué momento) y tus avisos de pistas confusas ({feedback.length}). Nada más. Sirve para ajustar la dificultad de los casos.</span>
        </span>
        <button className="btn btn--sm" onClick={send}><Icon name="share" size={16} /> Enviar</button>
        {state === 'copied' && <span className="share-ok" role="status">Enlace copiado: mándaselo al creador del juego.</span>}
        {state === 'shared' && <span className="share-ok" role="status">¡Enviado! Gracias.</span>}
        {state === 'failed' && <span className="share-ok share-ok--warn" role="status">No se ha podido compartir.</span>}
      </div>
      <div className="setting setting--stack">
        <span className="setting__text">
          <span className="setting__label">Panel de pruebas</span>
          <span className="setting__hint">Para quien crea los casos: junta los informes recibidos y muestra dónde se atasca la gente.</span>
        </span>
        <button className="btn btn--sm btn--ghost" onClick={() => navigate('/panel')}>Abrir el panel</button>
      </div>
    </>
  );
}
