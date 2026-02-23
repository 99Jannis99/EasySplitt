import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, Text, HelperText } from "react-native-paper";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAuth } from "../context/AuthContext";
import { appColors } from "../theme";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  const handleLogin = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("E-Mail und Passwort eingeben.");
      return;
    }
    setLoading(true);
    const { error: err } = await signIn(trimmedEmail, password);
    setLoading(false);
    if (err) {
      setError(err.message || "Anmeldung fehlgeschlagen.");
      return;
    }
    router.replace("/");
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
          <Text variant="headlineSmall" style={styles.title}>
            Anmelden
          </Text>
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
            label="Passwort"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            autoComplete="password"
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
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Anmelden
          </Button>
          <Button
            mode="text"
            onPress={() => router.push("/register")}
            style={styles.link}
          >
            Noch kein Konto? Registrieren
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
});
