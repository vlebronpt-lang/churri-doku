import { lazy, Suspense, useEffect, useState } from 'react';
import { useRoute, navigate } from './router';
import { getPuzzle } from './data/puzzles';
import { getLesson, lessonPuzzle } from './data/academy';
import { SiteFooter, SiteHeader, type Section } from './ui/SiteHeader';
import { Home } from './ui/Home';
import { GameScreen } from './ui/game/GameScreen';
import { HowTo } from './ui/HowTo';
import { SettingsPanel } from './ui/SettingsPanel';
import { Downloads } from './ui/Downloads';
import { ImportProgressModal } from './ui/ShareDialogs';
import { DailyScreen } from './ui/daily/DailyScreen';
import { Archive } from './ui/daily/Archive';
import { Stats } from './ui/Stats';
import { Academy } from './ui/academy/Academy';
import { Tutorial } from './ui/tutorial/Tutorial';
import { Panel, ImportReportModal } from './ui/panel/Panel';
import { AchievementToasts } from './ui/AchievementToasts';
import { AccountCenter, maybeWelcome, openAccount } from './ui/account/Account';
import { SalaScreen } from './ui/live/SalaScreen';
import { abrirPareja, ParejaCenter } from './ui/live/ParejaDialog';

const PrintPage = lazy(() => import('./ui/print/PrintPage'));

export default function App() {
  const { parts, query } = useRoute();
  const [help, setHelp] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const page = parts[0] ?? '';

  useEffect(() => {
    if (page === 'como-jugar') {
      setHelp(true);
      navigate('/');
    }
    // Enlaces de la cuenta: #/cuenta abre la ventana; #/cuenta/restablecer?token=… viene del correo de «olvidé la contraseña».
    if (page === 'cuenta') {
      if (parts[1] === 'restablecer') openAccount('reset', { token: query.get('token') ?? query.get('reset_token') ?? query.get('code') ?? '' });
      else openAccount();
      history.replaceState(history.state, '', `${location.pathname}${location.search}#/`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    // #/sala sin código: «Tengo un código».
    if (page === 'sala' && !parts[1]) {
      abrirPareja({ unirme: true });
      navigate('/');
    }
  }, [page, parts, query]);

  // Bienvenida al entrar sin cuenta (no en las páginas que se abren para imprimir o importar algo).
  useEffect(() => {
    if (['imprimir', 'progreso', 'informe', 'panel', 'cuenta', 'tutorial', 'sala'].includes(page)) return;
    const t = window.setTimeout(maybeWelcome, 900);
    return () => window.clearTimeout(t);
    // Solo al cargar la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (page === 'imprimir') {
    const sub = parts[1] ?? '';
    const special = sub === 'portada' || sub === 'reglas' || sub === 'libro' ? sub : null;
    const p = special ? null : getPuzzle(sub);
    const kind = special ?? ((parts[2] as 'color' | 'bn' | 'solucion') || 'color');
    return (
      <Suspense fallback={null}>
        <PrintPage p={p ?? null} kind={kind} />
      </Suspense>
    );
  }

  const openHelp = () => setHelp(true);
  const openSettings = () => setSettingsOpen(true);
  const overlays = (
    <>
      {help && <HowTo onClose={() => setHelp(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      <AchievementToasts />
      <AccountCenter />
      <ParejaCenter />
    </>
  );

  // Pantallas de juego (sin la cabecera del sitio)
  let game: React.ReactNode = null;
  if (page === 'caso') {
    const p = getPuzzle(parts[1] ?? '');
    if (p) game = <GameScreen key={p.id} p={p} reto={query.get('reto')} onHelp={openHelp} onSettings={openSettings} />;
  } else if (page === 'diario') {
    game = <DailyScreen key={parts[1] ?? 'hoy'} date={parts[1]} reto={query.get('reto')} onHelp={openHelp} onSettings={openSettings} />;
  } else if (page === 'academia' && parts[1]) {
    const l = getLesson(parts[1]);
    if (l) {
      const p = lessonPuzzle(l);
      game = <GameScreen key={p.id} p={p} reto={null} onHelp={openHelp} onSettings={openSettings} />;
    }
  } else if (page === 'tutorial') {
    game = <Tutorial onHelp={openHelp} onSettings={openSettings} />;
  } else if (page === 'sala' && parts[1]) {
    game = <SalaScreen key={parts[1]} codigo={parts[1].toUpperCase()} onHelp={openHelp} onSettings={openSettings} />;
  }
  if (game) {
    return (
      <>
        {game}
        {overlays}
      </>
    );
  }

  const section: Section | null = page === 'descargas' ? 'downloads' : page === 'archivo' ? 'daily' : page === 'logros' ? 'stats' : page === 'academia' ? 'academy' : page === 'panel' ? null : 'home';
  return (
    <div className="site">
      <SiteHeader current={section} onHelp={openHelp} onSettings={openSettings} />
      <main className="site-main">
        {page === 'descargas' ? <Downloads />
          : page === 'archivo' ? <Archive />
          : page === 'logros' ? <Stats />
          : page === 'academia' ? <Academy />
          : page === 'panel' ? <Panel />
          : <Home onHelp={openHelp} onSettings={openSettings} />}
      </main>
      <SiteFooter />
      {overlays}
      {page === 'progreso' && parts[1] && <ImportProgressModal payload={parts[1]} />}
      {page === 'informe' && parts[1] && <ImportReportModal payload={parts[1]} />}
    </div>
  );
}
