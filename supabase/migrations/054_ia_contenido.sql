-- ============================================================
-- Migración 054: historial de contenido generado con IA (Sprint 4)
--
-- Guarda cada consigna que la IA le generó a una pareja para un juego,
-- para poder pasarle al modelo "no repitas esto" en el próximo pedido
-- (ver lib/ai/prompts.ts). Sin esto, no hay forma de evitar que el
-- modelo devuelva el mismo texto (o uno casi igual) dos veces, porque
-- ya no hay un pool fijo del que excluir por id como en
-- couple_contenido_rechazado.
--
-- Arranca solo con Verdad o Reto -- Ruleta Picante no tiene distinción
-- de modo (verdad/reto), así que el CHECK de "juego" queda a propósito
-- reducido a lo que existe hoy; sumarla es una migración aparte.
--
-- 100% aditivo: tabla nueva, sin tocar contenido, sesiones ni
-- funciones existentes. INSERT vía server action (no client-side
-- directo) porque quien escribe es el server action que le pega a
-- Groq, no el browser.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.couple_ia_contenido (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id   uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  juego       text NOT NULL CHECK (juego IN ('verdad_o_reto')),
  modo        text NOT NULL CHECK (modo IN ('verdad', 'reto')),
  intensidad  text NOT NULL CHECK (intensidad IN ('liviana', 'media', 'intensa')),
  texto       text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Para traer rápido "los últimos N de esta pareja + este juego" al armar el prompt.
CREATE INDEX IF NOT EXISTS couple_ia_contenido_couple_juego_idx
  ON public.couple_ia_contenido (couple_id, juego, created_at DESC);

ALTER TABLE public.couple_ia_contenido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ia_contenido_select_member" ON public.couple_ia_contenido
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_ia_contenido.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE POLICY "ia_contenido_insert_member" ON public.couple_ia_contenido
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_ia_contenido.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );
