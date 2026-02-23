import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, StyleSheet, ScrollView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSelector, useDispatch } from "react-redux";
import { TextInput, Button, SegmentedButtons, Text, Chip, HelperText } from "react-native-paper";
import type { RootState } from "../../../store";
import { addExpenseFromServer } from "../../../store/slices/groupsSlice";
import { useAuth } from "../../../context/AuthContext";
import { createExpense } from "../../../lib/supabaseApi";
import { appColors } from "../../../theme";

export default function AddExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const { session } = useAuth();
  const group = useSelector((s: RootState) =>
    s.groups.groups.find((g) => g.id === id)
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [payerId, setPayerId] = useState("");
  const [splitBetweenIds, setSplitBetweenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text>Gruppe nicht gefunden.</Text>
      </View>
    );
  }

  const selectedIds =
    splitBetweenIds.length === 0
      ? group.participants.map((p) => p.id)
      : splitBetweenIds;
  const isSelected = (participantId: string) => selectedIds.includes(participantId);

  const toggleSplit = (participantId: string) => {
    if (isSelected(participantId)) {
      const newSelected = selectedIds.filter((id) => id !== participantId);
      if (newSelected.length === 0) return;
      setSplitBetweenIds(newSelected);
    } else {
      const newSelected = [...selectedIds, participantId];
      setSplitBetweenIds(
        newSelected.length === group.participants.length ? [] : newSelected
      );
    }
  };

  const save = async () => {
    const amount = parseFloat(amountStr.replace(",", "."));
    if (!title.trim() || isNaN(amount) || amount <= 0 || !payerId || !id || !session?.user?.id || !group) return;
    setError(null);
    setLoading(true);
    try {
      const expense = await createExpense(
        id,
        session.user.id,
        {
          title: title.trim(),
          description: description.trim(),
          amount,
          payerId,
          splitBetweenIds,
        },
        group.participants.map((p) => p.id)
      );
      dispatch(addExpenseFromServer(expense));
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ausgabe konnte nicht gespeichert werden.");
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    title.trim() &&
    !isNaN(parseFloat(amountStr.replace(",", "."))) &&
    parseFloat(amountStr.replace(",", ".")) > 0 &&
    !!payerId;

  const inputTheme = {
    roundness: 12,
    colors: {
      outline: appColors.accent,
      primary: appColors.primary,
      background: appColors.background,
    },
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TextInput
        label="Bezeichnung der Ausgabe"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        theme={inputTheme}
        outlineColor={appColors.accent}
        activeOutlineColor={appColors.primary}
      />
      <TextInput
        label="Beschreibung (optional)"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        style={[styles.input, styles.inputMultiline]}
        theme={inputTheme}
        outlineColor={appColors.accent}
        activeOutlineColor={appColors.primary}
        multiline
        numberOfLines={3}
      />
      <TextInput
        label="Betrag (€)"
        value={amountStr}
        onChangeText={setAmountStr}
        mode="outlined"
        keyboardType="decimal-pad"
        style={styles.input}
        theme={inputTheme}
        outlineColor={appColors.accent}
        activeOutlineColor={appColors.primary}
        left={<TextInput.Icon icon="currency-eur" />}
      />
      <Text variant="labelLarge" style={styles.label}>
        Wer hat bezahlt?
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segmentedScrollContent}
        style={styles.segmentedScroll}
      >
        <SegmentedButtons
          value={payerId}
          onValueChange={setPayerId}
          buttons={group.participants.map((p) => ({ value: p.id, label: p.name }))}
          style={styles.segmented}
        />
      </ScrollView>
      <Text variant="labelLarge" style={styles.label}>
        Für wen gilt die Ausgabe?
      </Text>
      <Text variant="bodySmall" style={styles.hint}>
        Tippen zum Abwählen (ausgegraut). Standardmäßig alle.
      </Text>
      {error ? (
        <HelperText type="error" visible style={styles.error}>
          {error}
        </HelperText>
      ) : null}
      <View style={styles.chips}>
        {group.participants.map((p) => (
          <Chip
            key={p.id}
            selected={isSelected(p.id)}
            onPress={() => toggleSplit(p.id)}
            showSelectedCheck
            selectedColor={appColors.background}
            style={[
              styles.chip,
              styles.chipBg,
              isSelected(p.id) ? styles.chipSelected : styles.chipDeselected,
            ]}
            textStyle={isSelected(p.id) ? styles.chipTextSelected : styles.chipTextDeselected}
          >
            {p.name}
          </Chip>
        ))}
      </View>
      <Button
        mode="contained"
        onPress={save}
        disabled={!isValid || loading}
        loading={loading}
        style={styles.save}
      >
        Ausgabe speichern
      </Button>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  input: {
    marginBottom: 16,
    backgroundColor: appColors.background,
  },
  inputMultiline: { minHeight: 88 },
  label: { marginTop: 8, marginBottom: 8 },
  segmentedScroll: { marginBottom: 8 },
  segmentedScrollContent: { flexGrow: 0 },
  segmented: { marginBottom: 0 },
  hint: { marginTop: 4, marginBottom: 8, color: appColors.accent },
  error: { marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { marginBottom: 4 },
  chipBg: { backgroundColor: appColors.background },
  chipSelected: { backgroundColor: appColors.accent },
  chipDeselected: { backgroundColor: appColors.accent, opacity: 0.4 },
  chipTextSelected: { color: appColors.background },
  chipTextDeselected: { color: appColors.primary },
  save: { marginTop: 24 },
});
