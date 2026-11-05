# Encargo: revisar los textos de los casos nuevos de Churri-doku

Churri-doku es un juego de lógica con asesinatos en series y películas, en español de España. Los textos los escribieron redactores distintos antes de que existiera la solución, y hay que dejarlos perfectos. Te dan una lista de casos. Para cada uno:

`npx tsx scripts/dump-caso.ts <id>` muestra las zonas, las reglas, el asesino, dónde está cada uno en la solución real, sus pistas, la intro, el epílogo, los móviles y los agravios. La intro y el epílogo se editan en `src/data/puzzles/<id>.ts` (solo el bloque `story`); móviles y agravios, en `art/textos/<id>.json`.

## Qué tienes que comprobar y corregir

1. **El epílogo tiene que cuadrar con la solución real.** Revela al asesino correcto. Si la frase que empieza por «Mientras tanto,» dice dónde estaba alguien, tiene que ser verdad: reescríbela con las zonas reales de dos o tres personas, con gracia, sin contradecir la solución. Si no dice dónde está nadie, mejórala con datos reales. Nada del epílogo puede contradecir el plano (por ejemplo, decir que el asesino estaba en otra zona).
2. **La intro** no debe contradecir las reglas ni el plano, ni revelar al asesino. Puede justificar las reglas de forma natural.
3. **Fidelidad a la obra.** Corrige lo que sea falso o dudoso: datos, relaciones, nombres (como se conocen en España). Si un móvil se apoya en algo inventado, que al menos suene a licencia cómica y no a dato falso. Puedes buscar con WebSearch cuando dudes. Ojo con los errores de bulto (quién es pariente de quién, quién trabaja dónde).
4. **Móviles** (`motives`): en tercera persona, una o dos frases, porque se leen justo después de «¡Fue X!». Nada de primera persona ni de «acabé», «llevo», «soy». **Agravios** (`grudges`): una frase, sin decir cómo lo hizo, sin señalar al asesino ni dónde estaba la víctima, y todos igual de creíbles: el del asesino no puede destacar.
5. **Español de España, natural y con humor.** Corrige erratas, frases forzadas, repeticiones («Harto/a de…» en todos es pobre: varía) y calcos del inglés. Nada de gore ni contenido sexual. Si hay críos en el reparto, sus textos son inofensivos.
6. No cambies títulos, nombres del reparto, reglas, mapa, pistas ni solución. No toques el bloque `// <gen>`.

Al editar un .ts usa ediciones pequeñas y comprueba al final con `npx tsc -b` que compila y con python3 que los JSON cargan. No hagas commits ni escribas en la ficha de KYRIOS Connect: de eso se encarga el coordinador.

Termina con un informe de pocas líneas: qué casos has tocado y cualquier problema que no hayas podido resolver.
