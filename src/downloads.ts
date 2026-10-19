import type { Puzzle } from './engine/types';

export type PdfKind = 'color' | 'bn' | 'solucion';

export const PDF_KINDS: { kind: PdfKind; label: string; hint: string }[] = [
  { kind: 'color', label: 'Color', hint: 'Para imprimir a color' },
  { kind: 'bn', label: 'B/N', hint: 'Ahorra tinta' },
  { kind: 'solucion', label: 'Solución', hint: 'Hoja aparte con la solución' },
];

export const caseSlug = (p: Pick<Puzzle, 'num' | 'id'>) => `${String(p.num).padStart(2, '0')}-${p.id}`;
export const downloadName = (p: Pick<Puzzle, 'num' | 'id'>, kind: PdfKind) => `churri-doku-${caseSlug(p)}-${kind}.pdf`;
export const ZIP_ALL = 'churri-doku-todos-los-casos.zip';
export const BOOK_PDF = 'churri-doku-libro-completo.pdf';
