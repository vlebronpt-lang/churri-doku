import { useEffect, useState, type ReactNode } from 'react';
import type { Puzzle } from '../../engine/types';
import { GameScreen, type LiveGame } from '../game/GameScreen';
import { IntroModal } from '../game/CaseModals';
import { Icon } from '../Icon';
import { Modal } from '../Modal';
import { navigate } from '../../router';
import { useAccount } from '../../cloud/account';
import { openAccount } from '../account/Account';
import {
  abrirSala, creacionPendiente, dejarSala, huella, otro, prepararSala, salaActual, useSala,
  type Asiento, type Modo, type PartidaSala, type VistaSala,
} from '../../live/sala';
import { cargarCaso, nombreCaso, useCaso } from '../../live/casos';
import { formatTime } from '../../game/useGame';
import { shareOrCopy, siteUrl } from '../../share';
import { levelInfo, nextPuzzle } from '../../data/puzzles';
import { caseTag } from '../../data/labels';
import { sfx } from '../../game/sfx';
import { MarcadorPareja } from './Marcador';
import { ElegirPartida } from './ParejaDialog';
import { LARGO_CODIGO, esCodigo } from '../../../base44/actors/SalaPareja/protocolo.ts';

const nombreModo = (m: Modo) => (m === 'coop' ? 'Cooperativo' : 'Duelo');
const iconoModo = (m: Modo) => (m === 'coop' ? '🤝' : '⚔️');
const enlaceSala = (codigo: string) => `${siteUrl()}#/sala/${codigo}`;

/** Vuelve a pintar cada poco mientras haga falta (reloj, cuenta atrás). */
function useAhora(cada: number | null) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (cada == null) return;
    const t = window.setInterval(() => setAhora(Date.now()), cada);
    return () => window.clearInterval(t);
  }, [cada]);
  return cada == null ? Date.now() : ahora;
}

// ------------------------------------------------------------ pantallas de paso

function Aviso({ titulo, texto, children }: { titulo: string; texto?: ReactNode; children?: ReactNode }) {
  return (
    <div className="daily-empty sala-aviso-pantalla">
      <div className="daily-empty__card">
        <p className="eyebrow"><span aria-hidden="true">💘</span> Jugar en pareja</p>
        <h1 className="section-title">{titulo}</h1>
        {texto && <p className="daily-empty__text">{texto}</p>}
        {children && <div className="row gap wrap">{children}</div>}
      </div>
    </div>
  );
}

const aCasos = <button className="btn" onClick={() => navigate('/')}><Icon name="back" size={18} /> Volver a los casos</button>;

/** `#/sala/KZPTR`: entrar en una sala (o crearla si viene de «Crear la sala»). */
export function SalaScreen({ codigo, onHelp, onSettings }: { codigo: string; onHelp: () => void; onSettings: () => void }) {
  const account = useAccount();
  if (!esCodigo(codigo)) {
    return (
      <Aviso titulo="Ese código no vale" texto={`Los códigos de sala tienen ${LARGO_CODIGO} letras, por ejemplo KZPTR. Revisa el enlace o escríbelo a mano.`}>
        <button className="btn btn--primary" onClick={() => { navigate('/'); }}>Volver a los casos</button>
      </Aviso>
    );
  }
  if (account.status === 'checking') return <Aviso titulo="Comprobando tu cuenta…" />;
  if (account.status !== 'in') {
    return (
      <Aviso
        titulo={account.status === 'expired' ? 'Tu sesión ha caducado' : 'Entra con tu cuenta'}
        texto={`Para jugar en directo, cada uno entra con su cuenta (es gratis). Después se abrirá la sala ${codigo}.`}
      >
        <button className="btn btn--primary" onClick={() => openAccount('login')}><Icon name="user" size={18} /> {account.status === 'expired' ? 'Volver a entrar' : 'Entrar o crear cuenta'}</button>
        {aCasos}
      </Aviso>
    );
  }
  return <SalaConectada key={codigo} codigo={codigo} onHelp={onHelp} onSettings={onSettings} />;
}

const TEXTOS: Record<string, { titulo: string; texto: string }> = {
  'no-existe': { titulo: 'Esa sala no existe', texto: 'Revisa el código (son 5 letras) o pide a tu pareja que cree una sala nueva y te dé su código.' },
  llena: { titulo: 'La sala está completa', texto: 'Ya hay dos detectives dentro. Pide a tu pareja que cree otra sala.' },
  'sin-cuenta': { titulo: 'Entra con tu cuenta', texto: 'Para jugar en directo hace falta tener la sesión abierta.' },
  sesion: { titulo: 'Tu sesión ha caducado', texto: 'Vuelve a entrar con tu cuenta y podrás seguir en la sala.' },
  version: { titulo: 'Hay que actualizar el juego', texto: 'Tu pareja tiene otra versión de Churri-doku. Recargad los dos la página para jugar juntos.' },
  'otro-dispositivo': { titulo: 'Has abierto la sala en otro dispositivo', texto: 'Puedes seguir allí o jugar aquí: si entras aquí, se cierra en el otro.' },
  servidor: { titulo: 'La sala no está disponible', texto: 'No hemos podido conectar con el servidor de las salas. Prueba otra vez en un momento.' },
  datos: { titulo: 'Algo no cuadra', texto: 'No se ha podido crear la sala con ese caso. Vuelve a intentarlo desde «Jugar en pareja».' },
};

function SalaConectada({ codigo, onHelp, onSettings }: { codigo: string; onHelp: () => void; onSettings: () => void }) {
  const [crear] = useState(() => creacionPendiente(codigo));
  const casoCrear = useCaso(crear?.caso ?? null);
  const [intento, setIntento] = useState(0);
  const preparada = !crear || casoCrear.estado !== 'cargando';
  const p0 = crear && casoCrear.estado === 'listo' ? casoCrear.p : null;
  useEffect(() => {
    if (!preparada || (crear && !p0)) return;
    abrirSala(codigo, crear && p0 ? { ...crear, huella: huella(p0) } : null);
    return () => dejarSala(codigo);
  }, [codigo, preparada, crear, p0, intento]);
  const vista = useSala();
  const v = vista?.codigo === codigo ? vista : null;

  // El código que se acababa de inventar ya lo usa otra sala: se prueba con otro.
  useEffect(() => {
    if (v?.error !== 'ocupada' || !crear) return;
    location.replace(`#/sala/${prepararSala(crear.caso, crear.modo)}`);
  }, [v?.error, crear]);
  useEffect(() => {
    if (v?.fuera) navigate('/');
  }, [v?.fuera]);

  if (crear && casoCrear.estado === 'no-esta') return <Aviso titulo="Ese caso no está" texto="No encontramos el caso elegido. Vuelve a crear la sala con otro.">{aCasos}</Aviso>;
  if (v?.error && v.error !== 'ocupada') {
    const t = TEXTOS[v.error] ?? TEXTOS.servidor;
    return (
      <Aviso titulo={t.titulo} texto={t.texto}>
        {(v.error === 'otro-dispositivo' || v.error === 'servidor') && <button className="btn btn--primary" onClick={() => setIntento((x) => x + 1)}>{v.error === 'servidor' ? 'Probar otra vez' : 'Jugar aquí'}</button>}
        {(v.error === 'sesion' || v.error === 'sin-cuenta') && <button className="btn btn--primary" onClick={() => openAccount('login')}>Volver a entrar</button>}
        {v.error === 'version' && <button className="btn btn--primary" onClick={() => location.reload()}>Recargar la página</button>}
        {aCasos}
      </Aviso>
    );
  }
  if (v?.pregunta) {
    const sala = salaActual();
    return (
      <Aviso titulo="Ya estás en esta sala" texto="Tu cuenta tiene esta sala abierta en otro dispositivo. ¿Qué quieres hacer?">
        <button className="btn btn--primary" onClick={() => sala?.responder('mismo')}>Seguir la partida aquí</button>
        <button className="btn" onClick={() => sala?.responder('segundo')}>Entrar como segundo jugador</button>
        {aCasos}
      </Aviso>
    );
  }
  if (!v?.partida || !v.yo) {
    const sinRed = navigator.onLine === false;
    const reconectando = v?.conexion === 'reconectando';
    return (
      <Aviso
        titulo={sinRed ? 'Sin conexión' : reconectando ? 'Conectando con la sala…' : `Entrando en la sala ${codigo}…`}
        texto={sinRed ? 'El modo en directo necesita internet. En cuanto vuelva la conexión, entraremos solos.' : reconectando ? 'Parece que la conexión va lenta. Seguimos intentándolo.' : undefined}
      >
        {aCasos}
      </Aviso>
    );
  }
  return <SalaPartida key={`${codigo}-${v.partida.n}`} v={v} partida={v.partida} yo={v.yo} onHelp={onHelp} onSettings={onSettings} />;
}

// ------------------------------------------------------------ la partida

function SalaPartida({ v, partida, yo, onHelp, onSettings }: { v: VistaSala; partida: PartidaSala; yo: Asiento; onHelp: () => void; onSettings: () => void }) {
  const caso = useCaso(partida.caso);
  if (caso.estado === 'cargando') return <Aviso titulo="Abriendo el expediente…" />;
  if (caso.estado === 'no-esta') {
    return (
      <Aviso titulo="Este caso no está en tu versión" texto={`Tu pareja ha elegido «${nombreCaso(partida.caso)}», que no encontramos aquí. Recarga la página para tener la última versión del juego.`}>
        <button className="btn btn--primary" onClick={() => location.reload()}>Recargar la página</button>
        {aCasos}
      </Aviso>
    );
  }
  return <SalaJuego v={v} partida={partida} yo={yo} p={caso.p} onHelp={onHelp} onSettings={onSettings} />;
}

function SalaJuego({ v, partida, yo, p, onHelp, onSettings }: { v: VistaSala; partida: PartidaSala; yo: Asiento; p: Puzzle; onHelp: () => void; onSettings: () => void }) {
  const sala = salaActual()!;
  const tablero = sala.tablero(p)!;
  const pareja = otro(yo);
  const inicio = v.inicio;
  const enMarcha = partida.fase === 'cuenta' || partida.fase === 'jugando' || partida.fase === 'fin';
  // Durante la cuenta atrás se refresca a menudo; luego basta una vez por segundo.
  const enCuenta = partida.fase === 'cuenta' && inicio != null && Date.now() < inicio;
  const ahora = useAhora(enCuenta ? 200 : enMarcha ? 1000 : null);
  const fase = partida.fase === 'cuenta' && inicio != null && ahora >= inicio ? 'jugando' : partida.fase;
  const duelo = partida.modo === 'duelo';
  const miTiempo = duelo ? partida.tiempos[yo] : partida.tiempo;
  const resuelto = duelo ? partida.tiempos[yo] != null : fase === 'fin';
  const meRendi = partida.rendido === yo;
  const [seguir, setSeguir] = useState(false);
  const [parado, setParado] = useState<number | null>(null);
  const corriendo = inicio != null && ahora > inicio ? Math.floor((ahora - inicio) / 1000) : 0;
  const activo = !resuelto && !meRendi && (fase === 'jugando' || (fase === 'fin' && duelo && seguir));
  // Al terminar el duelo sin haberlo resuelto, el reloj se para (salvo si sigues hasta resolverlo).
  useEffect(() => {
    if (fase === 'fin' && miTiempo == null) setParado((x) => x ?? corriendo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, miTiempo]);
  const segundos = miTiempo != null ? Math.floor(miTiempo / 1000) : fase === 'fin' && !seguir && parado != null ? parado : corriendo;

  // Resultado: tras la animación de «Caso cerrado»; si gana tu pareja el duelo, al momento.
  const [verFin, setVerFin] = useState(() => partida.fase === 'fin');
  const pierdo = duelo && fase === 'fin' && partida.ganador === pareja && !resuelto;
  useEffect(() => {
    if (pierdo && !seguir) {
      setVerFin(true);
      sfx.error();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pierdo]);

  const [salir, setSalir] = useState(false);
  const [elegir, setElegir] = useState(false);
  const [expediente, setExpediente] = useState(false);

  // Cuenta atrás: un sonido por número.
  const quedan = fase === 'cuenta' && inicio != null ? Math.ceil((inicio - ahora) / 1000) : 0;
  useEffect(() => {
    if (quedan > 0) sfx.ring(3 - Math.min(3, quedan));
  }, [quedan]);

  const live: LiveGame = {
    modo: partida.modo,
    tablero,
    activo,
    resuelto,
    segundos,
    alResolver: () => sala.resuelto(),
    alRevelar: () => setVerFin(true),
    revelarPareja: !duelo && fase === 'fin' && partida.resolvio === pareja ? partida.n : 0,
    barra: <SalaBar v={v} partida={partida} yo={yo} p={p} fase={fase} onSalir={() => setSalir(true)} onVerFin={fase === 'fin' && !verFin ? () => setVerFin(true) : undefined} />,
    capa: (
      <>
        {fase === 'espera' && !elegir && !salir && !expediente && (
          <Espera v={v} partida={partida} yo={yo} p={p} onEmpezar={() => sala.empezar()} onCambiar={() => setElegir(true)} onExpediente={() => setExpediente(true)} onSalir={() => setSalir(true)} />
        )}
        {fase === 'cuenta' && quedan > 0 && (
          <div className="cuenta" role="status" aria-live="assertive">
            <span key={quedan} className="cuenta__n">{quedan}</span>
            <span className="cuenta__txt">{duelo ? '¡Preparados para el duelo!' : '¡A investigar juntos!'}</span>
          </div>
        )}
        {verFin && fase === 'fin' && !salir && !elegir && (
          <Final
            v={v} partida={partida} yo={yo} p={p}
            onCerrar={() => setVerFin(false)}
            onSeguir={pierdo && !seguir ? () => { setSeguir(true); setVerFin(false); } : undefined}
            onOtra={() => setElegir(true)}
            onSalir={() => setSalir(true)}
          />
        )}
        {elegir && <OtraPartida partida={partida} p={p} onCerrar={() => setElegir(false)} />}
        {expediente && <IntroModal p={p} onStart={() => setExpediente(false)} onHelp={onHelp} inRoom />}
        {salir && <Salir v={v} partida={partida} yo={yo} fase={fase} onCerrar={() => setSalir(false)} />}
        {v.aviso && <AvisoSala key={v.aviso.n} texto={v.aviso.texto} desde={v.aviso.t} />}
      </>
    ),
  };

  return (
    <div className={`sala-juego${fase === 'espera' || fase === 'cuenta' ? ' is-esperando' : ''}`}>
      <GameScreen p={p} onHelp={onHelp} onSettings={onSettings} live={live} />
    </div>
  );
}

/** Aviso de la sala: se ve 4 segundos desde que llegó (si vuelves a la sala más tarde, ya no sale). */
function AvisoSala({ texto, desde }: { texto: string; desde: number }) {
  const [visible, setVisible] = useState(() => Date.now() - desde < 4000);
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), Math.max(0, 4000 - (Date.now() - desde)));
    return () => window.clearTimeout(t);
  }, [desde]);
  return visible ? <div className="toast sala-toast" role="status">{texto}</div> : null;
}

// ------------------------------------------------------------ barra de la sala

type EstadoPareja = 'espera' | 'linea' | 'senal' | 'reconecta' | 'fuera' | 'salio';

function useEstadoPareja(j: VistaSala['jugadores']['a']): EstadoPareja {
  const [caida, setCaida] = useState<number | null>(null);
  const conectado = !!j?.conectado;
  useEffect(() => {
    if (conectado) { setCaida(null); return; }
    setCaida(Date.now());
    const t = window.setTimeout(() => setCaida(0), 5000);
    return () => window.clearTimeout(t);
  }, [conectado]);
  if (!j) return 'espera';
  if (j.salio) return 'salio';
  if (j.conectado) return j.sinSenal ? 'senal' : 'linea';
  // Unos segundos de margen: si vuelve enseguida (cambio de red), no se llega a ver «desconectada».
  return caida ? 'reconecta' : 'fuera';
}

const TEXTO_PAREJA: Record<EstadoPareja, string> = {
  espera: 'aún no ha entrado',
  linea: 'en línea',
  senal: 'sin señal',
  reconecta: 'reconectando…',
  fuera: 'desconectada',
  salio: 'ha salido',
};

function SalaBar({ v, partida, yo, p, fase, onSalir, onVerFin }: {
  v: VistaSala; partida: PartidaSala; yo: Asiento; p: Puzzle; fase: PartidaSala['fase'];
  onSalir: () => void; onVerFin?: () => void;
}) {
  const pareja = v.jugadores[otro(yo)];
  const estado = useEstadoPareja(pareja);
  const prog = partida.progreso[otro(yo)];
  const total = prog?.total || p.cast.length;
  const colocados = prog?.colocados ?? 0;
  const huellaDistinta = huella(p) !== partida.huella;
  return (
    <div className="sala-bar">
      <div className="sala-bar__fila">
        <span className="sala-bar__sala" title={`Código de la sala: ${v.codigo}`}><span aria-hidden="true">{iconoModo(partida.modo)}</span> <span className="hide-sm">{nombreModo(partida.modo)} · </span>Sala <strong>{v.codigo}</strong></span>
        <span className={`sala-bar__pareja is-${estado}`} role="status" aria-label={pareja ? `${pareja.nombre}: ${TEXTO_PAREJA[estado]}` : 'Tu pareja aún no ha entrado'}>
          <span className="sala-bar__dot" aria-hidden="true" />
          <span className="sala-bar__nombre">{pareja?.nombre ?? 'Tu pareja'}</span>
          <span className="sala-bar__estado">{TEXTO_PAREJA[estado]}</span>
        </span>
        {partida.modo === 'duelo' && pareja && (fase === 'jugando' || fase === 'fin') && (
          <span className="sala-bar__prog" aria-label={`${pareja.nombre} lleva ${colocados} de ${total} colocados`} title={`${pareja.nombre} lleva ${colocados} de ${total}`}>
            <span className="sala-bar__barra"><span style={{ width: `${Math.round((colocados / Math.max(1, total)) * 100)}%` }} /></span>
            {partida.tiempos[otro(yo)] != null ? '✔' : `${colocados}/${total}`}
          </span>
        )}
        {v.conexion !== 'abierta' && <span className="sala-bar__red" role="status"><Icon name="cloudOff" size={16} /> <span className="hide-sm">Reconectando…</span></span>}
        {onVerFin && <button className="btn btn--sm sala-bar__btn" onClick={onVerFin}>Ver el final</button>}
        <button className="btn btn--ghost btn--sm sala-bar__btn" onClick={onSalir}><Icon name="logout" size={16} /> <span>Salir</span></button>
      </div>
      {huellaDistinta && <p className="sala-bar__aviso" role="alert">Tu pareja y tú tenéis versiones distintas de este caso: recargad los dos la página.</p>}
    </div>
  );
}

// ------------------------------------------------------------ sala de espera

function CodigoGrande({ codigo }: { codigo: string }) {
  const [hecho, setHecho] = useState<'' | 'copiado' | 'enviado' | 'fallo'>('');
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setHecho('copiado');
    } catch {
      setHecho('fallo');
    }
  };
  const enviar = async () => {
    const r = await shareOrCopy(`💘 Te espero en Churri-doku para jugar en directo. Entra en la sala ${codigo}:`, enlaceSala(codigo));
    setHecho(r === 'shared' ? 'enviado' : r === 'copied' ? 'copiado' : 'fallo');
  };
  return (
    <div className="lobby__codigo">
      <span className="lobby__etiqueta">Código de la sala</span>
      <strong className="lobby__letras" aria-label={[...codigo].join(' ')}>{codigo}</strong>
      <div className="row gap wrap lobby__compartir">
        <button className="btn btn--sm" onClick={() => void copiar()}><Icon name="list" size={16} /> Copiar el código</button>
        <button className="btn btn--sm" onClick={() => void enviar()}><Icon name="share" size={16} /> Enviar el enlace</button>
      </div>
      {hecho === 'copiado' && <span className="share-ok" role="status">Copiado. Pégalo en WhatsApp o donde quieras.</span>}
      {hecho === 'enviado' && <span className="share-ok" role="status">¡Enviado!</span>}
      {hecho === 'fallo' && <span className="share-ok share-ok--warn" role="status">No se ha podido copiar: díctale el código.</span>}
    </div>
  );
}

function Jugador({ nombre, yo, estado }: { nombre: string; yo?: boolean; estado: EstadoPareja }) {
  return (
    <li className={`lobby__jugador is-${estado}`}>
      <span className="me__avatar" aria-hidden="true">{nombre.trim().charAt(0).toUpperCase() || '?'}</span>
      <span className="lobby__nombre"><strong>{nombre}</strong>{yo && <span className="muted small"> (tú)</span>}</span>
      <span className="lobby__estado"><span className="sala-bar__dot" aria-hidden="true" /> {yo ? 'en línea' : TEXTO_PAREJA[estado]}</span>
    </li>
  );
}

function Espera({ v, partida, yo, p, onEmpezar, onCambiar, onExpediente, onSalir }: {
  v: VistaSala; partida: PartidaSala; yo: Asiento; p: Puzzle;
  onEmpezar: () => void; onCambiar: () => void; onExpediente: () => void; onSalir: () => void;
}) {
  const yoJ = v.jugadores[yo];
  const pareja = v.jugadores[otro(yo)];
  const estado = useEstadoPareja(pareja);
  const puede = !!pareja?.conectado && v.conexion === 'abierta';
  return (
    <div className="sala-capa" role="dialog" aria-modal="true" aria-labelledby="lobby-title">
      <div className="lobby">
        <p className="eyebrow"><span aria-hidden="true">💘</span> En directo · {iconoModo(partida.modo)} {nombreModo(partida.modo)}</p>
        <h2 id="lobby-title" className="lobby__titulo">{p.title}</h2>
        <p className="lobby__caso">{caseTag(p)} · {p.franchise} · {levelInfo(p.level).name} · {p.size}×{p.size}</p>
        {!pareja && <CodigoGrande codigo={v.codigo} />}
        <ul className="lobby__jugadores">
          <Jugador nombre={yoJ?.nombre ?? 'Tú'} yo estado="linea" />
          {pareja ? <Jugador nombre={pareja.nombre} estado={estado} /> : (
            <li className="lobby__jugador is-espera"><span className="me__avatar me__avatar--hueco" aria-hidden="true">?</span><span className="lobby__nombre">Esperando a tu pareja…</span></li>
          )}
        </ul>
        {!pareja && <p className="muted small lobby__ayuda">Dile el código o mándale el enlace. Lo abre en su móvil u ordenador, entra con su cuenta y aparecerá aquí.</p>}
        <p className="lobby__reglas">{partida.modo === 'coop'
          ? 'Un solo tablero para los dos: veréis al momento lo que coloca, anota o tacha el otro. Cualquiera puede acusar al culpable.'
          : 'El mismo caso, cada uno en su tablero. Veréis cuántos sospechosos lleva colocados el otro. Sin pistas: gana quien lo resuelva antes.'}</p>
        {v.marcador && <MarcadorPareja m={v.marcador} caso={partida.caso} completo={false} />}
        <button className="btn btn--primary btn--lg btn--block" disabled={!puede} onClick={onEmpezar}>
          <Icon name="play" size={18} /> {puede ? 'Empezar' : pareja ? `Esperando a ${pareja.nombre}…` : 'Empezar (cuando entre tu pareja)'}
        </button>
        <div className="row gap wrap lobby__mas">
          <button className="btn btn--sm" onClick={onCambiar}>Cambiar caso o modo</button>
          <button className="btn btn--sm" onClick={onExpediente}><Icon name="folder" size={16} /> Expediente</button>
          <button className="btn btn--ghost btn--sm" onClick={onSalir}><Icon name="logout" size={16} /> Salir de la sala</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ final

function Final({ v, partida, yo, p, onCerrar, onSeguir, onOtra, onSalir }: {
  v: VistaSala; partida: PartidaSala; yo: Asiento; p: Puzzle;
  onCerrar: () => void; onSeguir?: () => void; onOtra: () => void; onSalir: () => void;
}) {
  const pareja = otro(yo);
  const nombre = v.jugadores[pareja]?.nombre ?? 'Tu pareja';
  const s = (ms?: number) => (ms == null ? '' : formatTime(Math.floor(ms / 1000)));
  let sello = 'Caso cerrado', titulo = '', texto = '', icono = '🔎', tono = '';
  if (partida.modo === 'coop') {
    icono = '🤝';
    titulo = '¡Resuelto entre los dos!';
    texto = `Caso cerrado en ${s(partida.tiempo)}. ${partida.resolvio === yo ? 'Acusaste tú al culpable.' : `Acusó ${nombre} al culpable.`}`;
    tono = 'win';
  } else if (partida.ganador === yo) {
    icono = '🏆';
    sello = '¡Ganas!';
    titulo = '¡Has ganado el duelo!';
    texto = partida.rendido === pareja ? `${nombre} se ha rendido.` : `Lo has resuelto en ${s(partida.tiempos[yo])}.`;
    if (partida.tiempos[pareja] != null) texto += ` ${nombre} tardó ${s(partida.tiempos[pareja])}.`;
    else if (partida.rendido !== pareja) texto += ` ${nombre} sigue investigando.`;
    tono = 'win';
  } else {
    icono = '💘';
    sello = 'Gana tu pareja';
    titulo = `${nombre} gana el duelo`;
    texto = partida.rendido === yo ? 'Te has rendido.' : `Lo ha resuelto en ${s(partida.tiempos[pareja])}.`;
    if (partida.tiempos[yo] != null) texto += ` Tú, en ${s(partida.tiempos[yo])} (+${formatTime(Math.max(0, Math.floor(((partida.tiempos[yo] ?? 0) - (partida.tiempos[pareja] ?? 0)) / 1000)))}).`;
    tono = 'lose';
  }
  return (
    <Modal onClose={onCerrar} labelledBy="final-title" className={`final final--${tono}`}>
      <div className="final__cabeza">
        <span className="final__icono" aria-hidden="true">{icono}</span>
        <span className={`stamp${tono === 'lose' ? ' stamp--warn' : ''}`}>{sello}</span>
      </div>
      <h2 id="final-title" className="final__titulo">{titulo}</h2>
      <p className="final__texto">{texto}</p>
      <p className="muted small">{p.title} · {caseTag(p)} · {p.franchise}</p>
      {v.marcador ? <MarcadorPareja m={v.marcador} caso={partida.caso} completo={false} /> : <p className="muted small">Apuntando el resultado en vuestro marcador…</p>}
      <div className="final__acciones">
        {onSeguir && <button className="btn btn--primary" onClick={onSeguir}>Seguir hasta resolverlo</button>}
        <button className={`btn${onSeguir ? '' : ' btn--primary'}`} onClick={onOtra}><Icon name="refresh" size={18} /> Otra partida</button>
        <button className="btn btn--ghost" onClick={onCerrar}>Ver el tablero</button>
        <button className="btn btn--ghost" onClick={onSalir}><Icon name="logout" size={18} /> Salir de la sala</button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------ otra partida, salir

function OtraPartida({ partida, p, onCerrar }: { partida: PartidaSala; p: Puzzle; onCerrar: () => void }) {
  const siguiente = partida.fase === 'fin' && p.meta?.kind !== 'daily' ? nextPuzzle(p.id)?.id ?? p.id : partida.caso;
  const [modo, setModo] = useState<Modo>(partida.modo);
  const [caso, setCaso] = useState(siguiente);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const preparar = async () => {
    setOcupado(true);
    setError('');
    const q = await cargarCaso(caso);
    setOcupado(false);
    if (!q) { setError('No encontramos ese caso. Elige otro.'); return; }
    salaActual()?.nueva(caso, modo, huella(q));
    onCerrar();
  };
  return (
    <Modal title={partida.fase === 'espera' ? 'Cambiar caso o modo' : 'Otra partida'} onClose={onCerrar} labelledBy="otra-title" className="pareja">
      <ElegirPartida modo={modo} caso={caso} onModo={setModo} onCaso={setCaso} />
      {error && <p className="account__error" role="alert">{error}</p>}
      <button className="btn btn--primary btn--block" disabled={ocupado} onClick={() => void preparar()}>{ocupado ? 'Preparando…' : 'Preparar la partida'}</button>
      <p className="muted small pareja__fine">Tu pareja verá la sala de espera con el caso nuevo y cualquiera de los dos podrá darle a «Empezar».</p>
    </Modal>
  );
}

function Salir({ v, partida, yo, fase, onCerrar }: { v: VistaSala; partida: PartidaSala; yo: Asiento; fase: PartidaSala['fase']; onCerrar: () => void }) {
  const nombre = v.jugadores[otro(yo)]?.nombre;
  const dueloEnJuego = partida.modo === 'duelo' && (fase === 'cuenta' || fase === 'jugando') && !partida.ganador && !!nombre;
  const salir = () => {
    salaActual()?.salir();
    navigate('/');
  };
  return (
    <Modal title="¿Salir de la sala?" onClose={onCerrar} labelledBy="salir-title" className="pareja">
      <p>{dueloEnJuego
        ? `El duelo está en marcha: si sales ahora, te rindes y gana ${nombre}.`
        : nombre ? `${nombre} verá que has salido. Podrás volver a entrar con el código ${v.codigo}.` : `La sala ${v.codigo} se cerrará si sales y no entra nadie.`}</p>
      <div className="row gap wrap">
        <button className="btn btn--danger" onClick={salir}><Icon name="logout" size={18} /> {dueloEnJuego ? 'Rendirme y salir' : 'Salir de la sala'}</button>
        <button className="btn btn--ghost" onClick={onCerrar}>Seguir aquí</button>
      </div>
    </Modal>
  );
}
