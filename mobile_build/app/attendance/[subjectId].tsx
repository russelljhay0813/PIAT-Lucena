import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Card, RadioButton, Text, TextInput, Title } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getSubjectById, getSubjectRoster, saveAttendanceRecord } from "../../src/lib/db";
import { useSyncStore } from "../../src/lib/sync-store";
import { useToastStore } from "../../src/lib/toast-store";
import { generateId } from "../../src/lib/utils";

const attendanceOptions = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
];

export default function SubjectAttendanceScreen() {
  const router = useRouter();
  const { subjectId } = useLocalSearchParams();
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState<any>(null);
  const sync = useSyncStore();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!subjectId) return;
    async function loadAttendance() {
      const subjectData = await getSubjectById(subjectId as string);
      setSubject(subjectData);
      const roster = await getSubjectRoster(subjectId as string, today);
      setStudents(roster);
      const initialStatus: Record<string, string> = {};
      roster.forEach((row) => {
        if (row.attendanceStatus) initialStatus[row.studentId] = row.attendanceStatus;
      });
      setSelectedStatus(initialStatus);
    }
    loadAttendance().catch(console.error);
  }, [subjectId, today]);

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    return students.filter((student) => {
      const needle = search.toLowerCase();
      return student.firstName?.toLowerCase().includes(needle) || student.lastName?.toLowerCase().includes(needle) || student.studentId?.toLowerCase().includes(needle);
    });
  }, [search, students]);

  const toast = useToastStore((state) => state.showToast);

  const onMarkStatus = async (student: any, status: string) => {
    if (!subjectId || !subject) return;
    const record = {
      id: generateId(),
      studentId: student.studentId,
      studentName: `${student.lastName}, ${student.firstName}`,
      subjectId: subjectId as string,
      subjectCode: subject.code ?? "",
      subjectName: subject.title ?? "",
      facultyId: subject.facultyId ?? "",
      date: today,
      time: new Date().toISOString(),
      academicYear: subject.academicYear ?? "",
      semester: subject.semester ?? "",
      status,
      syncStatus: "pending" as const,
      updatedAt: Date.now(),
    };
    const saved = await saveAttendanceRecord(record);
    setSelectedStatus((prev) => ({ ...prev, [student.studentId]: status }));
    setStudents((prev) =>
      prev.map((row) =>
        row.studentId === student.studentId
          ? { ...row, attendanceStatus: status, attendanceSyncStatus: saved.syncStatus }
          : row,
      ),
    );
    sync.refreshPendingCount();

    if (saved.isUpdated && saved.previousStatus === status) {
      toast(`Attendance unchanged (${status}).`, "info");
    } else if (saved.isUpdated) {
      toast(`Updated attendance from ${saved.previousStatus ?? "none"} to ${status}.`, "success");
    } else {
      toast(`Marked ${student.firstName} ${student.lastName} as ${status}.`, "success");
    }
  };

  const markAllPresent = async () => {
    if (!subjectId || !subject) return;
    await Promise.all(
      students.map((student) =>
        saveAttendanceRecord({
          id: generateId(),
          studentId: student.studentId,
          studentName: `${student.lastName}, ${student.firstName}`,
          subjectId: subjectId as string,
          subjectCode: subject.code ?? "",
          subjectName: subject.title ?? "",
          facultyId: subject.facultyId ?? "",
          date: today,
          time: new Date().toISOString(),
          academicYear: subject.academicYear ?? "",
          semester: subject.semester ?? "",
          status: "present",
          syncStatus: "pending",
          updatedAt: Date.now(),
        }),
      ),
    );
    const allPresentStatus: Record<string, string> = {};
    students.forEach((student) => {
      allPresentStatus[student.studentId] = "present";
    });
    setSelectedStatus(allPresentStatus);
    sync.refreshPendingCount();
  };

  const handleSave = async () => {
    await sync.syncPendingAttendance();
    router.back();
  };

  return (
    <View style={styles.container}>
      <Title>Attendance for {subject?.code ?? subjectId}</Title>
      <TextInput placeholder="Search student" value={search} onChangeText={setSearch} style={styles.search} />
      <Button mode="outlined" onPress={markAllPresent} style={styles.fullButton}>Mark All Present</Button>
      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.studentId}
        renderItem={({ item }) => {
          const currentStatus = selectedStatus[item.studentId] ?? item.attendanceStatus ?? "Not marked";
          return (
            <Card style={styles.card}>
              <Card.Title title={`${item.lastName}, ${item.firstName}`} subtitle={item.studentId} />
              <Card.Content>
                <Text>Status: {currentStatus}</Text>
                <Text>Sync: {item.attendanceSyncStatus ?? "pending"}</Text>
                <RadioButton.Group onValueChange={(value) => onMarkStatus(item, value)} value={selectedStatus[item.studentId] ?? item.attendanceStatus ?? "absent"}>
                  {attendanceOptions.map((option) => (
                    <View key={option.value} style={styles.optionRow}>
                      <RadioButton value={option.value} />
                      <Text>{option.label}</Text>
                    </View>
                  ))}
                </RadioButton.Group>
              </Card.Content>
            </Card>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No enrolled students found.</Text>}
      />
      <Button mode="contained" onPress={handleSave} style={styles.saveButton}>Save Attendance</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  search: { marginBottom: 16, backgroundColor: "transparent" },
  fullButton: { marginBottom: 16 },
  card: { marginBottom: 12 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 4 },
  empty: { textAlign: "center", marginTop: 40 },
  saveButton: { marginTop: 16 },
});
