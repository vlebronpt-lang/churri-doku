import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { Modal } from '../Modal';
import { Icon } from '../Icon';
import { CloudError } from '../../cloud/api';
import {
  clearNotice, getAccount, loginWithGoogle, loginWithPassword, logout, register, requestPasswordReset,
  resendCode, resetPassword, resolveChoice, signupEmail, syncNow, useAccount, verifyCode, type AccountState,
} from '../../cloud/account';
import { useProgressStore, wasSolved } from '../../state/progress';
import { useUnlocked } from '../../state/achievements';
import { load, save } from '../../state/storage';

// ------------------------------------------------------------ qué ventana de cuenta está abierta

export type AccountView = 'welcome' | 'login' | 'register' | 'verify' | 'forgot' | 'reset' | 'profile';

interface Ui { view: AccountView | null; token?: string; email?: string }

let ui: Ui = { view: null };
const uiListeners = new Set<() => void>();
function setUi(next: Ui) {
  ui = next;
  uiListeners.forEach((l) => l());
}
const useUi = () => useSyncExternalStore((l) => { uiListeners.add(l); return () => { uiListeners.delete(l); }; }, () => ui, () => ui);

/** Abre la ventana de la cuenta (sin vista: la que toque según haya sesión o no). */
export function openAccount(view?: AccountView, extra: { token?: string; email?: string } = {}) {
  const s = getAccount();
  setUi({ view: view ?? (s.status === 'in' || s.status === 'checking' ? 'profile' : 'login'), ...extra });
}

const closeAccount = () => setUi({ view: null });

// ------------------------------------------------------------ bienvenida

const WELCOME_GAP = 20 * 3600_000;
const WELCOME_MAX = 3;

/** La bienvenida sale al entrar sin cuenta: como mucho una vez al día y hasta que se rechaza tres veces. */
export function maybeWelcome() {
  if (getAccount().status !== 'guest' || ui.view) return;
  // En las pruebas automáticas no sale (salvo en la que la comprueba), para no tapar lo que se prueba.
  if (navigator.webdriver && !load<boolean>('welcome-test', false)) return;
  const w = load<{ n?: number; t?: number }>('welcome', {});
  if ((w.n ?? 0) >= WELCOME_MAX || Date.now() - (w.t ?? 0) < WELCOME_GAP) return;
  save('welcome', { n: w.n ?? 0, t: Date.now() });
  setUi({ view: 'welcome' });
}

function dismissWelcome() {
  const w = load<{ n?: number; t?: number }>('welcome', {});
  save('welcome', { n: (w.n ?? 0) + 1, t: Date.now() });
  closeAccount();
}

// ------------------------------------------------------------ mensajes de error

type Ctx = 'login' | 'register' | 'verify' | 'resend' | 'forgot' | 'reset';

function errorText(e: unknown, ctx: Ctx): string {
  const status = e instanceof CloudError ? e.status : -1;
  const msg = e instanceof Error ? e.message : '';
  if (status === 0) return 'No hay conexión a internet. Prueba otra vez cuando vuelvas a tenerla.';
  if (status === 429 || /too many|rate/i.test(msg)) return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  if (ctx === 'login') {
    if (/not found|no user|doesn.t exist/i.test(msg)) return 'No hay ninguna cuenta con ese correo. ¿Quieres crearla?';
    if (/google|social|oauth|provider/i.test(msg)) return 'Esa cuenta se creó con Google: entra con el botón «Continuar con Google».';
    if (status === 400 || status === 401 || status === 403 || /invalid|incorrect|wrong|password/i.test(msg)) return 'El correo o la contraseña no son correctos.';
  }
  if (ctx === 'register') {
    if (/already|exist|registered|in use|taken/i.test(msg)) return 'Ya hay una cuenta con ese correo. Inicia sesión o recupera la contraseña.';
    if (/password/i.test(msg)) return 'Esa contraseña no vale: usa al menos 8 caracteres y mezcla letras y números.';
    if (/email|mail/i.test(msg)) return 'Ese correo no parece válido. Revísalo.';
  }
  if (ctx === 'verify') {
    if (/not found/i.test(msg)) return 'No encontramos ese registro. Vuelve a crear la cuenta.';
    if (status === 400 || status === 401 || status === 403 || /invalid|expired|wrong|incorrect/i.test(msg)) return 'El código no es correcto o ha caducado. Revísalo o pide otro.';
  }
  if (ctx === 'resend' && /not found/i.test(msg)) return 'No encontramos ese registro. Vuelve a crear la cuenta.';
  if (ctx === 'reset') {
    if (/token|expired|invalid/i.test(msg)) return 'Este enlace ya no sirve (caduca o solo vale una vez). Pide otro desde «¿Has olvidado la contraseña?».';
    if (/password/i.test(msg)) return 'Esa contraseña no vale: usa al menos 8 caracteres y mezcla letras y números.';
  }
  return 'Algo ha fallado. Inténtalo de nuevo en un momento.';
}

const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// ------------------------------------------------------------ piezas

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function GoogleButton() {
  const [going, setGoing] = useState(false);
  return (
    <button type="button" className="btn btn--google btn--block" disabled={going} onClick={() => { setGoing(true); loginWithGoogle(); }}>
      <GoogleMark /> {going ? 'Abriendo Google…' : 'Continuar con Google'}
    </button>
  );
}

function PasswordField({ label, value, onChange, autoComplete, hint }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="pass">
        <input id={id} className="input" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required minLength={autoComplete === 'new-password' ? 8 : undefined} aria-describedby={hint ? `${id}-hint` : undefined} />
        <button type="button" className="pass__toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar la contraseña' : 'Mostrar la contraseña'} aria-pressed={show}>
          <Icon name="eye" size={18} />
        </button>
      </span>
      {hint && <small id={`${id}-hint`} className="field__hint">{hint}</small>}
    </div>
  );
}

function Problem({ text }: { text: string }) {
  return text ? <p className="account__error" role="alert">{text}</p> : null;
}

/** Envoltorio de las acciones: «ocupado» mientras van y el error, en castellano. */
function useAction(ctx: Ctx) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      return true;
    } catch (e) {
      setError(errorText(e, ctx));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

function Tabs({ view }: { view: 'login' | 'register' }) {
  return (
    <div className="account__tabs" role="tablist" aria-label="Entrar o crear una cuenta">
      <button type="button" role="tab" aria-selected={view === 'login'} className={view === 'login' ? 'is-on' : ''} onClick={() => setUi({ view: 'login' })}>Iniciar sesión</button>
      <button type="button" role="tab" aria-selected={view === 'register'} className={view === 'register' ? 'is-on' : ''} onClick={() => setUi({ view: 'register' })}>Crear cuenta</button>
    </div>
  );
}

const Or = () => <p className="account__or"><span>o con tu correo</span></p>;

// ------------------------------------------------------------ vistas

function Welcome() {
  const store = useProgressStore();
  const solved = Object.entries(store).filter(([id, c]) => id !== 'tutorial' && !id.startsWith('lesson-') && wasSolved(c)).length;
  return (
    <>
      <div className="account__banner" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}img/ui/files.webp`} alt="" width="900" height="900" />
        <span className="stamp account__stamp">Tu expediente</span>
      </div>
      <h2 className="account__title" id="account-title">¡Hola, detective!</h2>
      <p>Crea tu cuenta gratis y tu progreso se guardará solo: casos resueltos, rachas y logros. Empieza en el móvil y sigue en el ordenador sin perder nada.</p>
      {solved > 0 && <p className="account__note"><Icon name="check" size={16} /> Llevas {solved} {solved === 1 ? 'caso resuelto' : 'casos resueltos'} en este navegador: se guardarán en tu cuenta.</p>}
      <div className="account__stack">
        <GoogleButton />
        <button type="button" className="btn btn--primary btn--block" onClick={() => setUi({ view: 'register' })}><Icon name="mail" size={18} /> Crear cuenta con mi correo</button>
      </div>
      <p className="account__switch">¿Ya tienes cuenta? <button type="button" className="linkish" onClick={() => setUi({ view: 'login' })}>Inicia sesión</button></p>
      <button type="button" className="btn btn--ghost btn--block account__later" onClick={dismissWelcome}>Ahora no, jugar sin cuenta</button>
      <p className="muted small account__fine">Sin cuenta también puedes jugar: el progreso se queda solo en este navegador.</p>
    </>
  );
}

function Login({ email: initial }: { email?: string }) {
  const account = useAccount();
  const [email, setEmail] = useState(initial ?? account.player?.email ?? '');
  const [password, setPassword] = useState('');
  const { busy, error, setError, run } = useAction('login');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) { setError('Ese correo no parece válido. Revísalo.'); return; }
    let unverified = false;
    const ok = await run(async () => {
      try {
        await loginWithPassword(email, password);
      } catch (err) {
        // Cuenta sin confirmar: ya se ha mandado otro código.
        if (err instanceof CloudError && err.code === 'unverified') unverified = true;
        else throw err;
      }
    });
    if (unverified) setUi({ view: 'verify' });
    else if (ok) closeAccount();
  };
  return (
    <>
      <Tabs view="login" />
      {account.status === 'expired' && <p className="account__note account__note--warn">Tu sesión ha caducado. Vuelve a entrar para seguir guardando tu progreso.</p>}
      <GoogleButton />
      <Or />
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Correo</span>
          <input className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus={!email} />
        </label>
        <PasswordField label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" />
        <Problem text={error} />
        <button className="btn btn--primary btn--block" disabled={busy || !email || !password}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <p className="account__switch"><button type="button" className="linkish" onClick={() => setUi({ view: 'forgot', email })}>¿Has olvidado la contraseña?</button></p>
    </>
  );
}

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, setError, run } = useAction('register');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) { setError('Ese correo no parece válido. Revísalo.'); return; }
    if (password.length < 8) { setError('La contraseña necesita al menos 8 caracteres.'); return; }
    if (await run(() => register(name, email, password))) setUi({ view: 'verify' });
  };
  return (
    <>
      <Tabs view="register" />
      <GoogleButton />
      <Or />
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Tu nombre <small className="muted">(opcional, para los retos)</small></span>
          <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
        </label>
        <label className="field">
          <span>Correo</span>
          <input className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <PasswordField label="Contraseña" value={password} onChange={setPassword} autoComplete="new-password" hint="Mínimo 8 caracteres." />
        <Problem text={error} />
        <button className="btn btn--primary btn--block" disabled={busy || !email || !password}>{busy ? 'Creando la cuenta…' : 'Crear cuenta'}</button>
      </form>
      <p className="muted small account__fine">Te mandaremos un código por correo para confirmar que es tuyo.</p>
    </>
  );
}

function Verify() {
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(30);
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useAction('verify');
  const resend = useAction('resend');
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => verifyCode(code))) closeAccount();
  };
  const again = async () => {
    setSent(false);
    if (await resend.run(resendCode)) { setSent(true); setWait(30); }
  };
  return (
    <>
      <p>Te hemos enviado un código a <strong>{signupEmail()}</strong>. Escríbelo aquí para terminar.</p>
      <p className="muted small">Si no lo ves, mira en spam o en promociones. Llega de <em>no-reply@base44-apps.com</em> y puede venir en inglés.</p>
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Código</span>
          <input className="input input--code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={12} autoFocus required />
        </label>
        <Problem text={error || resend.error} />
        {sent && <p className="share-ok" role="status">Código reenviado. Mira tu correo.</p>}
        <button className="btn btn--primary btn--block" disabled={busy || code.replace(/\s/g, '').length < 4}>{busy ? 'Comprobando…' : 'Confirmar'}</button>
      </form>
      <p className="account__switch">
        <button type="button" className="linkish" disabled={wait > 0 || resend.busy} onClick={again}>{wait > 0 ? `Reenviar el código (${wait} s)` : 'Reenviar el código'}</button>
        {' · '}
        <button type="button" className="linkish" onClick={() => setUi({ view: 'register' })}>Usar otro correo</button>
      </p>
    </>
  );
}

function Forgot({ email: initial }: { email?: string }) {
  const [email, setEmail] = useState(initial ?? '');
  const [done, setDone] = useState(false);
  const { busy, error, setError, run } = useAction('forgot');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) { setError('Ese correo no parece válido. Revísalo.'); return; }
    if (await run(() => requestPasswordReset(email))) setDone(true);
  };
  if (done) {
    return (
      <>
        <p>Si hay una cuenta con <strong>{email.trim()}</strong>, te llegará un correo con un enlace para crear una contraseña nueva. Ábrelo en este dispositivo.</p>
        <p className="muted small">Revisa también spam y promociones. Si entraste con Google, no necesitas contraseña: usa «Continuar con Google».</p>
        <button type="button" className="btn btn--block" onClick={() => setUi({ view: 'login', email })}>Volver a iniciar sesión</button>
      </>
    );
  }
  return (
    <>
      <p>Escribe el correo de tu cuenta y te mandaremos un enlace para crear una contraseña nueva.</p>
      <form onSubmit={submit} noValidate>
        <label className="field">
          <span>Correo</span>
          <input className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
        </label>
        <Problem text={error} />
        <button className="btn btn--primary btn--block" disabled={busy || !email}>{busy ? 'Enviando…' : 'Enviar el enlace'}</button>
      </form>
      <p className="account__switch"><button type="button" className="linkish" onClick={() => setUi({ view: 'login', email })}>Volver</button></p>
    </>
  );
}

function Reset({ token }: { token?: string }) {
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const { busy, error, setError, run } = useAction('reset');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('La contraseña necesita al menos 8 caracteres.'); return; }
    if (await run(() => resetPassword(token ?? '', password))) setDone(true);
  };
  if (!token) return <p>Este enlace está incompleto. Pide otro desde «¿Has olvidado la contraseña?».</p>;
  if (done) {
    return (
      <>
        <p className="share-ok" role="status">Contraseña cambiada. Ya puedes entrar con ella.</p>
        <button type="button" className="btn btn--primary btn--block" onClick={() => setUi({ view: 'login' })}>Iniciar sesión</button>
      </>
    );
  }
  return (
    <form onSubmit={submit} noValidate>
      <p>Elige la contraseña nueva para tu cuenta.</p>
      <PasswordField label="Contraseña nueva" value={password} onChange={setPassword} autoComplete="new-password" hint="Mínimo 8 caracteres." />
      <Problem text={error} />
      <button className="btn btn--primary btn--block" disabled={busy || !password}>{busy ? 'Guardando…' : 'Guardar la contraseña'}</button>
    </form>
  );
}

function ago(t: number | null): string {
  if (!t) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return 'hace un momento';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

export function syncLine(a: AccountState): { icon: string; text: string; tone: 'ok' | 'warn' | 'busy' } {
  if (a.status === 'checking') return { icon: 'cloud', text: 'Comprobando tu cuenta…', tone: 'busy' };
  if (a.status === 'expired') return { icon: 'cloudOff', text: 'Tu sesión ha caducado: vuelve a entrar para seguir guardando.', tone: 'warn' };
  if (a.choice) return { icon: 'cloud', text: 'Falta decidir qué hacer con el progreso de este dispositivo.', tone: 'warn' };
  switch (a.sync) {
    case 'syncing': return { icon: 'cloud', text: 'Guardando en tu cuenta…', tone: 'busy' };
    case 'offline': return { icon: 'cloudOff', text: 'Sin conexión: se guardará en tu cuenta en cuanto vuelva.', tone: 'warn' };
    case 'error': return { icon: 'cloudOff', text: 'No se ha podido guardar ahora. Lo volveremos a intentar enseguida.', tone: 'warn' };
    default: return { icon: 'cloud', text: a.lastSync ? `Progreso guardado en tu cuenta · ${ago(a.lastSync)}` : 'Progreso guardado en tu cuenta.', tone: 'ok' };
  }
}

function Profile() {
  const account = useAccount();
  const store = useProgressStore();
  const unlocked = useUnlocked();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((x) => x + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const p = account.player;
  if (!p) return null;
  const solved = Object.entries(store).filter(([id, c]) => id !== 'tutorial' && !id.startsWith('lesson-') && wasSolved(c)).length;
  const line = syncLine(account);
  const out = async (force = false) => {
    setBusy(true);
    const r = await logout(force);
    setBusy(false);
    if (r === 'unsaved') setConfirm(true);
    else closeAccount();
  };
  return (
    <>
      <div className="me">
        <span className="me__avatar" aria-hidden="true">{p.name.trim().charAt(0).toUpperCase() || '?'}</span>
        <span className="me__text">
          <strong>{p.name}</strong>
          <span className="muted">{p.email}</span>
        </span>
      </div>
      <p className={`sync-line sync-line--${line.tone}`} role="status"><Icon name={line.icon} size={18} /> {line.text}</p>
      <p className="me__stats">{solved} {solved === 1 ? 'caso resuelto' : 'casos resueltos'} · {Object.keys(unlocked).length} {Object.keys(unlocked).length === 1 ? 'logro' : 'logros'}</p>
      {account.status === 'expired' ? (
        <button type="button" className="btn btn--primary btn--block" onClick={() => setUi({ view: 'login', email: p.email })}>Volver a entrar</button>
      ) : (
        <button type="button" className="btn btn--block" disabled={account.sync === 'syncing' || account.status !== 'in'} onClick={() => void syncNow()}><Icon name="refresh" size={18} /> Guardar ahora</button>
      )}
      {!confirm ? (
        <button type="button" className="btn btn--ghost btn--block" disabled={busy} onClick={() => void out()}><Icon name="logout" size={18} /> {busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
      ) : (
        <div className="account__confirm" role="alertdialog" aria-label="Progreso sin guardar">
          <p>Hay progreso de este dispositivo que todavía no está en tu cuenta. Si cierras sesión ahora, se perderá.</p>
          <div className="row gap wrap">
            <button type="button" className="btn btn--danger btn--sm" onClick={() => void out(true)}>Cerrar sesión igualmente</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirm(false)}>Cancelar</button>
          </div>
        </div>
      )}
      <p className="muted small account__fine">Al cerrar sesión, tu progreso se queda en la cuenta y este dispositivo empieza de cero.</p>
    </>
  );
}

const TITLES: Record<AccountView, string> = {
  welcome: '',
  login: 'Tu cuenta',
  register: 'Tu cuenta',
  verify: 'Revisa tu correo',
  forgot: 'Recuperar la contraseña',
  reset: 'Contraseña nueva',
  profile: 'Tu cuenta',
};

function AccountModal({ u }: { u: Ui }) {
  const account = useAccount();
  const view = u.view!;
  // Si se entra con éxito mientras está abierta una vista de entrada, se cierra sola.
  const wasIn = useRef(account.status === 'in');
  useEffect(() => {
    if (account.status === 'in' && !wasIn.current && view !== 'profile') closeAccount();
    wasIn.current = account.status === 'in';
  }, [account.status, view]);
  const onClose = view === 'welcome' ? dismissWelcome : closeAccount;
  let body: ReactNode;
  switch (view) {
    case 'welcome': body = <Welcome />; break;
    case 'login': body = <Login email={u.email} />; break;
    case 'register': body = <Register />; break;
    case 'verify': body = <Verify />; break;
    case 'forgot': body = <Forgot email={u.email} />; break;
    case 'reset': body = <Reset token={u.token} />; break;
    default: body = <Profile />;
  }
  return (
    <Modal title={TITLES[view] || undefined} onClose={onClose} labelledBy="account-title" className={`account account--${view}`}>
      {body}
    </Modal>
  );
}

/** «¿Juntamos tu progreso?»: no se puede cerrar sin elegir. */
function ChoiceModal({ choice }: { choice: NonNullable<AccountState['choice']> }) {
  const [busy, setBusy] = useState(false);
  const pick = async (join: boolean) => {
    setBusy(true);
    await resolveChoice(join);
    setBusy(false);
  };
  const n = (k: number) => `${k} ${k === 1 ? 'caso resuelto' : 'casos resueltos'}`;
  return (
    <Modal title="¿Juntamos tu progreso?" labelledBy="choice-title" className="account">
      <p>Este dispositivo tiene progreso jugado sin cuenta y tu cuenta ya tiene el suyo.</p>
      <div className="choice">
        <div><span className="muted small">Este dispositivo</span><strong>{n(choice.device)}</strong></div>
        <div><span className="muted small">Tu cuenta</span><strong>{n(choice.account)}</strong></div>
      </div>
      <div className="account__stack">
        <button type="button" className="btn btn--primary btn--block" disabled={busy} onClick={() => void pick(true)}>Juntarlo todo</button>
        <button type="button" className="btn btn--block" disabled={busy} onClick={() => void pick(false)}>Usar solo lo de mi cuenta</button>
      </div>
      <p className="muted small account__fine">«Juntarlo todo» se queda con lo mejor de cada caso. Si este dispositivo lo usa otra persona, elige «Usar solo lo de mi cuenta»: lo de aquí se borra.</p>
    </Modal>
  );
}

function NoticeToast({ notice }: { notice: NonNullable<AccountState['notice']> }) {
  useEffect(() => {
    const t = window.setTimeout(clearNotice, 6000);
    return () => window.clearTimeout(t);
  }, [notice]);
  return (
    <button type="button" className={`notice-toast notice-toast--${notice.tone}`} role="status" onClick={clearNotice}>
      <Icon name={notice.tone === 'ok' ? 'cloud' : 'cloudOff'} size={20} /> {notice.text}
    </button>
  );
}

/** Todo lo de la cuenta que se superpone a la página: la ventana, la pregunta de juntar y los avisos. */
export function AccountCenter() {
  const u = useUi();
  const account = useAccount();
  return (
    <>
      {account.choice ? <ChoiceModal choice={account.choice} /> : u.view && <AccountModal u={u} />}
      {account.notice && !account.choice && <NoticeToast notice={account.notice} />}
    </>
  );
}

// ------------------------------------------------------------ accesos

/** Botón de la cabecera: «Entrar» sin cuenta; la inicial y el estado con ella. */
export function AccountButton() {
  const a = useAccount();
  if (a.status === 'guest' || !a.player) {
    return (
      <button className="btn btn--sm account-btn" onClick={() => openAccount('login')} aria-label="Entrar o crear cuenta" title="Entrar o crear cuenta">
        <Icon name="user" size={18} /> <span className="account-btn__label">Entrar</span>
      </button>
    );
  }
  const line = syncLine(a);
  return (
    <button className="icon-btn me-btn" onClick={() => openAccount('profile')} aria-label={`Tu cuenta: ${a.player.name}. ${line.text}`} title={line.text}>
      <span className="me__avatar me__avatar--sm" aria-hidden="true">{a.player.name.trim().charAt(0).toUpperCase() || '?'}</span>
      <span className={`me-btn__dot me-btn__dot--${line.tone}`} aria-hidden="true" />
    </button>
  );
}

/** Apartado «Tu cuenta» de los ajustes. */
export function AccountSettings() {
  const a = useAccount();
  if (a.status === 'guest' || !a.player) {
    return (
      <div className="setting setting--stack">
        <span className="setting__text">
          <span className="setting__label">Guarda tu progreso en una cuenta</span>
          <span className="setting__hint">Entra con Google o con tu correo y sigue jugando en cualquier móvil u ordenador sin perder nada.</span>
        </span>
        <button className="btn btn--sm btn--primary" onClick={() => openAccount('login')}><Icon name="user" size={16} /> Entrar o crear cuenta</button>
      </div>
    );
  }
  const line = syncLine(a);
  return (
    <div className="setting setting--stack">
      <span className="setting__text">
        <span className="setting__label">{a.player.name} <span className="muted small">({a.player.email})</span></span>
        <span className="setting__hint">{line.text}</span>
      </span>
      <button className="btn btn--sm" onClick={() => openAccount('profile')}>Abrir mi cuenta</button>
    </div>
  );
}

/** Recordatorio discreto en la portada. */
export function AccountNudge() {
  const a = useAccount();
  if (a.status === 'in' || a.status === 'checking') {
    const line = syncLine(a);
    return <p className={`nudge nudge--${line.tone}`}><Icon name={line.icon} size={16} /> {line.tone === 'ok' ? 'Tu progreso se guarda en tu cuenta.' : line.text}</p>;
  }
  if (a.status === 'expired') {
    return <p className="nudge nudge--warn"><Icon name="cloudOff" size={16} /> Tu sesión ha caducado. <button className="linkish" onClick={() => openAccount('login')}>Vuelve a entrar</button> para seguir guardando.</p>;
  }
  return <p className="nudge"><Icon name="cloudOff" size={16} /> Tu progreso solo está en este navegador. <button className="linkish" onClick={() => openAccount('register')}>Guárdalo en una cuenta</button></p>;
}

