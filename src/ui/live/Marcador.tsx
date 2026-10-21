import { formatTime } from '../../game/useGame';
import { esDelDia, nombreCaso } from '../../live/casos';
import { PUZZLES } from '../../data/puzzles';
import type { MarcadorVisto } from '../../live/marcador';
import type { PartidaPareja } from '../../../base44/actors/SalaPareja/protocolo.ts';

const orden = new Map(PUZZLES.map((p, i) => [p.id, i]));
const t = (s: number | null | undefined) => (s == null ? '·' : formatTime(s));

/** Nombre de cada lado del marcador («Tú» si se sabe cuál eres). */
export function nombresMarcador(m: MarcadorVisto): [string, string] {
  const n = (i: 0 | 1) => (m.yo === i ? 'Tú' : m.jugadores[i].nombre || 'Tu pareja');
  return [n(0), n(1)];
}

/** Una partida del historial: «Duelo · gana Lucía (6:12 a 7:40)» o «Juntos en 8:05». */
function resumen(u: PartidaPareja, n: [string, string]): string {
  if (u.modo === 'coop') return u.j != null ? `Juntos, en ${formatTime(u.j)}` : 'Juntos';
  if (u.g == null) return 'Duelo sin terminar';
  const tiempos = u.s && u.s[u.g] != null ? ` (${formatTime(u.s[u.g]!)}${u.s[1 - u.g] != null ? ` a ${formatTime(u.s[1 - u.g]!)}` : ''})` : '';
  const gana = n[u.g] === 'Tú' ? 'ganas tú' : `gana ${n[u.g]}`;
  const perdedor = n[1 - u.g];
  return `Duelo: ${gana}${u.r ? (perdedor === 'Tú' ? ' (te rendiste)' : ` (${perdedor} se rindió)`) : tiempos}`;
}

/** Marcador de una pareja: duelos ganados, casos resueltos juntos, mejores tiempos y últimas partidas. */
export function MarcadorPareja({ m, caso, completo = true }: { m: MarcadorVisto; caso?: string; completo?: boolean }) {
  const [n0, n1] = nombresMarcador(m);
  const filas = Object.entries(m.tiempos)
    .filter(([, v]) => v.some((x) => x != null))
    .sort(([a], [b]) => (esDelDia(a) ? 1 : 0) - (esDelDia(b) ? 1 : 0) || (orden.get(a) ?? 999) - (orden.get(b) ?? 999) || b.localeCompare(a));
  const delCaso = caso ? m.tiempos[caso] : undefined;
  const mejores = delCaso ? [[n0, delCaso[0]], [n1, delCaso[1]], ['juntos', delCaso[2]]].filter(([, s]) => s != null).map(([n, s]) => `${n} ${t(s as number)}`) : [];
  const lider = m.victorias[0] === m.victorias[1] ? -1 : m.victorias[0] > m.victorias[1] ? 0 : 1;
  const hayDuelos = m.duelos > 0;
  return (
    <div className="marcador">
      <div className="marcador__duelo" aria-label={hayDuelos ? `Duelos: ${n0} ${m.victorias[0]}, ${n1} ${m.victorias[1]}` : `${n0} y ${n1}: aún sin duelos`}>
        <span className={`marcador__lado${lider === 0 ? ' is-lider' : ''}`}>{hayDuelos && <strong>{m.victorias[0]}</strong>}<span>{n0}</span></span>
        <span className="marcador__vs"><span aria-hidden="true">⚔️</span>{!hayDuelos ? 'aún sin duelos' : m.duelos === 1 ? '1 duelo' : `${m.duelos} duelos`}</span>
        <span className={`marcador__lado${lider === 1 ? ' is-lider' : ''}`}>{hayDuelos && <strong>{m.victorias[1]}</strong>}<span>{n1}</span></span>
      </div>
      <p className="marcador__coop"><span aria-hidden="true">🤝</span> {m.coop === 0 ? 'Aún no habéis resuelto ningún caso juntos' : m.coop === 1 ? '1 caso resuelto juntos' : `${m.coop} casos resueltos juntos`}</p>
      {mejores.length > 0 && !completo && <p className="marcador__caso">Mejores tiempos en este caso: {mejores.join(' · ')}</p>}
      {completo && filas.length > 0 && (
        <div className="marcador__tabla-wrap">
          <table className="marcador__tabla">
            <caption className="sr-only">Mejores tiempos de cada uno por caso</caption>
            <thead>
              <tr><th scope="col">Mejores tiempos</th><th scope="col">{n0}</th><th scope="col">{n1}</th><th scope="col">Juntos</th></tr>
            </thead>
            <tbody>
              {filas.map(([id, v]) => (
                <tr key={id}>
                  <th scope="row">{nombreCaso(id)}</th>
                  <td className={v[0] != null && (v[1] == null || v[0] < v[1]) ? 'is-mejor' : ''}>{t(v[0])}</td>
                  <td className={v[1] != null && (v[0] == null || v[1] < v[0]) ? 'is-mejor' : ''}>{t(v[1])}</td>
                  <td>{t(v[2])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {completo && m.ultimas.length > 0 && (
        <details className="marcador__ultimas">
          <summary>Últimas partidas</summary>
          <ul>
            {m.ultimas.slice(0, 8).map((u) => (
              <li key={u.id}><span>{nombreCaso(u.caso)}</span><span className="muted">{resumen(u, [n0, n1])}</span></li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
