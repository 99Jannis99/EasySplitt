import { useEffect } from "react";
import { useRouter, useNavigation } from "expo-router";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSelector } from "react-redux";
import { List, Text, Card, IconButton, Icon } from "react-native-paper";
import type { RootState } from "../store";
import { removeGroup } from "../store/slices/groupsSlice";
import { useDispatch } from "react-redux";
import { useAuth } from "../context/AuthContext";
import { deleteGroup } from "../lib/supabaseApi";
import { appColors } from "../theme";

const headerButtonColor = "#000000";

export default function GroupsScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { session, loading, signOut } = useAuth();
  const groups = useSelector((s: RootState) => s.groups.groups);
  const groupsLoading = useSelector((s: RootState) => s.groups.groupsLoading);

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
      return;
    }
  }, [session, loading, router]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          <Pressable
            onPress={() => router.push("/add-group")}
            style={styles.headerButton}
            android_ripple={null}
          >
            <Icon source="plus" size={24} color={headerButtonColor} />
          </Pressable>
          <Pressable
            onPress={() => signOut().then(() => router.replace("/login"))}
            style={styles.headerButton}
            android_ripple={null}
          >
            <Icon source="logout" size={24} color={headerButtonColor} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, router, signOut]);

  if (session && groupsLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={appColors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={groups.length === 0 ? styles.scrollContentEmpty : styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="bodyLarge">Noch keine Gruppen. Lege eine an.</Text>
          </View>
        ) : (
          <List.Section>
            {groups.map((g) => {
              const isCreator = session?.user?.id && g.createdBy === session.user.id;
              return (
                <Card key={g.id} style={[styles.card, styles.cardBg]} onPress={() => router.push(`/group/${g.id}`)}>
                  <Card.Title
                    title={g.name}
                    subtitle={`${g.participants.length} Teilnehmer`}
                    right={isCreator ? (props) => (
                      <View style={styles.cardActions}>
                        <IconButton
                          {...props}
                          icon="pencil"
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/edit-group?id=${g.id}`);
                          }}
                        />
                        <IconButton
                          {...props}
                          icon="delete-outline"
                          onPress={async (e) => {
                            e.stopPropagation();
                            try {
                              await deleteGroup(g.id);
                              dispatch(removeGroup(g.id));
                            } catch (_) {}
                          }}
                        />
                      </View>
                    ) : undefined}
                  />
                </Card>
              );
            })}
          </List.Section>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.background },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  scrollContentEmpty: { flex: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  card: { marginHorizontal: 16, marginVertical: 6 },
  cardBg: { backgroundColor: appColors.background },
  cardActions: { flexDirection: "row" },
  headerButtons: { flexDirection: "row", alignItems: "center" },
  headerButton: {
    width: 35,
    height: 35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
