-- Sprint 4 (resto) + resolución de rituals.premium huérfano.
--
-- rituals.premium (migración 013, 30 rituales en viajes/planes/fantasías)
-- quedó sin ningún mecanismo que lo sirviera desde que se retiró
-- suscripciones (ver docs/DEUDA-TECNICA.md). Se parte a la mitad: 5 por
-- categoría (15 en total) pasan a ser gratis para siempre y entran ya
-- mismo a la rotación diaria normal; los otros 15 quedan reservados para
-- el desbloqueo con créditos (unlock_rituales_especiales), permanente por
-- pareja.
with numerados as (
  select id, row_number() over (partition by category order by created_at, id) as rn
  from public.rituals
  where premium = true
)
update public.rituals r
set premium = false
from numerados n
where r.id = n.id and n.rn <= 5;

alter table public.couples
  add column if not exists rituales_especiales_desbloqueados boolean not null default false;

-- get_ritual_page_data(): la elegibilidad de "premium" ahora depende de si
-- la pareja desbloqueó rituales especiales (antes dependía de
-- subscriptions, que ya no existe). De paso se corrige el chequeo de "no
-- repetir el ritual de ayer": antes tomaba el de CUALQUIER pareja al azar
-- (inofensivo mientras el pool era 100% global e idéntico para todos);
-- ahora que el pool puede diferir según si la pareja desbloqueó o no,
-- tiene que ser el de esta pareja específicamente.
create or replace function public.get_ritual_page_data()
returns jsonb
language plpgsql
as $function$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_profile jsonb;
  v_couple jsonb;
  v_partner_profile jsonb;
  v_today date;
  v_session jsonb;
  v_streak jsonb;
  v_day_of_year int;
  v_ritual_count int;
  v_ritual_id uuid;
  v_offset int;
  v_yesterday_ritual_id uuid;
  v_user1 uuid;
  v_user2 uuid;
  v_unlocked boolean := false;
begin
  if v_user_id is null then
    return null;
  end if;

  select to_jsonb(p) into v_profile from public.profiles p where p.id = v_user_id;

  select cm.couple_id into v_couple_id
  from public.couple_members cm
  where cm.user_id = v_user_id
  limit 1;

  if v_couple_id is null then
    return jsonb_build_object(
      'context', jsonb_build_object(
        'userId', v_user_id, 'profile', v_profile, 'couple', null, 'partnerProfile', null
      ),
      'session', null,
      'streak', null
    );
  end if;

  select to_jsonb(c) into v_couple from public.couples c where c.id = v_couple_id;
  select c.rituales_especiales_desbloqueados into v_unlocked from public.couples c where c.id = v_couple_id;

  select to_jsonb(p) into v_partner_profile
  from public.profiles p
  where p.id = (
    select cm2.user_id from public.couple_members cm2
    where cm2.couple_id = v_couple_id and cm2.user_id <> v_user_id
    limit 1
  );

  v_today := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  select jsonb_build_object(
    'id', crs.id, 'couple_id', crs.couple_id, 'ritual_id', crs.ritual_id,
    'session_date', crs.session_date, 'user1_id', crs.user1_id, 'user2_id', crs.user2_id,
    'user1_response', crs.user1_response, 'user2_response', crs.user2_response,
    'user1_completed_at', crs.user1_completed_at, 'user2_completed_at', crs.user2_completed_at,
    'revealed_at', crs.revealed_at,
    'ritual', to_jsonb(r)
  ) into v_session
  from public.couple_ritual_sessions crs
  join public.rituals r on r.id = crs.ritual_id
  where crs.couple_id = v_couple_id and crs.session_date = v_today;

  if v_session is null then
    v_day_of_year := to_char(v_today, 'DDD')::int;

    select count(*) into v_ritual_count from public.rituals where premium = false or v_unlocked;

    if v_ritual_count > 0 then
      v_offset := v_day_of_year % v_ritual_count;

      select id into v_ritual_id
      from public.rituals
      where premium = false or v_unlocked
      order by created_at asc, id asc
      offset v_offset
      limit 1;

      select crs2.ritual_id into v_yesterday_ritual_id
      from public.couple_ritual_sessions crs2
      where crs2.couple_id = v_couple_id and crs2.session_date = v_today - 1
      limit 1;

      if v_ritual_count > 1 and v_ritual_id = v_yesterday_ritual_id then
        select id into v_ritual_id
        from public.rituals
        where premium = false or v_unlocked
        order by created_at asc, id asc
        offset (v_offset + 1) % v_ritual_count
        limit 1;
      end if;

      select cm.user_id into v_user1
      from public.couple_members cm
      where cm.couple_id = v_couple_id
      order by cm.joined_at asc
      limit 1;

      select cm.user_id into v_user2
      from public.couple_members cm
      where cm.couple_id = v_couple_id and cm.user_id <> v_user1
      limit 1;

      insert into public.couple_ritual_sessions (couple_id, ritual_id, session_date, user1_id, user2_id)
      values (v_couple_id, v_ritual_id, v_today, v_user1, v_user2)
      on conflict (couple_id, session_date) do nothing;

      select jsonb_build_object(
        'id', crs.id, 'couple_id', crs.couple_id, 'ritual_id', crs.ritual_id,
        'session_date', crs.session_date, 'user1_id', crs.user1_id, 'user2_id', crs.user2_id,
        'user1_response', crs.user1_response, 'user2_response', crs.user2_response,
        'user1_completed_at', crs.user1_completed_at, 'user2_completed_at', crs.user2_completed_at,
        'revealed_at', crs.revealed_at,
        'ritual', to_jsonb(r)
      ) into v_session
      from public.couple_ritual_sessions crs
      join public.rituals r on r.id = crs.ritual_id
      where crs.couple_id = v_couple_id and crs.session_date = v_today;
    end if;
  end if;

  select to_jsonb(s) into v_streak from public.streaks s where s.couple_id = v_couple_id;

  return jsonb_build_object(
    'context', jsonb_build_object(
      'userId', v_user_id, 'profile', v_profile, 'couple', v_couple, 'partnerProfile', v_partner_profile
    ),
    'session', v_session,
    'streak', v_streak
  );
end;
$function$;

-- unlock_rituales_especiales(): desbloqueo permanente por pareja, pagado
-- con créditos (30, ver lib/credits.ts). Mismo patrón atómico que
-- consume_credits (FOR UPDATE + streak_bonus primero + idempotency_key),
-- pero además marca couples.rituales_especiales_desbloqueados = true en
-- la misma transacción -- evita el problema de "cobré pero no desbloqueé"
-- de dos llamadas separadas. SECURITY DEFINER porque couples_update_member
-- dejaría a cualquier miembro poner el flag en true gratis si esto fuera
-- un simple .update() desde el cliente.
create or replace function public.unlock_rituales_especiales(p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_already boolean;
  v_row couple_credits%rowtype;
  v_from_streak int;
  v_from_balance int;
  v_new_balance int;
  v_amount constant int := 30;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select cm.couple_id into v_couple_id from couple_members cm where cm.user_id = v_user_id limit 1;
  if v_couple_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_couple');
  end if;

  select rituales_especiales_desbloqueados into v_already from couples where id = v_couple_id;
  if v_already then
    return jsonb_build_object('ok', true, 'already_unlocked', true);
  end if;

  if exists (select 1 from credit_transactions where idempotency_key = p_idempotency_key) then
    update couples set rituales_especiales_desbloqueados = true where id = v_couple_id;
    return jsonb_build_object('ok', true, 'idempotent', true);
  end if;

  select * into v_row from couple_credits where couple_id = v_couple_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_credits_row');
  end if;

  if v_row.streak_bonus_expires_at is null or now() > v_row.streak_bonus_expires_at then
    v_row.streak_bonus := 0;
  end if;

  if (v_row.streak_bonus + v_row.balance) < v_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'balance', v_row.balance + v_row.streak_bonus);
  end if;

  v_from_streak := least(v_row.streak_bonus, v_amount);
  v_from_balance := v_amount - v_from_streak;
  v_new_balance := v_row.balance - v_from_balance;

  update couple_credits
  set balance = v_new_balance,
      streak_bonus = v_row.streak_bonus - v_from_streak,
      updated_at = now()
  where couple_id = v_couple_id;

  insert into credit_transactions (couple_id, user_id, type, amount, balance_after, feature, idempotency_key)
  values (v_couple_id, v_user_id, 'consumo_ia', -v_amount, v_new_balance, 'rituales_especiales', p_idempotency_key);

  update couples set rituales_especiales_desbloqueados = true where id = v_couple_id;

  return jsonb_build_object('ok', true, 'balance', v_new_balance);
end;
$function$;

revoke all on function public.unlock_rituales_especiales(uuid) from public;
grant execute on function public.unlock_rituales_especiales(uuid) to authenticated;

-- get_couple_insights(): resumen semanal + detección de patrones (Sprint
-- 4, "insights emocionales"). Categorías calculadas dinámicamente desde
-- rituals elegibles para la pareja (no hardcodeadas) porque ahora hay 7
-- categorías posibles, no 4 -- ver el split de arriba.
create or replace function public.get_couple_insights()
returns jsonb
language plpgsql
as $function$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_unlocked boolean := false;
  v_semana_count int := 0;
  v_semana_anterior_count int := 0;
  v_categoria_top text;
  v_categoria_evitada text;
  v_total_mes int := 0;
  v_tendencia text;
begin
  if v_user_id is null then
    return null;
  end if;

  select cm.couple_id into v_couple_id from couple_members cm where cm.user_id = v_user_id limit 1;
  if v_couple_id is null then
    return null;
  end if;

  select c.rituales_especiales_desbloqueados into v_unlocked from couples c where c.id = v_couple_id;

  select count(*) into v_semana_count
  from couple_ritual_sessions crs
  where crs.couple_id = v_couple_id and crs.revealed_at >= now() - interval '7 days';

  select count(*) into v_semana_anterior_count
  from couple_ritual_sessions crs
  where crs.couple_id = v_couple_id
    and crs.revealed_at >= now() - interval '14 days'
    and crs.revealed_at < now() - interval '7 days';

  select r.category into v_categoria_top
  from couple_ritual_sessions crs
  join rituals r on r.id = crs.ritual_id
  where crs.couple_id = v_couple_id and crs.revealed_at >= now() - interval '7 days'
  group by r.category
  order by count(*) desc, r.category asc
  limit 1;

  select count(*) into v_total_mes
  from couple_ritual_sessions crs
  where crs.couple_id = v_couple_id and crs.revealed_at >= now() - interval '30 days';

  -- Con poca actividad el "mínimo" es ruido (una pareja nueva "evita"
  -- todo menos lo primero que le tocó) -- se pide un piso de 8 rituales
  -- revelados en el mes para recién ahí hablar de patrón.
  if v_total_mes >= 8 then
    select cat.category into v_categoria_evitada
    from (
      select distinct r.category
      from rituals r
      where r.premium = false or v_unlocked
    ) cat
    left join (
      select r.category, count(*) as n
      from couple_ritual_sessions crs
      join rituals r on r.id = crs.ritual_id
      where crs.couple_id = v_couple_id and crs.revealed_at >= now() - interval '30 days'
      group by r.category
    ) counts on counts.category = cat.category
    order by coalesce(counts.n, 0) asc, cat.category asc
    limit 1;
  end if;

  if v_semana_anterior_count = 0 and v_semana_count = 0 then
    v_tendencia := null;
  elsif v_semana_count > v_semana_anterior_count then
    v_tendencia := 'mas';
  elsif v_semana_count < v_semana_anterior_count then
    v_tendencia := 'menos';
  else
    v_tendencia := 'igual';
  end if;

  return jsonb_build_object(
    'semanaCompletados', v_semana_count,
    'categoriaTop', v_categoria_top,
    'tendencia', v_tendencia,
    'categoriaEvitada', v_categoria_evitada
  );
end;
$function$;

grant execute on function public.get_couple_insights() to authenticated;
