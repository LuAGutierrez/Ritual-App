-- Extiende el sistema de referidos (migración 071) a signups por Google.
-- handle_new_user() solo puede leer raw_user_meta_data, y esa metadata la
-- llena Google en el signup por OAuth (nombre/avatar/email) -- no hay forma
-- de inyectarle "referred_by" ahí como sí se hace en el signUp() por
-- email/contraseña. Se resuelve aparte: el código viaja en la URL de
-- vuelta del callback OAuth y se linkea acá.
--
-- link_referral_for_new_oauth_user: SECURITY DEFINER para poder leer
-- auth.users.created_at (authenticated no tiene acceso al schema auth) y
-- así confirmar que la cuenta se acaba de crear -- sin este chequeo,
-- cualquier cuenta ya existente podría clickear el link de un amigo meses
-- después y generarle el bono igual. Ventana de 5 minutos: de sobra para
-- el round-trip de OAuth, corta para que sea inútil como fraude.
create or replace function public.link_referral_for_new_oauth_user(p_ref_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_created_at timestamptz;
  v_referrer_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_ref_code is null or p_ref_code = '' then
    return jsonb_build_object('ok', false, 'error', 'no_code');
  end if;

  select created_at into v_created_at from auth.users where id = v_user_id;

  if v_created_at is null or now() - v_created_at > interval '5 minutes' then
    return jsonb_build_object('ok', false, 'error', 'not_new_account');
  end if;

  if exists (select 1 from referrals where referred_id = v_user_id) then
    return jsonb_build_object('ok', true, 'already_linked', true);
  end if;

  select id into v_referrer_id from profiles where referral_code = upper(p_ref_code) and id <> v_user_id;

  if v_referrer_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  insert into referrals (referrer_id, referred_id) values (v_referrer_id, v_user_id)
  on conflict (referred_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$function$;

grant execute on function public.link_referral_for_new_oauth_user(text) to authenticated;
revoke execute on function public.link_referral_for_new_oauth_user(text) from anon;
