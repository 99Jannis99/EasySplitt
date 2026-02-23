import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { supabase } from "../lib/supabase";
import {
  fetchExpenseById,
  fetchGroupById,
  fetchGroupMembers,
} from "../lib/supabaseApi";
import {
  addExpenseFromServer,
  addGroupFromServer,
  removeExpense,
  removeGroup,
  updateExpense,
  updateGroup,
} from "../store/slices/groupsSlice";
import type { RootState } from "../store";

/**
 * Hält alle Supabase-Realtime-Subscriptions am Leben,
 * solange der User eingeloggt ist.
 *
 * Strategie:
 *  - groups    UPDATE/DELETE → direkt im Store anpassen
 *  - group_members *        → Teilnehmer der Gruppe neu laden; bei eigenem INSERT ggf. neue Gruppe fetchen
 *  - expenses  INSERT       → nach kurzem Delay vollständig fetchen (Splits sind dann da)
 *  - expenses  UPDATE       → Felder direkt im Store aktualisieren
 *  - expenses  DELETE       → aus Store entfernen
 *  - expense_splits *       → Splits der betroffenen Ausgabe debounced neu laden
 */
export function useRealtimeSync(userId: string | undefined) {
  const dispatch = useDispatch();
  const groupsRef = useRef<RootState["groups"]["groups"]>([]);
  const expensesRef = useRef<RootState["groups"]["expenses"]>([]);
  const groups = useSelector((s: RootState) => s.groups.groups);
  const expenses = useSelector((s: RootState) => s.groups.expenses);

  // Refs aktuell halten, damit Handler-Closures immer frische Daten sehen
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  useEffect(() => { expensesRef.current = expenses; }, [expenses]);

  useEffect(() => {
    if (!userId) return;

    // Debounce-Timer für expense_splits (expenseId → timer)
    const splitTimers = new Map<string, ReturnType<typeof setTimeout>>();
    // Delay-Timer für neue expenses (expenseId → timer)
    const expenseInsertTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const channel = supabase
      .channel("realtime-sync")

      // ── GROUPS ─────────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "groups" },
        (payload) => {
          const row = payload.new as { id: string; name: string };
          dispatch(updateGroup({ id: row.id, name: row.name }));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "groups" },
        (payload) => {
          const row = payload.old as { id: string };
          dispatch(removeGroup(row.id));
        }
      )

      // ── GROUP_MEMBERS ───────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members" },
        async (payload) => {
          const row = (payload.new ?? payload.old) as {
            group_id?: string;
            user_id?: string | null;
          } | null;
          const groupId = row?.group_id;
          if (!groupId) return;

          // Neue Gruppe für diesen User entdecken
          if (
            payload.eventType === "INSERT" &&
            (payload.new as { user_id?: string | null }).user_id === userId
          ) {
            const alreadyKnown = groupsRef.current.some((g) => g.id === groupId);
            if (!alreadyKnown) {
              // Kurz warten, damit ein eventuell laufendes lokales dispatch zuerst landet
              await new Promise((r) => setTimeout(r, 300));
              // Nochmal prüfen – könnte inzwischen lokal hinzugefügt worden sein
              if (!groupsRef.current.some((g) => g.id === groupId)) {
                const group = await fetchGroupById(groupId);
                if (group) dispatch(addGroupFromServer(group));
              }
              return;
            }
          }

          // Teilnehmer der bekannten Gruppe aktualisieren
          const alreadyKnown = groupsRef.current.some((g) => g.id === groupId);
          if (!alreadyKnown) return;
          try {
            const participants = await fetchGroupMembers(groupId);
            dispatch(updateGroup({ id: groupId, participants }));
          } catch (_) {}
        }
      )

      // ── EXPENSES ───────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "expenses" },
        (payload) => {
          const row = payload.new as { id: string; group_id: string };

          // Nur Gruppen, die wir kennen
          if (!groupsRef.current.some((g) => g.id === row.group_id)) return;
          // Nicht hinzufügen, wenn wir die Ausgabe bereits haben (eigene Aktion)
          if (expensesRef.current.some((e) => e.id === row.id)) return;

          // Kurz warten, damit Splits schon in der DB sind
          const existing = expenseInsertTimers.get(row.id);
          if (existing) clearTimeout(existing);
          expenseInsertTimers.set(
            row.id,
            setTimeout(async () => {
              expenseInsertTimers.delete(row.id);
              // Nochmal prüfen (könnte inzwischen lokal eingefügt worden sein)
              if (expensesRef.current.some((e) => e.id === row.id)) return;
              try {
                const expense = await fetchExpenseById(row.id);
                if (expense) dispatch(addExpenseFromServer(expense));
              } catch (_) {}
            }, 800)
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "expenses" },
        (payload) => {
          const row = payload.new as {
            id: string;
            title: string;
            description: string;
            amount: number;
            payer_id: string;
          };
          dispatch(
            updateExpense({
              id: row.id,
              title: row.title,
              description: row.description ?? "",
              amount: Number(row.amount),
              payerId: row.payer_id,
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "expenses" },
        (payload) => {
          const row = payload.old as { id: string };
          dispatch(removeExpense(row.id));
        }
      )

      // ── EXPENSE_SPLITS ─────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_splits" },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            expense_id?: string;
          } | null;
          const expenseId = row?.expense_id;
          if (!expenseId) return;

          // Debounce: mehrere gleichzeitige Split-Events sammeln
          const existing = splitTimers.get(expenseId);
          if (existing) clearTimeout(existing);
          splitTimers.set(
            expenseId,
            setTimeout(async () => {
              splitTimers.delete(expenseId);
              try {
                const expense = await fetchExpenseById(expenseId);
                if (expense) {
                  dispatch(
                    updateExpense({
                      id: expenseId,
                      splitBetweenIds: expense.splitBetweenIds,
                    })
                  );
                }
              } catch (_) {}
            }, 500)
          );
        }
      )

      .subscribe();

    return () => {
      // Alle laufenden Timer bereinigen
      splitTimers.forEach(clearTimeout);
      expenseInsertTimers.forEach(clearTimeout);
      supabase.removeChannel(channel);
    };
  }, [userId, dispatch]);
}
