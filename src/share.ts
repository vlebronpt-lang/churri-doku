/** Enlaces para compartir: retos entre jugadores y traspaso de progreso entre dispositivos. */

export interface Challenge {
  /** Nombre de quien reta. */
  n: string;
  /** Segundos. */
  t: number;
  /** Estrellas (1–3). */
  s: number;
  /** Pistas usadas. */
  h: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64Url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeChallenge(c: Challenge): string {
  return toB64Url(enc.encode(JSON.stringify({ n: c.n.slice(0, 24), t: Math.round(c.t), s: c.s, h: c.h })));
}

export function decodeChallenge(s: string): Challenge | null {
  try {
    const o = JSON.parse(dec.decode(fromB64Url(s)));
    if (typeof o.n !== 'string' || typeof o.t !== 'number') return null;
    return { n: o.n.slice(0, 24) || 'Alguien', t: Math.max(0, o.t | 0), s: Math.min(3, Math.max(1, o.s | 0)), h: Math.max(0, o.h | 0) };
  } catch {
    return null;
  }
}

/** URL base pública del juego (funciona igual en local y publicado). */
export function siteUrl(): string {
  return `${location.origin}${location.pathname}`;
}

export function challengeUrl(caseId: string, c: Challenge): string {
  return `${siteUrl()}#/caso/${caseId}?reto=${encodeChallenge(c)}`;
}

// --------------------------------------------------------------- progreso

async function deflate(bytes: Uint8Array): Promise<{ data: Uint8Array; z: boolean }> {
  if (typeof CompressionStream === 'undefined') return { data: bytes, z: false };
  const cs = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return { data: new Uint8Array(await new Response(cs).arrayBuffer()), z: true };
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(ds).arrayBuffer());
}

/** Enlace que contiene todo el progreso (comprimido si el navegador lo permite). */
export async function progressUrl(store: unknown): Promise<string> {
  const { data, z } = await deflate(enc.encode(JSON.stringify(store)));
  return `${siteUrl()}#/progreso/${z ? 'z' : 'j'}${toB64Url(data)}`;
}

export async function decodeProgress(payload: string): Promise<Record<string, unknown> | null> {
  try {
    const kind = payload[0];
    const bytes = fromB64Url(payload.slice(1));
    const raw = kind === 'z' ? await inflate(bytes) : bytes;
    const obj = JSON.parse(dec.decode(raw));
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}

/** Comparte con la hoja nativa del sistema o copia al portapapeles. Devuelve qué pasó. */
export async function shareOrCopy(text: string, url?: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share(url ? { text, url } : { text });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(url && !text.includes(url) ? `${text}\n${url}` : text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
