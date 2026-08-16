-- ============================================================
-- Migración 026: mover el contenido de los juegos de lib/juegos.ts a tablas
--
-- Verdad o Reto, Esto o Aquello, Elección y Ruleta Picante tenían su
-- contenido hardcodeado en arrays de TypeScript -- agregar o ajustar una
-- consigna requería tocar código y redeployar. Rituales ya resuelve esto
-- con una tabla (`rituals`); acá se aplica el mismo patrón a los 4 juegos.
--
-- Mismo esquema de RLS que `rituals`: solo lectura para autenticados, sin
-- policy de insert/update/delete para el cliente (contenido gestionado por
-- migración/servicio, no por el usuario).
-- ============================================================

-- ─────────────────────────────────────────────
-- TABLA: verdad_o_reto_items
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verdad_o_reto_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modo        text NOT NULL CHECK (modo IN ('verdad', 'reto')),
  texto       text NOT NULL,
  picante     boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.verdad_o_reto_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verdad_o_reto_items_select_authenticated" ON public.verdad_o_reto_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- TABLA: esto_o_aquello_items
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.esto_o_aquello_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_a    text NOT NULL,
  option_b    text NOT NULL,
  picante     boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.esto_o_aquello_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esto_o_aquello_items_select_authenticated" ON public.esto_o_aquello_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- TABLA: eleccion_prompts
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eleccion_prompts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_a    text NOT NULL,
  option_b    text NOT NULL,
  premio      text NOT NULL,
  picante     boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.eleccion_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eleccion_prompts_select_authenticated" ON public.eleccion_prompts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- TABLA: ruleta_picante_items
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ruleta_picante_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto       text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.ruleta_picante_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ruleta_picante_items_select_authenticated" ON public.ruleta_picante_items
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ============================================================
-- SEED: contenido migrado tal cual de lib/juegos.ts
-- ============================================================

INSERT INTO public.verdad_o_reto_items (modo, texto, picante) VALUES
('verdad', '¿Cuál fue tu primera impresión de mí?', false),
('verdad', '¿Qué es algo que nunca me dijiste por miedo a mi reacción?', false),
('verdad', '¿Cuál es el recuerdo que más atesorás de nosotros?', false),
('verdad', '¿Qué es lo que más te costó de adaptarte a estar en pareja?', false),
('verdad', '¿Hay algo que te gustaría que hiciéramos más seguido?', false),
('verdad', '¿Cuál fue el momento en que sentiste que esto iba en serio?', false),
('verdad', '¿Qué inseguridad mía notaste pero nunca nombraste?', false),
('verdad', '¿Qué es algo que admirás de mí y nunca me dijiste?', false),
('verdad', '¿Con qué parte de vos sentís que todavía no me mostrás del todo?', false),
('verdad', '¿Qué discusión nuestra te hizo pensar distinto después?', false),
('verdad', '¿Qué es algo que te gustaría cambiar de cómo nos comunicamos?', false),
('verdad', '¿Qué gesto mío te hace sentir más querido/a?', false),
('verdad', '¿Cuál es la fantasía que más te cuesta admitir que tenés conmigo?', true),
('verdad', '¿Qué parte de mi cuerpo te vuelve loco/a y nunca me lo dijiste así, directo?', true),
('verdad', '¿Cuál fue el momento en que me desataste más deseo, sin que yo lo supiera?', true),
('verdad', '¿Qué es algo que querés que te haga en la cama y todavía no me pediste?', true),
('verdad', '¿Con qué recuerdo nuestro te excitás cuando pensás en nosotros?', true),
('verdad', '¿Qué lugar fuera de la cama fantaseaste con hacerlo conmigo?', true),
('verdad', '¿Qué es lo más atrevido que pensaste hacer conmigo y no te animaste?', true),
('verdad', '¿Qué palabra o gesto mío te prende más en el momento?', true),
('reto', 'Dale un abrazo de 20 segundos sin hablar.', false),
('reto', 'Decile 3 cosas que te gustan de su cuerpo, mirándolo/a a los ojos.', false),
('reto', 'Bailen una canción lenta, aunque no haya música.', false),
('reto', 'Contale un secreto que nunca le contaste.', false),
('reto', 'Hacele un masaje de manos por 1 minuto.', false),
('reto', 'Imitalo/a durante 30 segundos.', false),
('reto', 'Decile la primera palabra que se te venga a la cabeza al mirarlo/a.', false),
('reto', 'Escribile un mensaje de audio diciendo por qué lo/la elegís hoy.', false),
('reto', 'Susurrale algo que te gustaría hacer juntos este mes.', false),
('reto', 'Dale un beso donde él/ella elija.', false),
('reto', 'Contale algo que te dio vergüenza de chico/a.', false),
('reto', 'Prometele algo que vas a cumplir esta semana.', false),
('reto', 'Besá a tu pareja donde vos elijas, sin avisar antes.', true),
('reto', 'Contale al oído qué te gustaría que pase esta noche.', true),
('reto', 'Sacale una prenda, despacio, sin apuro.', true),
('reto', 'Hacele un recorrido de besos desde el cuello hasta donde vos decidas parar.', true),
('reto', 'Guiá su mano hacia donde más te gusta que te toque.', true),
('reto', 'Describile en detalle una fantasía que tengas con él/ella.', true),
('reto', 'Mordé suavemente su labio antes de besarlo/a.', true),
('reto', 'Elegí una parte de su cuerpo y quedate ahí un minuto entero, sin palabras.', true);

INSERT INTO public.esto_o_aquello_items (option_a, option_b, picante) VALUES
('Playa', 'Montaña', false),
('Noche de películas', 'Noche de fiesta', false),
('Desayuno en la cama', 'Cena a la luz de velas', false),
('Viajar sin plan', 'Viajar con itinerario', false),
('Mensajes todo el día', 'Una llamada larga', false),
('Dormir abrazados', 'Dormir con espacio', false),
('Sorpresas', 'Planes avisados', false),
('Cocinar juntos', 'Pedir comida y ver algo', false),
('Discutir y hablarlo ya', 'Enfriar la cabeza primero', false),
('Regalos', 'Palabras de afecto', false),
('Mudarse de ciudad', 'Quedarse cerca de la familia', false),
('Fiesta con amigos', 'Noche los dos solos', false),
('Besos lentos', 'Besos urgentes', true),
('Que te seduzcan', 'Seducir vos', true),
('Luz prendida', 'A oscuras', true),
('Ir despacio', 'Ir directo al grano', true),
('Que te sorprendan en la intimidad', 'Planear todo antes', true),
('Susurrar', 'No contenerse', true),
('Provocar con la mirada', 'Provocar con el cuerpo', true),
('Tierno', 'Intenso', true);

INSERT INTO public.eleccion_prompts (option_a, option_b, premio, picante) VALUES
('Playa', 'Montaña', 'Planeen juntos ese viaje esta semana, aunque sea de mentira.', false),
('Cine', 'Sillón con manta', 'Elijan ahora mismo qué van a ver esta noche.', false),
('Sorpresa', 'Plan avisado', 'Uno le prepara una sorpresa chiquita al otro esta semana.', false),
('Beso', 'Abrazo', 'Dense el que eligieron, ahora.', false),
('Desayuno en la cama', 'Cena con velas', 'El que lo propone, lo organiza este fin de semana.', false),
('Quedarse en casa', 'Salir a bailar', 'La próxima salida la elige el que ganó esta ronda.', false),
('Mensaje de buenos días', 'Llamada antes de dormir', 'A partir de hoy, lo hacen todos los días.', false),
('Hablar apenas pasa algo', 'Pensarlo antes de hablar', 'Cuéntense cuál usaron la última vez que discutieron.', false),
('Regalos', 'Palabras', 'Practíquenlo ahora: uno le regala un cumplido al otro.', false),
('Aventurero', 'Hogareño', 'El que no coincide con su lado hoy, se anima un poco al del otro esta semana.', false),
('Dominar', 'Dejarse llevar', 'Esta noche, el que ganó decide quién manda.', true),
('Provocar todo el día', 'Sorpresa directo a la noche', 'El que ganó elige cómo empieza la noche.', true),
('Ducha juntos', 'Masaje juntos', 'Háganlo esta semana, lo que hayan coincidido.', true),
('Ropa interior', 'Piel', 'El que ganó elige qué se saca primero el otro esta noche.', true),
('Ir lento', 'Ir urgente', 'Esta noche se juega a la velocidad que ganó.', true),
('Susurrarlo', 'Mostrarlo', 'Cumplan la fantasía que coincidieron, cuando quieran esta semana.', true);

INSERT INTO public.ruleta_picante_items (texto) VALUES
('Besá a tu pareja en el cuello, despacio, por 15 segundos.'),
('Susurrale al oído tu fantasía favorita con ella/él.'),
('Sacate una prenda a elección de tu pareja.'),
('Decile, sin filtro, qué es lo que más te atrae de su cuerpo hoy.'),
('Dale un beso donde vos elijas, sin avisar dónde.'),
('Contale la vez que más lo/la deseaste este último mes.'),
('Hacele un masaje lento en la espalda, en silencio, por 2 minutos.'),
('Mostrale con un gesto (sin palabras) qué querés que haga.'),
('Decile una cosa que te gustaría probar juntos en la intimidad.'),
('Dejá que tu pareja elija tu próximo movimiento.'),
('Escribile un mensaje picante para que lo lea más tarde esta noche.'),
('Bailale una canción lenta, muy cerca, sin tocarse todavía.');
