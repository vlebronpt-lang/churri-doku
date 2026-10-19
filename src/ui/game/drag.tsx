import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CharacterDef, Puzzle } from '../../engine/types';
import { sfx } from '../../game/sfx';
import { Portrait } from '../Portrait';

export interface DragInfo {
  id: string;
  x: number;
  y: number;
  /** Casilla bajo el dedo o el ratón (null: fuera del plano). */
  cell: number | null;
  touch: boolean;
}

/** Casilla del plano que hay en un punto de la pantalla. */
export function cellFromPoint(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y);
  const cell = el?.closest?.('.board__grid > .cell');
  if (!cell?.parentElement) return null;
  return Array.prototype.indexOf.call(cell.parentElement.children, cell);
}

/** Con el dedo hay que mantener pulsado un instante antes de arrastrar (así un deslizamiento rápido no coloca a nadie). */
const HOLD_MS = 160;

/**
 * Arrastrar a un sospechoso desde su foto hasta una casilla del plano.
 * Con ratón empieza en cuanto se mueve; con el dedo, tras mantener pulsado un momento.
 */
export function useSuspectDrag(onDrop: (id: string, cell: number) => void, enabled: boolean) {
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const lastDrop = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;
  useEffect(() => () => cleanupRef.current?.(), []);

  const start = (id: string) => (e: React.PointerEvent) => {
    if (!enabled || e.button !== 0 || !e.isPrimary) return;
    cleanupRef.current?.();
    const touch = e.pointerType !== 'mouse';
    const pid = e.pointerId;
    const x0 = e.clientX, y0 = e.clientY;
    let cur = { x: x0, y: y0 };
    let active = false;
    let held = !touch;
    const holdTimer = touch ? window.setTimeout(() => { held = true; }, HOLD_MS) : 0;
    const activate = () => {
      active = true;
      sfx.pickup();
      setDrag({ id, x: cur.x, y: cur.y, cell: cellFromPoint(cur.x, cur.y), touch });
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      cur = { x: ev.clientX, y: ev.clientY };
      if (!active) {
        const d = Math.hypot(cur.x - x0, cur.y - y0);
        if (d < (touch ? 8 : 5)) return;
        if (!held) { cleanup(); return; } // deslizamiento rápido: no es un arrastre
        activate();
        return;
      }
      setDrag((s) => s && { ...s, x: cur.x, y: cur.y, cell: cellFromPoint(cur.x, cur.y) });
    };
    // Mientras se arrastra con el dedo, que la página no se desplace.
    const touchMove = (ev: TouchEvent) => { if (active && ev.cancelable) ev.preventDefault(); };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      if (active) {
        lastDrop.current = Date.now();
        const cell = cellFromPoint(ev.clientX, ev.clientY);
        if (cell !== null) dropRef.current(id, cell);
      }
      cleanup();
    };
    const cancel = (ev: PointerEvent) => { if (ev.pointerId === pid) cleanup(); };
    function cleanup() {
      window.clearTimeout(holdTimer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('touchmove', touchMove);
      cleanupRef.current = null;
      setDrag(null);
    }
    cleanupRef.current = cleanup;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('touchmove', touchMove, { passive: false });
  };

  /** El clic que llega justo después de soltar un arrastre no debe seleccionar ni deseleccionar. */
  const justDropped = () => Date.now() - lastDrop.current < 450;
  return { drag, start, justDropped };
}

/** Ficha que sigue al dedo o al ratón mientras se arrastra (con el dedo, un poco por encima para verla). */
export function DragGhost({ p, ch, x, y, touch, ok }: { p: Puzzle; ch: CharacterDef; x: number; y: number; touch: boolean; ok: boolean }) {
  return createPortal(
    <div className={`drag-ghost${ch.victim ? ' drag-ghost--victim' : ''}${ok ? '' : ' is-off'}`} style={{ left: x, top: touch ? y - 54 : y }} aria-hidden="true">
      <Portrait p={p} ch={ch} className="drag-ghost__img" />
      <span className="drag-ghost__tag">{ch.tag}</span>
    </div>,
    document.body,
  );
}
