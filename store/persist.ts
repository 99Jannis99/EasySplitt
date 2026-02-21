import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Group, Expense } from "./types";
import { STORAGE_KEY } from "./slices/groupsSlice";

export async function loadState(): Promise<{
  groups: Group[];
  expenses: Expense[];
}> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { groups: [], expenses: [] };
    const data = JSON.parse(raw);
    return {
      groups: data.groups ?? [],
      expenses: data.expenses ?? [],
    };
  } catch {
    return { groups: [], expenses: [] };
  }
}

export async function saveState(groups: Group[], expenses: Expense[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ groups, expenses })
    );
  } catch (_) {}
}
