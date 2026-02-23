import { useState } from "react";
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useDispatch } from "react-redux";
import { TextInput, Button, Text, HelperText } from "react-native-paper";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { addGroupFromServer } from "../store/slices/groupsSlice";
import { useAuth } from "../context/AuthContext";
import { createGroup } from "../lib/supabaseApi";
import { appColors } from "../theme";

export default function AddGroupScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || !session?.user?.id) {
      if (!session?.user?.id) setError("Nicht angemeldet – bitte erneut anmelden.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const newGroup = await createGroup(trimmed, session.user.id);
      dispatch(addGroupFromServer(newGroup));
      router.replace(`/add-group-members?groupId=${newGroup.id}`);
    } catch (e) {
      const msg =
        (e && typeof e === "object" && "message" in e && String((e as { message: unknown }).message)) ||
        (e instanceof Error ? e.message : "Gruppe konnte nicht erstellt werden.");
      console.error("[AddGroup] createGroup/fetchGroups error:", e);
      setError(msg);
    } finally {
      setLoading(false);
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

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
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
        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}
        <Button
          mode="contained"
          onPress={save}
          disabled={!name.trim() || loading}
          loading={loading}
          style={styles.save}
        >
          Weiter
        </Button>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.background },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  inner: { padding: 16 },
  input: { marginBottom: 16, backgroundColor: appColors.background },
  save: { marginTop: 24 },
});
