-- =============================================================================
-- Fluxshare – Initiales Supabase-Schema
-- In Supabase: SQL Editor → New query → Einfügen & Run
-- =============================================================================

-- Erweiterung für UUIDs (in Supabase meist schon aktiv)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. Profiles (erweitert auth.users um Anzeigenamen)
-- =============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: Beim Registrieren automatisch einen Profil-Eintrag anlegen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $handle_new_user$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$handle_new_user$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 2. Groups
-- =============================================================================
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_created_by ON public.groups(created_by);

-- =============================================================================
-- 3. Group Members (echte User in einer Gruppe; display_name = Name in dieser Gruppe)
-- =============================================================================
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);

-- Beim Anlegen einer Gruppe den Ersteller als Owner eintragen
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $handle_new_group$
DECLARE
  dn TEXT;
BEGIN
  SELECT COALESCE(display_name, 'Ich') INTO dn
  FROM public.profiles WHERE id = NEW.created_by;
  INSERT INTO public.group_members (group_id, user_id, display_name, role)
  VALUES (NEW.id, NEW.created_by, COALESCE(dn, 'Ich'), 'owner');
  RETURN NEW;
END;
$handle_new_group$;

CREATE TRIGGER on_group_created
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_group();

-- =============================================================================
-- 4. Expenses
-- =============================================================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  payer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX idx_expenses_payer_id ON public.expenses(payer_id);
CREATE INDEX idx_expenses_created_at ON public.expenses(created_at DESC);

-- =============================================================================
-- 5. Expense Splits (wer ist an einer Ausgabe beteiligt; leer = alle Mitglieder)
-- Gespeichert wird explizit: jede Zeile = ein User ist an der Aufteilung beteiligt
-- =============================================================================
CREATE TABLE public.expense_splits (
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, user_id)
);

CREATE INDEX idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON public.expense_splits(user_id);

-- =============================================================================
-- 6. Row Level Security (RLS)
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- Profiles: Jeder kann Lesen (für Anzeigenamen), nur eigenes Profil schreiben
CREATE POLICY "Profiles sind lesbar für alle authentifizierten User"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "User kann eigenes Profil aktualisieren"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Groups: Lesen wenn Mitglied, Erstellen wenn eingeloggt, Ändern/Löschen wenn Owner
CREATE POLICY "Gruppen lesen wenn Mitglied"
  ON public.groups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Gruppen erstellen wenn eingeloggt"
  ON public.groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Gruppe bearbeiten/löschen wenn Owner"
  ON public.groups FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = groups.id AND gm.user_id = auth.uid() AND gm.role = 'owner'
    )
  );

-- Group Members: Lesen wenn Gruppenmitglied; Einladen nur Owner; Löschen Owner oder selbst
CREATE POLICY "Mitglieder lesen wenn in der Gruppe"
  ON public.group_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Mitglieder hinzufügen nur als Owner"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'owner'
    )
  );

CREATE POLICY "Mitglied bearbeiten nur Owner; sich selbst darf man verlassen"
  ON public.group_members FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'owner'
    )
  );

CREATE POLICY "Mitglied entfernen: Owner oder selbst"
  ON public.group_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'owner'
    )
  );

-- Expenses: Lesen/Bearbeiten wenn Gruppenmitglied; Erstellen wenn Mitglied
CREATE POLICY "Ausgaben lesen wenn in Gruppe"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = expenses.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Ausgabe anlegen wenn Gruppenmitglied"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = expenses.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Ausgabe bearbeiten/löschen wenn Ersteller oder Gruppen-Owner"
  ON public.expenses FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = expenses.group_id AND gm.user_id = auth.uid() AND gm.role = 'owner'
    )
  );

CREATE POLICY "Ausgabe löschen (DELETE) wenn Ersteller oder Owner"
  ON public.expenses FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = expenses.group_id AND gm.user_id = auth.uid() AND gm.role = 'owner'
    )
  );

-- Expense Splits: Zugriff nur über die Ausgabe (Gruppenmitglied)
CREATE POLICY "Splits lesen wenn Ausgabe lesbar"
  ON public.expense_splits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id AND gm.user_id = auth.uid()
      WHERE e.id = expense_splits.expense_id
    )
  );

CREATE POLICY "Splits anlegen wenn Ausgabe anlegen erlaubt"
  ON public.expense_splits FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id AND gm.user_id = auth.uid()
      WHERE e.id = expense_splits.expense_id
    )
  );

CREATE POLICY "Splits löschen wenn Ausgabe bearbeitbar"
  ON public.expense_splits FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits.expense_id
      AND (
        e.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = e.group_id AND gm.user_id = auth.uid() AND gm.role = 'owner'
        )
      )
    )
  );

-- =============================================================================
-- 7. Hilfsfunktion: Nutzer zu Gruppe einladen (per E-Mail)
-- Nutzt Supabase auth: User muss bereits registriert sein.
-- WICHTIG: Diese Funktion in einer separaten Abfrage ausführen (nur diesen Block),
-- damit der Supabase SQL Editor den Rumpf nicht bei Zeilenumbrüchen trennt.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.invite_user_to_group(p_group_id UUID, p_email TEXT, p_display_name TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $invite$ DECLARE v_user_id UUID; v_display_name TEXT; v_member_id UUID; BEGIN IF NOT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'owner') THEN RAISE EXCEPTION 'Nur der Besitzer der Gruppe kann Mitglieder einladen.'; END IF; SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email)); IF v_user_id IS NULL THEN RAISE EXCEPTION 'Kein Nutzer mit dieser E-Mail gefunden. Der Nutzer muss sich zuerst registrieren.'; END IF; v_display_name := COALESCE(nullif(trim(p_display_name), ''), (SELECT display_name FROM public.profiles WHERE id = v_user_id), split_part((SELECT email FROM auth.users WHERE id = v_user_id), '@', 1)); INSERT INTO public.group_members (group_id, user_id, display_name, role) VALUES (p_group_id, v_user_id, v_display_name, 'member') ON CONFLICT (group_id, user_id) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id INTO v_member_id; RETURN v_member_id; END; $invite$;

-- =============================================================================
-- 8. updated_at automatisch setzen
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $set_updated_at$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$set_updated_at$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
