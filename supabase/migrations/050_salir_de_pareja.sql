-- ============================================================
-- Migración 050: salir de la pareja + cerrar el último agujero de
-- "un usuario en dos parejas" (crearPareja(), no cubierto por la 049)
--
-- La 049 le puso un candado a join_couple_by_invite/check_invite_code,
-- pero crearPareja() (app/actions/couple.ts) hace un INSERT directo a
-- couple_members sin pasar por ninguna de las dos funciones -- seguía
-- siendo posible terminar en dos parejas por ese camino. En vez de
-- agregar el mismo chequeo a mano en un tercer lugar, esta vez el
-- candado va en el esquema: un UNIQUE en couple_members.user_id hace
-- estructuralmente imposible una segunda fila, sin importar por qué
-- código se intente. Ya se confirmó que no hay duplicados hoy (se
-- limpió el único caso real que existía).
--
-- De paso, sin forma de salir de una pareja no había manera de
-- recuperarse de una separación real: con el candado de la 049 puesto,
-- alguien que ya no está con su pareja quedaba trabado para siempre.
-- leave_couple() borra solo la fila del que llama -- la pareja y su
-- historial (rituales, streaks, rondas de juegos) quedan intactos
-- para el otro lado, que pasa a verse como "todavía no se unió nadie"
-- (mismo estado que ya maneja toda la UI).
-- ============================================================

ALTER TABLE public.couple_members
  ADD CONSTRAINT couple_members_user_id_unique UNIQUE (user_id);

CREATE OR REPLACE FUNCTION public.leave_couple()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  DELETE FROM public.couple_members WHERE user_id = v_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.leave_couple() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_couple() TO authenticated;
