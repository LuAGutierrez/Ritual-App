-- ============================================================
-- Migración 040: registrar rondas jugadas de Verdad o Reto y Ruleta
-- Picante -- los únicos 2 juegos que hoy no persisten nada server-side
-- cuando se juega una ronda (son 100% client-side, sin reveal).
--
-- Sin esto, dos cosas quedan rotas: el nivel de progresión emocional
-- en /perfil subcuenta a estas parejas (nivelActual() solo suma
-- intentos de los 4 juegos con stats), y la variedad por categoría
-- (agregada en la migración 037) se resetea cada sesión porque vive
-- solo en memoria del cliente.
--
-- Mismo patrón y mismo razonamiento de RLS que
-- couple_contenido_rechazado (migración 032): INSERT/SELECT directo
-- del cliente autenticado, sin SECURITY DEFINER, porque esto es un
-- log liviano, no una acción puntuable como submit_*_choice -- no hay
-- nada que hacer trampa.
-- ============================================================

CREATE TABLE public.couple_rondas_jugadas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id   uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  juego       text NOT NULL CHECK (juego IN ('verdad_o_reto', 'ruleta_picante')),
  item_id     uuid NOT NULL,
  categoria   text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.couple_rondas_jugadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rondas_jugadas_select_member" ON public.couple_rondas_jugadas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_rondas_jugadas.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE POLICY "rondas_jugadas_insert_member" ON public.couple_rondas_jugadas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_rondas_jugadas.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE INDEX rondas_jugadas_couple_juego_idx
  ON public.couple_rondas_jugadas (couple_id, juego, created_at DESC);
