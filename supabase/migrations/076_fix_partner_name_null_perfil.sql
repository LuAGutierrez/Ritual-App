-- get_perfil_page_data(): el inviteCode se mostraba (y con él el mensaje
-- "Tu pareja todavía no se unió") cada vez que el partner_name daba null,
-- pero eso pasa tanto si nadie se unió como si se unió sin completar el
-- nombre (ver app/unirse/[code]/page.tsx, que hasta ahora no pedía nombre).
-- El chequeo correcto es la cantidad de miembros en couple_members, no el
-- display_name del otro.
create or replace function public.get_perfil_page_data()
returns jsonb
language plpgsql
as $function$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_profile jsonb;
  v_streak jsonb;
  v_rituales_completados int := 0;
  v_categoria_favorita text;
  v_partner_name text;
  v_invite_code text;
  v_partner_joined boolean;
begin
  if v_user_id is null then
    return null;
  end if;

  select to_jsonb(p) into v_profile from public.profiles p where p.id = v_user_id;
  if v_profile is null then
    return null;
  end if;

  select cm.couple_id into v_couple_id
  from public.couple_members cm
  where cm.user_id = v_user_id
  limit 1;

  if v_couple_id is null then
    return jsonb_build_object(
      'profile', v_profile, 'streak', null, 'ritualesCompletados', 0,
      'categoriaFavorita', null, 'partnerName', null,
      'inviteCode', null
    );
  end if;

  select to_jsonb(s) into v_streak from public.streaks s where s.couple_id = v_couple_id;

  select count(*) into v_rituales_completados
  from public.couple_ritual_sessions crs
  where crs.couple_id = v_couple_id and crs.revealed_at is not null;

  select r.category into v_categoria_favorita
  from public.couple_ritual_sessions crs
  join public.rituals r on r.id = crs.ritual_id
  where crs.couple_id = v_couple_id and crs.revealed_at is not null
  group by r.category
  order by count(*) desc, r.category asc
  limit 1;

  select exists (
    select 1 from public.couple_members cm2
    where cm2.couple_id = v_couple_id and cm2.user_id <> v_user_id
  ) into v_partner_joined;

  if v_partner_joined then
    select p.display_name into v_partner_name
    from public.profiles p
    where p.id = (
      select cm2.user_id from public.couple_members cm2
      where cm2.couple_id = v_couple_id and cm2.user_id <> v_user_id
      limit 1
    );
  else
    select c.invite_code into v_invite_code from public.couples c where c.id = v_couple_id;
  end if;

  return jsonb_build_object(
    'profile', v_profile,
    'streak', v_streak,
    'ritualesCompletados', v_rituales_completados,
    'categoriaFavorita', v_categoria_favorita,
    'partnerName', v_partner_name,
    'inviteCode', v_invite_code
  );
end;
$function$;
