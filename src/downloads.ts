import type { Puzzle } from './engine/types';

export type PdfKind = 'color' | 'bn' | 'solucion';

export const PDF_KINDS: { kind: PdfKind; label: string; hint: string }[] = [
  { kind: 'color', label: 'Color', hint: 'Para imprimir a color' },
  { kind: 'bn', label: 'B/N', hint: 'Ahorra tinta' },
  { kind: 'solucion', label: 'Solución', hint: 'Página aparte con la solución' },
];

export const caseSlug = (p: Pick<Puzzle, 'num' | 'id'>) => `${String(p.num).padStart(2, '0')}-${p.id}`;
export const downloadName = (p: Pick<Puzzle, 'num' | 'id'>, kind: PdfKind) => `churri-doku-${caseSlug(p)}-${kind}.pdf`;
export const ZIP_ALL = 'churri-doku-todos-los-casos.zip';
export const BOOK_PDF = 'churri-doku-libro-completo.pdf';
export const BOOK_BOUND_INTERIOR = 'churri-doku-libro-encuadernar-interior.pdf';
export const BOOK_BOUND_COVERS = 'churri-doku-libro-encuadernar-cubiertas.pdf';

/** Dedicatoria del libro que se prepara en Descargas y se imprime desde el navegador (#/imprimir/libro?dedicado=1). */
export interface Dedication {
  para: string;
  de: string;
  msg?: string;
}
export const DEDICATION_KEY = 'dedicatoria';
