import { useEffect, useState } from 'react';
import { LEVELS, PUZZLES } from '../data/puzzles';
import { BOOK_PDF, downloadName, PDF_KINDS, ZIP_ALL } from '../downloads';
import { CaseCover } from './CaseCard';
import { Icon } from './Icon';

const BASE = import.meta.env.BASE_URL;

const mb = (n?: number) => (n ? ` · ${(n / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB` : '');

export function Downloads() {
  const [sizes, setSizes] = useState<{ libro?: number; zip?: number }>({});
  useEffect(() => {
    fetch(`${BASE}downloads/tamanos.json`).then((r) => (r.ok ? r.json() : {})).then(setSizes).catch(() => {});
  }, []);
  return (
    <div className="downloads">
      <section className="dl-hero">
        <div className="dl-hero__intro">
          <div>
            <p className="eyebrow">Para papel y lápiz</p>
            <h1 className="section-title">Descargas</h1>
            <p className="lede">Cada caso en formato libro: portada, una doble página (a la izquierda, la historia, los sospechosos con sus pistas y los objetos del plano; a la derecha, el plano) y contraportada. Imprímelo en A4 a doble cara y, al abrirlo, el plano queda frente a los sospechosos. La solución va en un archivo aparte para que no te la encuentres sin querer.</p>
          </div>
          <img className="dl-hero__art" src={`${BASE}img/ui/files.webp`} alt="" width="900" height="900" />
        </div>
        <div className="dl-all">
          <a className="dl-big" href={`${BASE}downloads/${BOOK_PDF}`} download>
            <Icon name="book" size={30} />
            <span><strong>Libro completo (PDF)</strong><span>Los {PUZZLES.length} casos en doble página, con portada, reglas, índice, soluciones al final y contraportada{mb(sizes.libro)}.</span></span>
          </a>
          <a className="dl-big" href={`${BASE}downloads/${ZIP_ALL}`} download>
            <Icon name="download" size={30} />
            <span><strong>Todos los casos (ZIP)</strong><span>Los {PUZZLES.length * 3} PDF sueltos (color, B/N y solución), ordenados por nivel{mb(sizes.zip)}.</span></span>
          </a>
        </div>
      </section>
      {LEVELS.map((l) => {
        const list = PUZZLES.filter((p) => p.level === l.level);
        if (!list.length) return null;
        return (
          <section key={l.level} className="dl-level" style={{ ['--lvl' as string]: l.color }}>
            <h2><span className="lvl-dot" /> {l.season} · {l.name}</h2>
            <ul className="dl-list">
              {list.map((p) => (
                <li key={p.id} className="dl-item">
                  <CaseCover p={p} className="dl-item__cover" />
                  <div className="dl-item__text">
                    <span className="muted small">Nº {String(p.num).padStart(2, '0')} · {p.franchise} · {p.size}×{p.size}</span>
                    <strong>{p.title}</strong>
                  </div>
                  <div className="dl-item__links">
                    {PDF_KINDS.map((k) => (
                      <a key={k.kind} className={`btn btn--sm${k.kind === 'solucion' ? ' btn--ghost' : ''}`} href={`${BASE}downloads/${downloadName(p, k.kind)}`} download title={k.hint}>
                        <Icon name="download" size={16} /> {k.label}
                      </a>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
