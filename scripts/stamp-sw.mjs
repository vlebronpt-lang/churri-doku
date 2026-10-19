// Pone la marca de versión en dist/sw.js (así cada publicación renueva la caché del código).
import { readFileSync, writeFileSync } from 'node:fs';
const file = new URL('../dist/sw.js', import.meta.url);
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD__', stamp));
console.log(`sw.js versión ${stamp}`);
