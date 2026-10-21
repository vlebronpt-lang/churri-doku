# Churri-doku 🔎💘

**Sudoku con asesinato… y con tus series favoritas.**

👉 **Juega aquí: https://vlebronpt-lang.github.io/churri-doku/**

Churri-doku es un juego de lógica en español, inspirado en los rompecabezas tipo *Murdoku*. Cada caso es un plano con sospechosos y pistas: coloca a cada persona en la escena del crimen (una por fila y una por columna) y descubre quién estaba a solas con la víctima. Sin adivinar: solo con lógica.

## Qué trae

- **25 casos en 5 temporadas** (Muy fácil, Fácil, Medio, Difícil y Experto), cada uno con su serie o película: Shrek, Los Simpson, Toy Story, Stranger Things, Piratas del Caribe, Friends, The Office, Dragon Ball, Parque Jurásico, Peaky Blinders, Breaking Bad, Vikingos, Miércoles, La que se avecina, The Walking Dead, La Casa de Papel, Star Wars, Batman, El juego del calamar, Ataque a los Titanes, Juego de Tronos, Harry Potter, Marvel, El Señor de los Anillos y El Padrino.
- **Solución única comprobada** por ordenador en todos los casos, y dificultad medida con un motor que razona como una persona.
- **Pistas paso a paso** que explican el razonamiento (primero un empujoncito, luego la deducción completa).
- **Herramientas cómodas**: lápiz para anotar, X automáticas, deshacer y rehacer, comprobar errores, atajos de teclado y modo oscuro. Funciona en el móvil y en el ordenador.
- **Para jugar en pareja**: en directo, crea una sala y dale el código de 5 letras a tu pareja: resolved el mismo tablero entre los dos (cooperativo, veis al momento lo que coloca, anota o tacha el otro) o echad un duelo con el mismo caso, cada uno en el suyo (veis cuánto lleva el otro y gana quien lo resuelva antes). Un marcador de pareja guarda las victorias y los mejores tiempos de cada uno. Y por turnos: al resolver un caso, «Retar a mi churri» manda un enlace con tu tiempo, y la otra persona ve quién gana al terminar.
- **Tu cuenta**: entra con Google o con tu correo y tu progreso (casos, rachas, logros y nombre de los retos) se guarda solo y te sigue a cualquier dispositivo. Sin cuenta también se juega; entonces el progreso se pasa con un enlace desde Ajustes.
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

### Cuentas (Base44)

- `src/cloud/`: conexión con Base44 (`api.ts`), la copia del progreso y cómo se juntan dos copias (`save.ts`) y la sesión con su sincronización (`account.ts`). Cada cuenta tiene un registro `PlayerSave` que solo puede leer y cambiar su dueño (reglas en `base44/entities/`).
- Base44 solo devuelve a su propio dominio tras entrar con Google o desde los correos, así que allí vive un puente (`base44/site/index.html`) que trae al jugador de vuelta al juego. Se publica con `npx base44 site deploy -y`.
- Para usar la CLI en otra copia del repositorio: `npx base44 link --app-id 6ad7e5d5a1f2149ed0366eac`.
- `npx tsx scripts/e2e-account.ts` prueba todo el circuito con un Base44 simulado.

### Modo pareja en directo (Base44)

- Cada sala es una instancia del **actor** `SalaPareja` de Base44 (`base44/actors/SalaPareja/`): una sala en el servidor por código, con WebSocket y la identidad de cada jugador verificada por Base44. Hace falta cuenta para jugar en directo. La lógica está en `sala.ts` (asientos, fases, cooperativo, duelo, presencia y marcador), `tablero.ts` (los cambios del tablero compartido, que usa también el juego) y `protocolo.ts` (los mensajes); `entry.ts` solo la conecta con el runtime.
- Solo los dos de la sala pueden entrar en ella (un tercero recibe «La sala está completa») y la sala solo habla con quien ha entrado. El marcador es la entidad `MarcadorPareja`: lo escribe la sala con permisos de servidor y solo lo pueden leer los dos de cada pareja (reglas en `base44/entities/marcador-pareja.jsonc`).
- En el juego: `src/live/` (conexión sin SDK, estado de la sala y tableros) y `src/ui/live/` (ventana «Jugar en pareja», sala de espera, barra de la sala, final y marcador). Las partidas en pareja no tocan el progreso de siempre.
- Publicar la sala: `npx base44 actors deploy SalaPareja` (y las entidades con `npx base44 entities push --yes`, sin quitar ningún archivo de `base44/entities/`: lo que falte se borra en Base44).
- Pruebas: `npx tsx scripts/test-sala.ts` (la lógica de la sala), `npx tsx scripts/e2e-pareja.ts [url]` (dos navegadores, ordenador y móvil, con Base44 simulado y la sala de verdad dentro) y `npx tsx scripts/sala-real.ts` (la sala desplegada en Base44, con una copia temporal que deja entrar sin cuenta y se borra al acabar).
- Ojo con Base44: cierra una conexión solo si quien la abrió ya ha mandado algún mensaje, así que la sala decide todo al recibir «entrar»; y con la sesión caducada, el permiso de conexión responde 422.

## Aviso

Proyecto fan, gratuito y sin ánimo de lucro. Los personajes, nombres y marcas pertenecen a sus respectivos propietarios; este juego no está afiliado a ellos. Las ilustraciones se han creado con IA para este proyecto.
