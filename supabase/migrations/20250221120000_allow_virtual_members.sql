-- =============================================================================
-- Ermöglicht "virtuelle" Teilnehmer (ohne Login/User-ID)
-- Im Supabase SQL Editor ausführen.
-- =============================================================================

-- 1. user_id in group_members optional machen
ALTER TABLE public.group_members ALTER COLUMN user_id DROP NOT NULL;

-- 2. Foreign Keys in expenses/splits entfernen (da payer_id jetzt auch eine Member-ID sein kann)
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_payer_id_fkey;
ALTER TABLE public.expense_splits DROP CONSTRAINT IF EXISTS expense_splits_user_id_fkey;

-- 3. Hilfsfunktion zum Hinzufügen eines virtuellen Members
CREATE OR REPLACE FUNCTION public.add_virtual_member(p_group_id UUID, p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_member_id UUID;
BEGIN
  -- Prüfen ob Ausführender berechtigt ist (Owner oder Ersteller)
  IF NOT EXISTS (
    SELECT 1 FROM public.groups WHERE id = p_group_id AND created_by = auth.uid()
    UNION
    SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Nur Owner/Ersteller können Mitglieder hinzufügen.';
  END IF;

  INSERT INTO public.group_members (group_id, display_name, role)
  VALUES (p_group_id, p_name, 'member')
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$fn$;
