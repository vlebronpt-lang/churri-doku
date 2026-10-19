import { useEffect, useMemo, useState } from 'react';
import { PUZZLES, LEVELS, levelInfo, INPUTS } from '../../data/puzzles';
import { buildReport, type Report } from '../../game/report';
import { decodePacked } from '../../share';
import { load, save } from '../../state/storage';
import { REASONS } from '../../state/feedback';
import { formatTime } from '../../game/useGame';
import { navigate } from '../../router';
import { Modal } from '../Modal';
import { Icon } from '../Icon';

const TECH: Record<string, string> = {
  single: 'única casilla', rowSingle: 'fila con una opción', colSingle: 'columna con una opción', cellForcedRow: 'casilla obligada',
  cellForcedCol: 'casilla obligada', pointing: 'alineación', relation: 'relación entre pistas', room: 'quién comparte zona',
  subset: 'filas o columnas reservadas', trial: 'suposición', errores: 'tenía errores', revelar: 'pidió que se lo revelara',
};

function loadReports(): Report[] { return load<Report[]>('reports', []); }
function storeReports(r: Report[]) { save('reports', r); }

/** Añade informes (sin duplicar el mismo envío). Devuelve cuántos son nuevos. */
function addReports(incoming: Report[]): number {
  const cur = loadReports();
  const key = (r: Report) => `${r.player}-${r.at}`;
  const known = new Set(cur.map(key));
  const fresh = incoming.filter((r) => r && r.v === 1 && !known.has(key(r)));
  storeReports([...cur, ...fresh]);
  return fresh.length;
}

const median = (xs: number[]) => {
  if (!xs.length) return undefined;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Al abrir el enlace de un informe: añadirlo al panel. */
export function ImportReportModal({ payload }: { payload: string }) {
  const [report, setReport] = useState<Report | null | undefined>(undefined);
  const [done, setDone] = useState<number | null>(null);
  useEffect(() => { void decodePacked(payload).then((r) => setReport(r as Report | null)); }, [payload]);
  const close = () => navigate('/panel');
  if (report === undefined) return null;
  if (!report || report.v !== 1) {
    return (
      <Modal title="Informe de juego" onClose={close} labelledBy="rep-title">
        <p>Este enlace está incompleto o dañado.</p>
        <button className="btn" onClick={close}>Ir al panel</button>
      </Modal>
    );
  }
  const n = Object.keys(report.cases).length;
  return (
    <Modal title="Informe de juego recibido" onClose={close} labelledBy="rep-title">
      <p>{report.name ? `De ${report.name}` : 'De un jugador anónimo'} ({report.device}): {n} caso{n === 1 ? '' : 's'} jugado{n === 1 ? '' : 's'} y {report.feedback.length} aviso{report.feedback.length === 1 ? '' : 's'} sobre pistas.</p>
      {done === null ? (
        <div className="row gap wrap">
          <button className="btn btn--primary" onClick={() => setDone(addReports([report]))}>Añadir al panel</button>
          <button className="btn btn--ghost" onClick={close}>Cancelar</button>
        </div>
      ) : (
        <>
          <p className="share-ok" role="status">{done ? 'Añadido. ¡Gracias por recogerlo!' : 'Ese informe ya estaba en el panel.'}</p>
          <button className="btn btn--primary" onClick={close}>Ver el panel</button>
        </>
      )}
    </Modal>
  );
}

/** Panel de pruebas: junta los informes que envían los jugadores y muestra dónde se atascan. */
export function Panel() {
  const [reports, setReports] = useState<Report[]>(loadReports);
  const [mine, setMine] = useState(true);
  const [paste, setPaste] = useState('');
  const [msg, setMsg] = useState('');
  const all = useMemo(() => (mine ? [...reports, buildReport('Tú')] : reports), [reports, mine]);

  const importPasted = async () => {
    const payloads = [...paste.matchAll(/#\/informe\/([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
    const decoded = (await Promise.all(payloads.map(decodePacked))) as (Report | null)[];
    const n = addReports(decoded.filter(Boolean) as Report[]);
    setReports(loadReports());
    setPaste('');
    setMsg(payloads.length ? `${n} informe${n === 1 ? '' : 's'} nuevo${n === 1 ? '' : 's'} de ${payloads.length} enlace${payloads.length === 1 ? '' : 's'}.` : 'No he encontrado enlaces de informe en el texto.');
  };

  const rows = PUZZLES.map((p) => {
    const rs = all.map((r) => r.cases[p.id]).filter(Boolean);
    const solved = rs.filter((c) => c.s);
    const times = solved.map((c) => c.b ?? c.t);
    const techs = new Map<string, number>();
    rs.forEach((c) => c.hl?.forEach(([, t]) => techs.set(t, (techs.get(t) ?? 0) + 1)));
    const fb = all.flatMap((r) => r.feedback.filter((f) => f.c === p.id));
    return {
      p, players: rs.length, solved: solved.length,
      time: median(times), hints: median(rs.map((c) => c.h)), first: median(rs.map((c) => c.f ?? NaN).filter((x) => !isNaN(x))),
      abandon: rs.length - solved.length,
      techs: [...techs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2),
      fb,
    };
  });
  const dailyRs = all.flatMap((r) => Object.entries(r.cases).filter(([id]) => id.startsWith('d-')).map(([, c]) => c));
  const maxTime = Math.max(60, ...rows.map((r) => r.time ?? 0));
  const feedback = all.flatMap((r) => r.feedback.map((f) => ({ ...f, from: r.name ?? 'anónimo' })));

  const summary = () => {
    const lines = ['Resumen del panel de pruebas de Churri-doku', `${all.length} informes`, ''];
    for (const r of rows.filter((x) => x.players)) {
      lines.push(`Nº ${r.p.num} ${r.p.id} (${levelInfo(r.p.level).name}): ${r.solved}/${r.players} resuelto · mediana ${r.time != null ? formatTime(Math.round(r.time)) : '—'} · pistas ${r.hints ?? '—'}${r.techs.length ? ` · se atascan en: ${r.techs.map(([t, n]) => `${TECH[t] ?? t} (${n})`).join(', ')}` : ''}${r.fb.length ? ` · ${r.fb.length} avisos` : ''}`);
    }
    for (const f of feedback) lines.push(`Aviso ${f.c}${f.ch ? `/${f.ch}` : ''}: «${f.text}» — ${REASONS.find((x) => x.id === f.reason)?.label}${f.comment ? `: ${f.comment}` : ''}`);
    return lines.join('\n');
  };

  return (
    <div className="panel">
      <section className="panel__head">
        <p className="eyebrow">Para el creador del juego</p>
        <h1 className="section-title">Panel de pruebas</h1>
        <p className="lede">Aquí se juntan los informes de juego que te mandan los jugadores (Ajustes → «Enviar mis datos de juego»). Verás dónde se atascan, qué técnicas les cuestan y qué pistas les confunden.</p>
        <div className="row gap wrap">
          <label className="check"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Incluir mis propias partidas</label>
          <span className="muted small">{reports.length} informe{reports.length === 1 ? '' : 's'} guardado{reports.length === 1 ? '' : 's'}</span>
        </div>
        <div className="panel__paste">
          <textarea className="input" rows={2} placeholder="Pega aquí uno o varios enlaces de informe…" value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button className="btn" onClick={importPasted} disabled={!paste.trim()}>Añadir</button>
        </div>
        {msg && <p className="share-ok" role="status">{msg}</p>}
      </section>

      <section className="stats-block">
        <h2 className="stats-block__title">Curva de dificultad (mediana de tiempo por caso)</h2>
        <div className="curve" role="img" aria-label="Mediana del tiempo de resolución de cada caso">
          {rows.map((r) => (
            <div key={r.p.id} className="curve__col" title={`Nº ${r.p.num} ${r.p.title}: ${r.time != null ? formatTime(Math.round(r.time)) : 'sin datos'}`}>
              <span className="curve__bar" style={{ height: `${((r.time ?? 0) / maxTime) * 100}%`, background: levelInfo(r.p.level).color }} />
              <span className="curve__n">{r.p.num}</span>
            </div>
          ))}
        </div>
        <p className="muted small">{LEVELS.map((l) => `${l.name}: casos ${PUZZLES.filter((p) => p.level === l.level).map((p) => p.num).join(', ')}`).join(' · ')}</p>
      </section>

      <section className="stats-block">
        <h2 className="stats-block__title">Caso a caso</h2>
        <div className="table-wrap">
          <table className="panel-table">
            <thead><tr><th>Caso</th><th>Jugadores</th><th>Resuelto</th><th>Mediana</th><th>Pistas</th><th>1.ª ficha</th><th>Se atascan en</th><th>Avisos</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.p.id}>
                  <td><span className="lvl-dot" style={{ ['--lvl' as string]: levelInfo(r.p.level).color }} /> {r.p.num}. {r.p.franchise}</td>
                  <td>{r.players || '—'}</td>
                  <td>{r.players ? `${r.solved}/${r.players}` : '—'}</td>
                  <td>{r.time != null ? formatTime(Math.round(r.time)) : '—'}</td>
                  <td>{r.hints ?? '—'}</td>
                  <td>{r.first != null ? formatTime(Math.round(r.first)) : '—'}</td>
                  <td>{r.techs.map(([t, n]) => `${TECH[t] ?? t} (${n})`).join(', ') || '—'}</td>
                  <td>{r.fb.length || '—'}</td>
                </tr>
              ))}
              <tr>
                <td>📅 Casos del día</td>
                <td>{dailyRs.length || '—'}</td>
                <td>{dailyRs.length ? `${dailyRs.filter((c) => c.s).length}/${dailyRs.length}` : '—'}</td>
                <td>{dailyRs.length ? formatTime(Math.round(median(dailyRs.filter((c) => c.s).map((c) => c.b ?? c.t)) ?? 0)) : '—'}</td>
                <td>{median(dailyRs.map((c) => c.h)) ?? '—'}</td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="stats-block">
        <h2 className="stats-block__title">Pistas que confunden ({feedback.length})</h2>
        {feedback.length ? (
          <ul className="feedback-list">
            {feedback.map((f, k) => (
              <li key={k}>
                <strong>{INPUTS[f.c]?.franchise ?? (f.c.startsWith('d-') ? `Caso del día ${f.c.slice(2)}` : f.c)}</strong> · {REASONS.find((x) => x.id === f.reason)?.label}
                <blockquote>{f.text}</blockquote>
                {f.comment && <p>«{f.comment}» <span className="muted small">— {f.from}</span></p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Todavía nadie ha marcado ninguna pista como confusa.</p>
        )}
      </section>

      <div className="row gap wrap">
        <button className="btn" onClick={() => navigator.clipboard?.writeText(summary()).then(() => setMsg('Resumen copiado.')).catch(() => setMsg('No se ha podido copiar.'))}><Icon name="list" size={18} /> Copiar el resumen</button>
        {reports.length > 0 && <button className="btn btn--ghost" onClick={() => { storeReports([]); setReports([]); }}>Vaciar el panel</button>}
      </div>
    </div>
  );
}
