-- Backlog: "Cambiar el ritual del día (una vez por semana) si no les
-- gustó" (docs/ROADMAP.md). Solo permitido mientras nadie respondió
-- todavía -- cambiar el ritual después de que alguien ya contestó dejaría
-- esa respuesta apuntando a una pregunta distinta a la que ve el otro.
alter table public.couples
  add column if not exists ritual_changed_at timestamptz;

-- SECURITY DEFINER: elige un ritual al azar (no determinístico como el de
-- todos los días -- acá el pedido es explícitamente "denme otra cosa", no
-- "la siguiente de la fórmula") entre los elegibles para la pareja,
-- excluyendo el actual, y lo escribe en la sesión de hoy. FOR UPDATE sobre
-- la sesión evita una carrera si los dos miembros tocan "cambiar" y
-- "responder" casi al mismo tiempo.
create or replace function public.cambiar_ritual_del_dia()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_unlocked boolean := false;
  v_ritual_changed_at timestamptz;
  v_today date;
  v_session couple_ritual_sessions%rowtype;
  v_new_ritual_id uuid;
  v_ritual jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select cm.couple_id into v_couple_id from couple_members cm where cm.user_id = v_user_id limit 1;
  if v_couple_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_couple');
  end if;

  select rituales_especiales_desbloqueados, ritual_changed_at into v_unlocked, v_ritual_changed_at
  from couples where id = v_couple_id;

  if v_ritual_changed_at is not null and now() - v_ritual_changed_at < interval '7 days' then
    return jsonb_build_object(
      'ok', false, 'error', 'cooldown',
      'nextAt', v_ritual_changed_at + interval '7 days'
    );
  end if;

  v_today := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  select * into v_session
  from couple_ritual_sessions
  where couple_id = v_couple_id and session_date = v_today
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_session');
  end if;

  if v_session.user1_completed_at is not null or v_session.user2_completed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_responded');
  end if;

  select id into v_new_ritual_id
  from rituals
  where (premium = false or v_unlocked) and id <> v_session.ritual_id
  order by random()
  limit 1;

  if v_new_ritual_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_alternative');
  end if;

  update couple_ritual_sessions set ritual_id = v_new_ritual_id where id = v_session.id;
  update couples set ritual_changed_at = now() where id = v_couple_id;

  select to_jsonb(r) into v_ritual from rituals r where r.id = v_new_ritual_id;

  return jsonb_build_object('ok', true, 'ritual', v_ritual);
end;
$function$;

grant execute on function public.cambiar_ritual_del_dia() to authenticated;
