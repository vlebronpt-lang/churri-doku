import { lazy, Suspense, useEffect, useState } from 'react';
import { useRoute, navigate } from './router';
import { getPuzzle } from './data/puzzles';
import { SiteFooter, SiteHeader } from './ui/SiteHeader';
import { Home } from './ui/Home';
import { GameScreen } from './ui/game/GameScreen';
import { HowTo } from './ui/HowTo';
import { SettingsPanel } from './ui/SettingsPanel';
import { Downloads } from './ui/Downloads';
import { ImportProgressModal } from './ui/ShareDialogs';

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
  }, [page]);

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

  const modals = (
    <>
      {help && <HowTo onClose={() => setHelp(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </>
  );

  if (page === 'caso') {
    const p = getPuzzle(parts[1] ?? '');
    if (p) {
      return (
        <>
          <GameScreen key={p.id} p={p} reto={query.get('reto')} onHelp={() => setHelp(true)} onSettings={() => setSettingsOpen(true)} />
          {modals}
        </>
      );
    }
  }

  return (
    <div className="site">
      <SiteHeader current={page === 'descargas' ? 'downloads' : 'home'} onHelp={() => setHelp(true)} onSettings={() => setSettingsOpen(true)} />
      <main className="site-main">
        {page === 'descargas' ? <Downloads /> : <Home onHelp={() => setHelp(true)} onSettings={() => setSettingsOpen(true)} />}
      </main>
      <SiteFooter />
      {modals}
      {page === 'progreso' && parts[1] && <ImportProgressModal payload={parts[1]} />}
    </div>
  );
}
