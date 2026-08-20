-- ============================================================
-- Migración 051: Dado Picante -- juego nuevo, dos dados independientes
-- (lugar/objeto de la casa + posición). Mismo patrón que la 026 para
-- el contenido (tabla con RLS select-only, gestionada por migración,
-- no por el cliente).
--
-- Sin intensidad/categoria: a pedido explícito, las posiciones van
-- sin niveles (lista fija tipo Kama Sutra) y el lugar es solo el
-- escenario -- no hay nada que escalar. Por eso tampoco entra en el
-- techo de intensidad de la pareja (couples.intensidad_maxima,
-- migración 038): ese control filtra contenido que ESCALA, esta
-- lista es fija y chica, no dares progresivos.
--
-- Tampoco se integra a couple_rondas_jugadas / couple_momentos /
-- historial de juegos (migraciones 040/043): esos suman "evitar
-- repetir" y progresión emocional, pero acá repetir es lo esperado
-- de un dado de verdad, no un bug a evitar. Si más adelante se quiere
-- sumar al historial, es una migración aparte.
-- ============================================================

CREATE TABLE public.dado_picante_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        text NOT NULL CHECK (tipo IN ('lugar', 'posicion')),
  texto       text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.dado_picante_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dado_picante_items_select_authenticated" ON public.dado_picante_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Reutiliza la prueba gratis por pareja (una ronda picante gratis
-- antes del paywall, migración 046) -- mismo trato que los otros 5
-- juegos con modo picante.
ALTER TABLE public.couple_picante_trial DROP CONSTRAINT couple_picante_trial_juego_check;
ALTER TABLE public.couple_picante_trial ADD CONSTRAINT couple_picante_trial_juego_check
  CHECK (juego IN ('eleccion', 'esto_aquello', 'quien_de_los_dos', 'verdad_o_reto', 'ruleta_picante', 'dado_picante'));

INSERT INTO public.dado_picante_items (tipo, texto) VALUES
('lugar', 'Cama'),
('lugar', 'Mueble'),
('lugar', 'Silla'),
('lugar', 'Mesada'),
('lugar', 'Sofá'),
('lugar', 'Escritorio'),
('lugar', 'Mesa del comedor'),
('lugar', 'Alfombra'),
('lugar', 'Espejo'),
('lugar', 'Ducha'),
('lugar', 'Cocina'),
('lugar', 'Lavandería'),
('lugar', 'Escalera'),
('lugar', 'Baño'),
('lugar', 'Habitación'),
('posicion', 'Misionero'),
('posicion', 'Ella arriba'),
('posicion', 'Vos arriba'),
('posicion', 'Carretilla'),
('posicion', 'Parado'),
('posicion', 'En 4');
