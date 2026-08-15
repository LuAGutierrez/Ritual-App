export type JuegoId = 'eleccion' | 'verdad-o-reto' | 'ruleta-picante' | 'esto-o-aquello'

export interface JuegoInfo {
  id: JuegoId
  emoji: string
  titulo: string
  descripcion: string
  picante?: boolean
}

export const JUEGOS: JuegoInfo[] = [
  {
    id: 'eleccion',
    emoji: '💫',
    titulo: 'Elección',
    descripcion: 'Elijan en secreto y vean si coinciden.',
  },
  {
    id: 'verdad-o-reto',
    emoji: '🎲',
    titulo: 'Verdad o Reto',
    descripcion: 'El clásico, para animarse a más.',
  },
  {
    id: 'esto-o-aquello',
    emoji: '⚡',
    titulo: 'Esto o Aquello',
    descripcion: 'Rondas rápidas para conocerse mejor.',
  },
  {
    id: 'ruleta-picante',
    emoji: '🔥',
    titulo: 'Ruleta Picante',
    descripcion: 'Solo para parejas que se animan.',
    picante: true,
  },
]

export const VERDADES: string[] = [
  '¿Cuál fue tu primera impresión de mí?',
  '¿Qué es algo que nunca me dijiste por miedo a mi reacción?',
  '¿Cuál es el recuerdo que más atesorás de nosotros?',
  '¿Qué es lo que más te costó de adaptarte a estar en pareja?',
  '¿Hay algo que te gustaría que hiciéramos más seguido?',
  '¿Cuál fue el momento en que sentiste que esto iba en serio?',
  '¿Qué inseguridad mía notaste pero nunca nombraste?',
  '¿Qué es algo que admirás de mí y nunca me dijiste?',
  '¿Con qué parte de vos sentís que todavía no me mostrás del todo?',
  '¿Qué discusión nuestra te hizo pensar distinto después?',
  '¿Qué es algo que te gustaría cambiar de cómo nos comunicamos?',
  '¿Qué gesto mío te hace sentir más querido/a?',
]

export const RETOS: string[] = [
  'Dale un abrazo de 20 segundos sin hablar.',
  'Decile 3 cosas que te gustan de su cuerpo, mirándolo/a a los ojos.',
  'Bailen una canción lenta, aunque no haya música.',
  'Contale un secreto que nunca le contaste.',
  'Hacele un masaje de manos por 1 minuto.',
  'Imitalo/a durante 30 segundos.',
  'Decile la primera palabra que se te venga a la cabeza al mirarlo/a.',
  'Escribile un mensaje de audio diciendo por qué lo/la elegís hoy.',
  'Susurrale algo que te gustaría hacer juntos este mes.',
  'Dale un beso donde él/ella elija.',
  'Contale algo que te dio vergüenza de chico/a.',
  'Prometele algo que vas a cumplir esta semana.',
]

export interface EstoOAquelloPar {
  a: string
  b: string
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
]

export interface EleccionPrompt {
  a: string
  b: string
  premio: string
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
