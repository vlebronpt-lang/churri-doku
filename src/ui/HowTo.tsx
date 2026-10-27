import { useState, type ReactNode } from 'react';
import { Modal } from './Modal';

type Mark = 'a' | 'b' | 'v' | 'x' | 'ok' | 'o' | 'occ' | 'blk' | 'chair' | 'plant' | 'hl';

/** Mini tablero ilustrativo. rooms: filas de letras de zona; marks: casilla → marca. */
function Mini({ rooms, marks = {}, size = 128 }: { rooms: string[]; marks?: Record<string, Mark>; size?: number }) {
  const n = rooms.length;
  const m = rooms[0].length;
  const cs = 26;
  const W = m * cs + 8, H = n * cs + 8;
  const parts: ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < m; c++) {
      const x = 4 + c * cs, y = 4 + r * cs;
      const mark = marks[`${r},${c}`];
      parts.push(<rect key={`b${r}${c}`} x={x} y={y} width={cs} height={cs} fill={mark === 'hl' ? '#ffe58a' : rooms[r][c] === 'A' ? '#dcd2f2' : rooms[r][c] === 'B' ? '#cfe8de' : '#f6d9c2'} />);
      if (mark === 'blk' || mark === 'plant' || mark === 'chair') {
        if (mark === 'blk') parts.push(<rect key={`k${r}${c}`} x={x + 5} y={y + 5} width={cs - 10} height={cs - 10} rx="3" fill="#9a8f80" stroke="#251a37" strokeWidth="1.6" />);
        if (mark === 'plant') parts.push(<g key={`k${r}${c}`}><circle cx={x + cs / 2} cy={y + cs / 2 + 2} r="6" fill="#d2733f" stroke="#251a37" strokeWidth="1.5" /><circle cx={x + cs / 2} cy={y + cs / 2 - 4} r="6" fill="#5db55a" stroke="#251a37" strokeWidth="1.5" /></g>);
        if (mark === 'chair') parts.push(<g key={`k${r}${c}`}><rect x={x + 7} y={y + 10} width={cs - 14} height={cs - 15} rx="2" fill="#c98a52" stroke="#251a37" strokeWidth="1.5" /><rect x={x + 6} y={y + 5} width={cs - 12} height="6" rx="2" fill="#9b6136" stroke="#251a37" strokeWidth="1.5" /></g>);
      }
      if (mark === 'a' || mark === 'b' || mark === 'v') {
        parts.push(<circle key={`m${r}${c}`} cx={x + cs / 2} cy={y + cs / 2} r="9.5" fill={mark === 'v' ? '#e23d6b' : '#fff'} stroke="#251a37" strokeWidth="2" />);
        parts.push(<text key={`t${r}${c}`} x={x + cs / 2} y={y + cs / 2 + 4.5} textAnchor="middle" fontFamily="Bungee" fontSize="12" fill={mark === 'v' ? '#fff' : '#251a37'}>{mark === 'v' ? 'V' : mark.toUpperCase()}</text>);
      }
      if (mark === 'x') parts.push(<path key={`x${r}${c}`} d={`M${x + 8} ${y + 8} L${x + cs - 8} ${y + cs - 8} M${x + cs - 8} ${y + 8} L${x + 8} ${y + cs - 8}`} stroke="#251a37" strokeWidth="3" strokeLinecap="round" />);
      if (mark === 'ok') parts.push(<path key={`o${r}${c}`} d={`M${x + 7} ${y + 14} l5 5 l8 -10`} stroke="#1f8f6e" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />);
      if (mark === 'o') parts.push(<circle key={`c${r}${c}`} cx={x + cs / 2} cy={y + cs / 2} r="7" fill="none" stroke="#1f8f6e" strokeWidth="3" />);
      if (mark === 'occ') parts.push(
        <g key={`q${r}${c}`}>
          <circle cx={x + cs / 2} cy={y + cs / 2} r="9.5" fill="#f3b53f" fillOpacity=".7" stroke="#251a37" strokeWidth="2" strokeDasharray="3.2 2.2" />
          <circle cx={x + cs / 2} cy={y + cs / 2 - 2.6} r="2.6" fill="#251a37" fillOpacity=".65" />
          <path d={`M${x + cs / 2 - 5} ${y + cs / 2 + 6} a5 4.6 0 0 1 10 0z`} fill="#251a37" fillOpacity=".65" />
        </g>,
      );
    }
  }
  // Muros entre zonas
  const walls: string[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < m; c++) {
    const x = 4 + c * cs, y = 4 + r * cs;
    if (c < m - 1 && rooms[r][c] !== rooms[r][c + 1]) walls.push(`M${x + cs} ${y} V${y + cs}`);
    if (r < n - 1 && rooms[r][c] !== rooms[r + 1][c]) walls.push(`M${x} ${y + cs} H${x + cs}`);
  }
  const grid: string[] = [];
  for (let k = 1; k < m; k++) grid.push(`M${4 + k * cs} 4 V${4 + n * cs}`);
  for (let k = 1; k < n; k++) grid.push(`M4 ${4 + k * cs} H${4 + m * cs}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={size} height={(size * H) / W} className="mini" aria-hidden="true">
      {parts}
      <path d={grid.join(' ')} stroke="#251a37" strokeWidth="1" opacity=".25" />
      <path d={walls.join(' ')} stroke="#251a37" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="4" y="4" width={m * cs} height={n * cs} fill="none" stroke="#251a37" strokeWidth="4" rx="2" />
    </svg>
  );
}

function Card({ title, children, fig }: { title: string; children: ReactNode; fig?: ReactNode }) {
  return (
    <div className="howto-card">
      {fig && <div className="howto-card__fig">{fig}</div>}
      <div>
        <h4>{title}</h4>
        <div className="howto-card__text">{children}</div>
      </div>
    </div>
  );
}

const TABS = ['Reglas', 'Controles', 'Palabras clave', 'Técnicas', 'Preguntas'] as const;

export function HowTo({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Reglas');
  return (
    <Modal title="Cómo se juega" onClose={onClose} wide labelledBy="howto-title" className="howto">
      <div className="tabs tabs--modal" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Reglas' && (
        <div className="howto-grid">
          <p className="howto-lede">Ha habido un asesinato. Coloca a todas las personas en el plano usando sus pistas y descubre al culpable: <strong>es la única persona que estaba a solas con la víctima en su zona.</strong></p>
          <Card title="1 · Una persona por fila y por columna" fig={<Mini rooms={['AAAA', 'AAAA', 'AAAA', 'AAAA']} marks={{ '1,1': 'a', '1,0': 'x', '1,2': 'x', '1,3': 'x', '0,1': 'x', '2,1': 'x', '3,1': 'x' }} />}>
            Hay tantas personas como filas. Cada fila y cada columna tiene exactamente una. Al colocar a alguien, su fila y su columna quedan descartadas.
          </Card>
          <Card title="2 · Solo en casillas ocupables" fig={<Mini rooms={['AAA', 'AAA', 'AAA']} marks={{ '0,0': 'blk', '1,2': 'plant', '2,1': 'chair', '1,1': 'a' }} />}>
            Se puede estar en el suelo libre, en sillas, sillones, bancos, camas, alfombras, barcas… Pero no encima de mesas, estanterías, plantas, árboles o estatuas: esas casillas aparecen oscurecidas. Cada caso trae su lista de objetos para que no haya dudas.
          </Card>
          <Card title="3 · Las pistas nunca mienten" fig={<Mini rooms={['AAB', 'AAB', 'CCB']} marks={{ '0,0': 'v', '1,1': 'a' }} />}>
            Cada caso tiene una única solución y se resuelve sin adivinar. La víctima estaba a solas con el asesino: en su zona había exactamente dos personas.
          </Card>
          <Card title="4 · Acusa al culpable">
            Cuando todos estén colocados, pulsa <strong>Acusar</strong> y señala al asesino. Si algo no cuadra, te avisaremos.
          </Card>
        </div>
      )}

      {tab === 'Controles' && (
        <div className="howto-list">
          <p><strong>Elige un sospechoso</strong> tocando su foto (o pulsando su letra en el teclado). Luego <strong>toca una casilla</strong> para colocarlo; tócala otra vez para quitarlo. También puedes <strong>arrastrar su foto</strong> hasta la casilla (en el móvil, mantén el dedo un instante sobre la foto y arrastra) y <strong>mover una ficha</strong> arrastrándola a otra casilla; si cae sobre otra persona, se intercambian.</p>
          <p><strong>Lápiz:</strong> anota posibilidades con letras pequeñas. Sin cambiar de herramienta, también puedes <strong>mantener pulsada</strong> una casilla para anotar. Arrastra para anotar en varias.</p>
          <p><strong>Tachar (X):</strong> marca casillas donde no puede haber nadie. Arrastra para tachar muchas de una vez. Si una casilla tiene algo dentro (alguien colocado, notas a lápiz o «ocupada»), al tacharla se vacía: antes te pregunto, y puedes deshacerlo. Las X más marcadas son automáticas y definitivas: salen al colocar a alguien (o al marcar una casilla como ocupada) en toda su fila y su columna.</p>
          <p><strong>Ocupada:</strong> marca una casilla en la que sabes que hay alguien aunque aún no sepas quién (por ejemplo, porque es la única libre de su fila). Se ve como un hueco amarillo con una silueta y, como solo cabe una persona por fila y columna, también tacha el resto de su fila y su columna.</p>
          <p><strong>Zona:</strong> para cuando sabes en qué habitación está alguien pero no en qué casilla (por ejemplo, «A está en la Cocina»). Elige al sospechoso, pulsa <strong>Zona</strong> y toca cualquier casilla de esa habitación. Su letra aparece, con borde punteado, en todas las casillas de la zona donde aún puede estar, y desaparece de las que vayas tachando. Su tarjeta te dice cuántas le quedan. Para quitarla, toca otra vez la misma habitación o pulsa la ✕ de su tarjeta.</p>
          <p><strong>Filas y columnas enteras:</strong> toca su cabecera (<strong>C1, C2…</strong> arriba y <strong>F1, F2…</strong> a la izquierda) para usar la herramienta en toda la línea de una vez. Con un sospechoso elegido, lo anota a lápiz en todas las casillas libres (por ejemplo, «A está en la columna 2»). Con <strong>Tachar</strong>, tacha la línea. Con <strong>Ocupada</strong>, resalta las casillas libres donde está su persona (si solo queda una, la marca como ocupada). Con <strong>Borrar</strong>, te pregunta qué quitar de toda la línea.</p>
          <p><strong>Objetos:</strong> en el expediente y en el botón <strong>Objetos</strong> tienes la lista de lo que hay en el plano y si se puede estar en cada cosa. Si pasas el ratón por una casilla, te dice qué hay en ella.</p>
          <p><strong>Borrar</strong> limpia una casilla. Si en ella hay varias cosas (varias personas anotadas, una marca…), te pregunta si quieres borrarlo todo o solo lo que elijas. <strong>Deshacer</strong> y <strong>Rehacer</strong> no tienen límite.</p>
          <p><strong>Pista:</strong> primero un empujoncito; luego, con «Explícamelo», el razonamiento completo: de qué pista sale, qué significa y qué casillas le quedan a cada uno. Si se puede hacer algo en el tablero (colocar a alguien, tachar casillas, marcar su zona o apuntarlo a lápiz), te lo ofrece. «Siguiente pista» sigue desde lo que ya te ha explicado. Las pistas se calculan a partir de tu tablero.</p>
          <p><strong>Revisar</strong> marca en rojo lo que esté mal. Usar pistas o revisar baja la nota final (las estrellas).</p>
          <p><strong>Al pasar el ratón</strong> por una pista, el tablero resalta lo que menciona y aparece la definición de las palabras clave.</p>
          <p><strong>En el móvil:</strong> en los planos grandes, <strong>Ampliar plano</strong> lo agranda y te mueves por él con el dedo (mientras está ampliado, arrastrar desplaza el plano en vez de pintar). Si giras el móvil, el plano y las herramientas se colocan uno al lado del otro.</p>
          <p className="kbd-help"><kbd>←↑→↓</kbd> moverse · <kbd>Intro</kbd> colocar · <kbd>Mayús</kbd>+<kbd>Intro</kbd> anotar · <kbd>N</kbd> lápiz · <kbd>X</kbd> tachar · <kbd>O</kbd> ocupada · <kbd>B</kbd> borrar · <kbd>H</kbd> pista · <kbd>Ctrl</kbd>+<kbd>Z</kbd> deshacer · <kbd>Esc</kbd> soltar</p>
        </div>
      )}

      {tab === 'Palabras clave' && (
        <div className="howto-grid howto-grid--kw">
          <Card title="junto a" fig={<Mini rooms={['AAB', 'AAB', 'AAB']} marks={{ '1,0': 'a', '0,0': 'ok', '2,0': 'ok', '1,1': 'ok', '1,2': 'x' }} />}>A la izquierda, derecha, arriba o abajo, <strong>y en la misma zona</strong>. Una pared lo impide. En diagonal no cuenta.</Card>
          <Card title="solo / sola" fig={<Mini rooms={['AAB', 'AAB', 'CCB']} marks={{ '0,0': 'a', '0,1': 'x', '1,0': 'x', '1,1': 'x' }} />}>No había nadie más en su zona, ni siquiera la víctima.</Card>
          <Card title="a solas con" fig={<Mini rooms={['AAB', 'AAB', 'CCB']} marks={{ '0,0': 'a', '1,1': 'b', '0,1': 'x', '1,0': 'x' }} />}>En su zona estaban esas dos personas y nadie más.</Card>
          <Card title="con" fig={<Mini rooms={['AAB', 'AAB', 'CCB']} marks={{ '0,1': 'a', '1,0': 'b' }} />}>En la misma zona (no hace falta que estén juntos).</Card>
          <Card title="esquina" fig={<Mini rooms={['AAAB', 'AAAB', 'CCCB']} marks={{ '0,0': 'o', '0,2': 'o', '1,0': 'o', '1,2': 'o' }} />}>Casilla donde se juntan dos paredes de su zona.</Card>
          <Card title="misma diagonal" fig={<Mini rooms={['AAAA', 'AAAA', 'AAAA', 'AAAA']} marks={{ '1,1': 'a', '0,0': 'o', '2,2': 'o', '3,3': 'o', '0,2': 'o', '2,0': 'o' }} />}>En línea diagonal, a cualquier distancia.</Card>
          <Card title="al norte / sur / este / oeste de" fig={<Mini rooms={['AAAA', 'AAAA', 'AAAA']} marks={{ '2,1': 'a', '0,0': 'hl', '0,1': 'hl', '0,2': 'hl', '0,3': 'hl', '1,0': 'hl', '1,1': 'hl', '1,2': 'hl', '1,3': 'hl' }} />}>Norte es arriba: <strong>cualquier fila por encima</strong>, en cualquier columna. Sur es abajo, este a la derecha y oeste a la izquierda. Si prefieres «encima de», actívalo en Ajustes.</Card>
          <Card title="exactamente dos filas al norte" fig={<Mini rooms={['AAAA', 'AAAA', 'AAAA']} marks={{ '2,1': 'a', '0,0': 'hl', '0,1': 'hl', '0,2': 'hl', '0,3': 'hl' }} />}>La distancia exacta en esa dirección: ni una fila más ni una menos.</Card>
          <Card title="alguien" >Cualquier persona, también la víctima.</Card>
          <Card title="nadie estuvo en…">Esa zona estaba vacía: no había nadie, ni siquiera la víctima.</Card>
        </div>
      )}

      {tab === 'Técnicas' && (
        <div className="howto-grid">
          <Card title="Busca filas o columnas con una sola casilla libre" fig={<Mini rooms={['AAA', 'AAA', 'AAA']} marks={{ '0,0': 'blk', '2,0': 'blk', '1,0': 'occ', '1,1': 'x', '1,2': 'x' }} />}>Si en una columna solo queda una casilla posible, ahí hay alguien aunque aún no sepas quién: márcala como <strong>Ocupada</strong>. Nadie más podrá estar en su fila.</Card>
          <Card title="Filas o columnas reservadas" fig={<Mini rooms={['AAA', 'AAA', 'AAA']} marks={{ '0,0': 'a', '0,1': 'a', '1,0': 'b', '1,1': 'b', '2,0': 'x', '2,1': 'x' }} />}>Si A solo puede estar en dos casillas de las columnas 1 y 2, y B también, esas dos columnas son para ellos: nadie más puede ocuparlas.</Card>
          <Card title="Casillas alineadas" fig={<Mini rooms={['AAA', 'AAA', 'AAA']} marks={{ '0,0': 'a', '2,2': 'a', '0,2': 'x', '2,0': 'x' }} />}>Si alguien solo puede estar en dos casillas, nadie más podrá ocupar las casillas que comparten fila o columna con ambas.</Card>
          <Card title="¿Quién acompaña a la víctima?">En la zona de la víctima hay exactamente otra persona. Si solo una puede llegar ahí, es el asesino.</Card>
          <Card title="Supón y busca la contradicción">En todos los niveles llega un momento en que hay que suponer: «si X estuviera aquí…». Sigue las consecuencias unos pocos pasos; si alguien se queda sin sitio (o dos personas acaban en la misma fila), esa casilla queda descartada.</Card>
          <Card title="Practícalas en la Academia">En <strong>Academia</strong> tienes un tutorial guiado de 3 minutos y una lección por técnica, cada una con su minicaso para practicarla.</Card>
        </div>
      )}

      {tab === 'Preguntas' && (
        <div className="faq">
          <details open><summary>¿«Alguien» o «persona» incluye a la víctima?</summary><p>Sí. Piensa en dónde estaba cada uno justo antes del crimen.</p></details>
          <details><summary>Si una pista dice «junto a una planta», ¿puede estar junto a dos?</summary><p>Sí. Cuando el número importa, la pista dice «exactamente».</p></details>
          <details><summary>¿El objeto sobre el que está alguien cuenta como «junto a»?</summary><p>No. Quien está sentado en un sofá de dos casillas no está «junto a un sofá» por la otra mitad del mismo sofá.</p></details>
          <details><summary>¿Los retratos dan pistas?</summary><p>No, son decorativos. Solo importa el símbolo ♀/♂ cuando una pista habla de «una mujer» o «un hombre».</p></details>
          <details><summary>¿Se puede estar en el agua?</summary><p>Sí: el agua y las alfombras se pueden ocupar, salvo que encima haya algo que no se pueda ocupar (una mesa, una roca…). Ojo: quien va en una barca está «en la barca», no «en el agua». En cambio, quien está en una silla puesta sobre una alfombra sí está «sobre una alfombra».</p></details>
          <details><summary>¿Los objetos grandes ocupan varias casillas?</summary><p>Sí (mesas, camas, coches…), pero una persona solo ocupa una casilla.</p></details>
          <details><summary>¿Siempre hay una sola solución?</summary><p>Sí, y todos los casos se han verificado con un programa que lo comprueba. Si te sale otra cosa, repasa una palabra clave: es fácil pasar por alto un «no» o un «exactamente».</p></details>
          <details><summary>¿Por qué son tan difíciles?</summary><p>Porque así lo pidieron quienes los probaron. Hemos medido los casos de Murdoku con el mismo motor que resuelve los nuestros: «Muy fácil» tiene la dificultad de «La habitación del pánico», un caso «Difícil» de Murdoku, y cada nivel siguiente es más difícil que el anterior. Desde el primer caso hay que hacer suposiciones. Si te atascas, empieza por el tutorial y la Academia, y recuerda que las pistas te explican el siguiente paso sin destripar el caso.</p></details>
          <details><summary>¿Qué es el caso del día?</summary><p>Cada día hay un caso nuevo: el lunes, muy fácil; el sábado, experto. Usa el plano de uno de los 25 casos, pero con otra colocación, otras pistas y otro culpable. Si lo resuelves ese mismo día, sumas un día a tu <strong>racha</strong> 🔥. Los de días anteriores están en el <strong>Archivo</strong>.</p></details>
          <details><summary>¿Se guarda mi progreso?</summary><p>Sí, automáticamente en este navegador, incluido el tiempo. Puedes cerrar y seguir otro día. Para seguir en otro ordenador o en el móvil, abre <strong>Ajustes → Pasar mi progreso a otro dispositivo</strong> y abre ese enlace allí (o pégalo en <strong>Traer progreso desde un enlace</strong>).</p></details>
          <details><summary>¿Puedo instalarlo como una app y jugar sin conexión?</summary><p>Sí. En <strong>Ajustes → App y recordatorios</strong> puedes instalarlo (en iPhone: botón Compartir de Safari → «Añadir a pantalla de inicio») y pulsar <strong>Descargar todo</strong> para jugar sin internet. También puedes añadir a tu calendario un recordatorio diario del caso del día.</p></details>
          <details><summary>¿Y si una pista me confunde?</summary><p>Pulsa el <strong>?</strong> que aparece junto a la pista (en el móvil, «¿Te confunde esta pista?») y cuéntanos qué pasa. Se guarda en tu informe de juego (<strong>Ajustes → Ayudar a mejorar</strong>), que puedes mandar a quien crea los casos para mejorarlos.</p></details>
          <details><summary>¿Cómo juego con mi pareja si usa otro dispositivo?</summary><p>Cada uno abre esta misma página en su móvil u ordenador. Cuando resuelvas un caso, pulsa <strong>«Retar a mi churri»</strong> y mándale el enlace por WhatsApp o por donde queráis: verá tu tiempo antes de empezar y, al terminar, quién ha ganado. Luego puede devolverte el reto.</p></details>
          <details><summary>¿Puedo jugar en papel?</summary><p>Sí. En <strong>Descargas</strong> tienes cada caso en PDF (color, blanco y negro y solución) o todos juntos en un libro, también listo para encuadernar o con tu dedicatoria para regalarlo. El libro trae además un caso final que solo está en papel.</p></details>
        </div>
      )}
    </Modal>
  );
}
