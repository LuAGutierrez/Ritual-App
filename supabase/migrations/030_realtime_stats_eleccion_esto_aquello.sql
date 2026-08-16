-- ============================================================
-- Migración 030: agregar couple_eleccion_stats y
-- couple_esto_aquello_stats a la publicación de Realtime
--
-- Se me pasó en la migración 029 -- couple_conoces_stats sí quedó
-- agregada en la 028, pero estas dos tablas nuevas no. Sin esto, la
-- racha en pantalla no se actualiza en vivo después de un reveal
-- (solo se ve al recargar la página).
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_eleccion_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_esto_aquello_stats;
