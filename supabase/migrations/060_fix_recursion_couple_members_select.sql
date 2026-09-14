-- ============================================================
-- Migración 060: fix de recursión infinita en couple_members_select
--
-- Bug preexistente (migración 006, no relacionado al sistema de
-- créditos) encontrado mientras se probaba la UI de Sprint 5 en el
-- navegador: la policy de SELECT sobre couple_members hace un EXISTS
-- contra la propia tabla couple_members --
--
--   CREATE POLICY "couple_members_select" ON public.couple_members
--     FOR SELECT USING (
--       user_id = auth.uid()
--       OR EXISTS (SELECT 1 FROM public.couple_members cm2 WHERE ...)
--     );
--
-- -- y evaluar esa policy para leer la fila vuelve a evaluar la MISMA
-- policy para leer "cm2", que a su vez... El Postgres que trae la
-- versión actual de la CLI local (`npx supabase --version`, ver
-- ROADMAP) lo detecta como recursión infinita real (42P17) y corta
-- cualquier lectura de couple_members hecha por el cliente autenticado
-- -- que es la que usa getUserContextAction() en TODAS las páginas
-- protegidas, no solo las nuevas. Confirmado con un cliente autenticado
-- llamando `.from('couple_members').select(...)` directo, fuera de
-- cualquier código de Sprint 5, y reproducido también con las
-- migraciones 055-059 removidas -- 100% independiente de ese trabajo.
--
-- No hay evidencia de que esto rompa producción hoy (el registro,
-- login y juegos ya vienen funcionando ahí según la memoria del
-- proyecto) -- probablemente la versión de Postgres en el proyecto
-- remoto todavía tolera este patrón. Igual es un bug real, latente:
-- alcanza con que Supabase actualice la versión de Postgres del
-- proyecto para que se rompa en producción sin aviso. Vale la pena
-- tenerlo arreglado ya en el repo en vez de esperar a que explote.
--
-- Fix: mover la lectura recursiva a una función SECURITY DEFINER, que
-- al ejecutar como el dueño de la función (no como el rol autenticado)
-- no vuelve a pasar por RLS -- mismo patrón que ya usa el resto del
-- proyecto para RPCs (join_couple_by_invite, leave_couple, etc.), acá
-- aplicado adentro de una policy en vez de un RPC completo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.my_couple_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT couple_id FROM public.couple_members WHERE user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "couple_members_select" ON public.couple_members;

-- Mismo comportamiento que antes (podés ver tu propia fila, y las de
-- quien comparte tu couple_id) -- couple_members_user_id_unique
-- (migración 050) garantiza que my_couple_id() devuelve a lo sumo un
-- valor, así que esto sigue siendo "ver mi pareja", no "ver cualquier
-- pareja".
CREATE POLICY "couple_members_select" ON public.couple_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR couple_id = public.my_couple_id()
  );
