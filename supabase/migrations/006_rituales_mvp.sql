-- ============================================================
-- Migración 006: Rituales MVP
-- Tablas: couples, couple_members, rituals, couple_ritual_sessions, streaks
-- ============================================================

-- ─────────────────────────────────────────────
-- TABLA: couples
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.couples (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code  text UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text), 1, 6)),
  name         text,
  created_at   timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

-- Miembros pueden leer su pareja
CREATE POLICY "couples_select_member" ON public.couples
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couples.id
        AND couple_members.user_id = auth.uid()
    )
  );

-- Cualquier usuario autenticado puede crear una pareja
CREATE POLICY "couples_insert_auth" ON public.couples
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Miembros pueden actualizar nombre de pareja
CREATE POLICY "couples_update_member" ON public.couples
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couples.id
        AND couple_members.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────
-- TABLA: couple_members
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.couple_members (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id  uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, couple_id)
);

-- RLS
ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;

-- Miembros ven membresías de su pareja
CREATE POLICY "couple_members_select" ON public.couple_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.couple_members cm2
      WHERE cm2.couple_id = couple_members.couple_id
        AND cm2.user_id = auth.uid()
    )
  );

-- Usuarios pueden insertarse a sí mismos
CREATE POLICY "couple_members_insert" ON public.couple_members
  FOR INSERT WITH CHECK (user_id = auth.uid());


-- ─────────────────────────────────────────────
-- TABLA: rituals (catálogo de rituales)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rituals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text NOT NULL CHECK (category IN ('conexion', 'diversion', 'intimidad', 'reto')),
  prompt      text NOT NULL,
  challenge   text,
  difficulty  int DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  premium     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- RLS: rituales son públicos para autenticados
ALTER TABLE public.rituals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rituals_select_authenticated" ON public.rituals
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ─────────────────────────────────────────────
-- TABLA: couple_ritual_sessions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.couple_ritual_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id             uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  ritual_id             uuid NOT NULL REFERENCES public.rituals(id),
  session_date          date NOT NULL DEFAULT CURRENT_DATE,
  user1_id              uuid REFERENCES auth.users(id),
  user2_id              uuid REFERENCES auth.users(id),
  user1_response        text,
  user2_response        text,
  user1_completed_at    timestamptz,
  user2_completed_at    timestamptz,
  revealed_at           timestamptz,
  UNIQUE(couple_id, session_date)
);

-- RLS
ALTER TABLE public.couple_ritual_sessions ENABLE ROW LEVEL SECURITY;

-- Miembros de la pareja pueden ver sus sesiones
CREATE POLICY "sessions_select_member" ON public.couple_ritual_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_ritual_sessions.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- Miembros pueden crear sesión del día
CREATE POLICY "sessions_insert_member" ON public.couple_ritual_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_ritual_sessions.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- Miembros pueden actualizar (responder)
CREATE POLICY "sessions_update_member" ON public.couple_ritual_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_ritual_sessions.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- Habilitar Realtime para el reveal sincronizado
ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_ritual_sessions;


-- ─────────────────────────────────────────────
-- TABLA: streaks
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.streaks (
  couple_id              uuid PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  current_streak         int DEFAULT 0,
  longest_streak         int DEFAULT 0,
  last_completed_date    date,
  wildcards_remaining    int DEFAULT 1
);

-- RLS
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "streaks_select_member" ON public.streaks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = streaks.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE POLICY "streaks_insert_member" ON public.streaks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = streaks.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

CREATE POLICY "streaks_update_member" ON public.streaks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = streaks.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );


-- ============================================================
-- SEED: 40 rituales en 4 categorías
-- ============================================================

INSERT INTO public.rituals (category, prompt, challenge, difficulty) VALUES

-- CONEXIÓN (10 rituales)
('conexion', '¿Cuál es el recuerdo de nosotros que más guardás en tu corazón?', NULL, 1),
('conexion', '¿Qué es lo que más admirás de mí en este momento de tu vida?', NULL, 1),
('conexion', '¿Cuándo fue la última vez que te sentiste completamente entendido/a por mí?', NULL, 2),
('conexion', '¿Qué parte de mi personalidad te sorprendió después de que nos conocimos?', NULL, 1),
('conexion', '¿Qué cosa tuya creés que yo no comprendo del todo todavía?', NULL, 2),
('conexion', '¿Cuál es el momento en que más me necesitaste y yo estuve ahí?', NULL, 2),
('conexion', '¿Qué sueño tuyo querés que yo apoye más activamente?', NULL, 1),
('conexion', '¿Qué frase o gesto mío te hace sentir más amado/a?', NULL, 1),
('conexion', '¿Hay algo que tenés ganas de contarme hace tiempo y no encontraste el momento?', NULL, 3),
('conexion', '¿Cómo imaginás nuestra vida en 5 años?', NULL, 1),

-- DIVERSIÓN (10 rituales)
('diversion', '¿Si pudiéramos ir a cualquier lugar del mundo mañana, a dónde iríamos y qué haríamos primero?', NULL, 1),
('diversion', '¿Cuál sería nuestra película perfecta para ver esta noche?', 'Elijan una y pónenla.', 1),
('diversion', '¿Qué canción sería el himno oficial de nuestra relación y por qué?', NULL, 1),
('diversion', '¿Cuál fue el momento más ridículo que vivimos juntos?', NULL, 1),
('diversion', '¿Si tuviéramos un negocio juntos, de qué sería y cómo se llamaría?', NULL, 1),
('diversion', '¿Qué habilidad del otro envidiás en secreto?', NULL, 1),
('diversion', '¿Cuál es el hábito más raro que tenés y que el otro ya aceptó como normal?', NULL, 1),
('diversion', '¿Si pudiéramos intercambiar roles por un día, qué harías siendo yo?', NULL, 2),
('diversion', '¿Cuál es la cosa más espontánea que quisiste hacer conmigo y nunca dijiste?', 'Agéndala para este mes.', 2),
('diversion', '¿Qué animal serías y qué animal sería yo? Justificá.', NULL, 1),

-- INTIMIDAD (10 rituales)
('intimidad', '¿Qué es lo que más te gusta de estar cerca de mí físicamente?', NULL, 2),
('intimidad', '¿Cuándo fue la última vez que te sentiste completamente deseado/a por mí?', NULL, 2),
('intimidad', '¿Qué pequeño gesto mío te hace sentir más querido/a?', NULL, 1),
('intimidad', '¿Hay algo que quisiste pedirme o proponerme pero no te animaste?', NULL, 3),
('intimidad', '¿Qué necesitás de mí que últimamente no estás recibiendo?', NULL, 3),
('intimidad', '¿Cuál es tu forma favorita de que te dé cariño?', NULL, 1),
('intimidad', '¿Qué parte de nuestro tiempo juntos extrañás cuando no estamos?', NULL, 2),
('intimidad', '¿Qué cosa nueva te gustaría probar o explorar juntos?', NULL, 2),
('intimidad', '¿En qué momento sentiste que nos conectamos de una forma diferente?', NULL, 2),
('intimidad', '¿Cuál es el lugar donde te sentís más en paz cuando estás conmigo?', NULL, 1),

-- RETO (10 rituales)
('reto', 'Mandame un audio ahora diciéndome algo que me tenías ganas de decir.', 'El otro no puede responder hasta que escuche el audio completo.', 2),
('reto', '¿Cuál es la conversación que venimos postergando y necesitamos tener?', 'Tienen 5 minutos para hablarla ahora.', 3),
('reto', 'Escribí 3 cosas específicas que el otro hace que hacen más fácil tu vida.', NULL, 1),
('reto', 'Sin usar palabras, mostrá cómo te sentís con nuestra relación hoy.', 'Foto, dibujo, emoji, lo que sea.', 2),
('reto', '¿Cuál es algo que le darías las gracias al otro pero nunca lo dijiste en voz alta?', 'Díselo ahora.', 2),
('reto', 'Buscá una foto de un recuerdo juntos y contá por qué ese momento fue especial.', NULL, 1),
('reto', '¿Cuál es el próximo plan que querés que hagamos juntos? Poné una fecha.', NULL, 1),
('reto', '¿Qué cosa de la semana pasada del otro notaste pero no comentaste?', NULL, 2),
('reto', 'Describí cómo fue el día del otro hoy, sin que te cuente nada. ¿Acertaste?', NULL, 2),
('reto', '¿Qué cosa de vos mismo/a querés mejorar y necesitás que yo te apoye?', NULL, 3);
