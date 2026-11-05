#!/usr/bin/env python3
"""Encargo de los casos de la ampliación (art/ampliacion.json): reparto, víctima, asesino y reglas de cada caso nuevo.
Lo leen quienes redactan los casos y los retratos.  python3 scripts/ampliacion.py"""
import json, os

def c(tag, name, g='m', art=None, nh=False, groups=None, portrait=None):
    d = {'id': tag, 'tag': tag, 'name': name, 'gender': g}
    if art: d['article'] = art
    if nh: d['nonhuman'] = True
    if groups: d['groups'] = groups
    if portrait: d['portrait'] = portrait
    return d

def case(id, num, level, size, franchise, title, place, victim, murderer, cast, rooms=None, rules=None, groups=None, note=''):
    return dict(id=id, num=num, level=level, size=size, franchise=franchise, title=title, place=place, victim=victim,
                murderer=murderer, cast=cast, roomsHint=rooms or '', rules=rules or [], groups=groups or {}, note=note)

C = []
# ---------------------------------------------------------------- Temporada 1 · Muy fácil
C += [
case('monstruos', 5, 1, 9, 'Monstruos S.A.', 'Un susto de muerte', 'la fábrica de sustos de Monstruos S.A.', 'Ra', 'Rz', [
    c('Su', 'Sulley', nh=True), c('Mi', 'Mike', nh=True), c('Bo', 'Boo', 'f'), c('Ce', 'Celia', 'f', nh=True), c('Rz', 'Roz', 'f', nh=True),
    c('Wa', 'Sr. Waternoose', art='el', nh=True), c('Fu', 'Fungus', nh=True), c('Ye', 'Yeti', art='el', nh=True), c('Ra', 'Randall', nh=True)],
    rooms='Planta de sustos, Cámara de puertas, Vestuarios, Recepción, Despacho de Waternoose, Habitación de Boo, Cafetería, Simulador',
    rules=[{'t': 'zoneCount', 'room': '<Cámara de puertas>', 'n': 0}],
    note='La Cámara de puertas está precintada por los agentes de la CDA (el 2319): por eso nadie estaba allí. Roz, la del papeleo eterno, llevaba años esperando a que Randall rellenara un impreso.'),
case('ratatouille', 6, 1, 9, 'Ratatouille', 'La última cena de Skinner', 'la cocina de Gusteau\'s, en París', 'Sk', 'Ho', [
    c('Re', 'Remy', nh=True), c('Li', 'Linguini'), c('Co', 'Colette', 'f'), c('AE', 'Anton Ego'), c('Dj', 'Django', nh=True), c('Em', 'Emile', nh=True),
    c('Ho', 'Horst'), c('Gu', 'Gusteau', nh=True), c('Sk', 'Skinner')],
    rooms='Cocina, Comedor, Cámara frigorífica, Despacho de Skinner, Bodega, Callejón, Tejados de París, Orilla del Sena',
    rules=[{'t': 'zoneCount', 'room': '<Cocina>', 'n': 3}],
    note='Gusteau es el Gusteau imaginario que ve Remy (por eso no humano). Horst es el cocinero que da una versión distinta de por qué estuvo en la cárcel, incluida la de que mató a un hombre con el pulgar: esta vez dice la verdad.'),
case('reyleon', 7, 1, 9, 'El Rey León', 'Larga vida al rey', 'la Roca del Rey', 'Sc', 'Za', [
    c('Si', 'Simba', nh=True), c('Na', 'Nala', 'f', nh=True), c('Ti', 'Timón', nh=True), c('Pu', 'Pumba', nh=True), c('Ra', 'Rafiki', nh=True),
    c('Za', 'Zazú', nh=True), c('Sh', 'Shenzi', 'f', nh=True), c('Ba', 'Banzai', nh=True), c('Sc', 'Scar', nh=True)],
    rooms='Roca del Rey, Cueva de Scar, Cementerio de elefantes, Sabana, Oasis de Timón y Pumba, Árbol de Rafiki, Charca, Garganta',
    note='Zazú, encerrado por Scar en una jaula de huesos y obligado a cantar, se cobra años de humillación.'),
case('gru', 8, 1, 9, 'Gru, mi villano favorito', 'Un villano menos', 'el laboratorio secreto de Gru', 'Ve', 'Ag', [
    c('Gr', 'Gru'), c('Ma', 'Margo', 'f'), c('Ed', 'Edith', 'f'), c('Ag', 'Agnes', 'f'), c('Ne', 'Dr. Nefario', art='el'), c('Ke', 'Kevin', nh=True),
    c('St', 'Stuart', nh=True), c('Bo', 'Bob', nh=True), c('Ve', 'Vector')],
    rooms='Laboratorio, Salón de Gru, Cuarto de las niñas, Plataforma del cohete, Fábrica de minions, Pasillo de congelación, Jardín, Almacén de bananas',
    note='Vector viene a robar el rayo reductor. La dulce Agnes, la del unicornio esponjoso, es la asesina: Vector le rompió su unicornio.'),
case('pokemon', 9, 1, 9, 'Pokémon', '¡Hazte con el culpable!', 'el laboratorio del profesor Oak, en Pueblo Paleta', 'Gi', 'Me', [
    c('As', 'Ash'), c('Pi', 'Pikachu', nh=True), c('Mi', 'Misty', 'f'), c('Br', 'Brock'), c('Je', 'Jessie', 'f'), c('Ja', 'James'), c('Me', 'Meowth', nh=True),
    c('Oa', 'Profesor Oak', art='el'), c('Gi', 'Giovanni')],
    rooms='Laboratorio, Sala de Poké Balls, Biblioteca, Invernadero, Rancho de los Pokémon, Cocina, Sala del ordenador, Jardín de Pueblo Paleta',
    note='Giovanni, jefe del Team Rocket, ha ido a robar los Pokémon de Oak. Meowth, siempre despreciado por el jefe en favor de su Persian, se cobra la deuda.'),
case('zootropolis', 10, 1, 9, 'Zootrópolis', 'La oveja negra', 'el ayuntamiento de Zootrópolis', 'Be', 'Fl', [
    c('Ju', 'Judy Hopps', 'f', nh=True), c('Ni', 'Nick Wilde', nh=True), c('Bg', 'Jefe Bogo', art='el', nh=True), c('Ga', 'Garraza', nh=True), c('Fl', 'Flash', nh=True),
    c('Li', 'Alcalde Lionheart', art='el', nh=True), c('SB', 'Sr. Big', art='el', nh=True), c('Fi', 'Finnick', nh=True), c('Be', 'Vicealcaldesa Bellwether', 'f', art='la', nh=True)],
    rooms='Despacho del alcalde, Despacho de Bellwether, Sala de archivos, Vestíbulo, Comisaría, Sahara Square, Tundratown, Madriguera',
    rules=[{'t': 'zoneCount', 'room': '<Sala de archivos>', 'n': 1}],
    note='El perezoso Flash de la Jefatura de Tráfico es el asesino: tardó horas, pero nadie sospecha de él porque nadie le ha visto moverse.'),
case('surf', 11, 1, 9, 'Locos por el surf', 'La última ola de Tank Evans', 'la isla de Pen Gu, durante el campeonato en memoria de Gran Z', 'Ta', 'Ge', [
    c('Co', 'Cody Maverick', nh=True), c('La', 'Lani', 'f', nh=True), c('Ge', 'Geek', nh=True), c('PP', 'Pepe el Pollo', nh=True), c('Re', 'Reggie Belafonte', nh=True),
    c('Mi', 'Mikey', nh=True), c('Ar', 'Arnold', nh=True), c('Gl', 'Glen Maverick', nh=True), c('Ta', 'Tank Evans', nh=True)],
    rooms='Playa, Cabaña de Geek, Selva, Volcán, Chiringuito, Carpa de Reggie, Arrecife, Muelle',
    note='Todos son pingüinos menos Pepe el Pollo (pollo), Reggie (nutria marina, el representante de Tank) y Mikey (ave limícola, el cazatalentos). Geek es Gran Z escondido: Tank le arruinó la vida y lo humilló años atrás. No reveles a qué se dedica Geek hasta el epílogo.'),
case('serrano', 12, 1, 9, 'Los Serrano', 'Una de bravas y un muerto', 'la taberna de los Serrano, en el barrio de Santa Justa', 'Sa', 'Fi', [
    c('Di', 'Diego'), c('Lu', 'Lucía', 'f'), c('Fi', 'Fiti'), c('Ma', 'Marcos'), c('Ev', 'Eva', 'f'), c('Gu', 'Guille'), c('Te', 'Teté', 'f'), c('Ra', 'Raúl'), c('Sa', 'Santiago')],
    rooms='Taberna, Cocina de la taberna, Salón de los Serrano, Cuarto de los chicos, Taller de Fiti, Campo del Santa Justa, Instituto, Plaza del barrio',
    note='Santiago es el hermano mayor de Diego, socio en la taberna y presidente del Santa Justa F.C. Fiti, antiguo mecánico y amigo de los dos, es el culpable. Marcos es el mayor de Diego; Eva y Teté, las hijas de Lucía; Guille, el mediano; Raúl, el amigo de Marcos. No inventes parentescos ni datos que no te consten.'),
case('prada', 13, 1, 9, 'El diablo viste de Prada', 'Eso es todo', 'la redacción de la revista Runway', 'Mi', 'Ni', [
    c('An', 'Andy', 'f'), c('Em', 'Emily', 'f'), c('Ni', 'Nigel'), c('Ch', 'Christian Thompson'), c('Na', 'Nate'), c('Ly', 'Lily', 'f'), c('Ir', 'Irv Ravitz'), c('Ja', 'Jacqueline Follet', 'f'), c('Mi', 'Miranda Priestly', 'f')],
    rooms='Despacho de Miranda, Redacción, Armario de Runway, Sala de reuniones, Sala de pruebas, Recepción, Cafetería, Terraza',
    note='Nigel es el asesino: Miranda le quitó en París el puesto de su vida para salvar el suyo.'),
]
# ---------------------------------------------------------------- Temporada 2 · Fácil
C += [
case('shrek2', 19, 2, 9, 'Shrek 2', 'Encantador hasta el final', 'el castillo de Muy Muy Lejano', 'PE', 'RH', [
    c('S', 'Shrek', nh=True, portrait='shrek/S'), c('A', 'Asno', nh=True, portrait='shrek/A'), c('F', 'Fiona', 'f', portrait='shrek/F'), c('G', 'Gato con Botas', art='el', nh=True, portrait='shrek/G'),
    c('H', 'Hada Madrina', 'f', art='el', portrait='shrek/H'), c('J', 'Jengi', nh=True, portrait='shrek/J'), c('RH', 'Rey Harold', art='el'), c('RL', 'Reina Lillian', 'f', art='la'), c('PE', 'Príncipe Encantador', art='el')],
    rooms='Salón de baile, Comedor real, Fábrica de pociones, Taberna de la Manzana Envenenada, Sala del trono, Establos, Bosque, Jardines',
    note='El rey Harold, harto de que el Hada Madrina y su hijo le obliguen a todo, es el culpable. Epílogo sin revelar más de la cuenta.'),
case('toystory2', 20, 2, 9, 'Toy Story 2', 'La colección de Al', 'la juguetería de Al y su apartamento', 'Al', 'Pe', [
    c('W', 'Woody', nh=True, portrait='toystory/W', groups=['rodeo']), c('B', 'Buzz', nh=True, portrait='toystory/B'), c('J', 'Jessie', 'f', nh=True, portrait='toystory/J', groups=['rodeo']),
    c('Pg', 'Perdigón', nh=True, groups=['rodeo']), c('Pe', 'Apestoso Pete', nh=True, groups=['rodeo']), c('R', 'Rex', nh=True, portrait='toystory/R'), c('P', 'Sr. Potato', art='el', nh=True, portrait='toystory/P'),
    c('Zu', 'Emperador Zurg', art='el', nh=True), c('Al', 'Al')],
    groups={'rodeo': {'label': 'Rodeo de Woody', 'one': 'un juguete del Rodeo de Woody', 'many': 'los juguetes del Rodeo de Woody', 'color': '#b5651d'}},
    rooms='Pasillo de la juguetería, Sección de Buzz, Vitrina del Rodeo de Woody, Salón del apartamento, Taller del restaurador, Ascensor, Aeropuerto, Cinta de equipajes',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Vitrina del Rodeo de Woody>'], 'group': 'rodeo'}],
    note='Al es el coleccionista humano: la única persona de carne y hueso. Apestoso Pete, el buscador de oro que lleva toda la vida en su caja, es el culpable.'),
case('simpson2', 21, 2, 9, 'Los Simpson', 'El último acto de Bob', 'los estudios de televisión de Krusty', 'Bo', 'Kr', [
    c('Kr', 'Krusty'), c('B', 'Bart', portrait='simpson/B'), c('L', 'Lisa', 'f', portrait='simpson/L'), c('H', 'Homer', portrait='simpson/H'), c('M', 'Marge', 'f', portrait='simpson/M'),
    c('Mi', 'Milhouse'), c('Ap', 'Apu'), c('Wi', 'Jefe Wiggum', art='el'), c('Bo', 'Actor Secundario Bob', art='el')],
    rooms='Plató de Krusty, Camerino de Krusty, Plató de Rasca y Pica, Sala de guionistas, Almacén de atrezo, Cafetería, Aparcamiento, Taquilla',
    note='En España es «Actor Secundario Bob» (nunca Bob Patiño). Krusty es el culpable: Bob le tendió aquella trampa para mandarlo a la cárcel.'),
case('piratas2', 22, 2, 9, 'Piratas del Caribe', 'El corazón de Davy Jones', 'el Holandés Errante', 'D', 'T', [
    c('J', 'Jack Sparrow', portrait='piratas/J'), c('W', 'Will Turner', portrait='piratas/W'), c('E', 'Elizabeth Swann', 'f', portrait='piratas/E'), c('G', 'Gibbs', portrait='piratas/G'),
    c('T', 'Tía Dalma', 'f', portrait='piratas/T'), c('N', 'Norrington', portrait='piratas/N'), c('BB', 'Bill el Botas'), c('LB', 'Lord Beckett'), c('D', 'Davy Jones', portrait='piratas/D')],
    rooms='Cubierta, Camarote de Davy Jones, Sala del órgano, Bodega, Calabozo, Cofa, Isla Cruces, Bote de remos',
    note='Tía Dalma (Calipso, su antiguo amor) es la culpable. El cofre con el corazón puede ser un objeto único.'),
case('aquinohay', 23, 2, 9, 'Aquí no hay quien viva', 'Se levanta la junta', 'el edificio de Desengaño 21', 'JC', 'Em', [
    c('JC', 'Juan Cuesta', groups=['exterior']), c('Em', 'Emilio'), c('Vi', 'Vicenta', 'f', groups=['interior']), c('Ma', 'Marisa', 'f', groups=['interior']), c('Co', 'Concha', 'f', groups=['interior']),
    c('Pa', 'Paloma', 'f', groups=['exterior']), c('Be', 'Belén', 'f', groups=['interior']), c('Mu', 'Mauri', groups=['exterior']), c('Ro', 'Roberto', groups=['exterior'])],
    groups={'interior': {'label': 'Interior', 'only': 'interiores', 'one': 'un vecino de piso interior', 'many': 'los vecinos de pisos interiores', 'color': '#7a5ea8'}, 'exterior': {'label': 'Exterior', 'one': 'un vecino de piso exterior', 'many': 'los vecinos de pisos exteriores', 'color': '#3f8f7f'}},
    rooms='Portería, Patio de luces, Portal, Escalera, Rellano, Trastero, Azotea, Videoclub',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Patio de luces>'], 'group': 'interior'}],
    note='Regla pedida por Víctor: solo los pisos interiores dan al patio de luces, el «radio patio» de las cotillas. Juan Cuesta es el presidente de la comunidad y el marido de Paloma. Emilio es el portero: vive en la portería, sin etiqueta. No menciones números de piso salvo que Mauri vive en el 1.º B. Emilio, harto de horas extra, es el culpable.'),
case('cobrakai', 24, 2, 9, 'Cobra Kai', 'Sin piedad', 'el dojo Cobra Kai y el jardín de Miyagi-Do, la víspera del All Valley', 'Kr', 'Jo', [
    c('Jo', 'Johnny Lawrence', groups=['eagle']), c('Da', 'Daniel LaRusso', groups=['miyagi']), c('Mi', 'Miguel', groups=['eagle']), c('Ro', 'Robby', groups=['miyagi']), c('Sa', 'Sam', 'f', groups=['miyagi']),
    c('To', 'Tory', 'f', groups=['cobra']), c('Ha', 'Halcón', groups=['eagle']), c('Ch', 'Chozen', groups=['miyagi']), c('Kr', 'John Kreese', groups=['cobra'])],
    groups={'miyagi': {'label': 'Miyagi-Do', 'one': 'alguien de Miyagi-Do', 'many': 'los de Miyagi-Do', 'color': '#3c7a4f'}, 'cobra': {'label': 'Cobra Kai', 'one': 'alguien de Cobra Kai', 'many': 'los de Cobra Kai', 'color': '#111111'}, 'eagle': {'label': 'Colmillo de Águila', 'one': 'alguien de Colmillo de Águila', 'many': 'los de Colmillo de Águila', 'color': '#b23a3a'}},
    rooms='Dojo Cobra Kai, Jardín de Miyagi-Do, Dojo de Colmillo de Águila, Pabellón del All Valley, Concesionario LaRusso, Apartamento de Johnny, Instituto, Aparcamiento',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Jardín de Miyagi-Do>'], 'group': 'miyagi'}],
    note='Johnny, el alumno al que Kreese destrozó de joven, es el culpable.'),
case('bigbang', 25, 2, 9, 'The Big Bang Theory', 'Ese era su sitio', 'el edificio de Sheldon y Leonard en Pasadena', 'Sh', 'Be', [
    c('Le', 'Leonard', groups=['caltech']), c('Pe', 'Penny', 'f'), c('Ho', 'Howard', groups=['caltech']), c('Ra', 'Raj', groups=['caltech']), c('Am', 'Amy', 'f', groups=['caltech']), c('Be', 'Bernadette', 'f'),
    c('St', 'Stuart'), c('Kr', 'Barry Kripke', groups=['caltech']), c('Sh', 'Sheldon', groups=['caltech'])],
    groups={'caltech': {'label': 'Caltech', 'one': 'alguien de Caltech', 'many': 'los de Caltech', 'color': '#c2571a'}},
    rooms='Salón del 4A, Cuarto de Sheldon, Piso de Penny, Escalera, Ascensor averiado, Laboratorio de Caltech, Tienda de cómics, Cheesecake Factory',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Laboratorio de Caltech>'], 'group': 'caltech'}],
    note='Toc, toc, toc… Bernadette, la de la voz de miedo, es la culpable. El sitio de Sheldon en el sofá, objeto único con nombre propio.'),
case('regreso', 26, 2, 9, 'Regreso al futuro', 'Biff no llega a 1985', 'Hill Valley en 1955, la noche del baile', 'Bi', 'Ge', [
    c('Ma', 'Marty McFly', groups=['futuro']), c('Do', 'Doc Brown', groups=['futuro']), c('Ge', 'George McFly'), c('Lo', 'Lorraine', 'f'), c('Je', 'Jennifer', 'f', groups=['futuro']),
    c('St', 'Sr. Strickland', art='el'), c('Go', 'Goldie Wilson'), c('Ei', 'Einstein', nh=True, groups=['futuro']), c('Bi', 'Biff Tannen')],
    groups={'futuro': {'label': 'Del futuro', 'one': 'alguien del futuro', 'many': 'los que venían del futuro', 'color': '#2f6fb0'}},
    rooms='Gimnasio del instituto, Plaza del Ayuntamiento, Torre del reloj, Garaje de Doc, Cafetería de Lou, Casa de Lorraine, Aparcamiento, Rancho de los Dos Pinos',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Garaje de Doc>'], 'group': 'futuro'}],
    note='En el garaje de Doc está el DeLorean escondido: solo entran los que vienen del futuro. Einstein es el perro. George McFly, el pusilánime al que Biff lleva años pisoteando, por fin da el golpe.'),
]
# ---------------------------------------------------------------- Temporada 3 · Medio
C += [
case('dragonball2', 30, 3, 9, 'Dragon Ball', 'Los Juegos de Célula', 'el ring de los Juegos de Célula', 'Ce', 'MS', [
    c('G', 'Goku', portrait='dragonball/G'), c('V', 'Vegeta', portrait='dragonball/V'), c('Gh', 'Gohan', portrait='dragonball/Gh'), c('P', 'Piccolo', nh=True, portrait='dragonball/P'),
    c('K', 'Krilin', portrait='dragonball/K'), c('N', 'Número 18', 'f', portrait='dragonball/N'), c('Tr', 'Trunks'), c('MS', 'Mr. Satán'), c('Ce', 'Célula', nh=True)],
    rooms='Ring, Gradas, Kame House, Templo de Kami, Corporación Cápsula, Desierto rocoso, Bosque, Sala del Tiempo',
    note='En España, Célula (nunca Cell). Mr. Satán lleva años diciendo que derrotó a Célula: esta vez es verdad y nadie le cree.'),
case('friends2', 31, 3, 9, 'Friends', 'El de la muerte de Janice', 'la cena de Acción de Gracias en casa de Monica', 'Ja', 'M', [
    c('Ra', 'Rachel', 'f', portrait='friends/Ra'), c('M', 'Monica', 'f', portrait='friends/M'), c('P', 'Phoebe', 'f', portrait='friends/P'), c('Ro', 'Ross', portrait='friends/Ro'), c('C', 'Chandler', portrait='friends/C'),
    c('J', 'Joey', portrait='friends/J'), c('G', 'Gunther', portrait='friends/G'), c('Mk', 'Mike'), c('Ja', 'Janice', 'f', portrait='friends/Ja')],
    rooms='Cocina de Monica, Salón de Monica, Balcón, Apartamento de Joey y Chandler, Rellano, Terraza, Central Perk, Lavandería',
    rules=[{'t': 'emptyZones', 'n': 1}],
    note='Título al estilo de los episodios («El de…»). Monica, obsesa de su cena perfecta, es la culpable: la risa de Janice le arruinó el pavo.'),
case('jurassicw', 32, 3, 9, 'Jurassic World', 'Fuera del recinto', 'el parque Jurassic World', 'Ho', 'Bl', [
    c('Ow', 'Owen'), c('Cl', 'Claire', 'f'), c('Za', 'Zach'), c('Gr', 'Gray'), c('Ma', 'Masrani'), c('Wu', 'Dr. Wu', art='el'), c('Ba', 'Barry'), c('Bl', 'Blue', 'f', nh=True), c('Ho', 'Hoskins')],
    rooms='Sala de control, Recinto de la Indominus, Cercado de raptores, Valle de la girosfera, Laguna del Mosasaurio, Centro de visitantes, Laboratorio del Dr. Wu, Helipuerto',
    note='Blue es la velocirraptor: Hoskins quería convertirla en arma.'),
case('office2', 33, 3, 9, 'The Office', 'Feliz Navidad, Packer', 'la fiesta de Navidad de Dunder Mifflin', 'TP', 'Ph', [
    c('M', 'Michael', portrait='office/M'), c('D', 'Dwight', portrait='office/D'), c('J', 'Jim', portrait='office/J'), c('P', 'Pam', 'f', portrait='office/P'), c('A', 'Angela', 'f', portrait='office/A'),
    c('K', 'Kevin', portrait='office/K'), c('St', 'Stanley'), c('Ph', 'Phyllis', 'f'), c('TP', 'Todd Packer')],
    rooms='Sala de reuniones, Zona de ventas, Oficina de Michael, Cocina, Almacén, Aparcamiento, Recepción, Contabilidad',
    note='Phyllis, la dulce Phyllis, es la culpable: Packer llevaba años soltándole barbaridades.'),
case('peaky2', 34, 3, 9, 'Peaky Blinders', 'La Mano Negra', 'Small Heath durante la guerra con los Changretta', 'Lu', 'P', [
    c('T', 'Tommy Shelby', portrait='peaky/T'), c('A', 'Arthur Shelby', portrait='peaky/A'), c('P', 'Polly Gray', 'f', portrait='peaky/P'), c('Ad', 'Ada Shelby', 'f', portrait='peaky/Ad'), c('M', 'Michael Gray', portrait='peaky/M'),
    c('Al', 'Alfie Solomons', portrait='peaky/Al'), c('Ab', 'Aberama Gold'), c('Li', 'Lizzie', 'f'), c('Lu', 'Luca Changretta')],
    rooms='The Garrison, Casa de apuestas, Arrow House, Destilería de Alfie, Muelle del canal, Iglesia, Fundición, Establos',
    note='Luca Changretta manda notas con la Mano Negra a toda la familia. Polly, la que nunca se rinde, es la culpable.'),
case('indiana', 35, 3, 9, 'Indiana Jones', '¿Por qué tenían que ser serpientes?', 'la excavación de Tanis, en Egipto', 'Be', 'Ma', [
    c('In', 'Indiana Jones'), c('Ma', 'Marion', 'f'), c('Sa', 'Sallah'), c('MB', 'Marcus Brody'), c('He', 'Henry Jones'), c('Ta', 'Tapón'), c('Wi', 'Willie', 'f'), c('To', 'Mayor Toht', art='el'), c('Be', 'Belloq')],
    rooms='Pozo de las Almas, Campamento, Tienda de Belloq, Excavación, Sala del mapa, Mercado de El Cairo, Casa de Sallah, Pista de aterrizaje',
    rules=[{'t': 'zoneCount', 'room': '<Pozo de las Almas>', 'n': 0}],
    note='Nadie baja al Pozo de las Almas: está lleno de serpientes. Marion, a la que Belloq tuvo secuestrada, es la culpable. Tapón es Short Round en España. Sin nazis explícitos: Toht es el «mayor Toht» y basta.'),
case('punales', 36, 3, 9, 'Puñales por la espalda', 'Feliz cumpleaños, Harlan', 'la mansión Thrombey', 'Ha', 'Jo', [
    c('BB', 'Benoit Blanc'), c('Ma', 'Marta', 'f'), c('Ra', 'Ransom'), c('Li', 'Linda', 'f'), c('Ri', 'Richard'), c('Wa', 'Walt'), c('Jo', 'Joni', 'f'), c('Me', 'Meg', 'f'), c('Ha', 'Harlan Thrombey')],
    rooms='Estudio de Harlan, Salón, Biblioteca, Cocina, Invernadero, Desván, Pasadizo secreto, Jardín',
    note='La noche de su 85 cumpleaños. No reproduzcas la solución de la película: aquí la culpable es Joni, la nuera a la que Harlan pilló cobrando dos veces la matrícula de Meg.'),
case('titanic', 37, 3, 9, 'Titanic', 'El corazón del océano', 'el Titanic, la noche del 14 de abril de 1912', 'Ca', 'Ro', [
    c('Ja', 'Jack Dawson', groups=['tercera']), c('Ro', 'Rose', 'f', groups=['primera']), c('Ru', 'Ruth', 'f', groups=['primera']), c('Mo', 'Molly Brown', 'f', groups=['primera']), c('Lo', 'Lovejoy', groups=['primera']),
    c('An', 'Thomas Andrews', groups=['primera']), c('Sm', 'Capitán Smith', art='el', groups=['tripulacion']), c('Fa', 'Fabrizio', groups=['tercera']), c('Ca', 'Cal Hockley', groups=['primera'])],
    groups={'primera': {'label': '1.ª clase', 'one': 'un pasajero de primera', 'many': 'los pasajeros de primera', 'color': '#a8862c'}, 'tercera': {'label': '3.ª clase', 'one': 'un pasajero de tercera', 'many': 'los pasajeros de tercera', 'color': '#3f6f8f'}, 'tripulacion': {'label': 'Tripulación', 'one': 'alguien de la tripulación', 'many': 'los de la tripulación', 'color': '#333a5c'}},
    rooms='Cubierta de primera, Gran Escalera, Comedor de primera, Camarote de Rose, Fiesta de tercera, Bodega de los coches, Puente de mando, Cubierta de botes',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Cubierta de primera>', '<Comedor de primera>'], 'group': 'primera'}, {'t': 'zoneOnly', 'rooms': ['<Puente de mando>'], 'group': 'tripulacion'}],
    note='Lovejoy es el ayuda de cámara de Cal, viaja en primera. Rose, harta de un matrimonio a la fuerza, es la culpable. Sin tono de tragedia real: nada de víctimas reales del naufragio, solo el crimen de ficción y la mesa de Cal.'),
case('bridgerton', 38, 3, 9, 'Los Bridgerton', 'Queridos lectores', 'el baile de lady Danbury', 'Cr', 'Pe', [
    c('Da', 'Daphne', 'f', groups=['bridgerton']), c('Si', 'Simon'), c('An', 'Anthony', groups=['bridgerton']), c('El', 'Eloise', 'f', groups=['bridgerton']), c('Pe', 'Penelope', 'f'), c('Co', 'Colin', groups=['bridgerton']),
    c('LD', 'Lady Danbury', 'f'), c('RC', 'Reina Charlotte', 'f', art='la'), c('Cr', 'Cressida Cowper', 'f')],
    groups={'bridgerton': {'label': 'Bridgerton', 'one': 'un Bridgerton', 'many': 'los Bridgerton', 'color': '#5b7fb8'}},
    rooms='Salón de baile, Terraza, Jardín, Biblioteca, Sala de cartas, Comedor, Invernadero, Salita de los Bridgerton',
    rules=[{'t': 'zoneCount', 'room': '<Salón de baile>', 'n': 3}, {'t': 'zoneOnly', 'rooms': ['<Salita de los Bridgerton>'], 'group': 'bridgerton'}],
    note='El epílogo puede estar escrito como una columna de lady Whistledown. Penelope, a la que Cressida humilló durante años, es la culpable.'),
case('orgullo', 39, 3, 9, 'Orgullo y prejuicio', 'Una verdad universalmente reconocida', 'el baile de Netherfield', 'Wi', 'Ly', [
    c('El', 'Elizabeth Bennet', 'f'), c('Da', 'Sr. Darcy', art='el'), c('Ja', 'Jane Bennet', 'f'), c('Bi', 'Sr. Bingley', art='el'), c('Ly', 'Lydia Bennet', 'f'), c('Ca', 'Caroline Bingley', 'f'),
    c('Co', 'Sr. Collins', art='el'), c('LC', 'Lady Catherine', 'f'), c('Wi', 'Sr. Wickham', art='el')],
    rooms='Salón de baile, Biblioteca, Comedor, Sala de música, Jardines, Galería, Escalera principal, Invernadero',
    rules=[{'t': 'noZoneWith', 'n': 1}],
    note='Decoro ante todo: en ninguna zona había una sola persona. Lydia, que acaba de descubrir que Wickham solo iba a por dinero, es la culpable.'),
]
# ---------------------------------------------------------------- Temporada 4 · Difícil
C += [
case('breaking2', 42, 4, 10, 'Breaking Bad', 'Tuco no vuelve a casa', 'el escondite de Tuco en el desierto', 'Tu', 'G', [
    c('W', 'Walter White', portrait='breaking/W'), c('J', 'Jesse Pinkman', portrait='breaking/J'), c('Sk', 'Skyler', 'f', portrait='breaking/Sk'), c('Ha', 'Hank', portrait='breaking/Ha'), c('Sa', 'Saul Goodman', portrait='breaking/Sa'),
    c('M', 'Mike', portrait='breaking/M'), c('He', 'Héctor Salamanca', portrait='breaking/He'), c('Mr', 'Marie Schrader', 'f', portrait='breaking/Mr'), c('G', 'Gus Fring', portrait='breaking/G'), c('Tu', 'Tuco Salamanca')],
    rooms='Casa de Tuco, Cobertizo, Caravana, Desierto, Autolavado A1A, Los Pollos Hermanos, Despacho de Saul, Casa de los White, Garaje de Hank',
    note='Gus Fring, que tiene una cuenta pendiente con todos los Salamanca, es el culpable.'),
case('miercoles2', 43, 4, 10, 'Miércoles', 'El director nuevo', 'Nevermore, en el segundo curso', 'Do', 'Ag', [
    c('M', 'Miércoles', 'f', portrait='miercoles/M'), c('E', 'Enid', 'f', portrait='miercoles/E'), c('T', 'Tyler', portrait='miercoles/T'), c('B', 'Bianca', 'f', portrait='miercoles/B'), c('C', 'Cosa', nh=True, portrait='miercoles/C'),
    c('Pu', 'Pugsley'), c('Mo', 'Morticia', 'f'), c('Go', 'Gómez'), c('Ag', 'Agnes', 'f'), c('Do', 'Director Dort', art='el')],
    rooms='Despacho del director, Cripta, Comedor, Ophelia Hall, Biblioteca, Bosque, Cementerio, Hospital Willow Hill, Patio de Nevermore',
    note='Barry Dort, el director que quiere convertir Nevermore en un negocio. Agnes, la admiradora de Miércoles que puede volverse invisible, es la culpable.'),
case('vikingos2', 44, 4, 10, 'Vikingos', 'La corte de Wessex', 'la villa real de Wessex', 'E', 'Ju', [
    c('R', 'Ragnar', portrait='vikingos/R', groups=['vikingos']), c('L', 'Lagertha', 'f', portrait='vikingos/L', groups=['vikingos']), c('Ro', 'Rollo', portrait='vikingos/Ro', groups=['vikingos']), c('F', 'Floki', portrait='vikingos/F', groups=['vikingos']),
    c('B', 'Bjorn', portrait='vikingos/B', groups=['vikingos']), c('I', 'Ivar', portrait='vikingos/I', groups=['vikingos']), c('Ju', 'Judith', 'f', groups=['sajones']), c('Ae', 'Aethelwulf', groups=['sajones']), c('Kw', 'Kwenthrith', 'f', groups=['sajones']), c('E', 'Rey Ecbert', art='el', portrait='vikingos/E', groups=['sajones'])],
    groups={'vikingos': {'label': 'Vikingo', 'one': 'un vikingo', 'many': 'los vikingos', 'color': '#6b4a2f'}, 'sajones': {'label': 'Sajón', 'only': 'sajones', 'one': 'un sajón', 'many': 'los sajones', 'color': '#7a2f4a'}},
    rooms='Sala del trono, Baños romanos, Scriptorium, Capilla, Jardines, Campamento vikingo, Prisión, Aposentos de Judith, Bosque',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Capilla>'], 'group': 'sajones'}],
    note='Judith, la nuera a la que Ecbert manipuló durante años, es la culpable.'),
case('potter2', 45, 4, 10, 'Harry Potter', 'Hem, hem', 'el Ministerio de Magia', 'Um', 'M', [
    c('H', 'Harry', portrait='potter/H'), c('He', 'Hermione', 'f', portrait='potter/He'), c('R', 'Ron', portrait='potter/R'), c('M', 'McGonagall', 'f', portrait='potter/M'), c('Hg', 'Hagrid', portrait='potter/Hg'),
    c('Lu', 'Luna', 'f'), c('Ne', 'Neville'), c('Si', 'Sirius'), c('LM', 'Lucius Malfoy'), c('Um', 'Dolores Umbridge', 'f')],
    rooms='Atrio, Despacho de Umbridge, Departamento de Misterios, Sala de las Profecías, Sala del Velo, Tribunal número 10, Sala de los cerebros, Ascensores, Chimeneas',
    note='La profesora McGonagall, que aguantó a Umbridge todo un curso a base de ironía, es la culpable.'),
case('marvel2', 46, 4, 10, 'Marvel', 'Sin hilos', 'Sokovia, la ciudad flotante', 'Ul', 'BE', [
    c('I', 'Iron Man', portrait='marvel/I'), c('C', 'Capitán América', art='el', portrait='marvel/C'), c('T', 'Thor', portrait='marvel/T'), c('H', 'Hulk', portrait='marvel/H'), c('V', 'Viuda Negra', 'f', art='la', portrait='marvel/V'),
    c('O', 'Ojo de Halcón', portrait='marvel/O'), c('BE', 'Bruja Escarlata', 'f', art='la'), c('Qs', 'Mercurio'), c('Vi', 'Visión', nh=True), c('Ul', 'Ultrón', nh=True)],
    rooms='Iglesia de Sokovia, Plaza mayor, Núcleo de la ciudad, Fábrica, Calles en ruinas, Helitransporte, Puente, Búnker, Torre',
    note='En España es Ultrón, con tilde. La Bruja Escarlata venga a su hermano y a Sokovia.'),
case('hobbit', 47, 4, 10, 'El Señor de los Anillos', 'Un tesoro sin dueño', 'la Montaña Solitaria, en El Hobbit', 'Sm', 'Bi', [
    c('Bi', 'Bilbo'), c('G', 'Gandalf', portrait='anillos/G'), c('Th', 'Thorin', groups=['enanos']), c('Ba', 'Balin', groups=['enanos']), c('Ki', 'Kili', groups=['enanos']), c('Br', 'Bardo'), c('Ta', 'Tauriel', 'f'),
    c('Tr', 'Thranduil'), c('L', 'Legolas', portrait='anillos/L'), c('Sm', 'Smaug', nh=True)],
    groups={'enanos': {'label': 'Enano', 'only': 'enanos', 'one': 'un enano', 'many': 'los enanos', 'color': '#7a5a2a'}},
    rooms='Sala del Tesoro, Sala del Trono, Forjas, Puerta de Erebor, Valle, Ciudad del Lago, Bosque Negro, Galerías, Puerta secreta',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Sala del Trono>'], 'group': 'enanos'}],
    note='Bilbo, el saqueador, es el culpable: nadie sospecha de un hobbit.'),
case('killbill', 48, 4, 10, 'Kill Bill', 'Volumen 3', 'la hacienda de Bill en México', 'Bi', 'El', [
    c('No', 'La Novia', 'f'), c('OR', 'O-Ren Ishii', 'f'), c('El', 'Elle Driver', 'f'), c('Bu', 'Budd'), c('Ve', 'Vernita Green', 'f'), c('Go', 'Gogo Yubari', 'f'), c('HH', 'Hattori Hanzo'), c('PM', 'Pai Mei'), c('So', 'Sofie Fatale', 'f'), c('Bi', 'Bill')],
    rooms='Salón de la hacienda, Terraza, Sala de las espadas, Bodega, Capilla de Two Pines, Casa de las Hojas Azules, Caravana de Budd, Templo de Pai Mei, Jardín nevado',
    note='Sin violencia gráfica. No se menciona a la hija de la Novia. Elle Driver, a la que Bill siempre prefirió usar y dejar, es la culpable.'),
case('hambre', 49, 4, 10, 'Los Juegos del Hambre', 'Que la suerte esté de vuestra parte', 'el Capitolio, la noche de la gran fiesta', 'Sn', 'Ci', [
    c('Ka', 'Katniss', 'f', groups=['d12']), c('Pe', 'Peeta', groups=['d12']), c('Ga', 'Gale', groups=['d12']), c('Ha', 'Haymitch', groups=['d12']), c('Ef', 'Effie', 'f', groups=['capitolio']), c('Ci', 'Cinna', groups=['capitolio']),
    c('Fi', 'Finnick'), c('Jo', 'Johanna', 'f'), c('Co', 'Presidenta Coin', 'f', art='la'), c('Sn', 'Presidente Snow', art='el', groups=['capitolio'])],
    groups={'d12': {'label': 'Distrito 12', 'one': 'alguien del Distrito 12', 'many': 'los del Distrito 12', 'color': '#5c5c5c'}, 'capitolio': {'label': 'Capitolio', 'one': 'alguien del Capitolio', 'many': 'los del Capitolio', 'color': '#a33b8a'}},
    rooms='Planta del Distrito 12, Centro de Entrenamiento, Mansión presidencial, Rosaleda de Snow, Salón de banquetes, Plató de Caesar, Tren, Azotea, Taller de Cinna',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Planta del Distrito 12>'], 'group': 'd12'}, {'t': 'zoneOnly', 'rooms': ['<Rosaleda de Snow>'], 'group': 'capitolio'}],
    note='Cinna, el estilista callado, es el culpable: su vestido de sinsajo era solo el principio. Sin niños en peligro: nada de Prim ni de tributos menores.'),
case('theboys', 50, 4, 10, 'The Boys', 'Patriota, con leche', 'la Torre Vought', 'Pa', 'RM', [
    c('Bu', 'Butcher', groups=['chicos']), c('Hu', 'Hughie', groups=['chicos']), c('Ki', 'Kimiko', 'f', groups=['chicos']), c('Fr', 'Frenchie', groups=['chicos']), c('MM', 'M. M.', groups=['chicos']),
    c('LE', 'Luz Estelar', 'f', groups=['siete']), c('RM', 'Reina Maeve', 'f', groups=['siete']), c('Pr', 'Profundo', groups=['siete']), c('TA', 'Tren-A', groups=['siete']), c('Pa', 'Patriota', groups=['siete'])],
    groups={'chicos': {'label': 'Los Chicos', 'one': 'uno de los Chicos', 'many': 'los Chicos', 'color': '#3c3c3c'}, 'siete': {'label': 'Los Siete', 'one': 'uno de los Siete', 'many': 'los Siete', 'color': '#2b4fa8'}},
    rooms='Sala de los Siete, Despacho de Stan Edgar, Laboratorio del Compuesto V, Plató de Vought, Cafetería, Azotea, Escondite de los Chicos, Sala de prensa, Vestíbulo',
    rules=[{'t': 'groupsApart', 'a': 'chicos', 'b': 'siete'}, {'t': 'zoneOnly', 'rooms': ['<Sala de los Siete>'], 'group': 'siete'}],
    note='Los Chicos y los Siete nunca comparten zona. Como Patriota está a solas con su asesino, tiene que ser uno de los Siete: Reina Maeve. El móvil de Luz Estelar, Profundo y Tren-A no debe descartarlos. Humor negro sin gore.'),
case('oceans', 51, 4, 11, "Ocean's Eleven", 'La casa siempre gana', 'el casino Bellagio de Las Vegas', 'TB', 'Te', [
    c('Da', 'Danny Ocean'), c('Ru', 'Rusty'), c('Li', 'Linus'), c('Ba', 'Basher'), c('Sa', 'Saul'), c('Ye', 'Yen'), c('Lv', 'Livingston'), c('Fr', 'Frank'), c('Te', 'Tess', 'f'), c('TB', 'Terry Benedict')],
    rooms='Cámara acorazada, Casino, Sala de vigilancia, Fuentes del Bellagio, Despacho de Benedict, Pozo del ascensor, Galería de arte, Suite, Ring del MGM, Restaurante',
    rules=[{'t': 'zoneCount', 'room': '<Cámara acorazada>', 'n': 1}],
    note='Plano de 11×11: el acróbata Yen cabe en la cámara, pero ahí solo entra una persona. Tess, la mujer a la que Benedict trata como una obra de su colección, es la culpable.'),
case('dragon', 52, 4, 10, 'La casa del dragón', 'La danza de los dragones', 'la Fortaleza Roja, el día de la coronación', 'Cr', 'Al', [
    c('Rh', 'Rhaenyra', 'f', groups=['negros', 'targaryen']), c('Da', 'Daemon', groups=['negros', 'targaryen']), c('Ry', 'Rhaenys', 'f', groups=['negros', 'targaryen']), c('Co', 'Corlys', groups=['negros']), c('Al', 'Alicent', 'f', groups=['verdes']),
    c('Ot', 'Otto Hightower', groups=['verdes']), c('Ae', 'Aegon', groups=['verdes', 'targaryen']), c('Am', 'Aemond', groups=['verdes', 'targaryen']), c('He', 'Helaena', 'f', groups=['verdes', 'targaryen']), c('Cr', 'Ser Criston Cole', groups=['verdes'])],
    groups={'verdes': {'label': 'Verdes', 'one': 'un verde', 'many': 'los Verdes', 'color': '#2f7d4f'}, 'negros': {'label': 'Negros', 'one': 'un negro', 'many': 'los Negros', 'color': '#222222'}, 'targaryen': {'label': 'Targaryen', 'one': 'un Targaryen', 'many': 'los Targaryen', 'color': '#a3282c'}},
    rooms='Sala del Trono, Cámara del Consejo, Septo, Patio, Pozo Dragón, Bosque de dioses, Aposentos de la reina, Mazmorras, Murallas',
    rules=[{'t': 'groupsApart', 'a': 'verdes', 'b': 'negros'}, {'t': 'zoneOnly', 'rooms': ['<Pozo Dragón>'], 'group': 'targaryen'}],
    note='Verdes y Negros nunca comparten zona, y al Pozo Dragón solo bajan los Targaryen. Alicent, la reina, es la culpable (y por eso es uno de los Verdes).'),
]
# ---------------------------------------------------------------- Temporada 5 · Experto
C += [
case('batman2', 57, 5, 10, 'Batman', 'Reservado para el Pingüino', 'el Iceberg Lounge', 'P', 'DC', [
    c('B', 'Batman', portrait='batman/B'), c('G', 'Comisario Gordon', art='el', portrait='batman/G'), c('C', 'Catwoman', 'f', portrait='batman/C'), c('H', 'Harley Quinn', 'f', portrait='batman/H'), c('E', 'Enigma', portrait='batman/E'),
    c('DC', 'Dos Caras', portrait='batman/DC'), c('J', 'Joker', art='el', portrait='batman/J'), c('SF', 'Sr. Frío', art='el'), c('Ba', 'Bane'), c('P', 'Pingüino', art='el', portrait='batman/P')],
    rooms='Pista del club, Barra, Despacho del Pingüino, Cocina, Cámara frigorífica, Sala de juego, Escenario, Muelle trasero, Palcos',
    rules=[{'t': 'zoneCount', 'room': '<Cámara frigorífica>', 'n': 1}],
    note='En la cámara frigorífica solo aguanta una persona. Dos Caras lanzó su moneda, salió cara: es el culpable.'),
case('titanes2', 58, 5, 10, 'Ataque a los Titanes', 'La declaración de guerra', 'el festival de Liberio', 'WT', 'E', [
    c('E', 'Eren', portrait='titanes/E'), c('M', 'Mikasa', 'f', portrait='titanes/M'), c('A', 'Armin', portrait='titanes/A'), c('L', 'Levi', portrait='titanes/L'), c('R', 'Reiner', portrait='titanes/R'),
    c('Sa', 'Sasha', 'f', portrait='titanes/Sa'), c('Ze', 'Zeke'), c('Pi', 'Pieck', 'f'), c('Ha', 'Hange', 'f'), c('WT', 'Willy Tybur')],
    rooms='Escenario del festival, Plaza de Liberio, Gueto, Sótano de Reiner, Tejados, Hospital, Estación, Cuartel marleyano, Calles',
    note='Eren es el culpable. Sin gore: todo en tono de puzle.'),
case('tronos2', 59, 5, 10, 'Juego de Tronos', 'El caos es una escalera', 'Invernalia, la víspera de la Larga Noche', 'Me', 'S', [
    c('JN', 'Jon Nieve', groups=['stark', 'targaryen']), c('Da', 'Daenerys', 'f', groups=['targaryen']), c('S', 'Sansa', 'f', portrait='tronos/S', groups=['stark']), c('Ar', 'Arya', 'f', groups=['stark']), c('Br', 'Bran', groups=['stark']),
    c('T', 'Tyrion', portrait='tronos/T'), c('J', 'Jaime', portrait='tronos/J'), c('Bi', 'Brienne', 'f'), c('Dv', 'Ser Davos'), c('Me', 'Meñique', portrait='tronos/Me')],
    groups={'stark': {'label': 'Stark', 'one': 'un Stark', 'many': 'los Stark', 'color': '#5d6d7e'}, 'targaryen': {'label': 'Targaryen', 'one': 'un Targaryen', 'many': 'los Targaryen', 'color': '#a3282c'}},
    rooms='Gran Salón, Cripta, Guarida de los dragones, Bosque de dioses, Patio, Biblioteca, Forja, Torre Rota, Murallas',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Guarida de los dragones>'], 'group': 'targaryen'}, {'t': 'zoneOnly', 'rooms': ['<Cripta>'], 'group': 'stark'}],
    note='Regla pedida por Víctor: zonas solo para los Targaryen. Jon cuenta como Stark y como Targaryen: el giro de la serie entra en la regla. Sansa, manipulada por Meñique durante años, es la culpable.'),
case('arcane', 60, 5, 11, 'Arcane', 'La última gota', 'Piltover y Zaun', 'Si', 'Se', [
    c('Vi', 'Vi', 'f', groups=['zaun']), c('Ji', 'Jinx', 'f', groups=['zaun']), c('Ek', 'Ekko', groups=['zaun']), c('Se', 'Sevika', 'f', groups=['zaun']), c('Vk', 'Viktor', groups=['zaun']),
    c('Ca', 'Caitlyn', 'f', groups=['piltover']), c('Ja', 'Jayce', groups=['piltover']), c('He', 'Heimerdinger', nh=True, groups=['piltover']), c('Me', 'Mel', 'f', groups=['piltover']), c('Si', 'Silco', groups=['zaun'])],
    groups={'zaun': {'label': 'Zaun', 'one': 'alguien de Zaun', 'many': 'los de Zaun', 'color': '#2e8f7a'}, 'piltover': {'label': 'Piltover', 'one': 'alguien de Piltover', 'many': 'los de Piltover', 'color': '#b08a2e'}},
    rooms='Sala del Consejo, Laboratorio de Jayce, Academia, Puente del Progreso, La Última Gota, Fábrica de brillo, Vertedero de Zaun, Escondite de Jinx, Mina, Calles de Piltover',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Sala del Consejo>', '<Academia>'], 'group': 'piltover'}, {'t': 'zoneOnly', 'rooms': ['<Fábrica de brillo>'], 'group': 'zaun'}],
    note='Plano de 11×11. Sevika, la mano derecha de Silco que perdió un brazo por él, es la culpable.'),
case('pulp', 61, 5, 10, 'Pulp Fiction', 'Un masaje en los pies', "el Jack Rabbit Slim's", 'MW', 'Mi', [
    c('Vi', 'Vincent Vega'), c('Ju', 'Jules'), c('Mi', 'Mia Wallace', 'f'), c('Bu', 'Butch'), c('Fa', 'Fabienne', 'f'), c('Lo', 'Sr. Lobo', art='el'), c('La', 'Lance'), c('Ca', 'Calabaza'), c('Co', 'Conejita', 'f'), c('MW', 'Marsellus Wallace')],
    rooms="Pista de baile, Reservados de coche, Barra, Cocina, Almacén, Baños, Aparcamiento, Tienda de empeños, Cafetería",
    rules=[{'t': 'emptyZones', 'n': 1}],
    note='Mia Wallace es la culpable. Tono negro y absurdo, sin insultos ni drogas explícitas. Se mete un maletín brillante como objeto único.'),
case('whitelotus', 62, 5, 11, 'The White Lotus', 'Se ruega no molestar', 'el hotel White Lotus de Hawái', 'Sh', 'Ar', [
    c('Ar', 'Armond', groups=['empleados']), c('Be', 'Belinda', 'f', groups=['empleados']), c('Ta', 'Tanya', 'f', groups=['huespedes']), c('Ra', 'Rachel', 'f', groups=['huespedes']), c('Ni', 'Nicole', 'f', groups=['huespedes']),
    c('Ma', 'Mark', groups=['huespedes']), c('Ol', 'Olivia', 'f', groups=['huespedes']), c('Pa', 'Paula', 'f', groups=['huespedes']), c('Qu', 'Quinn', groups=['huespedes']), c('Sh', 'Shane', groups=['huespedes'])],
    groups={'empleados': {'label': 'Empleado', 'only': 'empleados', 'one': 'un empleado', 'many': 'los empleados', 'color': '#2d7f7a'}, 'huespedes': {'label': 'Huésped', 'only': 'huéspedes', 'one': 'un huésped', 'many': 'los huéspedes', 'color': '#c2703d'}},
    rooms='Suite Piña, Recepción, Oficina del gerente, Spa, Restaurante, Playa, Piscina, Muelle, Bar, Jardín tropical',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Oficina del gerente>'], 'group': 'empleados'}, {'t': 'zoneCount', 'room': '<Suite Piña>', 'n': 0}],
    note='Plano de 11×11. Armond, el gerente al que Shane hizo la vida imposible por una suite, es el culpable: la serie, al revés. Sin el detalle escatológico.'),
case('odisea', 63, 5, 11, 'La Odisea', 'El último pretendiente', 'el palacio de Odiseo en Ítaca', 'An', 'Pe', [
    c('Od', 'Odiseo'), c('Pe', 'Penélope', 'f'), c('Te', 'Telémaco'), c('At', 'Atenea', 'f', nh=True), c('Eu', 'Eumeo'), c('Er', 'Euriclea', 'f'), c('Em', 'Eurímaco', groups=['pretendientes']), c('Ml', 'Melantio'),
    c('Ar', 'Argos', nh=True), c('An', 'Antínoo', groups=['pretendientes'])],
    groups={'pretendientes': {'label': 'Pretendiente', 'one': 'un pretendiente', 'many': 'los pretendientes', 'color': '#8f3d3d'}},
    rooms='Gran Salón, Aposentos de Penélope, Telar, Patio, Cocinas, Armería, Pocilga de Eumeo, Templo de Atenea, Puerto, Olivar',
    rules=[{'t': 'zoneCount', 'room': '<Aposentos de Penélope>', 'n': 1}],
    note='Plano de 11×11 (película de Nolan de 2026, a partir de Homero). Argos es el perro; Atenea, disfrazada de Mentor. Penélope, que lleva veinte años tejiendo y destejiendo, es la culpable. Melantio va con los pretendientes.'),
case('edaddorada', 64, 5, 10, 'La edad dorada', 'Sin invitación', 'la mansión Russell en la Quinta Avenida', 'Tu', 'Be', [
    c('Be', 'Bertha Russell', 'f'), c('Ge', 'George Russell'), c('Gl', 'Gladys', 'f'), c('Ag', 'Agnes', 'f'), c('Ad', 'Ada', 'f'), c('Ma', 'Marian', 'f'), c('Pe', 'Peggy', 'f'),
    c('Ch', 'Sr. Church', art='el', groups=['servicio']), c('Ba', 'Sra. Bauer', 'f', art='la', groups=['servicio']), c('Tu', 'Turner', 'f')],
    groups={'servicio': {'label': 'Servicio', 'one': 'alguien del servicio', 'many': 'los del servicio', 'color': '#55606e'}},
    rooms='Salón de baile, Comedor, Cocinas, Escalera de servicio, Biblioteca, Recibidor, Invernadero, Casa de Agnes, Tocador de Bertha',
    rules=[{'t': 'zoneOnly', 'rooms': ['<Cocinas>', '<Escalera de servicio>'], 'group': 'servicio'}],
    note='Turner, la antigua doncella de Bertha que volvió casada y con ganas de hundirla. Bertha Russell es la culpable. Tanto Bertha como el resto saben quién es Turner: es la invitada que nadie invitó.'),
]

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json.dump(C, open(os.path.join(root, 'art', 'ampliacion.json'), 'w'), ensure_ascii=False, indent=1)
n = sum(len(x['cast']) for x in C)
new = sum(1 for x in C for ch in x['cast'] if 'portrait' not in ch)
print(len(C), 'casos,', n, 'personajes,', new, 'retratos nuevos')
for x in C:
    assert x['victim'] in [c['id'] for c in x['cast']], x['id']
    assert x['murderer'] in [c['id'] for c in x['cast']], x['id']
    tags = [c['tag'] for c in x['cast']]
    assert len(set(tags)) == len(tags), x['id']
    assert all(len(t) <= 2 for t in tags), x['id']
    want = 9 if x['level'] <= 3 else 10
    assert len(x['cast']) == want, (x['id'], len(x['cast']))
print(sorted(x['num'] for x in C))
