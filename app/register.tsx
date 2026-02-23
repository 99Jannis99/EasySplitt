import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, Text, HelperText } from "react-native-paper";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAuth } from "../context/AuthContext";
import { appColors } from "../theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  const handleRegister = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("E-Mail und Passwort eingeben.");
      return;
    }
    if (password.length < 6) {
      setError("Passwort mindestens 6 Zeichen.");
      return;
    }
    setLoading(true);
    const { error: err } = await signUp(trimmedEmail, password, displayName.trim() || undefined);
    setLoading(false);
    if (err) {
      setError(err.message || "Registrierung fehlgeschlagen.");
      return;
    }
    setSentTo(trimmedEmail);
    setEmailSent(true);
  };

  const inputTheme = {
    roundness: 12,
    colors: {
      outline: appColors.accent,
      primary: appColors.primary,
      background: appColors.background,
    },
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <View style={styles.iconWrapper}>
            <Text style={styles.icon}>✉️</Text>
          </View>
          <Text variant="headlineSmall" style={styles.confirmTitle}>
            E-Mail bestätigen
          </Text>
          <Text variant="bodyMedium" style={styles.confirmText}>
            Wir haben eine Bestätigungs-E-Mail an
          </Text>
          <Text variant="bodyMedium" style={styles.confirmEmail}>
            {sentTo}
          </Text>
          <Text variant="bodyMedium" style={styles.confirmText}>
            gesendet. Bitte öffne die E-Mail und klicke auf den Bestätigungslink,
            um dein Konto zu aktivieren.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace("/login")}
            style={styles.button}
          >
            Zum Login
          </Button>
          <Button
            mode="text"
            onPress={() => setEmailSent(false)}
            style={styles.link}
          >
            Andere E-Mail verwenden
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
        <Text variant="headlineSmall" style={styles.title}>
          Konto erstellen
        </Text>
        <TextInput
          label="Anzeigename (optional)"
          value={displayName}
          onChangeText={setDisplayName}
          mode="outlined"
          autoComplete="name"
          style={styles.input}
          theme={inputTheme}
          outlineColor={appColors.accent}
          activeOutlineColor={appColors.primary}
        />
        <TextInput
          label="E-Mail"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.input}
          theme={inputTheme}
          outlineColor={appColors.accent}
          activeOutlineColor={appColors.primary}
        />
        <TextInput
          label="Passwort (min. 6 Zeichen)"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          autoComplete="new-password"
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
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Registrieren
        </Button>
        <Button
          mode="text"
          onPress={() => router.back()}
          style={styles.link}
        >
          Bereits Konto? Anmelden
        </Button>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  inner: { padding: 24 },
  title: { marginBottom: 24, color: appColors.primary },
  input: { marginBottom: 16, backgroundColor: appColors.background },
  button: { marginTop: 8 },
  link: { marginTop: 16 },
  iconWrapper: { alignItems: "center", marginBottom: 20 },
  icon: { fontSize: 56 },
  confirmTitle: { marginBottom: 16, color: appColors.primary, textAlign: "center" },
  confirmText: { color: appColors.accent, textAlign: "center", marginBottom: 4 },
  confirmEmail: { fontWeight: "700", color: appColors.primary, textAlign: "center", marginBottom: 4 },
});
