-- ============================================================
-- Migración 059: policies de cliente para ai_content_cache
--
-- La migración 055 dejó esta tabla a propósito sin policies ("solo se
-- toca desde RPC SECURITY DEFINER / service role"), pero
-- generarConIAAction (app/actions/ritual-ia.ts) la lee/escribe con el
-- cliente normal (anon key + sesión del usuario, sujeto a RLS) -- sin
-- esto, cada SELECT devuelve vacío y cada INSERT falla en silencio.
--
-- No es información sensible ni por-pareja (es contenido genérico
-- cacheado por tags de contexto, compartido entre TODAS las parejas a
-- propósito -- esa es la optimización), así que cualquier autenticado
-- puede leer/escribir/actualizar hits. Nadie puede borrar desde el
-- cliente.
-- ============================================================

CREATE POLICY "ai_content_cache_select_authenticated" ON public.ai_content_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ai_content_cache_insert_authenticated" ON public.ai_content_cache
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ai_content_cache_update_hits_authenticated" ON public.ai_content_cache
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
