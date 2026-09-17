-- ============================================================
-- Migración 075: retiro de couples.intensidad_maxima
--
-- El techo de intensidad de los 6 juegos dejó de ser una config de
-- pareja en /perfil (migración 038) y pasó a elegirse con chips en la
-- propia pantalla de cada juego, efímero por sesión -- ver
-- docs/DECISIONES.md, "Techo de intensidad por juego, no por pareja
-- (revertido 17/09/2026)". Motivo: casi ninguna pareja real entraba a
-- /perfil a configurar esto, así que en la práctica siempre quedaba
-- en el default 'intensa'.
--
-- Aplicada recién después de confirmar que el deploy con el código
-- nuevo (que ya no lee esta columna) estaba en producción -- borrarla
-- antes hubiera roto los 6 juegos, /perfil y Ritual con IA en el medio.
-- ============================================================

ALTER TABLE public.couples DROP COLUMN intensidad_maxima;
