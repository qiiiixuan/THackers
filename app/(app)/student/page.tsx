"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, getSession } from "@/app/lib/api";

type EventItem = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: string;
  endTime: string;
  capacity?: number | null;
  requiresApproval?: boolean;
  allowWaitlist?: boolean;
  signupCount?: number;
  statusCounts?: Record<string, number>;
};

type UserInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type UserEvent = EventItem & {
  signupId?: string;
  signupStatus?: string;
  signedUpAt?: string;
};

const formatDate = (value?: string) => {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function StudentPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [myEvents, setMyEvents] = useState<UserEvent[]>([]);
  const [qrToken, setQrToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const session = useMemo(() => getSession(), []);

  const refresh = async (userId?: string) => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const eventsResponse = await apiFetch<{ events: EventItem[] }>("/api/events");
      setEvents(eventsResponse.data?.events || []);

      if (userId) {
        const myEventsResponse = await apiFetch<{ events: UserEvent[] }>(
          `/api/users/${userId}/events`
        );
        setMyEvents(myEventsResponse.data?.events || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
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

  const handleSignup = async (eventId: string) => {
    setMessage(null);
    setError(null);
    try {
      const response = await apiFetch<{ signup: { status: string } }>("/api/signups", {
        method: "POST",
        body: JSON.stringify({ eventId }),
      });
      setMessage(response.message || "Signed up.");
      if (user?.id) await refresh(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
    }
  };

  const handleQrSignup = async () => {
    if (!qrToken.trim()) return;
    setMessage(null);
    setError(null);
    try {
      const response = await apiFetch("/api/signups/qr/" + encodeURIComponent(qrToken), {
        method: "POST",
      });
      setMessage(response.message || "Signed up via QR.");
      setQrToken("");
      if (user?.id) await refresh(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "QR sign-up failed");
    }
  };

  if (!session?.accessToken) {
    return (
      <div className="card p-6">
        <h1 className="font-display text-2xl text-[color:var(--accent-3)]">
          Student access
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign in to access event sign-ups and your calendar.
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

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="card p-6">
          <p className="pill">Student dashboard</p>
          <h1 className="font-display mt-4 text-3xl text-[color:var(--accent-3)]">
            Welcome{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Scan an event QR or tap sign-up to reserve your spot.
          </p>
          <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
            <label className="text-xs font-semibold text-muted">Scan event QR</label>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                className="flex-1 rounded-2xl border border-black/10 px-4 py-3 text-sm"
                placeholder="Paste QR token here"
                value={qrToken}
                onChange={(event) => setQrToken(event.target.value)}
              />
              <button
                className="rounded-2xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white"
                onClick={handleQrSignup}
                type="button"
              >
                Join
              </button>
            </div>
          </div>
          {message ? <p className="mt-3 text-sm text-[color:var(--accent)]">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="card p-6">
          <h2 className="font-display text-xl text-[color:var(--accent-3)]">
            Upcoming events
          </h2>
          <p className="mt-2 text-sm text-muted">
            Tap once to sign up. If capacity is full, you will be waitlisted.
          </p>
          <div className="mt-4 space-y-4">
            {events.map((event) => {
              const approved =
                (event.statusCounts?.APPROVED || 0) +
                (event.statusCounts?.CHECKED_IN || 0);
              const capacityLabel =
                event.capacity != null
                  ? `${approved}/${event.capacity} spots`
                  : `${event.signupCount || 0} sign-ups`;
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
                      className="rounded-full bg-[color:var(--accent-3)] px-4 py-2 text-xs font-semibold text-white"
                      onClick={() => handleSignup(event.id)}
                      type="button"
                    >
                      Sign up
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted">{capacityLabel}</p>
                </div>
              );
            })}
            {!events.length && !loading ? (
              <p className="text-sm text-muted">No events yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-[color:var(--accent-3)]">
          My sign-ups
        </h2>
        <p className="mt-2 text-sm text-muted">
          See confirmed, pending, and waitlisted events.
        </p>
        <div className="mt-4 space-y-4">
          {myEvents.map((event) => (
            <div key={event.signupId || event.id} className="rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                {event.title}
              </p>
              <p className="mt-1 text-xs text-muted">
                {formatDate(event.startTime)} · {event.location || "TBD"}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-[color:var(--surface-2)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-3)]">
                {event.signupStatus || "CONFIRMED"}
              </span>
            </div>
          ))}
          {!myEvents.length && !loading ? (
            <p className="text-sm text-muted">No sign-ups yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
