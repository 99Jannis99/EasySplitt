import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { TextInput, Button, Chip, Text } from "react-native-paper";
import { updateGroup } from "../store/slices/groupsSlice";
import type { RootState } from "../store";
import type { Participant } from "../store/types";
import { appColors, appTheme } from "../theme";

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const group = useSelector((s: RootState) =>
    s.groups.groups.find((g) => g.id === id)
  );
  const [name, setName] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setParticipants([...group.participants]);
    }
  }, [group]);

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

  const removeParticipant = (participantId: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  };

  const save = () => {
    if (!id) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (participants.length === 0) return;
    dispatch(updateGroup({ id, name: trimmed, participants }));
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

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text>Gruppe nicht gefunden.</Text>
      </View>
    );
  }

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
          <Chip
            key={p.id}
            onClose={() => removeParticipant(p.id)}
            style={[styles.chip, styles.chipBg]}
          >
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
        Änderungen speichern
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: appColors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
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
