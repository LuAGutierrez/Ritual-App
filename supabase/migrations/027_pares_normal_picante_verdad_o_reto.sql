-- ============================================================
-- Migración 027: pares normal→picante en Verdad o Reto
--
-- Idea de producto: cada tantas rondas en modo normal, mostrar un preview
-- borroso de la versión picante de esa misma pregunta/reto (mismo tema,
-- más directo) para tentar la conversión a Premium -- en vez de un upsell
-- genérico. Requiere poder relacionar un ítem normal con su par picante.
--
-- Los pares se eligieron a mano revisando el contenido existente: varios
-- ítems normales y picante ya comparten molde de frase (ej. "...y nunca
-- me dijiste" / "...te vuelve loco/a y nunca me lo dijiste así, directo").
-- No todos los ítems normales tienen un par natural -- se dejan sin
-- relacionar (par_picante_id null) en vez de forzar una pareja floja.
-- ============================================================

ALTER TABLE public.verdad_o_reto_items
  ADD COLUMN par_picante_id uuid REFERENCES public.verdad_o_reto_items(id);

-- Verdad
UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = '¿Cuál es la fantasía que más te cuesta admitir que tenés conmigo?'
) WHERE texto = '¿Qué es algo que nunca me dijiste por miedo a mi reacción?';

UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = '¿Con qué recuerdo nuestro te excitás cuando pensás en nosotros?'
) WHERE texto = '¿Cuál es el recuerdo que más atesorás de nosotros?';

UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = '¿Qué lugar fuera de la cama fantaseaste con hacerlo conmigo?'
) WHERE texto = '¿Hay algo que te gustaría que hiciéramos más seguido?';

UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = '¿Cuál fue el momento en que me desataste más deseo, sin que yo lo supiera?'
) WHERE texto = '¿Cuál fue el momento en que sentiste que esto iba en serio?';

UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = '¿Qué parte de mi cuerpo te vuelve loco/a y nunca me lo dijiste así, directo?'
) WHERE texto = '¿Qué es algo que admirás de mí y nunca me dijiste?';

UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = '¿Qué palabra o gesto mío te prende más en el momento?'
) WHERE texto = '¿Qué gesto mío te hace sentir más querido/a?';

-- Reto
UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = 'Elegí una parte de su cuerpo y quedate ahí un minuto entero, sin palabras.'
) WHERE texto = 'Dale un abrazo de 20 segundos sin hablar.';

UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = 'Guiá su mano hacia donde más te gusta que te toque.'
) WHERE texto = 'Decile 3 cosas que te gustan de su cuerpo, mirándolo/a a los ojos.';

UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = 'Hacele un recorrido de besos desde el cuello hasta donde vos decidas parar.'
) WHERE texto = 'Hacele un masaje de manos por 1 minuto.';

UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = 'Describile en detalle una fantasía que tengas con él/ella.'
) WHERE texto = 'Decile la primera palabra que se te venga a la cabeza al mirarlo/a.';

UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = 'Contale al oído qué te gustaría que pase esta noche.'
) WHERE texto = 'Susurrale algo que te gustaría hacer juntos este mes.';

UPDATE public.verdad_o_reto_items SET par_picante_id = (
  SELECT id FROM public.verdad_o_reto_items WHERE texto = 'Besá a tu pareja donde vos elijas, sin avisar antes.'
) WHERE texto = 'Dale un beso donde él/ella elija.';
