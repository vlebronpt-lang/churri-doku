import { Logo } from './Logo';
import { Icon } from './Icon';
import { navigate } from '../router';
import { useSettings } from '../state/settings';

export function SiteHeader({ current, onHelp, onSettings }: { current: string; onHelp: () => void; onSettings: () => void }) {
  const { settings, set } = useSettings();
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  return (
    <header className="site-head">
      <a className="site-head__logo" href="#/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
        <Logo />
      </a>
      <nav className="site-nav" aria-label="Principal">
        <a href="#/" className={current === 'home' ? 'is-on' : ''} onClick={(e) => { e.preventDefault(); navigate('/'); }}>Casos</a>
        <button onClick={onHelp}>Cómo jugar</button>
        <a href="#/descargas" className={current === 'downloads' ? 'is-on' : ''} onClick={(e) => { e.preventDefault(); navigate('/descargas'); }}>Descargas</a>
      </nav>
      <div className="site-head__tools">
        <button className="icon-btn" onClick={() => set('theme', dark ? 'light' : 'dark')} aria-label={dark ? 'Usar tema claro' : 'Usar tema oscuro'} title={dark ? 'Tema claro' : 'Tema oscuro'}>
          <Icon name={dark ? 'sun' : 'moon'} />
        </button>
        <button className="icon-btn" onClick={onSettings} aria-label="Ajustes" title="Ajustes"><Icon name="settings" /></button>
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
      <p className="muted">Hecho con cariño (y algún asesinato) · Tu progreso se guarda en este navegador.</p>
    </footer>
  );
}
