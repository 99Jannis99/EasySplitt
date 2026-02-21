import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { TextInput, Button, SegmentedButtons, Text, Chip } from "react-native-paper";
import type { RootState } from "../../../store";
import { addExpense } from "../../../store/slices/groupsSlice";
import { appColors } from "../../../theme";

export default function AddExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const group = useSelector((s: RootState) =>
    s.groups.groups.find((g) => g.id === id)
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [payerId, setPayerId] = useState("");
  const [splitBetweenIds, setSplitBetweenIds] = useState<string[]>([]);

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

  const save = () => {
    const amount = parseFloat(amountStr.replace(",", "."));
    if (!title.trim() || isNaN(amount) || amount <= 0 || !payerId) return;
    dispatch(
      addExpense({
        groupId: id,
        title: title.trim(),
        description: description.trim(),
        amount,
        payerId,
        splitBetweenIds,
      })
    );
    router.back();
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
    <ScrollView
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
        disabled={!isValid}
        style={styles.save}
      >
        Ausgabe speichern
      </Button>
    </ScrollView>
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { marginBottom: 4 },
  chipBg: { backgroundColor: appColors.background },
  chipSelected: { backgroundColor: appColors.accent },
  chipDeselected: { backgroundColor: appColors.accent, opacity: 0.4 },
  chipTextSelected: { color: appColors.background },
  chipTextDeselected: { color: appColors.primary },
  save: { marginTop: 24 },
});
