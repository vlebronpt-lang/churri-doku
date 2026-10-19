import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Bocadillo flotante que nunca se corta: se pinta en <body>, encima del elemento si cabe
 * (si no, debajo) y siempre dentro de la pantalla.
 */
export function FloatingTip({ anchor, children, maxWidth = 260 }: { anchor: DOMRect; children: ReactNode; maxWidth?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean; arrow: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const margin = 8;
    const below = anchor.top - h - 10 < margin && anchor.bottom + h + 10 < vh - margin;
    const top = below ? anchor.bottom + 10 : anchor.top - h - 10;
    const center = anchor.left + anchor.width / 2;
    const left = Math.min(Math.max(center - w / 2, margin), vw - w - margin);
    setPos({ left, top: Math.max(margin, top), below, arrow: Math.min(Math.max(center - left, 14), w - 14) });
  }, [anchor]);
  return createPortal(
    <div
      ref={ref}
      className={`float-tip${pos?.below ? ' is-below' : ''}`}
      role="tooltip"
      style={{ maxWidth, left: pos?.left ?? -9999, top: pos?.top ?? -9999, ['--arrow' as string]: `${pos?.arrow ?? 20}px` }}
    >
      {children}
    </div>,
    document.body,
  );
}
