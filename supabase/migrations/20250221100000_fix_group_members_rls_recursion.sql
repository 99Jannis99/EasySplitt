-- =============================================================================
-- Behebt "infinite recursion detected in policy for relation group_members"
-- durch SECURITY-DEFINER-Hilfsfunktionen (keine Selbstreferenz in Policies).
-- Im Supabase SQL Editor ausführen.
-- =============================================================================

-- Hilfsfunktionen (lesen group_members/groups ohne RLS-Rekursion)
CREATE OR REPLACE FUNCTION public.is_member_of_group(gid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND user_id = auth.uid()
  );
$fn$;

CREATE OR REPLACE FUNCTION public.is_group_creator(gid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = gid AND created_by = auth.uid()
  );
$fn$;

CREATE OR REPLACE FUNCTION public.is_group_creator_or_owner(gid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = gid AND g.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = gid AND gm.user_id = auth.uid() AND gm.role = 'owner'
  );
$fn$;

-- Alte group_members Policies entfernen
DROP POLICY IF EXISTS "Mitglieder lesen wenn in der Gruppe" ON public.group_members;
DROP POLICY IF EXISTS "Mitglieder hinzufügen nur als Owner" ON public.group_members;
DROP POLICY IF EXISTS "Mitglied bearbeiten nur Owner; sich selbst darf man verlassen" ON public.group_members;
DROP POLICY IF EXISTS "Mitglied entfernen: Owner oder selbst" ON public.group_members;

-- Neue Policies ohne Selbstreferenz
CREATE POLICY "Mitglieder lesen wenn in der Gruppe"
  ON public.group_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_member_of_group(group_id)
  );

CREATE POLICY "Mitglieder hinzufügen nur als Gruppen-Ersteller"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (public.is_group_creator(group_id));

CREATE POLICY "Mitglied bearbeiten nur Ersteller/Owner oder selbst"
  ON public.group_members FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_group_creator_or_owner(group_id)
  );

CREATE POLICY "Mitglied entfernen: Ersteller/Owner oder selbst"
  ON public.group_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_group_creator_or_owner(group_id)
  );

-- groups: SELECT/UPDATE/DELETE ohne Rekursion (INSERT bleibt: auth.uid() = created_by)
DROP POLICY IF EXISTS "Gruppen lesen wenn Mitglied" ON public.groups;
DROP POLICY IF EXISTS "Gruppe bearbeiten/löschen wenn Owner" ON public.groups;

CREATE POLICY "Gruppen lesen wenn Mitglied"
  ON public.groups FOR SELECT TO authenticated
  USING (public.is_member_of_group(id));

-- Nur SELECT, UPDATE, DELETE – INSERT wird weiter von "Gruppen erstellen wenn eingeloggt" erlaubt
CREATE POLICY "Gruppe bearbeiten/löschen wenn Owner"
  ON public.groups FOR SELECT TO authenticated
  USING (public.is_group_creator_or_owner(id));

CREATE POLICY "Gruppe aktualisieren/löschen wenn Owner"
  ON public.groups FOR UPDATE TO authenticated
  USING (public.is_group_creator_or_owner(id));

CREATE POLICY "Gruppe löschen wenn Owner"
  ON public.groups FOR DELETE TO authenticated
  USING (public.is_group_creator_or_owner(id));

-- INSERT explizit sicherstellen (falls nicht mehr vorhanden)
DROP POLICY IF EXISTS "Gruppen erstellen wenn eingeloggt" ON public.groups;
CREATE POLICY "Gruppen erstellen wenn eingeloggt"
  ON public.groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
