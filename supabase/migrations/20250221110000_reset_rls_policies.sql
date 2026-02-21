-- =============================================================================
-- Reset und Neuanlage aller RLS-Policies für groups und group_members
-- Behebt "new row violates row-level security policy"
-- Im Supabase SQL Editor ausführen.
-- =============================================================================

-- 1. RLS kurz deaktivieren, um alte Policies sicher zu löschen
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;

-- Alte Policies löschen (sowohl aus initial_schema als auch aus fix_recursion)
DROP POLICY IF EXISTS "Gruppen erstellen wenn eingeloggt" ON public.groups;
DROP POLICY IF EXISTS "Gruppen lesen wenn Mitglied" ON public.groups;
DROP POLICY IF EXISTS "Gruppe bearbeiten/löschen wenn Owner" ON public.groups;
DROP POLICY IF EXISTS "Gruppe aktualisieren/löschen wenn Owner" ON public.groups;
DROP POLICY IF EXISTS "Gruppe löschen wenn Owner" ON public.groups;

DROP POLICY IF EXISTS "Mitglieder lesen wenn in der Gruppe" ON public.group_members;
DROP POLICY IF EXISTS "Mitglieder hinzufügen nur als Gruppen-Ersteller" ON public.group_members;
DROP POLICY IF EXISTS "Mitglied bearbeiten nur Ersteller/Owner oder selbst" ON public.group_members;
DROP POLICY IF EXISTS "Mitglied entfernen: Ersteller/Owner oder selbst" ON public.group_members;
DROP POLICY IF EXISTS "Mitglieder hinzufügen nur als Owner" ON public.group_members;
DROP POLICY IF EXISTS "Mitglied bearbeiten nur Owner; sich selbst darf man verlassen" ON public.group_members;
DROP POLICY IF EXISTS "Mitglied entfernen: Owner oder selbst" ON public.group_members;

-- 2. Hilfsfunktionen sicherstellen (Security Definer = läuft mit Admin-Rechten)
CREATE OR REPLACE FUNCTION public.is_member_of_group(gid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = gid AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator_or_owner(gid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups WHERE id = gid AND created_by = auth.uid())
  OR EXISTS (SELECT 1 FROM public.group_members WHERE group_id = gid AND user_id = auth.uid() AND role = 'owner');
$$;

-- 3. Policies neu anlegen
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- GROUPS
-- Insert: Jeder authentifizierte User darf eine Gruppe erstellen
CREATE POLICY "groups_insert" ON public.groups FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Select: Mitglieder dürfen lesen
CREATE POLICY "groups_select" ON public.groups FOR SELECT TO authenticated
USING (public.is_member_of_group(id));

-- Update: Nur Owner/Ersteller
CREATE POLICY "groups_update" ON public.groups FOR UPDATE TO authenticated
USING (public.is_group_creator_or_owner(id));

-- Delete: Nur Owner/Ersteller
CREATE POLICY "groups_delete" ON public.groups FOR DELETE TO authenticated
USING (public.is_group_creator_or_owner(id));


-- GROUP MEMBERS
-- Select: Mitglieder dürfen lesen
CREATE POLICY "members_select" ON public.group_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_member_of_group(group_id));

-- Insert: Erlauben, wenn man der Ersteller der Gruppe ist (für Einladungen) oder Owner
CREATE POLICY "members_insert" ON public.group_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND created_by = auth.uid())
  OR 
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_id AND user_id = auth.uid() AND role = 'owner')
);

-- Update: Owner oder man selbst
CREATE POLICY "members_update" ON public.group_members FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_group_creator_or_owner(group_id));

-- Delete: Owner oder man selbst
CREATE POLICY "members_delete" ON public.group_members FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_group_creator_or_owner(group_id));
