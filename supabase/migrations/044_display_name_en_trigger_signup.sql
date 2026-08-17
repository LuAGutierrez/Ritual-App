-- ============================================================
-- Migración 044: guardar display_name al registrarse
--
-- handle_new_user() (migración 004) solo copiaba id/email a profiles,
-- nunca leyó display_name -- el nombre que se tipea en /auth al
-- registrarse (enviado como raw_user_meta_data->>'display_name' via
-- signUp options.data) se perdía siempre. El único código que sí lo
-- guardaba era un upsert client-side en app/auth/page.tsx, pero ese
-- upsert solo corre si signUp() devuelve sesión inmediata -- con
-- confirmación de email obligatoria (estado actual en producción),
-- signUp() nunca devuelve sesión inmediata, así que ese upsert nunca
-- se ejecutaba. Resultado: /onboarding siempre repreguntaba el nombre,
-- no como repregunta cosmética sino porque nunca se había guardado.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$;
