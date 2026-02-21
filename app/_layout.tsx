import { Stack } from "expo-router";
import { Provider as ReduxProvider } from "react-redux";
import { PaperProvider } from "react-native-paper";
import { store } from "../store";
import { loadState, saveState } from "../store/persist";
import { setStateFromStorage } from "../store/slices/groupsSlice";
import { useEffect, useRef } from "react";
import { appTheme } from "../theme";

export default function RootLayout() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    loadState().then(({ groups, expenses }) => {
      store.dispatch(setStateFromStorage({ groups, expenses }));
    });
  }, []);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      const state = store.getState();
      saveState(state.groups.groups, state.groups.expenses);
    });
    return unsub;
  }, []);

  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={appTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: appTheme.colors.primaryContainer },
            headerTintColor: appTheme.colors.onPrimaryContainer,
          }}
        >
          <Stack.Screen name="index" options={{ title: "Gruppen" }} />
          <Stack.Screen name="add-group" options={{ title: "Neue Gruppe" }} />
          <Stack.Screen name="edit-group" options={{ title: "Gruppe bearbeiten" }} />
          <Stack.Screen name="group/[id]/index" options={{ title: "Gruppe" }} />
          <Stack.Screen name="group/[id]/add-expense" options={{ title: "Ausgabe hinzufügen" }} />
          <Stack.Screen name="group/[id]/edit-expense" options={{ title: "Ausgabe bearbeiten" }} />
        </Stack>
      </PaperProvider>
    </ReduxProvider>
  );
}
