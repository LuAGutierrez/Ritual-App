-- ============================================================
-- Migración 074: variantes en ai_content_cache
--
-- Bug reportado en producción: pedir el mismo feature con el mismo
-- ánimo/tiempo/objetivo/racha (ej. ritual_profundo + "Con ganas" + 30m
-- + Deseo) devolvía SIEMPRE el mismo ritual -- generarConIAAction
-- (app/actions/ritual-ia.ts) cachea por (feature, context_key) exacto,
-- así que la segunda vez ni siquiera llama al modelo, sirve la fila
-- cacheada. Para algo vendido como "generado a medida" esto se nota
-- mal apenas alguien repite una combinación, que es fácil de hacer.
--
-- Fix: la clave de caché pasa a ser (feature, context_key, variant),
-- con variant elegido al azar en cada pedido entre 0 y
-- CACHE_VARIANTS-1 (ver app/actions/ritual-ia.ts). Sigue ahorrando
-- tokens una vez que las N variantes de una combinación popular ya
-- existen, pero dos pedidos seguidos con el mismo contexto ya no
-- devuelven necesariamente lo mismo.
-- ============================================================

alter table public.ai_content_cache
  add column if not exists variant int not null default 0;

alter table public.ai_content_cache
  drop constraint if exists ai_content_cache_feature_context_key_key;

alter table public.ai_content_cache
  add constraint ai_content_cache_feature_context_key_variant_key unique (feature, context_key, variant);
