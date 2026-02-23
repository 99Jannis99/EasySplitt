import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, HelperText, Text, TextInput } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import { addVirtualMember, deleteGroup, fetchGroupMembers, inviteToGroup } from "../lib/supabaseApi";
import type { RootState } from "../store";
import { removeGroup, updateGroup } from "../store/slices/groupsSlice";
import { appColors } from "../theme";

const inputTheme = {
  roundness: 12,
  colors: {
    outline: appColors.accent,
    primary: appColors.primary,
    background: appColors.background,
  },
};

export default function AddGroupMembersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const group = useSelector((s: RootState) =>
    s.groups.groups.find((g) => g.id === groupId)
  );

  // Anzahl der auf diesem Screen hinzugefügten Mitglieder
  const [addedCount, setAddedCount] = useState(0);

  // Zurück ohne Mitglied → Gruppe löschen
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (addedCount >= 1) return;
      e.preventDefault();
      (async () => {
        try {
          if (groupId) {
            await deleteGroup(groupId);
            dispatch(removeGroup(groupId));
          }
        } catch (_) {}
        navigation.dispatch(e.data.action);
      })();
    });
    return unsubscribe;
  }, [navigation, addedCount, groupId, dispatch]);

  // Virtuelles Mitglied
  const [virtualName, setVirtualName] = useState("");
  const [virtualLoading, setVirtualLoading] = useState(false);
  const [virtualError, setVirtualError] = useState<string | null>(null);

  // E-Mail-Einladung
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  if (!group || !groupId) {
    return (
      <View style={styles.centered}>
        <Text>Gruppe nicht gefunden.</Text>
      </View>
    );
  }

  const refreshMembers = async () => {
    const participants = await fetchGroupMembers(groupId);
    dispatch(updateGroup({ id: groupId, participants }));
  };

  const handleAddVirtual = async () => {
    if (!virtualName.trim()) return;
    setVirtualError(null);
    setVirtualLoading(true);
    try {
      await addVirtualMember(groupId, virtualName.trim());
      await refreshMembers();
      setVirtualName("");
      setAddedCount((c) => c + 1);
    } catch (e) {
      setVirtualError(e instanceof Error ? e.message : "Hinzufügen fehlgeschlagen.");
    } finally {
      setVirtualLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteError(null);
    setInviteLoading(true);
    try {
      await inviteToGroup(groupId, inviteEmail.trim(), inviteDisplayName.trim() || undefined);
      await refreshMembers();
      setInviteEmail("");
      setInviteDisplayName("");
      setAddedCount((c) => c + 1);
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Einladung fehlgeschlagen.");
    } finally {
      setInviteLoading(false);
    }
  };

  const canFinish = addedCount >= 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Aktuelle Mitglieder */}
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

      {/* Virtuelles Mitglied */}
      <Text variant="titleSmall" style={styles.sectionTitle}>
        Teilnehmer ohne Konto hinzufügen
      </Text>
      <Text variant="bodySmall" style={styles.hint}>
        Fügt einen Namen hinzu, der kein Konto benötigt.
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
        style={styles.addBtn}
      >
        Hinzufügen
      </Button>

      {/* E-Mail-Einladung */}
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
        style={styles.addBtn}
      >
        Einladen
      </Button>

      {/* Fertig */}
      {!canFinish && (
        <Text variant="bodySmall" style={styles.hint}>
          Füge mindestens ein weiteres Mitglied hinzu.
        </Text>
      )}
      <Button
        mode="contained"
        onPress={() => router.replace(`/group/${groupId}`)}
        disabled={!canFinish}
        style={styles.finishBtn}
      >
        Fertig
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  sectionTitle: { marginTop: 24, marginBottom: 8 },
  hint: { marginBottom: 8, color: appColors.accent },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { marginBottom: 4 },
  chipBg: { backgroundColor: appColors.accent, borderWidth: 1, borderColor: appColors.accent },
  input: { marginBottom: 8, backgroundColor: appColors.background },
  addBtn: { marginTop: 4 },
  finishBtn: { marginTop: 32 },
});
