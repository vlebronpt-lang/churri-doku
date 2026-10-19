/** Lupa con un corazón dentro: la "O" de DOKU. */
export function HeartLens({ size = 1 }: { size?: number }) {
  return (
    <svg className="lens" viewBox="0 0 64 64" style={{ width: `${0.86 * size}em`, height: `${0.86 * size}em` }} aria-hidden="true">
      <path d="M41 41 L57 57" stroke="var(--ink)" strokeWidth="11" strokeLinecap="round" />
      <path d="M41 41 L56 56" stroke="var(--mustard)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="27" cy="27" r="21" fill="var(--card)" stroke="var(--ink)" strokeWidth="6.5" />
      <path d="M27 38 C16 31 15.5 24.5 18.5 21.2 C21.5 18 25.5 19 27 22.6 C28.5 19 32.5 18 35.5 21.2 C38.5 24.5 38 31 27 38 Z" fill="var(--raspberry)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M14 22 Q16 15 22 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".75" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`logo${compact ? ' logo--compact' : ''}`} aria-label="Churri-doku">
      <span className="logo__churri" aria-hidden="true">CHURRI</span>
      <span className="logo__doku" aria-hidden="true">
        D<HeartLens />KU
      </span>
    </span>
  );
}
