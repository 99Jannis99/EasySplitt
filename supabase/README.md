# Supabase-Setup für Fluxshare

## Schema ausführen

1. Im [Supabase Dashboard](https://app.supabase.com) dein Projekt öffnen.
2. **SQL Editor** → **New query**.
3. Den kompletten Inhalt von `migrations/20250221000000_initial_schema.sql` einfügen und **Run** ausführen.

Alternativ mit Supabase CLI (falls eingerichtet):

```bash
supabase db push
```

## Tabellenüberblick

| Tabelle         | Beschreibung |
|-----------------|-------------|
| `profiles`      | Erweiterung zu `auth.users` (display_name, avatar_url); wird bei Registrierung automatisch angelegt. |
| `groups`        | Gruppen; `created_by` = Ersteller. Beim Anlegen wird der Ersteller automatisch als `group_members`-Eintrag mit Rolle `owner` angelegt. |
| `group_members` | Echte User in einer Gruppe; `display_name` = Anzeigename in dieser Gruppe, `role` = `owner` \| `member`. |
| `expenses`      | Ausgaben; `payer_id` = User, der gezahlt hat; `created_by` = User, der die Ausgabe angelegt hat. |
| `expense_splits`| Beteiligte an einer Ausgabe (Aufteilung). **Leer** = in der App so interpretieren, dass auf **alle** Gruppenmitglieder aufgeteilt wird – beim Speichern also alle `group_members` als Zeilen in `expense_splits` eintragen. |

## Einladung

- Nutzer per E-Mail einladen: RPC `invite_user_to_group(group_id, email, display_name?)` aufrufen.
- Der eingeladene User muss bereits registriert sein (Supabase Auth).

## RLS

- Alle Tabellen haben Row Level Security.
- Gruppen: Lesen nur als Mitglied, Anlegen als eingeloggter User, Bearbeiten/Löschen nur als Owner.
- Ausgaben: Lesen/Anlegen als Gruppenmitglied, Bearbeiten/Löschen als Ersteller oder Gruppen-Owner.
