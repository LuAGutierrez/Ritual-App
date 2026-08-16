export type JuegoId = 'eleccion' | 'verdad-o-reto' | 'ruleta-picante' | 'esto-o-aquello'

export interface JuegoInfo {
  id: JuegoId
  emoji: string
  titulo: string
  descripcion: string
  picante?: boolean
  tienePicante?: boolean
}

export const JUEGOS: JuegoInfo[] = [
  {
    id: 'eleccion',
    emoji: '💫',
    titulo: 'Elección',
    descripcion: 'Elijan en secreto y vean si coinciden.',
    tienePicante: true,
  },
  {
    id: 'verdad-o-reto',
    emoji: '🎲',
    titulo: 'Verdad o Reto',
    descripcion: 'El clásico, para animarse a más.',
    tienePicante: true,
  },
  {
    id: 'esto-o-aquello',
    emoji: '⚡',
    titulo: 'Esto o Aquello',
    descripcion: 'Rondas rápidas para conocerse mejor.',
    tienePicante: true,
  },
  {
    id: 'ruleta-picante',
    emoji: '🔥',
    titulo: 'Ruleta Picante',
    descripcion: 'Solo para parejas que se animan.',
    picante: true,
  },
]

export interface JuegoItem {
  texto: string
  picante?: boolean
}

export const VERDADES: JuegoItem[] = [
  { texto: '¿Cuál fue tu primera impresión de mí?' },
  { texto: '¿Qué es algo que nunca me dijiste por miedo a mi reacción?' },
  { texto: '¿Cuál es el recuerdo que más atesorás de nosotros?' },
  { texto: '¿Qué es lo que más te costó de adaptarte a estar en pareja?' },
  { texto: '¿Hay algo que te gustaría que hiciéramos más seguido?' },
  { texto: '¿Cuál fue el momento en que sentiste que esto iba en serio?' },
  { texto: '¿Qué inseguridad mía notaste pero nunca nombraste?' },
  { texto: '¿Qué es algo que admirás de mí y nunca me dijiste?' },
  { texto: '¿Con qué parte de vos sentís que todavía no me mostrás del todo?' },
  { texto: '¿Qué discusión nuestra te hizo pensar distinto después?' },
  { texto: '¿Qué es algo que te gustaría cambiar de cómo nos comunicamos?' },
  { texto: '¿Qué gesto mío te hace sentir más querido/a?' },
  { texto: '¿Cuál es la fantasía que más te cuesta admitir que tenés conmigo?', picante: true },
  { texto: '¿Qué parte de mi cuerpo te vuelve loco/a y nunca me lo dijiste así, directo?', picante: true },
  { texto: '¿Cuál fue el momento en que me desataste más deseo, sin que yo lo supiera?', picante: true },
  { texto: '¿Qué es algo que querés que te haga en la cama y todavía no me pediste?', picante: true },
  { texto: '¿Con qué recuerdo nuestro te excitás cuando pensás en nosotros?', picante: true },
  { texto: '¿Qué lugar fuera de la cama fantaseaste con hacerlo conmigo?', picante: true },
  { texto: '¿Qué es lo más atrevido que pensaste hacer conmigo y no te animaste?', picante: true },
  { texto: '¿Qué palabra o gesto mío te prende más en el momento?', picante: true },
]

export const RETOS: JuegoItem[] = [
  { texto: 'Dale un abrazo de 20 segundos sin hablar.' },
  { texto: 'Decile 3 cosas que te gustan de su cuerpo, mirándolo/a a los ojos.' },
  { texto: 'Bailen una canción lenta, aunque no haya música.' },
  { texto: 'Contale un secreto que nunca le contaste.' },
  { texto: 'Hacele un masaje de manos por 1 minuto.' },
  { texto: 'Imitalo/a durante 30 segundos.' },
  { texto: 'Decile la primera palabra que se te venga a la cabeza al mirarlo/a.' },
  { texto: 'Escribile un mensaje de audio diciendo por qué lo/la elegís hoy.' },
  { texto: 'Susurrale algo que te gustaría hacer juntos este mes.' },
  { texto: 'Dale un beso donde él/ella elija.' },
  { texto: 'Contale algo que te dio vergüenza de chico/a.' },
  { texto: 'Prometele algo que vas a cumplir esta semana.' },
  { texto: 'Besá a tu pareja donde vos elijas, sin avisar antes.', picante: true },
  { texto: 'Contale al oído qué te gustaría que pase esta noche.', picante: true },
  { texto: 'Sacale una prenda, despacio, sin apuro.', picante: true },
  { texto: 'Hacele un recorrido de besos desde el cuello hasta donde vos decidas parar.', picante: true },
  { texto: 'Guiá su mano hacia donde más te gusta que te toque.', picante: true },
  { texto: 'Describile en detalle una fantasía que tengas con él/ella.', picante: true },
  { texto: 'Mordé suavemente su labio antes de besarlo/a.', picante: true },
  { texto: 'Elegí una parte de su cuerpo y quedate ahí un minuto entero, sin palabras.', picante: true },
]

export interface EstoOAquelloPar {
  a: string
  b: string
  picante?: boolean
}

export const ESTO_O_AQUELLO: EstoOAquelloPar[] = [
  { a: 'Playa', b: 'Montaña' },
  { a: 'Noche de películas', b: 'Noche de fiesta' },
  { a: 'Desayuno en la cama', b: 'Cena a la luz de velas' },
  { a: 'Viajar sin plan', b: 'Viajar con itinerario' },
  { a: 'Mensajes todo el día', b: 'Una llamada larga' },
  { a: 'Dormir abrazados', b: 'Dormir con espacio' },
  { a: 'Sorpresas', b: 'Planes avisados' },
  { a: 'Cocinar juntos', b: 'Pedir comida y ver algo' },
  { a: 'Discutir y hablarlo ya', b: 'Enfriar la cabeza primero' },
  { a: 'Regalos', b: 'Palabras de afecto' },
  { a: 'Mudarse de ciudad', b: 'Quedarse cerca de la familia' },
  { a: 'Fiesta con amigos', b: 'Noche los dos solos' },
  { a: 'Besos lentos', b: 'Besos urgentes', picante: true },
  { a: 'Que te seduzcan', b: 'Seducir vos', picante: true },
  { a: 'Luz prendida', b: 'A oscuras', picante: true },
  { a: 'Ir despacio', b: 'Ir directo al grano', picante: true },
  { a: 'Que te sorprendan en la intimidad', b: 'Planear todo antes', picante: true },
  { a: 'Susurrar', b: 'No contenerse', picante: true },
  { a: 'Provocar con la mirada', b: 'Provocar con el cuerpo', picante: true },
  { a: 'Tierno', b: 'Intenso', picante: true },
]

export interface EleccionPrompt {
  a: string
  b: string
  premio: string
  picante?: boolean
}

export const ELECCION_PROMPTS: EleccionPrompt[] = [
  { a: 'Playa', b: 'Montaña', premio: 'Planeen juntos ese viaje esta semana, aunque sea de mentira.' },
  { a: 'Cine', b: 'Sillón con manta', premio: 'Elijan ahora mismo qué van a ver esta noche.' },
  { a: 'Sorpresa', b: 'Plan avisado', premio: 'Uno le prepara una sorpresa chiquita al otro esta semana.' },
  { a: 'Beso', b: 'Abrazo', premio: 'Dense el que eligieron, ahora.' },
  { a: 'Desayuno en la cama', b: 'Cena con velas', premio: 'El que lo propone, lo organiza este fin de semana.' },
  { a: 'Quedarse en casa', b: 'Salir a bailar', premio: 'La próxima salida la elige el que ganó esta ronda.' },
  { a: 'Mensaje de buenos días', b: 'Llamada antes de dormir', premio: 'A partir de hoy, lo hacen todos los días.' },
  { a: 'Hablar apenas pasa algo', b: 'Pensarlo antes de hablar', premio: 'Cuéntense cuál usaron la última vez que discutieron.' },
  { a: 'Regalos', b: 'Palabras', premio: 'Practíquenlo ahora: uno le regala un cumplido al otro.' },
  { a: 'Aventurero', b: 'Hogareño', premio: 'El que no coincide con su lado hoy, se anima un poco al del otro esta semana.' },
  { a: 'Dominar', b: 'Dejarse llevar', premio: 'Esta noche, el que ganó decide quién manda.', picante: true },
  { a: 'Provocar todo el día', b: 'Sorpresa directo a la noche', premio: 'El que ganó elige cómo empieza la noche.', picante: true },
  { a: 'Ducha juntos', b: 'Masaje juntos', premio: 'Háganlo esta semana, lo que hayan coincidido.', picante: true },
  { a: 'Ropa interior', b: 'Piel', premio: 'El que ganó elige qué se saca primero el otro esta noche.', picante: true },
  { a: 'Ir lento', b: 'Ir urgente', premio: 'Esta noche se juega a la velocidad que ganó.', picante: true },
  { a: 'Susurrarlo', b: 'Mostrarlo', premio: 'Cumplan la fantasía que coincidieron, cuando quieran esta semana.', picante: true },
]

export const RULETA_PICANTE: string[] = [
  'Besá a tu pareja en el cuello, despacio, por 15 segundos.',
  'Susurrale al oído tu fantasía favorita con ella/él.',
  'Sacate una prenda a elección de tu pareja.',
  'Decile, sin filtro, qué es lo que más te atrae de su cuerpo hoy.',
  'Dale un beso donde vos elijas, sin avisar dónde.',
  'Contale la vez que más lo/la deseaste este último mes.',
  'Hacele un masaje lento en la espalda, en silencio, por 2 minutos.',
  'Mostrale con un gesto (sin palabras) qué querés que haga.',
  'Decile una cosa que te gustaría probar juntos en la intimidad.',
  'Dejá que tu pareja elija tu próximo movimiento.',
  'Escribile un mensaje picante para que lo lea más tarde esta noche.',
  'Bailale una canción lenta, muy cerca, sin tocarse todavía.',
]
