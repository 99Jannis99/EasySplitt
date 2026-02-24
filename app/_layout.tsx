import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { supabase } from "../lib/supabase";
import { PaperProvider } from "react-native-paper";
import { Provider as ReduxProvider } from "react-redux";
import { CustomHeader } from "../components/CustomHeader";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useRealtimeSync } from "../hooks/useRealtimeSync";
import { fetchGroupsAndExpenses } from "../lib/supabaseApi";
import { store } from "../store";
import { setGroupsLoading, setStateFromStorage } from "../store/slices/groupsSlice";
import { appColors, appTheme } from "../theme";

// Splash so lange anzeigen, bis wir explizit ausblenden (verhindert Flackern / „hängen“)
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 400, fade: true });

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch() {
    SplashScreen.hideAsync();
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Etwas ist schiefgelaufen</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message ?? "Unbekannter Fehler"}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function parseAuthUrl(url: string | null): { access_token: string; refresh_token: string } | null {
  if (!url || !url.includes("auth")) return null;
  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams as Record<string, string> | undefined;
    const access_token = q?.access_token;
    const refresh_token = q?.refresh_token;
    if (access_token && refresh_token) return { access_token, refresh_token };
  } catch (_) {}
  return null;
}

function RootStack() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const loaded = useRef(false);

  useRealtimeSync(session?.user?.id);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      const tokens = parseAuthUrl(url);
      if (!tokens) return;
      supabase.auth.setSession(tokens).then(() => {
        router.dismissAll();
        router.replace("/");
      }).catch(() => {});
    };
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", (e) => handleUrl(e.url));
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (!session?.user?.id || loaded.current) return;
    loaded.current = true;
    store.dispatch(setGroupsLoading(true));
    fetchGroupsAndExpenses(session.user.id)
      .then(({ groups, expenses }) => {
        store.dispatch(setStateFromStorage({ groups, expenses }));
      })
      .catch(() => {
        loaded.current = false;
        store.dispatch(setGroupsLoading(false));
      });
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session) loaded.current = false;
  }, [session]);

  // Splash ausblenden, sobald Auth-Zustand bekannt ist (erster sinnvoller Frame)
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={appColors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: appTheme.colors.primaryContainer },
        headerTintColor: appTheme.colors.onPrimaryContainer,
        ...(Platform.OS === "android" && {
          animation: "fade_from_bottom",
          header: (props: unknown) => <CustomHeader {...(props as React.ComponentProps<typeof CustomHeader>)} />,
        }),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Gruppen" }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "Anmelden" }} />
      <Stack.Screen name="register" options={{ title: "Registrieren" }} />
      <Stack.Screen name="add-group" options={{ title: "Neue Gruppe" }} />
      <Stack.Screen name="add-group-members" options={{ title: "Mitglieder hinzufügen" }} />
      <Stack.Screen name="edit-group" options={{ title: "Gruppe bearbeiten" }} />
      <Stack.Screen name="group/[id]/index" options={{ title: "Gruppe" }} />
      <Stack.Screen name="group/[id]/add-expense" options={{ title: "hinzufügen" }} />
      <Stack.Screen name="group/[id]/edit-expense" options={{ title: "bearbeiten" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: appColors.background },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: appColors.background },
  errorTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  errorText: { fontSize: 14, color: "#666", textAlign: "center" },
});

export default function Layout() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <ReduxProvider store={store}>
          <KeyboardProvider>
            <PaperProvider theme={appTheme}>
              <RootStack />
            </PaperProvider>
          </KeyboardProvider>
        </ReduxProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
