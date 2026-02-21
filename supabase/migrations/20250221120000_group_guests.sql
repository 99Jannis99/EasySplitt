-- =============================================================================
-- Gäste (Teilnehmer ohne Konto) zu Gruppen
-- Im Supabase SQL Editor ausführen.
-- =============================================================================

-- Gäste pro Gruppe (nur Name, kein User-Account)
CREATE TABLE public.group_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_guests_group_id ON public.group_guests(group_id);

-- RLS: gleiche Logik wie group_members (Mitglieder/Owner dürfen lesen, Owner/Ersteller hinzufügen/entfernen)
ALTER TABLE public.group_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_guests_select"
  ON public.group_guests FOR SELECT TO authenticated
  USING (
    public.is_member_of_group(group_id) OR public.is_group_creator_or_owner(group_id)
  );

CREATE POLICY "group_guests_insert"
  ON public.group_guests FOR INSERT TO authenticated
  WITH CHECK (public.is_group_creator_or_owner(group_id));

CREATE POLICY "group_guests_delete"
  ON public.group_guests FOR DELETE TO authenticated
  USING (public.is_group_creator_or_owner(group_id));

-- Expenses: Zahler kann auch ein Gast sein
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payer_guest_id UUID REFERENCES public.group_guests(id) ON DELETE SET NULL;

-- payer_id darf null sein, wenn payer_guest_id gesetzt ist (Constraint optional)
ALTER TABLE public.expenses
  ALTER COLUMN payer_id DROP NOT NULL;

-- Aufteilung auf Gäste (zusätzlich zu expense_splits für User)
CREATE TABLE public.expense_splits_guests (
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.group_guests(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, guest_id)
);

CREATE INDEX idx_expense_splits_guests_expense_id ON public.expense_splits_guests(expense_id);

ALTER TABLE public.expense_splits_guests ENABLE ROW LEVEL SECURITY;

-- Gleiche Sichtbarkeit wie expenses
CREATE POLICY "expense_splits_guests_select"
  ON public.expense_splits_guests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits_guests.expense_id
      AND (public.is_member_of_group(e.group_id) OR public.is_group_creator_or_owner(e.group_id))
    )
  );

CREATE POLICY "expense_splits_guests_insert"
  ON public.expense_splits_guests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.group_members gm ON gm.group_id = e.group_id AND gm.user_id = auth.uid()
      WHERE e.id = expense_splits_guests.expense_id
    )
  );

CREATE POLICY "expense_splits_guests_delete"
  ON public.expense_splits_guests FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits_guests.expense_id
      AND (e.created_by = auth.uid() OR public.is_group_creator_or_owner(e.group_id))
    )
  );
