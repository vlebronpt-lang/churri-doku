import { useEffect, useState } from 'react';

/** Router mínimo por hash (compatible con GitHub Pages). */
export function navigate(path: string) {
  if (location.hash.slice(1) === path) return;
  location.hash = path;
  window.scrollTo({ top: 0 });
}

export function useRoute(): { path: string; parts: string[]; query: URLSearchParams } {
  const read = () => {
    const full = location.hash.replace(/^#/, '') || '/';
    const [path, qs = ''] = full.split('?');
    return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) };
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
