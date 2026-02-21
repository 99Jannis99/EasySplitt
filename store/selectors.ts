import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./index";
import type { Group, Expense } from "./types";

const selectGroups = (s: RootState) => s.groups.groups;
const selectExpenses = (s: RootState) => s.groups.expenses;

export const selectGroupById = createSelector(
  [selectGroups, (_s: RootState, id: string) => id],
  (groups, id): Group | undefined => groups.find((g) => g.id === id)
);

export const selectExpensesForGroup = createSelector(
  [selectExpenses, (_s: RootState, groupId: string) => groupId],
  (expenses, groupId): Expense[] => expenses.filter((e) => e.groupId === groupId)
);
