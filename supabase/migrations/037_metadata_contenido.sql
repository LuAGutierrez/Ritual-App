-- ============================================================
-- Migración 037: metadata rica de contenido (§1/§8 del pedido de
-- evolución de juegos) -- intensidad y categoria en las tablas que
-- todavía no las tenían, más picante en quien_de_los_dos_items.
--
-- categoria reusa la taxonomía de RitualCategory (types/index.ts,
-- ya usada por Rituales) en vez de inventar una nueva -- consistencia
-- en toda la app. Sin CHECK constraint (mismo criterio ya usado en
-- conoces_items/quien_de_los_dos_items: texto libre, el enum se
-- aplica a nivel TypeScript).
--
-- El backfill clasifica cada fila existente por su contenido real
-- (no un valor por defecto sin sentido): intensidad liviana = sin
-- carga emocional/juguetón; media = conexión o vulnerabilidad
-- moderada; intensa = todo lo ya picante=true, más lo normal
-- genuinamente profundo/vulnerable.
-- ============================================================

ALTER TABLE public.verdad_o_reto_items ADD COLUMN intensidad text NOT NULL DEFAULT 'media';
ALTER TABLE public.verdad_o_reto_items ADD COLUMN categoria text NOT NULL DEFAULT 'conexion';

ALTER TABLE public.esto_o_aquello_items ADD COLUMN intensidad text NOT NULL DEFAULT 'media';
ALTER TABLE public.esto_o_aquello_items ADD COLUMN categoria text NOT NULL DEFAULT 'conexion';

ALTER TABLE public.eleccion_prompts ADD COLUMN intensidad text NOT NULL DEFAULT 'media';
ALTER TABLE public.eleccion_prompts ADD COLUMN categoria text NOT NULL DEFAULT 'conexion';

ALTER TABLE public.ruleta_picante_items ADD COLUMN intensidad text NOT NULL DEFAULT 'intensa';
ALTER TABLE public.ruleta_picante_items ADD COLUMN categoria text NOT NULL DEFAULT 'fantasias';

ALTER TABLE public.conoces_items ADD COLUMN intensidad text NOT NULL DEFAULT 'media';
-- conoces_items ya tiene categoria ('nosotros') -- no se toca.

ALTER TABLE public.quien_de_los_dos_items ADD COLUMN picante boolean NOT NULL DEFAULT false;
-- quien_de_los_dos_items ya tiene intensidad y categoria -- no se tocan.

-- ─────────────────────────────────────────────
-- BACKFILL: verdad_o_reto_items (40 filas)
-- ─────────────────────────────────────────────
UPDATE public.verdad_o_reto_items SET intensidad = 'media', categoria = 'conexion' WHERE modo = 'verdad' AND texto = '¿Cuál fue tu primera impresión de mí?';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'intimidad' WHERE modo = 'verdad' AND texto = '¿Qué es algo que nunca me dijiste por miedo a mi reacción?';
UPDATE public.verdad_o_reto_items SET intensidad = 'media', categoria = 'conexion' WHERE modo = 'verdad' AND texto = '¿Cuál es el recuerdo que más atesorás de nosotros?';
UPDATE public.verdad_o_reto_items SET intensidad = 'media', categoria = 'conexion' WHERE modo = 'verdad' AND texto = '¿Qué es lo que más te costó de adaptarte a estar en pareja?';
UPDATE public.verdad_o_reto_items SET intensidad = 'liviana', categoria = 'planes' WHERE modo = 'verdad' AND texto = '¿Hay algo que te gustaría que hiciéramos más seguido?';
UPDATE public.verdad_o_reto_items SET intensidad = 'media', categoria = 'conexion' WHERE modo = 'verdad' AND texto = '¿Cuál fue el momento en que sentiste que esto iba en serio?';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'intimidad' WHERE modo = 'verdad' AND texto = '¿Qué inseguridad mía notaste pero nunca nombraste?';
UPDATE public.verdad_o_reto_items SET intensidad = 'liviana', categoria = 'conexion' WHERE modo = 'verdad' AND texto = '¿Qué es algo que admirás de mí y nunca me dijiste?';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'intimidad' WHERE modo = 'verdad' AND texto = '¿Con qué parte de vos sentís que todavía no me mostrás del todo?';
UPDATE public.verdad_o_reto_items SET intensidad = 'media', categoria = 'conexion' WHERE modo = 'verdad' AND texto = '¿Qué discusión nuestra te hizo pensar distinto después?';
UPDATE public.verdad_o_reto_items SET intensidad = 'media', categoria = 'conexion' WHERE modo = 'verdad' AND texto = '¿Qué es algo que te gustaría cambiar de cómo nos comunicamos?';
UPDATE public.verdad_o_reto_items SET intensidad = 'liviana', categoria = 'conexion' WHERE modo = 'verdad' AND texto = '¿Qué gesto mío te hace sentir más querido/a?';

UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'verdad' AND texto = '¿Cuál es la fantasía que más te cuesta admitir que tenés conmigo?';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'verdad' AND texto = '¿Qué parte de mi cuerpo te vuelve loco/a y nunca me lo dijiste así, directo?';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'verdad' AND texto = '¿Cuál fue el momento en que me desataste más deseo, sin que yo lo supiera?';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'verdad' AND texto = '¿Qué es algo que querés que te haga en la cama y todavía no me pediste?';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'verdad' AND texto = '¿Con qué recuerdo nuestro te excitás cuando pensás en nosotros?';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'verdad' AND texto = '¿Qué lugar fuera de la cama fantaseaste con hacerlo conmigo?';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'verdad' AND texto = '¿Qué es lo más atrevido que pensaste hacer conmigo y no te animaste?';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'verdad' AND texto = '¿Qué palabra o gesto mío te prende más en el momento?';

UPDATE public.verdad_o_reto_items SET intensidad = 'liviana', categoria = 'conexion' WHERE modo = 'reto' AND texto = 'Dale un abrazo de 20 segundos sin hablar.';
UPDATE public.verdad_o_reto_items SET intensidad = 'media', categoria = 'conexion' WHERE modo = 'reto' AND texto = 'Decile 3 cosas que te gustan de su cuerpo, mirándolo/a a los ojos.';
UPDATE public.verdad_o_reto_items SET intensidad = 'liviana', categoria = 'diversion' WHERE modo = 'reto' AND texto = 'Bailen una canción lenta, aunque no haya música.';
UPDATE public.verdad_o_reto_items SET intensidad = 'media', categoria = 'intimidad' WHERE modo = 'reto' AND texto = 'Contale un secreto que nunca le contaste.';
UPDATE public.verdad_o_reto_items SET intensidad = 'liviana', categoria = 'conexion' WHERE modo = 'reto' AND texto = 'Hacele un masaje de manos por 1 minuto.';
UPDATE public.verdad_o_reto_items SET intensidad = 'liviana', categoria = 'diversion' WHERE modo = 'reto' AND texto = 'Imitalo/a durante 30 segundos.';
UPDATE public.verdad_o_reto_items SET intensidad = 'liviana', categoria = 'diversion' WHERE modo = 'reto' AND texto = 'Decile la primera palabra que se te venga a la cabeza al mirarlo/a.';
UPDATE public.verdad_o_reto_items SET intensidad = 'media', categoria = 'conexion' WHERE modo = 'reto' AND texto = 'Escribile un mensaje de audio diciendo por qué lo/la elegís hoy.';
UPDATE public.verdad_o_reto_items SET intensidad = 'liviana', categoria = 'planes' WHERE modo = 'reto' AND texto = 'Susurrale algo que te gustaría hacer juntos este mes.';
UPDATE public.verdad_o_reto_items SET intensidad = 'liviana', categoria = 'conexion' WHERE modo = 'reto' AND texto = 'Dale un beso donde él/ella elija.';
UPDATE public.verdad_o_reto_items SET intensidad = 'liviana', categoria = 'diversion' WHERE modo = 'reto' AND texto = 'Contale algo que te dio vergüenza de chico/a.';
UPDATE public.verdad_o_reto_items SET intensidad = 'media', categoria = 'planes' WHERE modo = 'reto' AND texto = 'Prometele algo que vas a cumplir esta semana.';

UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'reto' AND texto = 'Besá a tu pareja donde vos elijas, sin avisar antes.';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'reto' AND texto = 'Contale al oído qué te gustaría que pase esta noche.';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'reto' AND texto = 'Sacale una prenda, despacio, sin apuro.';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'reto' AND texto = 'Hacele un recorrido de besos desde el cuello hasta donde vos decidas parar.';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'reto' AND texto = 'Guiá su mano hacia donde más te gusta que te toque.';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'reto' AND texto = 'Describile en detalle una fantasía que tengas con él/ella.';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'reto' AND texto = 'Mordé suavemente su labio antes de besarlo/a.';
UPDATE public.verdad_o_reto_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE modo = 'reto' AND texto = 'Elegí una parte de su cuerpo y quedate ahí un minuto entero, sin palabras.';

-- ─────────────────────────────────────────────
-- BACKFILL: esto_o_aquello_items (20 filas)
-- ─────────────────────────────────────────────
UPDATE public.esto_o_aquello_items SET intensidad = 'liviana', categoria = 'viajes' WHERE option_a = 'Playa' AND option_b = 'Montaña';
UPDATE public.esto_o_aquello_items SET intensidad = 'liviana', categoria = 'diversion' WHERE option_a = 'Noche de películas' AND option_b = 'Noche de fiesta';
UPDATE public.esto_o_aquello_items SET intensidad = 'liviana', categoria = 'conexion' WHERE option_a = 'Desayuno en la cama' AND option_b = 'Cena a la luz de velas';
UPDATE public.esto_o_aquello_items SET intensidad = 'liviana', categoria = 'viajes' WHERE option_a = 'Viajar sin plan' AND option_b = 'Viajar con itinerario';
UPDATE public.esto_o_aquello_items SET intensidad = 'liviana', categoria = 'conexion' WHERE option_a = 'Mensajes todo el día' AND option_b = 'Una llamada larga';
UPDATE public.esto_o_aquello_items SET intensidad = 'media', categoria = 'conexion' WHERE option_a = 'Dormir abrazados' AND option_b = 'Dormir con espacio';
UPDATE public.esto_o_aquello_items SET intensidad = 'liviana', categoria = 'planes' WHERE option_a = 'Sorpresas' AND option_b = 'Planes avisados';
UPDATE public.esto_o_aquello_items SET intensidad = 'liviana', categoria = 'planes' WHERE option_a = 'Cocinar juntos' AND option_b = 'Pedir comida y ver algo';
UPDATE public.esto_o_aquello_items SET intensidad = 'media', categoria = 'conexion' WHERE option_a = 'Discutir y hablarlo ya' AND option_b = 'Enfriar la cabeza primero';
UPDATE public.esto_o_aquello_items SET intensidad = 'liviana', categoria = 'conexion' WHERE option_a = 'Regalos' AND option_b = 'Palabras de afecto';
UPDATE public.esto_o_aquello_items SET intensidad = 'media', categoria = 'planes' WHERE option_a = 'Mudarse de ciudad' AND option_b = 'Quedarse cerca de la familia';
UPDATE public.esto_o_aquello_items SET intensidad = 'liviana', categoria = 'diversion' WHERE option_a = 'Fiesta con amigos' AND option_b = 'Noche los dos solos';

UPDATE public.esto_o_aquello_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Besos lentos' AND option_b = 'Besos urgentes';
UPDATE public.esto_o_aquello_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Que te seduzcan' AND option_b = 'Seducir vos';
UPDATE public.esto_o_aquello_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Luz prendida' AND option_b = 'A oscuras';
UPDATE public.esto_o_aquello_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Ir despacio' AND option_b = 'Ir directo al grano';
UPDATE public.esto_o_aquello_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Que te sorprendan en la intimidad' AND option_b = 'Planear todo antes';
UPDATE public.esto_o_aquello_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Susurrar' AND option_b = 'No contenerse';
UPDATE public.esto_o_aquello_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Provocar con la mirada' AND option_b = 'Provocar con el cuerpo';
UPDATE public.esto_o_aquello_items SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Tierno' AND option_b = 'Intenso';

-- ─────────────────────────────────────────────
-- BACKFILL: eleccion_prompts (16 filas)
-- ─────────────────────────────────────────────
UPDATE public.eleccion_prompts SET intensidad = 'liviana', categoria = 'viajes' WHERE option_a = 'Playa' AND option_b = 'Montaña';
UPDATE public.eleccion_prompts SET intensidad = 'liviana', categoria = 'diversion' WHERE option_a = 'Cine' AND option_b = 'Sillón con manta';
UPDATE public.eleccion_prompts SET intensidad = 'liviana', categoria = 'planes' WHERE option_a = 'Sorpresa' AND option_b = 'Plan avisado';
UPDATE public.eleccion_prompts SET intensidad = 'liviana', categoria = 'conexion' WHERE option_a = 'Beso' AND option_b = 'Abrazo';
UPDATE public.eleccion_prompts SET intensidad = 'liviana', categoria = 'conexion' WHERE option_a = 'Desayuno en la cama' AND option_b = 'Cena con velas';
UPDATE public.eleccion_prompts SET intensidad = 'liviana', categoria = 'diversion' WHERE option_a = 'Quedarse en casa' AND option_b = 'Salir a bailar';
UPDATE public.eleccion_prompts SET intensidad = 'liviana', categoria = 'conexion' WHERE option_a = 'Mensaje de buenos días' AND option_b = 'Llamada antes de dormir';
UPDATE public.eleccion_prompts SET intensidad = 'media', categoria = 'conexion' WHERE option_a = 'Hablar apenas pasa algo' AND option_b = 'Pensarlo antes de hablar';
UPDATE public.eleccion_prompts SET intensidad = 'liviana', categoria = 'conexion' WHERE option_a = 'Regalos' AND option_b = 'Palabras';
UPDATE public.eleccion_prompts SET intensidad = 'media', categoria = 'planes' WHERE option_a = 'Aventurero' AND option_b = 'Hogareño';

UPDATE public.eleccion_prompts SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Dominar' AND option_b = 'Dejarse llevar';
UPDATE public.eleccion_prompts SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Provocar todo el día' AND option_b = 'Sorpresa directo a la noche';
UPDATE public.eleccion_prompts SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Ducha juntos' AND option_b = 'Masaje juntos';
UPDATE public.eleccion_prompts SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Ropa interior' AND option_b = 'Piel';
UPDATE public.eleccion_prompts SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Ir lento' AND option_b = 'Ir urgente';
UPDATE public.eleccion_prompts SET intensidad = 'intensa', categoria = 'fantasias' WHERE option_a = 'Susurrarlo' AND option_b = 'Mostrarlo';

-- ─────────────────────────────────────────────
-- BACKFILL: ruleta_picante_items (12 filas, todas intensa por
-- naturaleza del juego -- el default de la columna ya cubre 11,
-- solo se ajustan categoria y la única excepción de intensidad)
-- ─────────────────────────────────────────────
UPDATE public.ruleta_picante_items SET categoria = 'conexion' WHERE texto = 'Hacele un masaje lento en la espalda, en silencio, por 2 minutos.';
UPDATE public.ruleta_picante_items SET intensidad = 'media', categoria = 'conexion' WHERE texto = 'Bailale una canción lenta, muy cerca, sin tocarse todavía.';
-- El resto (10 filas) ya queda cubierto por el default intensa/fantasias.

-- ─────────────────────────────────────────────
-- BACKFILL: conoces_items (18 filas)
-- ─────────────────────────────────────────────
UPDATE public.conoces_items SET intensidad = 'liviana' WHERE pregunta = '¿Cuál es tu comida reconfortante cuando tenés un mal día?';
UPDATE public.conoces_items SET intensidad = 'liviana' WHERE pregunta = 'Si te regalan un día libre sin nada planeado, ¿qué elegís hacer?';
UPDATE public.conoces_items SET intensidad = 'intensa' WHERE pregunta = '¿Cuál es el miedo que más te cuesta admitir?';
UPDATE public.conoces_items SET intensidad = 'liviana' WHERE pregunta = '¿A qué destino soñás viajar alguna vez?';
UPDATE public.conoces_items SET intensidad = 'media' WHERE pregunta = '¿Cómo preferís que te consuelen cuando estás mal?';
UPDATE public.conoces_items SET intensidad = 'liviana' WHERE pregunta = '¿Cuál es tu mayor lujo cuando tenés plata de sobra?';
UPDATE public.conoces_items SET intensidad = 'media' WHERE pregunta = '¿Qué es lo que más rápido te saca de quicio?';
UPDATE public.conoces_items SET intensidad = 'liviana' WHERE pregunta = '¿Cómo te gusta arrancar el día?';
UPDATE public.conoces_items SET intensidad = 'liviana' WHERE pregunta = 'Si ganás la lotería, ¿qué hacés primero?';
UPDATE public.conoces_items SET intensidad = 'media' WHERE pregunta = '¿Cuál es tu forma favorita de que te demuestren cariño?';
UPDATE public.conoces_items SET intensidad = 'intensa' WHERE pregunta = '¿Qué te cuesta más soltar?';
UPDATE public.conoces_items SET intensidad = 'liviana' WHERE pregunta = '¿Con qué clima te sentís mejor?';
UPDATE public.conoces_items SET intensidad = 'liviana' WHERE pregunta = '¿Cuál es tu fin de semana ideal?';
UPDATE public.conoces_items SET intensidad = 'media' WHERE pregunta = '¿Qué es lo que más extrañás de cuando eras chico/a?';
UPDATE public.conoces_items SET intensidad = 'media' WHERE pregunta = '¿Cómo manejás el estrés?';
UPDATE public.conoces_items SET intensidad = 'media' WHERE pregunta = 'En 5 años, ¿qué te haría sentir más orgulloso/a?';
UPDATE public.conoces_items SET intensidad = 'media' WHERE pregunta = '¿Cuál es tu estilo para discutir?';
UPDATE public.conoces_items SET intensidad = 'liviana' WHERE pregunta = '¿Qué te genera más ternura en una relación?';

-- ─────────────────────────────────────────────
-- SEED: preguntas picante nuevas para quien_de_los_dos_items, para
-- que el toggle Picante (pieza 6 del plan) tenga contenido real.
-- ─────────────────────────────────────────────
INSERT INTO public.quien_de_los_dos_items (pregunta, intensidad, categoria, picante) VALUES
('¿Quién de los dos es más provocador/a en la intimidad?', 'intensa', 'fantasias', true),
('¿Quién de los dos toma más la iniciativa en la cama?', 'intensa', 'fantasias', true),
('¿Quién de los dos tiene más fantasías sin contar?', 'intensa', 'fantasias', true),
('¿Quién de los dos se anima más a probar algo nuevo en la intimidad?', 'intensa', 'fantasias', true),
('¿Quién de los dos es más celoso/a de la atención del otro en la cama?', 'intensa', 'fantasias', true),
('¿Quién de los dos aguanta más sin ceder al deseo?', 'intensa', 'fantasias', true),
('¿Quién de los dos es más intenso/a besando?', 'intensa', 'fantasias', true),
('¿Quién de los dos disfruta más ser observado/a?', 'intensa', 'fantasias', true),
('¿Quién de los dos se excita más rápido?', 'intensa', 'fantasias', true),
('¿Quién de los dos es más audaz para sugerir algo picante?', 'intensa', 'fantasias', true);
