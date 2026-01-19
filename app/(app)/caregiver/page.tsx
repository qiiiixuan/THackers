"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, getSession } from "@/app/lib/api";

type UserInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type StudentProfile = {
  gender?: string | null;
  nationalId?: string | null;
  nokName?: string | null;
  nokContact?: string | null;
  disabilityType?: string | null;
  supportNeeds?: string | null;
};

type StudentRecord = {
  id: string;
  name: string;
  email: string;
  qrToken?: string;
  studentProfile?: StudentProfile | null;
  relationship?: string | null;
  consentGivenAt?: string | null;
};

type EventItem = {
  id: string;
  title: string;
  location?: string | null;
  startTime: string;
  capacity?: number | null;
  statusCounts?: Record<string, number>;
};

const formatDate = (value?: string) => {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function CaregiverPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [scanToken, setScanToken] = useState("");
  const [scanResult, setScanResult] = useState<StudentRecord | null>(null);
  const [scanLinked, setScanLinked] = useState(false);
  const [relationship, setRelationship] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const session = useMemo(() => getSession(), []);

  const refresh = async (userId?: string) => {
    if (!session?.accessToken) return;
    try {
      const eventsResponse = await apiFetch<{ events: EventItem[] }>("/api/events");
      setEvents(eventsResponse.data?.events || []);

      if (userId) {
        const studentsResponse = await apiFetch<{ students: StudentRecord[] }>(
          "/api/users/my-students"
        );
        setStudents(studentsResponse.data?.students || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!session?.accessToken) return;
      try {
        const userResponse = await apiFetch<{ user: UserInfo }>("/api/auth/me");
        setUser(userResponse.data?.user || null);
        if (userResponse.data?.user?.id) {
          await refresh(userResponse.data.user.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    };
    void bootstrap();
  }, [session]);

  const handleScan = async () => {
    if (!scanToken.trim()) return;
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch<{ user: StudentRecord; linked: boolean }>(
        "/api/users/qr/" + encodeURIComponent(scanToken)
      );
      setScanResult(response.data?.user || null);
      setScanLinked(Boolean(response.data?.linked));
      setMessage(response.message || "Student record loaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    }
  };

  const handleLink = async () => {
    if (!scanResult) return;
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/users/assign-student", {
        method: "POST",
        body: JSON.stringify({ studentId: scanResult.id, relationship }),
      });
      setMessage("Student linked successfully.");
      setScanLinked(true);
      if (user?.id) await refresh(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link student");
    }
  };

  const handleSignup = async (studentId: string, eventId: string) => {
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch("/api/signups/caregiver", {
        method: "POST",
        body: JSON.stringify({ studentId, eventId }),
      });
      setMessage(response.message || "Student signed up.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up student");
    }
  };

  if (!session?.accessToken) {
    return (
      <div className="card p-6">
        <h1 className="font-display text-2xl text-[color:var(--accent-3)]">
          Caregiver access
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign in to scan student QR codes and register them for events.
        </p>
        <Link
          className="mt-4 inline-flex rounded-full bg-[color:var(--accent-3)] px-4 py-2 text-sm font-semibold text-white"
          href="/auth"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  const canRegisterStudent = scanLinked || user?.role === "STAFF";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div className="card p-6">
          <p className="pill">Caregiver dashboard</p>
          <h1 className="font-display mt-4 text-3xl text-[color:var(--accent-3)]">
            Assist with confidence
          </h1>
          <p className="mt-2 text-sm text-muted">
            Scan a student QR to view details and register them for activities.
          </p>
          <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
            <label className="text-xs font-semibold text-muted">Scan student QR</label>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                className="flex-1 rounded-2xl border border-black/10 px-4 py-3 text-sm"
                placeholder="Paste student QR token"
                value={scanToken}
                onChange={(event) => setScanToken(event.target.value)}
              />
              <button
                className="rounded-2xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white"
                onClick={handleScan}
                type="button"
              >
                Scan
              </button>
            </div>
          </div>
          {message ? <p className="mt-3 text-sm text-[color:var(--accent)]">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        {scanResult ? (
          <div className="card p-6">
            <h2 className="font-display text-xl text-[color:var(--accent-3)]">
              Student profile
            </h2>
            <p className="mt-2 text-sm text-muted">
              {scanResult.name} · {scanResult.email}
            </p>
            <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
              <div>Disability: {scanResult.studentProfile?.disabilityType || "Not set"}</div>
              <div>Support: {scanResult.studentProfile?.supportNeeds || "Not set"}</div>
              <div>NOK: {scanResult.studentProfile?.nokName || "Not set"}</div>
              <div>Contact: {scanResult.studentProfile?.nokContact || "Not set"}</div>
            </div>
            {!scanLinked && user?.role === "CAREGIVER" ? (
              <div className="mt-4 space-y-2">
                <input
                  className="w-full rounded-2xl border border-black/10 px-4 py-2 text-sm"
                  placeholder="Relationship (optional)"
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value)}
                />
                <button
                  className="rounded-full bg-[color:var(--accent-3)] px-4 py-2 text-xs font-semibold text-white"
                  onClick={handleLink}
                  type="button"
                >
                  Link student
                </button>
              </div>
            ) : (
              <span className="mt-4 inline-flex rounded-full bg-[color:var(--surface-2)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-3)]">
                {scanLinked ? "Linked" : "Staff access"}
              </span>
            )}
          </div>
        ) : null}

        <div className="card p-6">
          <h2 className="font-display text-xl text-[color:var(--accent-3)]">
            Register student for event
          </h2>
          <p className="mt-2 text-sm text-muted">
            Select an event once a student is linked or you are signed in as staff.
          </p>
          <div className="mt-4 space-y-3">
            {events.map((event) => {
              const approved =
                (event.statusCounts?.APPROVED || 0) +
                (event.statusCounts?.CHECKED_IN || 0);
              const capacityLabel =
                event.capacity != null
                  ? `${approved}/${event.capacity} spots`
                  : `${event.statusCounts?.APPROVED || 0} confirmed`;
              return (
                <div key={event.id} className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                        {event.title}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(event.startTime)} · {event.location || "TBD"}
                      </p>
                    </div>
                    <button
                      className="rounded-full bg-[color:var(--accent-3)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                      onClick={() => scanResult && handleSignup(scanResult.id, event.id)}
                      disabled={!scanResult || !canRegisterStudent}
                      type="button"
                    >
                      Sign up
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted">{capacityLabel}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-[color:var(--accent-3)]">
          My students
        </h2>
        <p className="mt-2 text-sm text-muted">
          Linked students appear here with consent status.
        </p>
        <div className="mt-4 space-y-3">
          {students.map((student) => (
            <div key={student.id} className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                {student.name}
              </p>
              <p className="text-xs text-muted">
                {student.relationship || "Caregiver"} ·{" "}
                {student.consentGivenAt ? "Consent recorded" : "Consent pending"}
              </p>
            </div>
          ))}
          {!students.length ? (
            <p className="text-sm text-muted">No linked students yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
