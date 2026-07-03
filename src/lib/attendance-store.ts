import { useCallback, useEffect, useState } from "react";
import { fetchAttendance, saveAttendance } from "./api";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  subjectId: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  updatedAt: number;
}

const EVENT = "bwest:attendance-changed";

function broadcastUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export async function getAttendance(subjectId: string, date: string): Promise<AttendanceRecord[]> {
  return fetchAttendance(subjectId, date);
}

export async function saveAttendanceRecord(
  studentId: string,
  subjectId: string,
  date: string,
  status: "present" | "absent" | "late" | "excused",
): Promise<AttendanceRecord> {
  const record = await saveAttendance({ studentId, subjectId, date, status });
  broadcastUpdate();
  return record;
}

export function useAttendance(subjectId: string, date: string) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const refresh = useCallback(async () => {
    if (!subjectId || !date) {
      setRecords([]);
      return;
    }
    try {
      setRecords(await getAttendance(subjectId, date));
    } catch {
      setRecords([]);
    }
  }, [subjectId, date]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  return records;
}
