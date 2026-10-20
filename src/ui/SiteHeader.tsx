import { Logo } from './Logo';
import { Icon } from './Icon';
import { navigate } from '../router';
import { useSettings } from '../state/settings';
import { AccountButton } from './account/Account';

export type Section = 'home' | 'daily' | 'academy' | 'stats' | 'downloads';

const NAV: { id: Section; label: string; route: string }[] = [
  { id: 'home', label: 'Casos', route: '/' },
  { id: 'daily', label: 'Hoy', route: '/diario' },
  { id: 'academy', label: 'Academia', route: '/academia' },
  { id: 'stats', label: 'Logros', route: '/logros' },
  { id: 'downloads', label: 'Descargas', route: '/descargas' },
];

export function SiteHeader({ current, onHelp, onSettings }: { current: Section | null; onHelp: () => void; onSettings: () => void }) {
  const { settings, set } = useSettings();
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  return (
    <header className="site-head">
      <a className="site-head__logo" href="#/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
        <Logo />
      </a>
      <nav className="site-nav" aria-label="Principal">
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.route}`} className={current === n.id ? 'is-on' : ''} aria-current={current === n.id ? 'page' : undefined} onClick={(e) => { e.preventDefault(); navigate(n.route); }}>
            {n.label}
          </a>
        ))}
      </nav>
      <div className="site-head__tools">
        <button className="icon-btn" onClick={onHelp} aria-label="Cómo se juega" title="Cómo se juega"><Icon name="help" /></button>
        <button className="icon-btn" onClick={() => set('theme', dark ? 'light' : 'dark')} aria-label={dark ? 'Usar tema claro' : 'Usar tema oscuro'} title={dark ? 'Tema claro' : 'Tema oscuro'}>
          <Icon name={dark ? 'sun' : 'moon'} />
        </button>
        <button className="icon-btn" onClick={onSettings} aria-label="Ajustes" title="Ajustes"><Icon name="settings" /></button>
        <AccountButton />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <p>
        <strong>Churri-doku</strong> es un proyecto fan sin ánimo de lucro, inspirado en los rompecabezas de lógica tipo <em>Murdoku</em>. Los personajes, nombres y marcas pertenecen a sus respectivos propietarios; este juego no está afiliado a ellos.
      </p>
      <p className="muted">Hecho con cariño (y algún asesinato) · Tu progreso se guarda en este navegador y, si entras con tu cuenta, también en ella.</p>
    </footer>
  );
}
