import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Divider, Text } from "react-native-paper";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import { selectExpensesForGroup, selectGroupById } from "../../../store/selectors";
import { getBalances, getDebts } from "../../../utils/settlement";
import { appColors } from "../../../theme";

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useSelector((s: RootState) => selectGroupById(s, id ?? ""));
  const expenses = useSelector((s: RootState) => selectExpensesForGroup(s, id ?? ""));

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text>Gruppe nicht gefunden.</Text>
      </View>
    );
  }

  const participantById = new Map(group.participants.map((p) => [p.id, p]));

  // Pro Person: wie viel hat sie insgesamt bezahlt (als Zahler)
  const totalPaidByParticipant: Record<string, number> = {};
  group.participants.forEach((p) => (totalPaidByParticipant[p.id] = 0));
  expenses.forEach((e) => {
    totalPaidByParticipant[e.payerId] = (totalPaidByParticipant[e.payerId] ?? 0) + e.amount;
  });

  const balances = getBalances(group, expenses);
  const debts = getDebts(balances);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Wer hat wie viel bezahlt */}
      <Card style={[styles.card, styles.cardBg]}>
        <Card.Title title="Wer hat wie viel bezahlt?" />
        <Card.Content>
          {group.participants.map((p) => (
            <View key={p.id} style={styles.row}>
              <Text>{p.name}</Text>
              <Text variant="titleSmall" style={styles.money}>
                {totalPaidByParticipant[p.id]?.toFixed(2) ?? "0,00"} €
              </Text>
            </View>
          ))}
          {expenses.length === 0 && (
            <Text variant="bodySmall" style={styles.muted}>
              Noch keine Ausgaben.
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Rechenweg: wie die Kostenaufteilung berechnet wird */}
      <Card style={[styles.card, styles.cardBg]}>
        <Card.Title title="So wird die Aufteilung berechnet" />
        <Card.Content>
          <Text variant="bodySmall" style={styles.muted}>
            Jede Ausgabe wird gleichmäßig auf die beteiligten Personen aufgeteilt. Wer bezahlt hat, bekommt den Betrag gutgeschrieben; wer mit drin war, bekommt seinen Anteil abgezogen. Daraus ergeben sich die Salden.
          </Text>
          {expenses.length === 0 ? (
            <Text variant="bodySmall" style={[styles.muted, styles.topMargin]}>
              Noch keine Ausgaben – daher kein Rechenweg.
            </Text>
          ) : (
            <>
              <Divider style={styles.divider} />
              {expenses.map((e) => {
                const share = e.splitBetweenIds.length > 0
                  ? e.amount / e.splitBetweenIds.length
                  : 0;
                const payerName = participantById.get(e.payerId)?.name ?? "?";
                const splitNames = e.splitBetweenIds
                  .map((pid) => participantById.get(pid)?.name ?? "?")
                  .join(", ");
                return (
                  <View key={e.id} style={styles.expenseBlock}>
                    <Text variant="labelMedium" style={styles.expenseTitle}>
                      {e.title}: {e.amount.toFixed(2)} €
                    </Text>
                    <Text variant="bodySmall" style={styles.calcLine}>
                      Geteilt auf {e.splitBetweenIds.length} Person(en) → je {share.toFixed(2)} €
                    </Text>
                    <Text variant="bodySmall" style={styles.calcLine}>
                      Bezahlt von <Text style={styles.bold}>{payerName}</Text> → +{e.amount.toFixed(2)} €
                    </Text>
                    <Text variant="bodySmall" style={styles.calcLine}>
                      Beteiligt: {splitNames} → je −{share.toFixed(2)} €
                    </Text>
                  </View>
                );
              })}
              <Divider style={styles.divider} />
              <Text variant="bodySmall" style={styles.muted}>
                Aus den Salden (Wer bekommt / schuldet) werden die Überweisungen abgeleitet: Wer zahlt wem.
              </Text>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Kurz: Salden und Wer zahlt wem */}
      {expenses.length > 0 && (
        <Card style={[styles.card, styles.cardBg]}>
          <Card.Title title="Ergebnis" />
          <Card.Content>
            <Text variant="labelSmall" style={styles.sectionLabel}>
              Salden
            </Text>
            {balances.map((b) => {
              const name = participantById.get(b.participantId)?.name ?? "?";
              const isPos = b.balance >= 0;
              return (
                <View key={b.participantId} style={styles.row}>
                  <Text variant="bodySmall">{name}</Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.money,
                      isPos ? styles.positive : b.balance === 0 ? styles.muted : styles.negative,
                    ]}
                  >
                    {b.balance > 0 ? "+" : ""}{b.balance.toFixed(2)} €
                  </Text>
                </View>
              );
            })}
            {debts.length > 0 && (
              <>
                <Text variant="labelSmall" style={[styles.sectionLabel, styles.topMargin]}>
                  Wer zahlt wem
                </Text>
                {debts.map((d, i) => (
                  <Text key={i} variant="bodySmall" style={styles.debtLine}>
                    {participantById.get(d.fromId)?.name ?? "?"} → {participantById.get(d.toId)?.name ?? "?"}: {d.amount.toFixed(2)} €
                  </Text>
                ))}
              </>
            )}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  card: { marginVertical: 8 },
  cardBg: { backgroundColor: appColors.background },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  money: { color: appColors.primary },
  muted: { color: appColors.accent },
  topMargin: { marginTop: 12 },
  divider: { marginVertical: 12 },
  expenseBlock: { marginBottom: 16 },
  expenseTitle: { color: appColors.primary, marginBottom: 4 },
  calcLine: { marginBottom: 2, color: appColors.accent },
  bold: { fontWeight: "600", color: appColors.primary },
  sectionLabel: { color: appColors.accent, marginBottom: 4 },
  positive: { color: appColors.accent },
  negative: { color: "#b54c4c" },
  debtLine: { paddingVertical: 2 },
});
