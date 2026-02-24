import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, Platform } from "react-native";
import { Card, Chip, Icon, IconButton, Surface, Text } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import { deleteExpense } from "../../../lib/supabaseApi";
import type { RootState } from "../../../store";
import { selectExpensesForGroup, selectGroupById } from "../../../store/selectors";
import { removeExpense } from "../../../store/slices/groupsSlice";
import { appColors } from "../../../theme";
import { getBalances, getDebts } from "../../../utils/settlement";
import { ScreenContent } from "../../../components/ScreenContent";
import { GlassHeaderButton } from "../../../components/GlassHeaderButton";

const headerButtonColor = "#000000";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const group = useSelector((s: RootState) => selectGroupById(s, id ?? ""));
  const expenses = useSelector((s: RootState) => selectExpensesForGroup(s, id ?? ""));

  const navigation = useNavigation();
  const [headerPillPressed, setHeaderPillPressed] = useState(false);

  useEffect(() => {
    if (!group || !id) return;
    navigation.setOptions({
      title: group.name,
      headerRight: () => (
        <View style={styles.headerButtons}>
          {Platform.OS === "android" ? (
            <GlassHeaderButton variant="pill" pressed={headerPillPressed}>
              <View style={styles.headerPillInner}>
                <Pressable
                  onPress={() => router.push(`/group/${id}/info`)}
                  onPressIn={() => setHeaderPillPressed(true)}
                  onPressOut={() => setHeaderPillPressed(false)}
                  style={styles.headerButton}
                  android_ripple={null}
                >
                  <Icon source="information-outline" size={24} color={headerButtonColor} />
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/group/${id}/add-expense`)}
                  onPressIn={() => setHeaderPillPressed(true)}
                  onPressOut={() => setHeaderPillPressed(false)}
                  style={styles.headerButton}
                  android_ripple={null}
                >
                  <Icon source="plus" size={24} color={headerButtonColor} />
                </Pressable>
              </View>
            </GlassHeaderButton>
          ) : (
            <>
              <Pressable
                onPress={() => router.push(`/group/${id}/info`)}
                style={styles.headerButton}
                android_ripple={null}
              >
                <Icon source="information-outline" size={24} color={headerButtonColor} />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/group/${id}/add-expense`)}
                style={styles.headerButton}
                android_ripple={null}
              >
                <Icon source="plus" size={24} color={headerButtonColor} />
              </Pressable>
            </>
          )}
        </View>
      ),
    });
  }, [group, id, navigation, router, headerPillPressed]);

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text>Gruppe nicht gefunden.</Text>
      </View>
    );
  }

  const balances = getBalances(group, expenses);
  const debts = getDebts(balances);
  const participantById = new Map(group.participants.map((p) => [p.id, p]));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll}>
        <View style={styles.chipsWrap}>
          <View style={styles.chips}>
            {group.participants.map((p) => (
              <Chip key={p.id} compact style={[styles.chip, styles.chipBg]}>
                {p.name}
              </Chip>
            ))}
          </View>
        </View>

        <Card style={[styles.card, styles.cardBg]}>
          <Card.Title title="Wer bekommt / schuldet" />
          <Card.Content>
            {balances.length === 0 ? (
              <Text variant="bodyMedium" style={styles.muted}>
                Noch keine Ausgaben.
              </Text>
            ) : (
              balances.map((b) => {
                const name = participantById.get(b.participantId)?.name ?? "?";
                const isPositive = b.balance >= 0;
                return (
                  <View key={b.participantId} style={styles.balanceRow}>
                    <Text>{name}</Text>
                    <Text
                      variant="titleSmall"
                    style={{
                      color: isPositive
                        ? appColors.accent
                        : b.balance === 0
                          ? appColors.accent
                          : "#b54c4c",
                    }}
                    >
                      {b.balance > 0 ? "+" : ""}
                      {b.balance.toFixed(2)} €
                    </Text>
                  </View>
                );
              })
            )}
          </Card.Content>
        </Card>

        {debts.length > 0 && (
          <Card style={[styles.card, styles.cardBg]}>
            <Card.Title title="Wer zahlt wem" />
            <Card.Content>
              {debts.map((d, i) => (
                <View key={i} style={styles.debtRow}>
                  <Text>
                    {participantById.get(d.fromId)?.name ?? "?"} →{" "}
                    {participantById.get(d.toId)?.name ?? "?"}:{" "}
                    <Text variant="titleSmall">{d.amount.toFixed(2)} €</Text>
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        <Surface style={styles.section} elevation={0}>
          <Text variant="titleMedium">Ausgaben</Text>
          {expenses.length === 0 ? (
            <Text variant="bodyMedium" style={styles.muted}>
              Noch keine Ausgaben.
            </Text>
          ) : (
            expenses.map((e) => {
              const payer = participantById.get(e.payerId)?.name ?? "?";
              return (
                <Card key={e.id} style={[styles.expenseCard, styles.cardBg]}>
                  <Card.Title
                    title={e.title}
                    subtitle={`${e.amount.toFixed(2)} € · bezahlt von ${payer}`}
                    right={(props) => (
                      <View style={styles.cardActions}>
                        <IconButton
                          {...props}
                          icon="pencil"
                          onPress={() =>
                            router.push(`/group/${id}/edit-expense?expenseId=${e.id}`)
                          }
                        />
                        <IconButton
                          {...props}
                          icon="delete-outline"
                          onPress={async () => {
                            try {
                              await deleteExpense(e.id);
                              dispatch(removeExpense(e.id));
                            } catch (_) {}
                          }}
                        />
                      </View>
                    )}
                  />
                  {e.description ? (
                    <Card.Content>
                      <Text variant="bodySmall" style={styles.muted}>
                        {e.description}
                      </Text>
                    </Card.Content>
                  ) : null}
                </Card>
              );
            })
          )}
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.background },
  scroll: { flex: 1 },
  headerButtons: { flexDirection: "row", alignItems: "center" },
  headerPillInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerButton: {
    width: 35,
    height: 35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: { padding: 16, marginHorizontal: 16, marginVertical: 8, borderRadius: 12 },
  chipsWrap: { alignItems: "center", paddingVertical: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  chip: { marginRight: 8, marginBottom: 4 },
  chipBg: {
    backgroundColor: appColors.accent,
    borderWidth: 1,
    borderColor: appColors.accent,
  },
  card: { marginHorizontal: 16, marginVertical: 8 },
  cardBg: { backgroundColor: appColors.background },
  cardActions: { flexDirection: "row" },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  debtRow: { paddingVertical: 4 },
  expenseCard: { marginVertical: 6 },
  muted: { color: appColors.accent },
});
