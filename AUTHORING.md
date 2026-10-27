# Guía para crear casos de Churri-doku

Churri-doku es un juego de lógica tipo *Murdoku* en español: una cuadrícula N×N dividida en zonas
(habitaciones) con objetos; N personajes (N−1 sospechosos + 1 víctima). Exactamente una persona por fila y
por columna, solo en casillas ocupables. El asesino es la única persona que estaba a solas con la víctima en
su zona. Cada caso tiene una sola solución y se resuelve sin adivinar.

Ejemplos completos: `src/data/puzzles/simpson.ts` (6×6, Muy fácil) y `src/data/puzzles/tronos.ts` (10×10, Experto).

## 1. Archivo del caso: `src/data/puzzles/<id>.ts`

```ts
import type { PuzzleInput } from '../../engine/types';

const puzzle: PuzzleInput = {
  id: 'friends',            // minúsculas, sin espacios; también nombra las imágenes
  num: 6,                   // número de caso (1–25), ver tabla de casos
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

- **Tamaño por nivel**: Muy fácil 5×5–6×6 · Fácil 7×7 · Medio 8×8 · Difícil 9×9 · Experto 10×10.
- **Zonas**: 4 (6×6), 5–6 (7×7), 6–7 (8×8), 7–8 (9×9), 8–9 (10×10). Cada zona conexa y de al menos 4 casillas;
  formas variadas (rectángulos, L, T). Nombres temáticos en español con su artículo.
- **Densidad**: 30–45 % de casillas con objeto. Ocupables especiales (sillas, camas, alfombras, agua…) en torno al
  15–25 %; bloqueantes 20–30 %. Cada fila y cada columna debe tener al menos 3 casillas ocupables.
- **Tema**: zonas y objetos deben evocar el escenario de la serie/película. Incluye 1–3 objetos únicos icónicos
  (`unique: true`, p. ej. «Trono de Hierro», «sofá naranja»); dan pistas con mucho sabor («junto al sofá naranja»).
- **Colores**: zonas contiguas con colores distintos y suaves (pastel), coherentes con el escenario.
- **Etiquetas**: el nombre de la zona se escribe en su borde inferior o superior; deja ese borde algo despejado.
- Comprueba siempre el mapa con la vista previa (ver §6) y mira la imagen: que se lea bien y sea bonito.

## 4. Reparto e historia

- Usa exactamente los personajes, etiquetas, géneros, víctima y asesino indicados en el encargo.
- Nombres como se conocen en España (doblaje de España).
- `intro`: 2–4 frases en registro de España, con humor y tensión; termina con la pregunta del caso.
- `epilogue`: revela al asesino (debe ser `wantMurderer`) y su motivo/método. Guiños para fans, sin copiar frases
  largas literales de la obra (parafrasea). Nada de spoilers innecesarios fuera del caso. Si cuenta dónde estaba
  el resto, que empiece por «Mientras tanto,»: la solución impresa corta ahí para quedarse solo con el crimen.
- Móviles: uno por sospechoso en `src/data/motives.ts` (confesión completa, para los casos del día) y su agravio
  sin el «cómo» en `src/data/grudges.ts` (sale en la página del caso del libro; el del asesino, en su perfil).

## 5. Calidad de las pistas

- Pistas temáticas y variadas: no más del ~40 % del mismo tipo. Mejor «junto a la tarta de bodas» que «en la cuarta fila».
- Evita pistas que regalen al asesino (nada de «estaba con la víctima»; el generador ya lo evita).
- En Muy fácil y Fácil: pistas directas (zona, objeto, junto a, fila/columna, al norte de…).
- En Medio en adelante: relaciones entre personajes, «a solas con», «con una mujer», «exactamente N filas»…
- La dificultad la mide el motor lógico (columna `score/pj`): Muy fácil ≈1,0–1,75 · Fácil ≈1,5–2,4 · Medio ≈2,0–3,2 ·
  Difícil ≈2,6–4,2 · Experto ≈3,2–7. Difícil admite como mucho 1 «suposición» (trial); Experto, hasta 5.

## 6. Flujo de trabajo

```bash
# 1) Vista previa del mapa (PNG). Revisa la imagen con la herramienta de lectura de imágenes.
PREVIEW_OUT=<carpeta> npx tsx scripts/preview.ts <id>

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

No modifiques el motor (`src/engine`), el render ni la interfaz. Si crees que hay un fallo en ellos, descríbelo en tu
informe en lugar de arreglarlo.
