-- ============================================================
-- Migración 055: esquema del sistema de créditos compartidos por pareja
--
-- Reemplaza el modelo de suscripción mensual (Mercado Pago) por un pozo
-- de créditos que se gasta solo en generación con IA. El catálogo
-- estático (rituales, los 6 juegos, modo picante, historial) pasa a
-- ser gratis para todos -- el gating por `subscriptions` se retira en
-- una migración/PR aparte, después del cutover (ver plan de migración
-- en docs/ROADMAP.md).
--
-- 100% aditivo: tablas nuevas, no se toca `subscriptions` ni ninguna
-- función existente acá. Los hooks a signup/pairing van en la 056, el
-- RPC de consumo en la 057 -- separado para poder revisar/revertir
-- cada capa por separado si algo sale mal.
-- ============================================================

-- Saldo individual, previo a vincular pareja. Se crea junto con el
-- profile (trigger handle_new_user, migración 056). Permite probar
-- Ritual Simple en solitario -- Ritual Profundo y Dinámica de
-- compatibilidad no están bloqueados por código, pero con 50 créditos
-- alcanza para pocos usos antes de necesitar vincular pareja o comprar.
CREATE TABLE public.user_credits (
  user_id     uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance     int NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Pozo compartido, se crea al vincular la pareja (grant_pairing_bonus,
-- migración 056). streak_bonus es el crédito diario no acumulable: se
-- gasta antes que balance y se trata como 0 si ya expiró -- sin
-- necesidad de un cron que lo limpie (consume_credits, migración 057,
-- chequea la expiración inline en cada gasto).
CREATE TABLE public.couple_credits (
  couple_id                uuid PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  balance                  int NOT NULL DEFAULT 0 CHECK (balance >= 0),
  streak_bonus             int NOT NULL DEFAULT 0 CHECK (streak_bonus >= 0),
  streak_bonus_expires_at  timestamptz,
  last_streak_grant_date   date,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Ledger inmutable: fuente de verdad para auditoría/soporte ("¿por qué
-- bajó el saldo?"). balance/streak_bonus en las tablas de arriba son un
-- cache del último estado, siempre escrito en la misma transacción que
-- la fila del ledger correspondiente.
CREATE TABLE public.credit_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       uuid REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type            text NOT NULL CHECK (type IN (
                    'welcome_signup', 'pairing_bonus', 'streak_daily',
                    'purchase', 'consumo_ia', 'refund', 'admin_adjustment'
                  )),
  amount          int NOT NULL,                  -- + o -, nunca 0
  balance_after   int NOT NULL,
  feature         text,                           -- 'ritual_simple' | 'ritual_profundo' | 'dinamica_ia' | null
  idempotency_key uuid UNIQUE,                    -- evita doble cobro en retry de red
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (amount <> 0)
);

CREATE INDEX credit_transactions_couple_idx ON public.credit_transactions (couple_id, created_at DESC);
CREATE INDEX credit_transactions_user_idx ON public.credit_transactions (user_id, created_at DESC);

-- Anti-farmeo: fingerprint persistente por dispositivo. Se llena desde
-- un server action liviano (client manda un UUID de localStorage), no
-- forma parte de esta migración -- la tabla queda lista para cuando se
-- cablee esa pantalla. grant_pairing_bonus (migración 056) ya la
-- consulta; si está vacía simplemente nunca encuentra riesgo.
CREATE TABLE public.device_fingerprints (
  id                bigserial PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fingerprint_hash  text NOT NULL,
  ip_hash           text,
  first_seen_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint_hash)
);

CREATE INDEX device_fingerprints_hash_idx ON public.device_fingerprints (fingerprint_hash);

-- Caché de contenido de IA por etiquetas de contexto (lib/ai/context.ts
-- buildContextTags). Dos parejas con el mismo feature + mismas tags
-- reciben el mismo contenido generado antes, sin nueva llamada al
-- modelo -- ahorro real de tokens, no solo de tiempo.
CREATE TABLE public.ai_content_cache (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature       text NOT NULL,          -- 'ritual_simple' | 'ritual_profundo' | 'dinamica_ia'
  context_key   text NOT NULL,          -- tags normalizados
  model         text NOT NULL,
  output        jsonb NOT NULL,
  hits          int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature, context_key)
);

-- Paquetes de créditos comprables y sus compras (reemplaza
-- `subscriptions`). El webhook de Mercado Pago que los llena se
-- reescribe en una fase aparte del plan (toca pagos reales) -- estas
-- tablas quedan listas de antemano.
CREATE TABLE public.credit_packages (
  id          text PRIMARY KEY,        -- 'pack_prueba', 'pack_finde', 'pack_a_fondo'
  credits     int NOT NULL CHECK (credits > 0),
  price_ars   int NOT NULL CHECK (price_ars > 0),
  active      bool NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0
);

CREATE TABLE public.credit_purchases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id      text NOT NULL REFERENCES public.credit_packages(id),
  mp_payment_id   text UNIQUE,          -- id de pago de Mercado Pago, idempotencia del webhook
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  credits_granted int,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS: mismo patrón que couple_ia_contenido (migración 054) -- el
-- cliente solo lee lo suyo, todo INSERT/UPDATE de saldo pasa por RPC
-- SECURITY DEFINER (nunca UPDATE directo de balance desde el browser).
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_content_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_credits_select_own" ON public.user_credits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "couple_credits_select_member" ON public.couple_credits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.couple_members
            WHERE couple_members.couple_id = couple_credits.couple_id
              AND couple_members.user_id = auth.uid())
  );

CREATE POLICY "credit_transactions_select_member" ON public.credit_transactions
  FOR SELECT USING (
    couple_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = credit_transactions.couple_id
        AND couple_members.user_id = auth.uid()
    )
    OR (couple_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "credit_packages_select_active" ON public.credit_packages
  FOR SELECT USING (active = true);

CREATE POLICY "credit_purchases_select_member" ON public.credit_purchases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.couple_members
            WHERE couple_members.couple_id = credit_purchases.couple_id
              AND couple_members.user_id = auth.uid())
  );
-- device_fingerprints y ai_content_cache: sin policy de cliente a
-- propósito -- solo se tocan desde RPC SECURITY DEFINER / service role.

-- Precios de partida (hipótesis, no dato de negocio validado -- ajustar
-- estas filas no requiere migración). Pack "finde" es el ancla: ~35%
-- más barato que el viejo mensual de $4.999 porque ahora es un bloque
-- finito, no acceso ilimitado -- ver docs/ROADMAP.md para el detalle.
INSERT INTO public.credit_packages (id, credits, price_ars, sort_order) VALUES
  ('pack_prueba',  60,  1500, 1),
  ('pack_finde',   150, 3200, 2),
  ('pack_a_fondo', 400, 7500, 3);
