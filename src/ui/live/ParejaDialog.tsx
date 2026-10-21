import { useEffect, useId, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { Puzzle } from '../../engine/types';
import { Modal } from '../Modal';
import { Icon } from '../Icon';
import { navigate } from '../../router';
import { useAccount } from '../../cloud/account';
import { openAccount } from '../account/Account';
import { useProgressStore, wasSolved } from '../../state/progress';
import { PUZZLES } from '../../data/puzzles';
import { gruposDeCasos } from '../../live/casos';
import { limpiarCodigo, prepararSala, salaAbierta, type Modo } from '../../live/sala';
import { LARGO_CODIGO } from '../../../base44/actors/SalaPareja/protocolo.ts';

// ------------------------------------------------------------ qué está abierto

interface Ui { abierta: boolean; pestana: 'crear' | 'unirme'; caso?: string; codigo?: string }
let ui: Ui = { abierta: false, pestana: 'crear' };
/** Se abrió la cuenta desde aquí: al entrar (en los minutos siguientes), la ventana vuelve sola. */
let volverTrasEntrar = 0;
const escuchas = new Set<() => void>();
function setUi(next: Ui) {
  ui = next;
  escuchas.forEach((l) => l());
}
const useUi = () => useSyncExternalStore((l) => { escuchas.add(l); return () => { escuchas.delete(l); }; }, () => ui, () => ui);

/** Abre «Jugar en pareja» (con un caso ya elegido, o en «Tengo un código»). */
export function abrirPareja(o: { caso?: string; unirme?: boolean; codigo?: string } = {}) {
  setUi({ abierta: true, pestana: o.unirme || o.codigo ? 'unirme' : 'crear', caso: o.caso, codigo: o.codigo });
}
const cerrarPareja = () => setUi({ ...ui, abierta: false });

/** Los 25 casos y los del día se pueden jugar en pareja (el tutorial y las lecciones, no). */
export const puedeJugarseEnPareja = (p: Puzzle) => !p.meta || p.meta.kind === 'daily';

// ------------------------------------------------------------ la ventana

function SinCuenta({ caducada }: { caducada: boolean }) {
  const ir = (vista: 'login' | 'register') => {
    volverTrasEntrar = Date.now();
    cerrarPareja();
    openAccount(vista);
  };
  return (
    <>
      <p>{caducada ? 'Tu sesión ha caducado. Vuelve a entrar para jugar en directo.' : 'Para jugar en directo, cada uno entra con su cuenta (es gratis). Así la sala sabe quién es quién y guarda vuestro marcador.'}</p>
      <div className="account__stack">
        <button type="button" className="btn btn--primary btn--block" onClick={() => ir('login')}><Icon name="user" size={18} /> {caducada ? 'Volver a entrar' : 'Entrar con mi cuenta'}</button>
        {!caducada && <button type="button" className="btn btn--block" onClick={() => ir('register')}>Crear una cuenta</button>}
      </div>
      <p className="muted small pareja__fine">Sin cuenta también podéis retaros: al resolver un caso, «Retar a mi churri» manda un enlace con tu tiempo.</p>
    </>
  );
}

function ElegirModo({ modo, onModo }: { modo: Modo; onModo: (m: Modo) => void }) {
  const name = useId();
  return (
    <fieldset className="modos">
      <legend className="sr-only">Modo de juego</legend>
      <label className={`modo${modo === 'coop' ? ' is-on' : ''}`}>
        <input type="radio" name={name} value="coop" checked={modo === 'coop'} onChange={() => onModo('coop')} />
        <span className="modo__icon" aria-hidden="true">🤝</span>
        <span className="modo__text"><strong>Cooperativo</strong><span>Un tablero para los dos: lo que coloca uno, el otro lo ve al momento.</span></span>
      </label>
      <label className={`modo${modo === 'duelo' ? ' is-on' : ''}`}>
        <input type="radio" name={name} value="duelo" checked={modo === 'duelo'} onChange={() => onModo('duelo')} />
        <span className="modo__icon" aria-hidden="true">⚔️</span>
        <span className="modo__text"><strong>Duelo</strong><span>El mismo caso, cada uno en su tablero. Veis cuánto lleva el otro y gana quien lo resuelva antes.</span></span>
      </label>
    </fieldset>
  );
}

/** Modo y caso (para crear la sala y para «Otra partida»). */
export function ElegirPartida({ modo, caso, onModo, onCaso }: { modo: Modo; caso: string; onModo: (m: Modo) => void; onCaso: (c: string) => void }) {
  const id = useId();
  return (
    <>
      <ElegirModo modo={modo} onModo={onModo} />
      <div className="field">
        <label htmlFor={id}>Caso</label>
        <select id={id} className="input" value={caso} onChange={(e) => onCaso(e.target.value)}>
          {gruposDeCasos(caso).map((g) => (
            <optgroup key={g.nombre} label={g.nombre}>
              {g.casos.map((c) => <option key={c.id} value={c.id}>{c.texto}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
    </>
  );
}

function Crear({ casoInicial }: { casoInicial?: string }) {
  const store = useProgressStore();
  const primero = PUZZLES.find((p) => !wasSolved(store[p.id])) ?? PUZZLES[0];
  const [modo, setModo] = useState<Modo>('coop');
  const [caso, setCaso] = useState(casoInicial ?? primero.id);
  const crear = (e: FormEvent) => {
    e.preventDefault();
    const codigo = prepararSala(caso, modo);
    cerrarPareja();
    navigate(`/sala/${codigo}`);
  };
  return (
    <form onSubmit={crear}>
      <ElegirPartida modo={modo} caso={caso} onModo={setModo} onCaso={setCaso} />
      <button className="btn btn--primary btn--block"><Icon name="play" size={18} /> Crear la sala</button>
      <p className="muted small pareja__fine">Te daremos un código de {LARGO_CODIGO} letras para que tu pareja entre desde su móvil u ordenador.</p>
    </form>
  );
}

function Unirme({ codigoInicial }: { codigoInicial?: string }) {
  const [codigo, setCodigo] = useState(limpiarCodigo(codigoInicial ?? ''));
  const id = useId();
  const listo = codigo.length === LARGO_CODIGO;
  const entrar = (e: FormEvent) => {
    e.preventDefault();
    if (!listo) return;
    cerrarPareja();
    navigate(`/sala/${codigo}`);
  };
  return (
    <form onSubmit={entrar}>
      <div className="field">
        <label htmlFor={id}>Código de la sala</label>
        <input
          id={id}
          className="input input--code"
          value={codigo}
          onChange={(e) => setCodigo(limpiarCodigo(e.target.value))}
          placeholder="KZPTR"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={LARGO_CODIGO + 4}
          autoFocus
        />
        <small className="field__hint">Son {LARGO_CODIGO} letras. Te lo da quien ha creado la sala.</small>
      </div>
      <button className="btn btn--primary btn--block" disabled={!listo}>Entrar en la sala</button>
    </form>
  );
}

function ParejaModal({ u }: { u: Ui }) {
  const account = useAccount();
  const [pestana, setPestana] = useState(u.pestana);
  const abierta = salaAbierta();
  const sinRed = typeof navigator !== 'undefined' && navigator.onLine === false;
  const enCuenta = account.status === 'in';
  return (
    <Modal title="Jugar en pareja" onClose={cerrarPareja} labelledBy="pareja-title" className="pareja">
      <p className="pareja__lede">En directo, cada uno desde su dispositivo: resolved el caso juntos o echad un duelo.</p>
      {account.status === 'checking' ? (
        <p className="muted">Comprobando tu cuenta…</p>
      ) : !enCuenta ? (
        <SinCuenta caducada={account.status === 'expired'} />
      ) : (
        <>
          {sinRed && <p className="account__note account__note--warn"><Icon name="cloudOff" size={16} /> Sin conexión: el modo en directo necesita internet.</p>}
          {abierta && (
            <p className="pareja__abierta">
              <span>Tienes una sala abierta: <strong>{abierta}</strong></span>
              <button type="button" className="btn btn--sm" onClick={() => { cerrarPareja(); navigate(`/sala/${abierta}`); }}>Volver a la sala</button>
            </p>
          )}
          <div className="account__tabs" role="tablist" aria-label="Crear una sala o unirse con un código">
            <button type="button" role="tab" aria-selected={pestana === 'crear'} className={pestana === 'crear' ? 'is-on' : ''} onClick={() => setPestana('crear')}>Crear sala</button>
            <button type="button" role="tab" aria-selected={pestana === 'unirme'} className={pestana === 'unirme' ? 'is-on' : ''} onClick={() => setPestana('unirme')}>Tengo un código</button>
          </div>
          {pestana === 'crear' ? <Crear casoInicial={u.caso} /> : <Unirme codigoInicial={u.codigo} />}
        </>
      )}
    </Modal>
  );
}

/** La ventana «Jugar en pareja» (va con los demás avisos de la página). */
export function ParejaCenter() {
  const u = useUi();
  const account = useAccount();
  // Si se fue a entrar con la cuenta desde aquí, al volver con sesión se abre otra vez.
  useEffect(() => {
    if (account.status === 'in' && volverTrasEntrar) {
      if (Date.now() - volverTrasEntrar < 10 * 60_000) setUi({ ...ui, abierta: true });
      volverTrasEntrar = 0;
    }
  }, [account.status]);
  return u.abierta ? <ParejaModal u={u} /> : null;
}
