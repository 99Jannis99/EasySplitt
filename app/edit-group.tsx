import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useDispatch, useSelector } from "react-redux";
import { TextInput, Button, Chip, Text, HelperText } from "react-native-paper";
import { updateGroup } from "../store/slices/groupsSlice";
import type { RootState } from "../store";
import { inviteToGroup, fetchGroupMembers, updateGroup as updateGroupApi, addVirtualMember } from "../lib/supabaseApi";
import { appColors } from "../theme";

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const group = useSelector((s: RootState) => s.groups.groups.find((g) => g.id === id));
  const [name, setName] = useState("");
  
  // Invite via Email
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  
  // Add Virtual Member
  const [virtualName, setVirtualName] = useState("");
  const [virtualLoading, setVirtualLoading] = useState(false);
  const [virtualError, setVirtualError] = useState<string | null>(null);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (group) setName(group.name);
  }, [group]);

  const saveName = async () => {
    if (!id || !name.trim()) return;
    setSaveError(null);
    setSaveLoading(true);
    try {
      await updateGroupApi(id, name.trim());
      dispatch(updateGroup({ id, name: name.trim() }));
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!id || !inviteEmail.trim()) return;
    setInviteError(null);
    setInviteLoading(true);
    try {
      await inviteToGroup(id, inviteEmail.trim(), inviteDisplayName.trim() || undefined);
      const participants = await fetchGroupMembers(id);
      dispatch(updateGroup({ id, participants }));
      setInviteEmail("");
      setInviteDisplayName("");
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Einladung fehlgeschlagen.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAddVirtual = async () => {
    if (!id || !virtualName.trim()) return;
    setVirtualError(null);
    setVirtualLoading(true);
    try {
      await addVirtualMember(id, virtualName.trim());
      const participants = await fetchGroupMembers(id);
      dispatch(updateGroup({ id, participants }));
      setVirtualName("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Hinzufügen fehlgeschlagen.";
      console.error("[EditGroup] addVirtualMember error:", e);
      setVirtualError(msg);
    } finally {
      setVirtualLoading(false);
    }
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
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
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
      {saveError ? (
        <HelperText type="error" visible>
          {saveError}
        </HelperText>
      ) : null}
      <Button
        mode="contained"
        onPress={saveName}
        disabled={!name.trim() || saveLoading}
        loading={saveLoading}
        style={styles.save}
      >
        Namen speichern
      </Button>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Mitglieder
      </Text>
      <View style={styles.chips}>
        {group.participants.map((p) => (
          <Chip key={p.id} style={[styles.chip, styles.chipBg]}>
            {p.name}
          </Chip>
        ))}
      </View>

      <Text variant="titleSmall" style={styles.sectionTitle}>
        Teilnehmer ohne Konto hinzufügen
      </Text>
      <Text variant="bodySmall" style={styles.hint}>
        Fügt einen Namen hinzu, der kein echtes Konto benötigt.
      </Text>
      <TextInput
        label="Name"
        value={virtualName}
        onChangeText={setVirtualName}
        mode="outlined"
        style={styles.input}
        theme={inputTheme}
        outlineColor={appColors.accent}
        activeOutlineColor={appColors.primary}
      />
      {virtualError ? (
        <HelperText type="error" visible>
          {virtualError}
        </HelperText>
      ) : null}
      <Button
        mode="outlined"
        onPress={handleAddVirtual}
        disabled={!virtualName.trim() || virtualLoading}
        loading={virtualLoading}
        style={styles.inviteBtn}
      >
        Hinzufügen
      </Button>

      <Text variant="titleSmall" style={styles.sectionTitle}>
        Mitglied per E-Mail einladen
      </Text>
      <Text variant="bodySmall" style={styles.hint}>
        Der Nutzer muss bereits ein Konto haben.
      </Text>
      <TextInput
        label="E-Mail"
        value={inviteEmail}
        onChangeText={setInviteEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        theme={inputTheme}
        outlineColor={appColors.accent}
        activeOutlineColor={appColors.primary}
      />
      <TextInput
        label="Anzeigename (optional)"
        value={inviteDisplayName}
        onChangeText={setInviteDisplayName}
        mode="outlined"
        style={styles.input}
        theme={inputTheme}
        outlineColor={appColors.accent}
        activeOutlineColor={appColors.primary}
      />
      {inviteError ? (
        <HelperText type="error" visible>
          {inviteError}
        </HelperText>
      ) : null}
      <Button
        mode="outlined"
        onPress={handleInvite}
        disabled={!inviteEmail.trim() || inviteLoading}
        loading={inviteLoading}
        style={styles.inviteBtn}
      >
        Einladen
      </Button>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  input: { marginBottom: 16, backgroundColor: appColors.background },
  save: { marginTop: 8 },
  sectionTitle: { marginTop: 24, marginBottom: 8 },
  hint: { marginBottom: 8, color: appColors.accent },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { marginBottom: 4 },
  chipBg: {
    backgroundColor: appColors.accent,
    borderWidth: 1,
    borderColor: appColors.accent,
  },
  inviteBtn: { marginTop: 8 },
});
