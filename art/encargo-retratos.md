# Encargo: retratos de los casos nuevos de Churri-doku

Generas los retratos en la web de Higgsfield, en la pestaña de Chrome que te indican, con el modo **Unlimited**. Las herramientas de Chrome (`mcp__claude-in-chrome__*`) hay que cargarlas primero con ToolSearch; agrupa acciones con `browser_batch` y usa capturas a escala 0.4–0.7 para no gastar de más.

## Reglas que no se pueden saltar

- **Nunca se gastan créditos.** Antes de CADA clic en generar, haz zoom sobre el botón: tiene que poner **UNLIMITED**, sin ningún número. Si sale un número, no generes: vuelve a activar el interruptor «Unlimited». Si no se puede, para y avisa.
- No uses las herramientas `generate_*` de Higgsfield por MCP (gastan créditos). Solo la web.
- Recargar la página o cambiar de modelo apaga Unlimited. Deja siempre 1/4 imágenes: subir a 2 lo apaga. No toques nada más de la cuenta.
- La cuenta es de Víctor, que genera otras cosas a la vez. Nunca borres ni muevas archivos `hf_*` que no sean los tuyos.

## Preparación (solo si el cuadro no está ya así)

Modelo **Seedream 4.5**, calidad **2K**, **1/4**, Unlimited activado, y la referencia de estilo adjunta en el cuadro: botón «+» → pestaña Uploads → la hoja de nueve retratos con fondos pastel (si no está, súbela: `art/estilo-referencia.png`, con `file_upload` sobre el input de archivo). El selector de proporción («Aspect ratio») se cambia según la hoja.

## Cada hoja

Los prompts están en `art/prompts-ampliacion.json` (`id`, `rows`, `cols`, `ratio`, `ids`, `prompt`). Lee solo la entrada que toque:
`python3 -c "import json;d={x['id']:x for x in json.load(open('art/prompts-ampliacion.json'))}['<id>'];print(d['rows'],d['cols'],d['ratio'],','.join(d['ids']));print(d['prompt'])"`

1. Pon la proporción de la hoja (`ratio`). Clic en el cuadro del prompt, `cmd+a` y pega con JavaScript (escribir a mano es lento):
   ```js
   const P = `…prompt…`;
   const el = document.activeElement;
   const dt = new DataTransfer(); dt.setData('text/plain', P);
   el.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}));
   await new Promise(r => setTimeout(r, 400));
   (el.innerText || '').slice(0, 40)
   ```
2. Zoom al botón (debe poner UNLIMITED) y clic para generar. Tarda 1–2 minutos. Mientras tanto puedes preparar y lanzar la siguiente hoja (cambia ratio y prompt): caben varias a la vez en cola. Las imágenes nuevas salen arriba a la izquierda de la galería.
3. Abre la imagen (clic) y compruébala: nº de casillas correcto, sin texto ni letras, sin marcos negros, un personaje por casilla y en su orden, y **que se reconozca a cada personaje**. Si algo falla, corrige la descripción en el prompt y genera otra vez (hasta 3 veces por hoja). Sé exigente con el parecido: es lo que más le importa a Víctor. Para personajes reales de series que no recuerdes bien, mira cómo son en Google Imágenes con el navegador integrado (`mcp__Claude_Browser__*`), sin descargar nada.
4. Descárgala:
   - `touch <carpeta temporal>/marca` justo antes de pulsar **Download** en el detalle de la imagen.
   - Espera 3 segundos y mueve el archivo nuevo: `f=$(find ~/Downloads -maxdepth 1 -name 'hf_*' -newer <carpeta temporal>/marca | head -1); mv "$f" art/sheets/<id>.png`.
   - Cierra el detalle.
   Seedream a veces cambia de sitio las casillas o pasa un objeto de un personaje a otro. Si solo están permutadas, basta con cambiar el orden de los ids al recortar; si un objeto se ha ido al personaje equivocado, rehaz esos dos sueltos (paso 6). Si salen nombres escritos, descarta la imagen y genera otra vez.
   Si la web responde «Protected content detected», quita del prompt el título de la obra y los apellidos, deja solo los nombres de pila y los rasgos, y prueba otra vez.
5. Recorta y revisa:
   - `python3 scripts/slice.py art/sheets/<id>.png <rows> <cols> public/img/portraits/<id> <ids separados por comas> --inset 0.055` (los `-` se descartan; el margen quita el borde de cada casilla).
   - `python3 scripts/contact.py <id> <carpeta temporal>/<id>.jpg` y mira la imagen con Read: retratos centrados, sin trozos de otras casillas ni esquinas blancas, y cada nombre con su cara. Los reutilizados de otros casos también salen: comprueba que el estilo casa.
6. Si solo falla una casilla, genera ese personaje suelto con una hoja de 1×1 (`Use the attached image ONLY as the style reference… a single square portrait…`), descárgalo a `art/singles/<id>-<personaje>.png` y procésalo con `python3 scripts/singles.py <id>-<personaje>`.

## Al terminar

Informe breve: por cada caso, hecho o pendiente y qué retratos se parecen menos al personaje. No hagas commits ni escribas en la ficha de KYRIOS Connect: de eso se encarga el coordinador. Cierra solo lo que hayas abierto; deja la pestaña de Higgsfield abierta.

## Portadas (solo si te las encargan)

Los prompts están en `art/prompts-portadas.json` (`sheet`, `ids`, `prompt`). Proporción 1:1, y como referencia de estilo adjunta la hoja `art/covers/E.png` en lugar de la de retratos (quita la otra con «Remove attachment»). Comprueba: cuatro escenas, sin personas ni texto legible, que se reconozca el lugar. Descarga igual que los retratos, a `art/covers/<sheet>.png`, y recorta con `python3 scripts/slice.py art/covers/<sheet>.png 2 2 art/covers_raw <ids separados por comas> --size 768`; después `python3 scripts/cover_fix.py <ids separados por espacios>` (salta los `-`) las copia a `public/img/covers/`.
