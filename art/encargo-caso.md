# Encargo: crear un caso nuevo de Churri-doku

Churri-doku es un juego web de lógica tipo Murdoku, en español de España, con asesinatos en lugares de series y películas.
Estás en la ampliación del juego (rama `ampliacion-80`, carpeta de trabajo: el repositorio). Tu tarea: crear **un caso**:
su mapa, su reparto y sus textos. Las pistas las genera después un script: no las escribas.

Solo puedes crear dos archivos: `src/data/puzzles/<id>.ts` y `art/textos/<id>.json`. No toques nada más ni hagas commits.

## Pasos

1. Lee `AUTHORING.md` entero y `src/data/puzzles/tronos.ts` como ejemplo de formato, densidad y tono. Tu encargo es la
   entrada con tu `id` en `art/ampliacion.json`:
   `python3 -c "import json;print(json.dumps(next(c for c in json.load(open('art/ampliacion.json')) if c['id']=='<id>'),ensure_ascii=False,indent=1))"`
2. Escribe `src/data/puzzles/<id>.ts`:
   - Copia tal cual `id`, `num`, `level`, `franchise`, `title`, `size`, el reparto y los `groups`. Cada personaje lleva además `clues: []`, y la víctima, `victim: true`. `wantMurderer` es `murderer`.
   - Las reglas del encargo citan la zona entre `<…>`: pon la letra de esa zona. No añadas ni quites reglas.
   - Zonas: `roomsHint` son sugerencias; elige las que mejor funcionen (7–8 en 9×9, 8–9 en 10×10, 9–10 en 11×11), cada una con su color, suelo y artículo correcto. Formas variadas y que se note el lugar: un buen mapa no es una rejilla de rectángulos.
   - Objetos del catálogo de `AUTHORING.md` (la galería de iconos está en `scratchpad/mapas/icons.png`, en la carpeta temporal que te indican: mírala para no elegir un objeto que luego no se reconozca), con 1–3 objetos únicos con nombre propio muy reconocibles para los fans. Para un objeto propio usa un icono existente (`base`) con `key`, `name`, `plural`, `fem`, `unique`.
   - Fija la zona de la víctima con `pins` si la historia lo pide (`pins: { <víctima>: { rooms: ['X'] } }`). La zona de la víctima necesita sitio para dos personas en filas y columnas distintas. Una zona reservada o con número exacto de personas tiene que tener sitio para ellas.
   - `story.intro` y `story.epilogue`, según `AUTHORING.md` §4: en español de España, con humor y guiños para fans, sin copiar frases largas de la obra. El epílogo revela al asesino del encargo. Usa la `note` del encargo y respeta los nombres del reparto.
   - Deja el bloque `// <gen>` con `solution: undefined as never`.
3. Comprueba y corrige hasta que quede bien:
   - `PREVIEW_OUT=<carpeta temporal>/<id> npx tsx scripts/preview.ts <id>` y mira la imagen con Read: que se lea, que los rótulos no pisen objetos importantes, que sea bonito y evoque el lugar.
   - `npx tsx scripts/check-map.ts <id>`: ni un ✘, y atiende los ⚠ salvo que tengas un buen motivo.
   - Mira siempre la imagen del mapa definitivo antes de acabar.
4. Escribe `art/textos/<id>.json` según `AUTHORING.md` §8: móvil y agravio de **todos** los sospechosos (no de la víctima), `looks` en inglés de quienes **no** tienen `portrait` en el encargo (también la víctima), y `cover`.
   - Los móviles y agravios salen de la obra: hechos, manías, tramas o frases parafraseadas que un fan reconozca. Nada genérico del tipo «estaba harta de sus manías»; si de alguien no recuerdas nada seguro, busca con WebSearch antes de escribir.
   - Los agravios no pueden señalar al asesino ni decir dónde estaba la víctima, y todos deben parecer igual de sospechosos.
   - En `looks`, describe cómo es el personaje con detalle visual exacto (edad aparente, pelo, vello facial, gafas, ropa típica; nunca nombres de actores); si es muy conocido, empieza por su nombre y su obra. Si dudas de su aspecto, compruébalo con WebSearch: los retratos tienen que parecerse.
5. Termina con un informe de 3–5 líneas: zonas, objetos únicos y cualquier duda o dato que no hayas podido confirmar.

## Criterios

- Datos fieles a la obra: si no estás seguro de un dato, no lo uses. Nombres como se conocen en España.
- Humor blanco o negro de sobremesa, nunca gore ni contenido sexual. Sin personas reales. Ningún menor en situaciones violentas: si hay algún crío en el reparto, sus textos son inofensivos y cómicos.
- Nada de spoilers innecesarios en la intro. Ni la intro ni los agravios deben dar pistas sobre la solución.
