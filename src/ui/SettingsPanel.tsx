import { useState } from 'react';
import { Modal } from './Modal';
import { useSettings, type Settings } from '../state/settings';
import { resetAll } from '../state/progress';
import { ProgressLinkButton } from './ShareDialogs';

function Toggle({ k, label, hint }: { k: keyof Settings; label: string; hint?: string }) {
  const { settings, set } = useSettings();
  const v = settings[k] as boolean;
  return (
    <label className="setting">
      <span className="setting__text">
        <span className="setting__label">{label}</span>
        {hint && <span className="setting__hint">{hint}</span>}
      </span>
      <input type="checkbox" className="switch" checked={v} onChange={(e) => set(k, e.target.checked as never)} />
    </label>
  );
}

function Choice<K extends keyof Settings>({ k, label, options, hint }: { k: K; label: string; hint?: string; options: { value: Settings[K]; label: string }[] }) {
  const { settings, set } = useSettings();
  return (
    <div className="setting">
      <span className="setting__text">
        <span className="setting__label">{label}</span>
        {hint && <span className="setting__hint">{hint}</span>}
      </span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} role="radio" aria-checked={settings[k] === o.value} className={settings[k] === o.value ? 'is-on' : ''} onClick={() => set(k, o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function NameField() {
  const { settings, set } = useSettings();
  return (
    <label className="setting">
      <span className="setting__text">
        <span className="setting__label">Tu nombre en los retos</span>
        <span className="setting__hint">Aparece en los retos que envías.</span>
      </span>
      <input className="input" value={settings.playerName} maxLength={24} placeholder="Tu nombre" onChange={(e) => set('playerName', e.target.value)} />
    </label>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { reset } = useSettings();
  const [confirm, setConfirm] = useState(false);
  return (
    <Modal title="Ajustes" onClose={onClose} labelledBy="settings-title" className="settings">
      <h3 className="settings__group">Aspecto</h3>
      <Choice k="theme" label="Tema" options={[{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} />
      <Choice k="tokenStyle" label="Fichas en el tablero" options={[{ value: 'portrait', label: 'Retrato' }, { value: 'letter', label: 'Letra' }]} />
      <Choice k="clueSize" label="Tamaño del texto de las pistas" options={[{ value: 'sm', label: 'A' }, { value: 'md', label: 'A+' }, { value: 'lg', label: 'A++' }]} />
      <Toggle k="genderSymbols" label="Símbolos ♀ / ♂" hint="Útiles cuando una pista habla de «una mujer» o «un hombre»." />
      <Toggle k="shadeBlocked" label="Oscurecer casillas no ocupables" />
      <Toggle k="animations" label="Animaciones" />

      <h3 className="settings__group">Juego</h3>
      <Choice k="tapAction" label="Un toque en una casilla…" hint="Mantener pulsado hace la acción contraria." options={[{ value: 'place', label: 'Coloca' }, { value: 'note', label: 'Anota' }]} />
      <Toggle k="autoX" label="Tachar fila y columna al colocar" hint="Pone X automáticas y bien visibles al colocar a alguien o marcar una casilla como ocupada." />
      <Toggle k="noXOnBlocked" label="Sin X sobre objetos" hint="No tacha casillas que ya no se pueden ocupar." />
      <Toggle k="conflictWarnings" label="Avisar de dos personas en la misma fila o columna" />
      <Toggle k="keywordHighlights" label="Resaltar al pasar por las pistas" hint="Ilumina en el tablero objetos, zonas y personas." />
      <Toggle k="simpleDirections" label="Direcciones sencillas" hint="«encima de» en lugar de «al norte de», etc." />
      <Toggle k="timer" label="Mostrar el tiempo" />

      <h3 className="settings__group">En pareja</h3>
      <NameField />
      <ProgressLinkButton />

      <h3 className="settings__group">Sonido</h3>
      <Toggle k="sound" label="Efectos de sonido" />
      <Toggle k="haptics" label="Vibración" hint="En móviles compatibles." />

      <div className="settings__danger">
        <button className="btn btn--ghost btn--sm" onClick={reset}>Restablecer ajustes</button>
        {!confirm ? (
          <button className="btn btn--ghost btn--sm" onClick={() => setConfirm(true)}>Borrar mi progreso…</button>
        ) : (
          <span className="row gap">
            <span className="small">¿Seguro? Se borran todos los casos.</span>
            <button className="btn btn--danger btn--sm" onClick={() => { resetAll(); setConfirm(false); }}>Sí, borrar</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setConfirm(false)}>Cancelar</button>
          </span>
        )}
      </div>
    </Modal>
  );
}
