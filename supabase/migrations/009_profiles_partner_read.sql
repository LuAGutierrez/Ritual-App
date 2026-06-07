-- Ritual — Permitir leer el perfil de la pareja vinculada
-- Sin esto, getUserContextAction no puede obtener display_name del partner (RLS bloquea la fila).

CREATE POLICY "profiles_select_partner" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.couple_members cm_self
      JOIN public.couple_members cm_partner
        ON cm_self.couple_id = cm_partner.couple_id
      WHERE cm_self.user_id = auth.uid()
        AND cm_partner.user_id = profiles.id
        AND cm_self.user_id <> cm_partner.user_id
    )
  );
