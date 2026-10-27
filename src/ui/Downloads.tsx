import { useEffect, useState, type FormEvent } from 'react';
import { LEVELS, PUZZLES } from '../data/puzzles';
import { BOOK_BOUND_COVERS, BOOK_BOUND_INTERIOR, BOOK_PDF, DEDICATION_KEY, downloadName, PDF_KINDS, ZIP_ALL, type Dedication } from '../downloads';
import { load, save } from '../state/storage';
import { navigate } from '../router';
import { CaseCover } from './CaseCard';
import { Icon } from './Icon';

const BASE = import.meta.env.BASE_URL;

const mb = (n?: number) => (n ? ` · ${(n / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB` : '');

/** Libro con dedicatoria: se guarda aquí y se imprime (o se guarda en PDF) desde el navegador. */
function DedicatedBook() {
  const saved = load<Partial<Dedication>>(DEDICATION_KEY, {});
  const [para, setPara] = useState(saved.para ?? '');
  const [de, setDe] = useState(saved.de ?? '');
  const [msg, setMsg] = useState(saved.msg ?? '');
  const [bound, setBound] = useState(false);
  const go = (e: FormEvent) => {
    e.preventDefault();
    save(DEDICATION_KEY, { para: para.trim(), de: de.trim(), msg: msg.trim() || undefined });
    navigate(`/imprimir/libro?dedicado=1${bound ? '&encuadernar=1' : ''}`);
  };
  return (
    <form className="dl-card" onSubmit={go}>
      <h2><Icon name="book" size={22} /> Un libro dedicado</h2>
      <p>Para regalar: la portada dirá «Edición especial para…» y la primera página llevará tu dedicatoria y su carné de detective. Se prepara aquí y se imprime (o se guarda en PDF) desde el navegador.</p>
      <div className="dl-card__row">
        <label className="field">Para<input className="input" value={para} onChange={(e) => setPara(e.target.value)} maxLength={40} required autoComplete="off" placeholder="Su nombre" /></label>
        <label className="field">De<input className="input" value={de} onChange={(e) => setDe(e.target.value)} maxLength={40} required autoComplete="off" placeholder="Tu nombre" /></label>
      </div>
      <label className="field"><span>Dedicatoria <span className="field__hint">(opcional)</span></span><textarea className="input dl-card__msg" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={220} rows={3} placeholder="Para que resuelvas todos los casos conmigo…" /></label>
      <label className="dl-card__check"><input type="checkbox" checked={bound} onChange={(e) => setBound(e.target.checked)} /> Con margen para encuadernar</label>
      <button className="btn" type="submit">Preparar el libro dedicado</button>
    </form>
  );
}

export function Downloads() {
  const [sizes, setSizes] = useState<{ libro?: number; zip?: number; interior?: number; cubiertas?: number }>({});
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
            <p className="lede">Cada caso en formato libro: portada, una doble página (a la izquierda, la historia y los sospechosos con su pista y su móvil; a la derecha, el plano y la cuadrícula de deducción) y contraportada. Imprímelo en A4 a doble cara y, al abrirlo, el plano queda frente a los sospechosos. La solución va en un archivo aparte para que no te la encuentres sin querer.</p>
          </div>
          <img className="dl-hero__art" src={`${BASE}img/ui/files.webp`} alt="" width="900" height="900" />
        </div>
        <div className="dl-all">
          <a className="dl-big" href={`${BASE}downloads/${BOOK_PDF}`} download>
            <Icon name="book" size={30} />
            <span><strong>Libro completo (PDF)</strong><span>Los {PUZZLES.length} casos en doble página y un caso final exclusivo, con cómo se juega, la escuela de detectives, las soluciones al final y contraportada{mb(sizes.libro)}.</span></span>
          </a>
          <a className="dl-big" href={`${BASE}downloads/${ZIP_ALL}`} download>
            <Icon name="download" size={30} />
            <span><strong>Todos los casos (ZIP)</strong><span>Los {PUZZLES.length * 3} PDF sueltos (color, B/N y solución), ordenados por nivel{mb(sizes.zip)}.</span></span>
          </a>
        </div>
      </section>
      <section className="dl-special">
        <DedicatedBook />
        <div className="dl-card">
          <h2><Icon name="download" size={22} /> Para encuadernar</h2>
          <p>El libro preparado para la copistería: el interior lleva un margen extra en el lado del lomo para que los agujeros no tapen nada, y las cubiertas van aparte.</p>
          <a className="dl-mini" href={`${BASE}downloads/${BOOK_BOUND_INTERIOR}`} download><Icon name="download" size={18} /> Interior (PDF{mb(sizes.interior)})</a>
          <a className="dl-mini" href={`${BASE}downloads/${BOOK_BOUND_COVERS}`} download><Icon name="download" size={18} /> Cubiertas (PDF{mb(sizes.cubiertas)})</a>
          <ol className="dl-card__steps">
            <li>Imprime el <b>interior</b> en A4 a doble cara (volteo por el borde largo), en papel de 90 a 100 g.</li>
            <li>Imprime las <b>cubiertas</b> a doble cara en cartulina de 250 a 300 g: la portada lleva detrás la dedicatoria y la contraportada, las notas.</li>
            <li>Pide <b>encuadernación en espiral o wire-o</b> por el lado izquierdo: el libro se abre en plano y se escribe cómodamente.</li>
          </ol>
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
