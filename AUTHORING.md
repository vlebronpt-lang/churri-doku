# Guía para crear casos de Churri-doku

Churri-doku es un juego de lógica tipo *Murdoku* en español: una cuadrícula N×N dividida en zonas
(habitaciones) con objetos; N personajes (N−1 sospechosos + 1 víctima). Exactamente una persona por fila y
por columna, solo en casillas ocupables. El asesino es la única persona que estaba a solas con la víctima en
su zona. Cada caso tiene una sola solución y se resuelve sin adivinar.

Algunos casos tienen **reglas del caso** (zonas reservadas a un grupo, zonas vacías, número exacto de personas…)
o un plano con más filas y columnas que personas (11×11 con 10 personas: como mucho una por fila y por columna).

Ejemplos completos: `src/data/puzzles/shrek.ts` (9×9, Muy fácil) y `src/data/puzzles/tronos.ts` (10×10, Experto).

## 1. Archivo del caso: `src/data/puzzles/<id>.ts`

```ts
import type { PuzzleInput } from '../../engine/types';

const puzzle: PuzzleInput = {
  id: 'friends',            // minúsculas, sin espacios; también nombra las imágenes
  num: 6,                   // número de caso, ver art/ampliacion.json
  level: 2,                 // 1 Muy fácil · 2 Fácil · 3 Medio · 4 Difícil · 5 Experto
  franchise: 'Friends',
  title: '¿Quién mató al Sr. Heckles?',
  size: 7,
  rooms: {                  // letra → zona. Orden = orden de aparición en la leyenda de juego
    M: { name: 'Apartamento de Monica', article: 'el', color: '#f2c6d0', floor: 'wood' },
    // article: 'el' | 'la' | 'los' | 'las' | ''   (para «en el Salón», «en la Cocina», «en Duloc»)
    // floor: wood | planks | tiles | checker | grass | stone | sand | water | metal | carpet | dirt | snow | marble | plain | lava | space
  },
  layout: [ /* size cadenas de size letras de zona */ ],
  objects: [ /* size cadenas: '.' = vacío, o una letra de la leyenda */ ],
  floors: [ /* opcional: capa de suelo, '.' o letra de alfombra/agua */ ],
  legend: {
    s: 'silla',                                       // objeto del catálogo tal cual
    a: { base: 'alfombra', tint: '#c25b7a' },         // mismo objeto con otro color
    K: { base: 'sofa', key: 'sofa_naranja', name: 'sofá naranja', plural: 'sofás naranjas', unique: true, fem: false, tint: '#e8833a' },
    // objeto propio: necesita key única; unique:true = objeto con nombre propio («junto al sofá naranja»)
  },
  cast: [
    { id: 'Ra', tag: 'Ra', name: 'Rachel', gender: 'f', clues: [] },
    { id: 'H', tag: 'H', name: 'Sr. Heckles', article: 'el', gender: 'm', victim: true, clues: [] },
    // tag: 1–2 caracteres, único. article: 'el'/'la' si el nombre lo lleva («el Profesor», «el Sr. Burns»).
    // nonhuman: true para criaturas, robots, juguetes... (evita pistas de «con una mujer/un hombre»).
  ],
  groups: {                 // opcional: grupos del reparto (cada personaje lleva groups: ['interior'])
    interior: { label: 'Interior', one: 'un vecino de piso interior', many: 'los vecinos de pisos interiores', color: '#7a5ea8' },
  },
  rules: [                  // opcional: reglas del caso, ver §7
    { t: 'zoneOnly', rooms: ['P'], group: 'interior' },
  ],
  // <gen>
  solution: undefined as never,
  // </gen>
  wantMurderer: 'C',                 // id del asesino deseado
  pins: { H: { rooms: ['P'] } },     // opcional: restricciones temáticas para la solución (rooms/objs/cells)
  story: {
    intro: '…',      // 2–4 frases: escenario, víctima, gancho y pregunta final
    epilogue: '…',   // 2–4 frases: quién fue, cómo y por qué; con humor y guiños a la serie
  },
};

export default puzzle;
```

El bloque entre `// <gen>` y `// </gen>` lo rellenan los scripts (solución + pistas). Se puede retocar a mano.

## 2. Catálogo de objetos (claves para la leyenda)

**Ocupables** (se puede estar encima): `silla`, `sillon`, `sofa`*, `banco`*, `taburete`, `trono`, `silla_ruedas`,
`cama`*, `litera`*, `camilla`*, `tumbona`*, `hamaca`*, `barca`*, `drakkar`*, `coche`*, `autocaravana`*, `nave`*, `caballo`.
**Suelo** (capa `floors`, ocupable): `alfombra`*, `agua`*.
**Bloqueantes**: `mesa`*, `escritorio`*, `barra`*, `planta`, `arbol`, `arbusto`, `palmera`, `estanteria`, `estatua`,
`armadura`, `television`, `ordenador`, `barril`, `caja`, `chimenea`, `hoguera`, `brasero`, `piano`, `armario`, `pilar`,
`roca`, `cofre`, `canon`, `lampara`, `farola`, `nevera`, `fogon`, `jaula`, `valla`*, `caldero`, `telescopio`, `pedestal`,
`holomesa`*, `yunque`, `escudo`, `tarta`, `ataud`*, `lapida`, `muneca`, `imprenta`*, `caja_fuerte`, `oro`, `carbonita`,
`foso`*, `torre`, `caminante`, `titan`*, `buzones`, `vivero`, `maquina_escribir`, `violonchelo`, `freidora`, `huevo`,
`bola`, `futbolin`, `pato`, `fotocopiadora`, `expendedora`, `contenedor`, `baul`, `letrina`, `bicicleta`, `recreativa`,
`timon`, `ancla`, `orbe`, `martillo`, `estandarte`, `jarron`, `reloj`, `inodoro`, `lavabo`, `cactus`, `maquina`*,
`consola`*, `cuna`, `bloques`, `calabaza`, `colmena`.

`*` = fusionable: casillas contiguas con la **misma letra** forman un único objeto (una mesa de 1×3, una cama de 1×2…).
Para dos objetos iguales pegados usa letras distintas que apunten al mismo objeto (p. ej. `T: 'mesa', U: 'mesa'`).
Los objetos fusionables deben ser rectángulos (1×2, 1×3, 2×2); las alfombras y el agua pueden tener forma de L.

Los asientos se orientan solos hacia la mesa/escritorio/tele contigua: pon las sillas pegadas a las mesas.

## 3. Reglas de diseño del mapa

- **Tamaño por nivel**: Muy fácil, Fácil y Medio 9×9 con 9 personas · Difícil y Experto 10×10 con 10 personas ·
  unos pocos casos 11×11 con 10 personas.
- **Zonas**: 7–8 (9×9), 8–9 (10×10), 9–10 (11×11). Cada zona conexa y de al menos 4 casillas; formas variadas
  (rectángulos, L, T), no todas iguales. Nombres temáticos en español con su artículo.
- **Densidad**: 50–60 % de casillas con objeto (o suelo especial). Bloqueantes 30–35 %; el resto, ocupables con objeto
  (sillas, camas, alfombras, agua…) y suelo libre. Cada fila y cada columna debe tener al menos 3 casillas ocupables.
- **Tema**: zonas y objetos deben evocar el escenario de la serie/película. Incluye 1–3 objetos únicos icónicos
  (`unique: true`, p. ej. «Trono de Hierro», «sofá naranja»); dan pistas con mucho sabor («junto al sofá naranja»).
- **Colores**: zonas contiguas con colores distintos y suaves (pastel), coherentes con el escenario.
- **Etiquetas**: el nombre de la zona se escribe en su borde inferior o superior; deja ese borde algo despejado.
- Comprueba siempre el mapa con la vista previa (ver §6) y mira la imagen: que se lea bien y sea bonito.

## 4. Reparto e historia

- Usa exactamente los personajes, etiquetas, géneros, víctima y asesino indicados en el encargo.
- Nombres como se conocen en España (doblaje de España).
- `intro`: 2–4 frases en registro de España, con humor y tensión; termina con la pregunta del caso. Si el caso tiene
  reglas, que la historia las justifique sin explicarlas (la Cámara de puertas está precintada, el patio de luces solo
  se ve desde los pisos interiores…).
- `epilogue`: revela al asesino (debe ser `wantMurderer`) y su motivo/método. Guiños para fans, sin copiar frases
  largas literales de la obra (parafrasea). Nada de spoilers innecesarios fuera del caso. Si cuenta dónde estaba
  el resto, que empiece por «Mientras tanto,»: la solución impresa corta ahí para quedarse solo con el crimen.
- Móviles: uno por sospechoso en `src/data/motives.ts` (móvil completo en tercera persona, para los casos del día) y su agravio
  sin el «cómo» en `src/data/grudges.ts` (sale en la página del caso del libro; el del asesino, en su perfil).

## 5. Calidad de las pistas

- Pistas temáticas y variadas: no más del ~40 % del mismo tipo. Mejor «junto a la tarta de bodas» que «en la cuarta fila».
- Evita pistas que regalen al asesino (nada de «estaba con la víctima»; el generador ya lo evita).
- En Muy fácil y Fácil: pistas directas (zona, objeto, junto a, fila/columna, al norte de…).
- En Medio en adelante: relaciones entre personajes, «a solas con», «con una mujer», «exactamente N filas»…
- La dificultad la mide el motor lógico (columna `score/pj`) y las bandas de cada nivel están en
  `src/engine/difficulty.ts`.

## 6. Flujo de trabajo

```bash
# 1) Vista previa del mapa (PNG). Revisa la imagen con la herramienta de lectura de imágenes.
PREVIEW_OUT=<carpeta> npx tsx scripts/preview.ts <id>

# 1b) Comprobar el mapa sin generar pistas: zonas, casillas ocupables y si hay colocaciones que cumplan las reglas.
npx tsx scripts/check-map.ts <id>

# 2) Generar candidatos de pistas (muestra los mejores y los guarda en .gen/<id>.json)
npx tsx scripts/gen.ts <id> --tries 60 --time 180 --top 6 --seed 1

# 3) Ver todos los candidatos guardados y escribir el elegido en el caso
npx tsx scripts/pick.ts <id>        # lista
npx tsx scripts/pick.ts <id> 3      # escribe el candidato 3

# 4) Validar (solución única, resoluble con lógica, historia presente) y ver el paso a paso
npx tsx scripts/validate.ts <id> --steps

# 5) Vista previa con la solución
PREVIEW_OUT=<carpeta> npx tsx scripts/preview.ts <id> --sol
```

Opciones útiles de `gen.ts`: `--keep-solution` (mantiene la solución escrita y solo busca pistas),
`--band 2.2-3.0` (banda de dificultad), `--seed N` (otra búsqueda).

Puedes editar a mano las pistas del bloque `<gen>` (formato JSON de `Clue` en `src/engine/types.ts`), por ejemplo para
cambiar una pista por otra equivalente con más sabor; después **siempre** valida con `scripts/validate.ts <id>`.

## 7. Reglas del caso

Valen para todo el reparto, víctima incluida, y salen en un recuadro junto a la historia y en el rótulo de la zona.
Tienen que hacer falta: el generador rechaza los juegos de pistas en los que sobra una regla.

```ts
{ t: 'zoneOnly', rooms: ['C'], group: 'stark' }     // Solo los Stark podían estar en la Cripta.
{ t: 'zoneCount', room: 'T', n: 0 }                 // Nadie estaba en la Terraza. (n = 1: una sola persona; n = 3: exactamente tres)
{ t: 'emptyZones', n: 1 }                           // Había exactamente una zona vacía. (n = 0: ninguna)
{ t: 'objCount', obj: 'silla', n: 2 }               // Había exactamente dos personas sentadas en una silla.
{ t: 'zoneHasGroup', rooms: ['H'], group: 'guarda' } // En esa zona había al menos un guarda.
{ t: 'groupsApart', a: 'verdes', b: 'negros' }      // Los Verdes y los Negros nunca compartían zona.
{ t: 'noZoneWith', n: 1 }                           // En ninguna zona había una sola persona.
```

Los grupos (`groups` del caso y `groups` de cada personaje) salen como etiqueta en su ficha: `label` corto, `one` en
singular con artículo («un Targaryen») y `many` en plural con artículo («los Targaryen»). Las pistas pueden citarlos
(«Estaba con un Targaryen»). La regla debe poder cumplirse: si la víctima tiene que estar a solas con el asesino, los
dos tienen que poder compartir zona. Las zonas reservadas deben tener sitio para los del grupo.

## 8. Textos del caso nuevo

Además del caso, en `art/textos/<id>.json` (se juntan después con `motives.ts` y `grudges.ts`):

```json
{
  "motives": { "<id de cada sospechoso>": "Móvil completo en tercera persona, una o dos frases, que sigue a «¡Fue X!» si es el culpable en un caso del día." },
  "grudges": { "<id de cada sospechoso>": "Su agravio contra la víctima, sin decir cómo lo hizo, sin señalar al asesino ni dónde estaba la víctima." },
  "looks": { "<id de cada personaje con retrato nuevo>": "Descripción en inglés para ilustrarlo: especie o edad, pelo, ropa, rasgos que lo hacen reconocible." },
  "cover": "Descripción en inglés de la portada del caso: el lugar y un objeto icónico, sin personajes ni texto."
}
```

Los móviles de todos tienen que sonar igual de creíbles; ninguno debe delatar al culpable real.

No modifiques el motor (`src/engine`), el render ni la interfaz. Si crees que hay un fallo en ellos, descríbelo en tu
informe en lugar de arreglarlo.
