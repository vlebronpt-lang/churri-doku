# Churri-doku 🔎💘

**Sudoku con asesinato… y con tus series favoritas.**

👉 **Juega aquí: https://vlebronpt-lang.github.io/churri-doku/**

Churri-doku es un juego de lógica en español, inspirado en los rompecabezas tipo *Murdoku*. Cada caso es un plano con sospechosos y pistas: coloca a cada persona en la escena del crimen (una por fila y una por columna) y descubre quién estaba a solas con la víctima. Sin adivinar: solo con lógica.

## Qué trae

- **25 casos en 5 temporadas** (Muy fácil, Fácil, Medio, Difícil y Experto), cada uno con su serie o película: Shrek, Los Simpson, Toy Story, Stranger Things, Piratas del Caribe, Friends, The Office, Dragon Ball, Parque Jurásico, Peaky Blinders, Breaking Bad, Vikingos, Miércoles, La que se avecina, The Walking Dead, La Casa de Papel, Star Wars, Batman, El juego del calamar, Ataque a los Titanes, Juego de Tronos, Harry Potter, Marvel, El Señor de los Anillos y El Padrino.
- **Solución única comprobada** por ordenador en todos los casos, y dificultad medida con un motor que razona como una persona.
- **Pistas paso a paso** que explican el razonamiento (primero un empujoncito, luego la deducción completa).
- **Herramientas cómodas**: lápiz para anotar, X automáticas, deshacer y rehacer, comprobar errores, atajos de teclado y modo oscuro. Funciona en el móvil y en el ordenador.
- **Para jugar en pareja**: al resolver un caso, «Retar a mi churri» manda un enlace con tu tiempo, y la otra persona ve quién gana al terminar. Desde Ajustes puedes pasar tu progreso a otro dispositivo con un enlace.
- **Descargas**: cada caso en PDF (color, blanco y negro y solución), todos en un ZIP o un libro completo con portada, reglas y soluciones.

## Desarrollo

```bash
npm install
npm run dev            # http://localhost:5173
npx tsx scripts/validate.ts   # comprueba los 25 casos (solución única, sin adivinar, nivel)
npm run build && npx tsx scripts/pdf.ts   # web en dist/ y PDF en dist/downloads/
```

- `src/engine/`: reglas, solucionador exhaustivo, motor lógico (pistas y dificultad) y textos de las pistas.
- `src/data/puzzles/`: un archivo por caso. `AUTHORING.md` explica cómo crear casos nuevos.
- `src/render/`: el plano en SVG y los iconos.
- `scripts/`: generador de pistas, validador, PDF, capturas e imágenes.

La web se publica en GitHub Pages (rama `gh-pages`) con el contenido de `dist/`.

## Aviso

Proyecto fan, gratuito y sin ánimo de lucro. Los personajes, nombres y marcas pertenecen a sus respectivos propietarios; este juego no está afiliado a ellos. Las ilustraciones se han creado con IA para este proyecto.
