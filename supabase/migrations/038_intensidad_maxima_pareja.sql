-- ============================================================
-- Migración 038: techo de intensidad elegido por la pareja (§5 del
-- pedido de evolución de juegos: "la pareja puede elegir el nivel
-- permitido al comenzar").
--
-- Default 'intensa' (sin restricción) para todas las parejas,
-- nuevas y existentes -- decisión confirmada con el usuario: a
-- diferencia de picante_habilitado (contenido +18, migración 035),
-- esto es intensidad emocional dentro de contenido normal. Restringir
-- por defecto sería una segunda pantalla de fricción sin necesidad
-- real, ya que el gate fuerte (picante) sigue existiendo aparte.
--
-- Reusa la policy couples_update_member (migración 001) para el
-- UPDATE directo desde el cliente -- mismo criterio ya aplicado a
-- picante_habilitado: campo no privado ni adversarial entre los dos
-- miembros de la pareja.
-- ============================================================

ALTER TABLE public.couples ADD COLUMN intensidad_maxima text NOT NULL DEFAULT 'intensa';
