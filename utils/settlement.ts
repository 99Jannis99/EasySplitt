import type { Group, Expense, Balance, Debt } from "../store/types";

export function getBalances(group: Group, expenses: Expense[]): Balance[] {
  const groupExpenses = expenses.filter((e) => e.groupId === group.id);
  const balances: Record<string, number> = {};
  group.participants.forEach((p) => (balances[p.id] = 0));

  for (const exp of groupExpenses) {
    const share = exp.amount / exp.splitBetweenIds.length;
    balances[exp.payerId] = (balances[exp.payerId] ?? 0) + exp.amount;
    exp.splitBetweenIds.forEach((id) => {
      balances[id] = (balances[id] ?? 0) - share;
    });
  }

  return group.participants.map((p) => ({
    participantId: p.id,
    balance: Math.round((balances[p.id] ?? 0) * 100) / 100,
  }));
}

/** Vereinfachte Schulden: wer muss wem wie viel zahlen */
export function getDebts(balances: Balance[]): Debt[] {
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ ...b, balance: b.balance }))
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b, balance: b.balance }))
    .sort((a, b) => a.balance - b.balance);

  const debts: Debt[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const cred = creditors[i];
    const deb = debtors[j];
    const amount = Math.min(cred.balance, -deb.balance);
    if (amount < 0.01) {
      if (cred.balance <= 0.01) i++;
      else j++;
      continue;
    }
    debts.push({ fromId: deb.participantId, toId: cred.participantId, amount: Math.round(amount * 100) / 100 });
    cred.balance -= amount;
    deb.balance += amount;
    if (cred.balance <= 0.01) i++;
    if (deb.balance >= -0.01) j++;
  }

  return debts;
}
