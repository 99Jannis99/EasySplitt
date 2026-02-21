import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Group, Expense, Participant } from "../types";

const STORAGE_KEY = "@splitt/groups";

export interface GroupsState {
  groups: Group[];
  expenses: Expense[];
}

const initialState: GroupsState = {
  groups: [],
  expenses: [],
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const groupsSlice = createSlice({
  name: "groups",
  initialState,
  reducers: {
    setStateFromStorage(
      _,
      action: PayloadAction<{ groups: Group[]; expenses: Expense[] }>
    ) {
      return action.payload;
    },
    addGroup(state, action: PayloadAction<{ name: string; participants: Participant[] }>) {
      const id = generateId();
      state.groups.push({
        id,
        name: action.payload.name,
        participants: action.payload.participants,
      });
    },
    updateGroup(
      state,
      action: PayloadAction<{
        id: string;
        name?: string;
        participants?: Participant[];
      }>
    ) {
      const g = state.groups.find((x) => x.id === action.payload.id);
      if (!g) return;
      if (action.payload.name != null) g.name = action.payload.name;
      if (action.payload.participants != null) g.participants = action.payload.participants;
    },
    removeGroup(state, action: PayloadAction<string>) {
      state.groups = state.groups.filter((g) => g.id !== action.payload);
      state.expenses = state.expenses.filter((e) => e.groupId !== action.payload);
    },
    addExpense(
      state,
      action: PayloadAction<{
        groupId: string;
        title: string;
        description: string;
        amount: number;
        payerId: string;
        splitBetweenIds: string[];
      }>
    ) {
      const group = state.groups.find((g) => g.id === action.payload.groupId);
      if (!group) return;
      const splitBetweenIds =
        action.payload.splitBetweenIds.length > 0
          ? action.payload.splitBetweenIds
          : group.participants.map((p) => p.id);
      state.expenses.push({
        id: generateId(),
        groupId: action.payload.groupId,
        title: action.payload.title,
        description: action.payload.description,
        amount: action.payload.amount,
        payerId: action.payload.payerId,
        splitBetweenIds,
      });
    },
    updateExpense(
      state,
      action: PayloadAction<{
        id: string;
        title?: string;
        description?: string;
        amount?: number;
        payerId?: string;
        splitBetweenIds?: string[];
      }>
    ) {
      const exp = state.expenses.find((e) => e.id === action.payload.id);
      if (!exp) return;
      const { id: _id, ...rest } = action.payload;
      Object.assign(exp, rest);
    },
    removeExpense(state, action: PayloadAction<string>) {
      state.expenses = state.expenses.filter((e) => e.id !== action.payload);
    },
  },
});

export const {
  setStateFromStorage,
  addGroup,
  updateGroup,
  removeGroup,
  addExpense,
  updateExpense,
  removeExpense,
} = groupsSlice.actions;
export default groupsSlice.reducer;

export { STORAGE_KEY };
