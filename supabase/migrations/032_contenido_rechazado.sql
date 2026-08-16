-- ============================================================
-- Migración 032: botón "Paso" -- rechazar contenido sin romper la
-- partida (sección 11 del pedido de evolución de juegos)
--
-- Verdad o Reto y Ruleta Picante ya permiten saltar libremente (los
-- botones "Siguiente"/"Girar de nuevo" no piden explicación ni tienen
-- costo) -- lo que faltaba era una acción EXPLÍCITA de "esto no, paso"
-- distinta de "dame otra al azar", para que decir que no se sienta
-- una opción legítima y no algo que hay que camuflar pidiendo "otra".
--
-- De paso, queda registrado qué se rechaza -- exactamente el tipo de
-- señal que el pedido original lista como metadata útil para
-- personalización futura ("retos rechazados", "preguntas
-- rechazadas"), aunque en esta fase no se construye nada que consuma
-- ese dato todavía.
--
-- 100% aditivo: tabla nueva, sin tocar contenido, sesiones ni
-- funciones existentes. INSERT client-side directo (sin función
-- SECURITY DEFINER) porque no hay nada que hacer trampa acá -- no es
-- una acción puntuable como las de submit_*_choice.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.couple_contenido_rechazado (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id   uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  juego       text NOT NULL CHECK (juego IN ('verdad_o_reto', 'ruleta_picante')),
  item_id     uuid NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.couple_contenido_rechazado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contenido_rechazado_select_member" ON public.couple_contenido_rechazado
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_contenido_rechazado.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE POLICY "contenido_rechazado_insert_member" ON public.couple_contenido_rechazado
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_contenido_rechazado.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );
