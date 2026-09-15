-- Backlog: "Invitar a un amigo / referido". Sistema separado del invite
-- de pareja (couples.invite_code): acá cualquier usuario invita a OTRA
-- persona a crearse una cuenta, y gana créditos cuando esa persona
-- realmente arranca a usar la app (queda emparejada con su propia
-- pareja) -- no solo por registrarse, para no regalar créditos por un
-- email vacío que nunca vuelve.

-- profiles.referral_code: mismo patrón que couples.invite_code (migración
-- 006), código de 6 caracteres. Backfill primero (cada UPDATE evalúa
-- random() por fila), constraint UNIQUE y default recién después.
alter table public.profiles add column if not exists referral_code text;

update public.profiles
set referral_code = upper(substring(md5(random()::text || id::text || clock_timestamp()::text), 1, 6))
where referral_code is null;

alter table public.profiles alter column referral_code set not null;
alter table public.profiles add constraint profiles_referral_code_key unique (referral_code);
alter table public.profiles alter column referral_code
  set default upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));

create table public.referrals (
  id             uuid primary key default gen_random_uuid(),
  referrer_id    uuid not null references public.profiles(id) on delete cascade,
  referred_id    uuid not null unique references public.profiles(id) on delete cascade,
  bonus_granted  boolean not null default false,
  risk_flagged   boolean not null default false,
  created_at     timestamptz not null default now(),
  check (referrer_id <> referred_id)
);

create index referrals_referrer_idx on public.referrals(referrer_id);

alter table public.referrals enable row level security;

create policy "referrals_select_own" on public.referrals
  for select using (referrer_id = auth.uid() or referred_id = auth.uid());

alter table public.credit_transactions drop constraint credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check
  check (type in (
    'welcome_signup', 'pairing_bonus', 'streak_daily', 'purchase',
    'consumo_ia', 'refund', 'admin_adjustment', 'referral_bonus'
  ));

-- handle_new_user: si el signup trae referred_by (código, seteado por
-- /auth desde ?ref=CODE en raw_user_meta_data), registra el referral. No
-- otorga créditos acá todavía -- ver grant_referral_bonus_if_pending.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_referrer_id uuid;
  v_ref_code text := new.raw_user_meta_data->>'referred_by';
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name');

  insert into public.user_credits (user_id, balance) values (new.id, 50);

  insert into public.credit_transactions (couple_id, user_id, type, amount, balance_after)
  values (NULL, new.id, 'welcome_signup', 50, 50);

  if v_ref_code is not null and v_ref_code <> '' then
    select id into v_referrer_id from public.profiles where referral_code = upper(v_ref_code) and id <> new.id;
    if v_referrer_id is not null then
      insert into public.referrals (referrer_id, referred_id) values (v_referrer_id, new.id)
      on conflict (referred_id) do nothing;
    end if;
  end if;

  return new;
end;
$function$;

-- grant_referral_bonus_if_pending: se llama desde join_couple_by_invite,
-- mismo momento en que grant_pairing_bonus ya corre -- ahí couple_credits
-- ya existe para p_couple_id (recién creada o ya existente), y ya hay
-- fingerprints registrados (se graban en /onboarding y /unirse antes de
-- llegar acá), así que el chequeo anti-farmeo tiene datos reales.
--
-- 30 créditos al referente, una sola vez por referido (bonus_granted).
-- Si el referente tiene pareja propia pero SIN couple_credits todavía
-- (su propio partner no se unió aún) no se acredita nada: su
-- user_credits personal quedaría en cero apenas se empareje
-- (grant_pairing_bonus lo resetea, no lo transfiere -- ver DECISIONES.md)
-- y perderíamos el bono en el camino. Caso raro (exige que el referente
-- esté siendo referido Y vinculándose él mismo a la vez); se documenta en
-- vez de resolverse con más complejidad.
create or replace function public.grant_referral_bonus_if_pending(p_couple_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_referral referrals%rowtype;
  v_risk boolean;
  v_amount int;
  v_new_balance int;
  v_referrer_couple_id uuid;
  v_has_couple_credits boolean;
begin
  select r.* into v_referral
  from referrals r
  join couple_members cm on cm.user_id = r.referred_id
  where cm.couple_id = p_couple_id and r.bonus_granted = false
  limit 1;

  if not found then
    return;
  end if;

  select exists (
    select 1
    from device_fingerprints df
    join credit_transactions ct on ct.user_id = df.user_id and ct.type = 'referral_bonus'
    where df.fingerprint_hash in (
      select fingerprint_hash from device_fingerprints where user_id = v_referral.referred_id
    )
  ) into v_risk;

  v_amount := case when v_risk then 0 else 30 end;

  update referrals set bonus_granted = true, risk_flagged = v_risk where id = v_referral.id;

  if v_amount = 0 then
    return;
  end if;

  select cm.couple_id into v_referrer_couple_id from couple_members cm where cm.user_id = v_referral.referrer_id limit 1;

  if v_referrer_couple_id is not null then
    select exists(select 1 from couple_credits where couple_id = v_referrer_couple_id) into v_has_couple_credits;
  else
    v_has_couple_credits := false;
  end if;

  if v_has_couple_credits then
    update couple_credits set balance = balance + v_amount, updated_at = now()
    where couple_id = v_referrer_couple_id
    returning balance into v_new_balance;

    insert into credit_transactions (couple_id, user_id, type, amount, balance_after, metadata)
    values (v_referrer_couple_id, v_referral.referrer_id, 'referral_bonus', v_amount, v_new_balance,
            jsonb_build_object('referred_id', v_referral.referred_id));
  elsif v_referrer_couple_id is null then
    update user_credits set balance = balance + v_amount, updated_at = now()
    where user_id = v_referral.referrer_id
    returning balance into v_new_balance;

    insert into credit_transactions (couple_id, user_id, type, amount, balance_after, metadata)
    values (NULL, v_referral.referrer_id, 'referral_bonus', v_amount, v_new_balance,
            jsonb_build_object('referred_id', v_referral.referred_id));
  end if;
  -- else: referente en limbo (pareja creada, sin couple_credits) -- sin acreditar, ver comentario arriba.
end;
$function$;

revoke all on function public.grant_referral_bonus_if_pending(uuid) from public, anon, authenticated;

create or replace function public.join_couple_by_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_couple_id uuid;
  v_count int;
  v_user_id uuid := auth.uid();
  v_recent_attempts int;
  v_existing_couple_id uuid;
  v_other_user_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  SELECT count(*) INTO v_recent_attempts
  FROM public.invite_attempts
  WHERE user_id = v_user_id AND attempted_at > now() - interval '15 minutes';

  IF v_recent_attempts >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Demasiados intentos. Esperá unos minutos y probá de nuevo.');
  END IF;

  INSERT INTO public.invite_attempts (user_id) VALUES (v_user_id);

  SELECT id INTO v_couple_id
  FROM couples
  WHERE invite_code = upper(trim(p_code));

  IF v_couple_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código de invitación inválido');
  END IF;

  IF EXISTS (
    SELECT 1 FROM couple_members
    WHERE couple_id = v_couple_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already_member', true);
  END IF;

  SELECT couple_id INTO v_existing_couple_id
  FROM couple_members
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_existing_couple_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ya tenés una pareja vinculada. No podés unirte a otra.');
  END IF;

  SELECT count(*)::int INTO v_count
  FROM couple_members
  WHERE couple_id = v_couple_id;

  IF v_count >= 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esta pareja ya tiene dos integrantes');
  END IF;

  SELECT user_id INTO v_other_user_id FROM couple_members WHERE couple_id = v_couple_id LIMIT 1;

  INSERT INTO couple_members (user_id, couple_id)
  VALUES (v_user_id, v_couple_id);

  PERFORM grant_pairing_bonus(v_couple_id, v_user_id, v_other_user_id);
  PERFORM grant_referral_bonus_if_pending(v_couple_id);

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'already_member', true);
END;
$function$;

-- get_referral_info: código propio + cuántos referidos ya se activaron
-- (para mostrar en /perfil). SECURITY INVOKER (default) alcanza porque
-- solo lee columnas del propio usuario vía RLS de referrals.
create or replace function public.get_referral_info()
returns jsonb
language plpgsql
as $function$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_activados int;
  v_pendientes int;
begin
  if v_user_id is null then
    return null;
  end if;

  select referral_code into v_code from profiles where id = v_user_id;

  select count(*) filter (where bonus_granted), count(*) filter (where not bonus_granted)
  into v_activados, v_pendientes
  from referrals where referrer_id = v_user_id;

  return jsonb_build_object(
    'referralCode', v_code,
    'activados', coalesce(v_activados, 0),
    'pendientes', coalesce(v_pendientes, 0)
  );
end;
$function$;

grant execute on function public.get_referral_info() to authenticated;
