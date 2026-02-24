import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { supabase } from "../lib/supabase";
import { appColors } from "../theme";

/**
 * Deep-Link-Handler für E-Mail-Verifizierung.
 * Wird aufgerufen via fluxshare://auth?access_token=XXX&refresh_token=YYY
 * Setzt die Supabase-Session und leitet zur Gruppenübersicht weiter.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
  }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;

    if (!accessToken || !refreshToken) {
      setError("Anmeldung fehlgeschlagen – Token fehlen.");
      setTimeout(() => router.replace("/login"), 2000);
      return;
    }

    let cancelled = false;

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(() => {
        if (!cancelled) {
          router.dismissAll();
          router.replace("/");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message ?? "Anmeldung fehlgeschlagen.");
          setTimeout(() => router.replace("/login"), 2000);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params.access_token, params.refresh_token, router]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.hint}>Weiterleitung zum Login…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={appColors.primary} />
      <Text style={styles.hint}>Anmeldung wird abgeschlossen…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: appColors.background,
    padding: 24,
  },
  hint: { marginTop: 16, color: appColors.accent, fontSize: 14 },
  error: { color: "#c00", textAlign: "center", marginBottom: 8 },
});
