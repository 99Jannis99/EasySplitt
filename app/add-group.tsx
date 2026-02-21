import { useState } from "react";
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useDispatch } from "react-redux";
import { TextInput, Button, Chip, Text } from "react-native-paper";
import { addGroup } from "../store/slices/groupsSlice";
import type { Participant } from "../store/types";
import { appColors, appTheme } from "../theme";

export default function AddGroupScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);

  const addParticipant = () => {
    const trimmed = currentName.trim();
    if (!trimmed) return;
    if (participants.some((p) => p.name === trimmed)) return;
    setParticipants((prev) => [
      ...prev,
      { id: `p-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: trimmed },
    ]);
    setCurrentName("");
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (participants.length === 0) return;
    dispatch(addGroup({ name: trimmed, participants }));
    router.back();
  };

  const inputTheme = {
    roundness: 12,
    colors: {
      outline: appColors.accent,
      primary: appColors.primary,
      background: appColors.background,
    },
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Gruppenname"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        theme={inputTheme}
        outlineColor={appColors.accent}
        activeOutlineColor={appColors.primary}
      />
      <Text variant="labelLarge" style={styles.label}>
        Teilnehmer (nur Namen)
      </Text>
      <View style={styles.row}>
        <TextInput
          label="Name"
          value={currentName}
          onChangeText={setCurrentName}
          mode="outlined"
          style={styles.inputFlex}
          theme={inputTheme}
          outlineColor={appColors.accent}
          activeOutlineColor={appColors.primary}
          onSubmitEditing={addParticipant}
          returnKeyType="done"
        />
        <Button mode="contained" onPress={addParticipant} style={styles.addBtn}>
          Hinzufügen
        </Button>
      </View>
      <View style={styles.chips}>
        {participants.map((p) => (
          <Chip key={p.id} onClose={() => removeParticipant(p.id)} style={[styles.chip, styles.chipBg]}>
            {p.name}
          </Chip>
        ))}
      </View>
      <Button
        mode="contained"
        onPress={save}
        disabled={!name.trim() || participants.length === 0}
        style={styles.save}
      >
        Gruppe speichern
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: appColors.background },
  input: { marginBottom: 16, backgroundColor: appColors.background },
  inputFlex: { flex: 1, marginRight: 8, marginBottom: 0, backgroundColor: appColors.background },
  label: { marginTop: 8, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center" },
  addBtn: { minWidth: 100 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 8 },
  chip: { marginRight: 8, marginBottom: 8 },
  chipBg: {
    backgroundColor: appColors.accent,
    borderWidth: 1,
    borderColor: appColors.accent,
  },
  save: { marginTop: 24 },
});
