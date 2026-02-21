import { useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { Provider as ReduxProvider } from "react-redux";
import { PaperProvider } from "react-native-paper";
import { store } from "../store";
import { setStateFromStorage, setGroupsLoading } from "../store/slices/groupsSlice";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { fetchGroupsAndExpenses } from "../lib/supabaseApi";
import { appTheme, appColors } from "../theme";

function RootStack() {
  const { session, loading } = useAuth();
  const loaded = useRef(false);

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
        headerStyle: { backgroundColor: appTheme.colors.primaryContainer },
        headerTintColor: appTheme.colors.onPrimaryContainer,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Gruppen" }} />
      <Stack.Screen name="login" options={{ title: "Anmelden" }} />
      <Stack.Screen name="register" options={{ title: "Registrieren" }} />
      <Stack.Screen name="add-group" options={{ title: "Neue Gruppe" }} />
      <Stack.Screen name="edit-group" options={{ title: "Gruppe bearbeiten" }} />
      <Stack.Screen name="group/[id]/index" options={{ title: "Gruppe" }} />
      <Stack.Screen name="group/[id]/add-expense" options={{ title: "Ausgabe hinzufügen" }} />
      <Stack.Screen name="group/[id]/edit-expense" options={{ title: "Ausgabe bearbeiten" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: appColors.background },
});

export default function Layout() {
  return (
    <AuthProvider>
      <ReduxProvider store={store}>
        <PaperProvider theme={appTheme}>
          <RootStack />
        </PaperProvider>
      </ReduxProvider>
    </AuthProvider>
  );
}
