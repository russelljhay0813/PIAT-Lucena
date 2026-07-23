import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, Title, List } from "react-native-paper";
import { getAuthData, deleteAuthData } from "../../src/lib/storage";
import { getTodaySubjects, getTotalStudentsForFaculty } from "../../src/lib/db";
import { useRouter } from "expo-router";
import { useSyncStore } from "../../src/lib/sync-store";

export default function DashboardScreen() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const { isConnected, lastSyncAt, isSyncing, syncPendingAttendance, pendingCount } =
    useSyncStore();

  useEffect(() => {
    async function load() {
      const auth = await getAuthData();
      setProfile(auth?.user ?? null);
      if (auth?.user?.id) {
        const subjects = await getTodaySubjects(auth.user.id);
        setSubjects(subjects);
        const studentCount = await getTotalStudentsForFaculty(auth.user.id);
        setStudentCount(studentCount);
      }
    }
    load().catch(console.error);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Title>Welcome, {profile?.firstName ?? "Faculty"}</Title>
        <Text>{profile?.program ?? "Program not loaded"}</Text>
        <Text>{profile?.yearLevel ?? "Year not loaded"}</Text>
      </View>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text>Total Subjects</Text>
            <Title>{subjects.length}</Title>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text>Total Students</Text>
            <Title>{studentCount}</Title>
          </Card.Content>
        </Card>
      </View>
      <Card style={styles.card}>
        <Card.Title title="Sync Status" subtitle={isConnected ? "Online" : "Offline"} />
        <Card.Content>
          <Text>Pending: {pendingCount}</Text>
          <Text>Last Sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}</Text>
          <Text>{isSyncing ? "Syncing..." : "Idle"}</Text>
        </Card.Content>
        <Card.Actions>
          <Button onPress={syncPendingAttendance} disabled={isSyncing}>
            Sync Now
          </Button>
        </Card.Actions>
      </Card>
      <Card style={styles.card}>
        <Card.Title title="Today's Assigned Subjects" />
        <Card.Content>
          {subjects.length === 0 ? (
            <Text>No classes found.</Text>
          ) : (
            subjects.map((subject) => (
              <List.Item
                key={subject.id}
                title={`${subject.code} • ${subject.title}`}
                description={`${subject.schedule} • ${subject.room}`}
                onPress={() => router.push(`/attendance/${subject.id}`)}
              />
            ))
          )}
        </Card.Content>
      </Card>
      <Button
        mode="outlined"
        onPress={async () => {
          await deleteAuthData();
          router.replace("/login");
        }}
      >
        Logout
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f3f3" },
  content: { padding: 16, gap: 16 },
  header: { marginBottom: 12 },
  card: { padding: 0 },
  statsRow: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  statCard: { flex: 1 },
});
