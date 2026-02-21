import { supabase } from "./supabase";
import type { Group, Expense, Participant } from "../store/types";

export async function fetchGroupsAndExpenses(userId: string): Promise<{ groups: Group[]; expenses: Expense[] }> {
  // 1. Alle Gruppen-IDs holen, in denen der User Mitglied ist ODER die er erstellt hat
  // A) Gruppen, wo ich Mitglied bin
  const { data: memberGroups } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);
    
  // B) Gruppen, die ich erstellt habe
  const { data: createdGroups } = await supabase
    .from("groups")
    .select("id")
    .eq("created_by", userId);

  const groupIds = [
    ...new Set([
      ...(memberGroups?.map((m) => m.group_id) ?? []),
      ...(createdGroups?.map((g) => g.id) ?? []),
    ]),
  ];

  if (groupIds.length === 0) return { groups: [], expenses: [] };

  // 2. Jetzt ALLE Mitglieder und Gruppendaten für diese IDs holen
  const { data: allMembers, error: membersError } = await supabase
    .from("group_members")
    .select("id, group_id, user_id, display_name, groups(id, name)")
    .in("group_id", groupIds);

  if (membersError) {
    console.error("[supabaseApi] fetchGroups error:", membersError);
    throw membersError;
  }

  const groupsMap = new Map<string, { id: string; name: string; createdBy: string; members: { id: string; user_id: string | null; display_name: string }[] }>();

  const { data: groupsData } = await supabase
    .from("groups")
    .select("id, name, created_by")
    .in("id", groupIds);
    
  for (const g of groupsData ?? []) {
    groupsMap.set(g.id, { id: g.id, name: g.name, createdBy: g.created_by, members: [] });
  }

  // Jetzt die Mitglieder einsortieren
  for (const row of allMembers ?? []) {
    if (groupsMap.has(row.group_id)) {
      groupsMap.get(row.group_id)!.members.push({ 
        id: row.id, 
        user_id: row.user_id, 
        display_name: row.display_name 
      });
    }
  }

  const groups: Group[] = Array.from(groupsMap.values()).map((g) => ({
    id: g.id,
    name: g.name,
    createdBy: g.createdBy,
    participants: g.members.map((m) => ({ 
      id: m.user_id ?? m.id, 
      name: m.display_name 
    } as Participant)),
  }));

  const { data: expensesRows, error: expensesError } = await supabase
    .from("expenses")
    .select("id, group_id, title, description, amount, payer_id, created_by, created_at")
    .in("group_id", groupIds)
    .order("created_at", { ascending: false });

  if (expensesError) throw expensesError;

  const expenseIds = (expensesRows ?? []).map((e: { id: string }) => e.id);
  let splits: { expense_id: string; user_id: string }[] = [];
  if (expenseIds.length > 0) {
    const { data: splitsRows } = await supabase
      .from("expense_splits")
      .select("expense_id, user_id")
      .in("expense_id", expenseIds);
    splits = (splitsRows ?? []) as { expense_id: string; user_id: string }[];
  }

  const splitsByExpense = new Map<string, string[]>();
  for (const s of splits) {
    const list = splitsByExpense.get(s.expense_id) ?? [];
    list.push(s.user_id);
    splitsByExpense.set(s.expense_id, list);
  }

  const expenses: Expense[] = (expensesRows ?? []).map(
    (e: { id: string; group_id: string; title: string; description: string; amount: number; payer_id: string }) => ({
      id: e.id,
      groupId: e.group_id,
      title: e.title,
      description: e.description ?? "",
      amount: Number(e.amount),
      payerId: e.payer_id,
      splitBetweenIds: splitsByExpense.get(e.id) ?? [],
    })
  );

  return { groups, expenses };
}

export async function createGroup(name: string, createdBy: string): Promise<Group> {
  const { data: sessionData } = await supabase.auth.getSession();
  console.log("[createGroup] session user:", sessionData.session?.user?.id, "arg createdBy:", createdBy);

  const { data, error } = await supabase
    .from("groups")
    .insert({ name, created_by: createdBy })
    .select("id, name")
    .single();

  if (error) {
    console.error("[supabaseApi] createGroup insert error:", error.message, error.details, error.hint);
    throw new Error(error.message || "Gruppe konnte nicht erstellt werden.");
  }

  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("id, user_id, display_name")
    .eq("group_id", data.id);

  if (membersError) {
     console.error("[supabaseApi] fetch members error after create:", membersError);
  }

  const participants: Participant[] = (members ?? []).map((m: { id: string; user_id: string | null; display_name: string }) => ({
    id: m.user_id ?? m.id,
    name: m.display_name,
  }));

  return {
    id: data.id,
    name: data.name,
    createdBy,
    participants,
  };
}

export async function updateGroup(groupId: string, name: string): Promise<void> {
  const { error } = await supabase.from("groups").update({ name }).eq("id", groupId);
  if (error) throw error;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw error;
}

export async function addVirtualMember(groupId: string, name: string): Promise<Participant> {
  const { data, error } = await supabase.rpc("add_virtual_member", {
    p_group_id: groupId,
    p_name: name,
  });

  if (error) {
    console.error("[supabaseApi] addVirtualMember error:", error.message, error.details, error.hint);
    throw new Error(error.message || "Teilnehmer konnte nicht hinzugefügt werden.");
  }

  return {
    id: data, // UUID from group_members
    name: name,
  };
}

export async function inviteToGroup(groupId: string, email: string, displayName?: string | null): Promise<void> {
  const { error } = await supabase.rpc("invite_user_to_group", {
    p_group_id: groupId,
    p_email: email,
    p_display_name: displayName ?? null,
  });
  if (error) throw error;
}

export async function fetchGroupMembers(groupId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("id, user_id, display_name")
    .eq("group_id", groupId);

  if (error) throw error;
  return (data ?? []).map((m: { id: string; user_id: string | null; display_name: string }) => ({
    id: m.user_id ?? m.id,
    name: m.display_name,
  }));
}

export async function createExpense(
  groupId: string,
  createdBy: string,
  payload: {
    title: string;
    description: string;
    amount: number;
    payerId: string;
    splitBetweenIds: string[];
  },
  participantIds: string[]
): Promise<Expense> {
  const splitIds =
    payload.splitBetweenIds.length > 0 ? payload.splitBetweenIds : participantIds;

  const { data: exp, error: expError } = await supabase
    .from("expenses")
    .insert({
      group_id: groupId,
      title: payload.title,
      description: payload.description,
      amount: payload.amount,
      payer_id: payload.payerId,
      created_by: createdBy,
    })
    .select("id, group_id, title, description, amount, payer_id")
    .single();

  if (expError) throw expError;

  if (splitIds.length > 0) {
    const { error: splitError } = await supabase.from("expense_splits").insert(
      splitIds.map((user_id) => ({ expense_id: exp.id, user_id }))
    );
    if (splitError) throw splitError;
  }

  return {
    id: exp.id,
    groupId: exp.group_id,
    title: exp.title,
    description: exp.description ?? "",
    amount: Number(exp.amount),
    payerId: exp.payer_id,
    splitBetweenIds: splitIds,
  };
}

export async function updateExpense(
  expenseId: string,
  payload: {
    title?: string;
    description?: string;
    amount?: number;
    payerId?: string;
    splitBetweenIds?: string[];
  }
): Promise<void> {
  const { title, description, amount, payerId, splitBetweenIds } = payload;

  if (title !== undefined || description !== undefined || amount !== undefined || payerId !== undefined) {
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (amount !== undefined) updates.amount = amount;
    if (payerId !== undefined) updates.payer_id = payerId;
    const { error } = await supabase.from("expenses").update(updates).eq("id", expenseId);
    if (error) throw error;
  }

  if (splitBetweenIds !== undefined) {
    await supabase.from("expense_splits").delete().eq("expense_id", expenseId);
    if (splitBetweenIds.length > 0) {
      const { error } = await supabase
        .from("expense_splits")
        .insert(splitBetweenIds.map((user_id) => ({ expense_id: expenseId, user_id })));
      if (error) throw error;
    }
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) throw error;
}
