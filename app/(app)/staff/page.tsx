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
  qrToken?: string;
  checkInToken?: string;
  capacity?: number | null;
  requiresApproval?: boolean;
  allowWaitlist?: boolean;
  signupCount?: number;
  statusCounts?: Record<string, number>;
};

type SignupItem = {
  id: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    studentProfile?: {
      disabilityType?: string | null;
      supportNeeds?: string | null;
    } | null;
  };
  signedUpBy?: {
    name: string;
    email: string;
  } | null;
};

const formatDate = (value?: string) => {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function StaffPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [signups, setSignups] = useState<SignupItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    startTime: "",
    endTime: "",
    capacity: "",
    requiresApproval: false,
    allowWaitlist: true,
  });

  const session = useMemo(() => getSession(), []);

  const refreshEvents = async () => {
    try {
      const response = await apiFetch<{ events: EventItem[] }>("/api/events");
      setEvents(response.data?.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    }
  };

  useEffect(() => {
    if (!session?.accessToken) return;
    void refreshEvents();
  }, [session]);

  const loadEventDetails = async (eventId: string) => {
    setError(null);
    try {
      const eventResponse = await apiFetch<{ event: EventItem }>(`/api/events/${eventId}`);
      setSelectedEvent(eventResponse.data?.event || null);
      const signupsResponse = await apiFetch<{ signups: SignupItem[] }>(
        `/api/events/${eventId}/signups`
      );
      setSignups(signupsResponse.data?.signups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    }
  };

  const handleCreateEvent = async () => {
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
        startTime: form.startTime,
        endTime: form.endTime,
        requiresApproval: form.requiresApproval,
        allowWaitlist: form.allowWaitlist,
      };

      if (form.capacity) {
        payload.capacity = Number(form.capacity);
      }

      const response = await apiFetch<{ event: EventItem }>("/api/events", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage(response.message || "Event created.");
      setForm({
        title: "",
        description: "",
        location: "",
        startTime: "",
        endTime: "",
        capacity: "",
        requiresApproval: false,
        allowWaitlist: true,
      });
      await refreshEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    }
  };

  const handleSignupAction = async (signupId: string, action: "approve" | "decline" | "check-in") => {
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch(`/api/signups/${signupId}/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMessage(response.message || "Action completed.");
      if (selectedEvent) {
        await loadEventDetails(selectedEvent.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  if (!session?.accessToken) {
    return (
      <div className="card p-6">
        <h1 className="font-display text-2xl text-[color:var(--accent-3)]">
          Staff access
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign in to manage events, approvals, and attendance.
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
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <div className="card p-6">
          <p className="pill">Staff console</p>
          <h1 className="font-display mt-4 text-3xl text-[color:var(--accent-3)]">
            Create new event
          </h1>
          <div className="mt-4 grid gap-3">
            <input
              className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
              placeholder="Title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
              placeholder="Location"
              value={form.location}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, location: event.target.value }))
              }
            />
            <textarea
              className="min-h-[80px] rounded-2xl border border-black/10 px-4 py-3 text-sm"
              placeholder="Description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
                type="datetime-local"
                value={form.startTime}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startTime: event.target.value }))
                }
              />
              <input
                className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
                type="datetime-local"
                value={form.endTime}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, endTime: event.target.value }))
                }
              />
            </div>
            <input
              className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
              type="number"
              min="0"
              placeholder="Capacity (optional)"
              value={form.capacity}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, capacity: event.target.value }))
              }
            />
            <div className="flex flex-wrap gap-4 text-sm text-muted">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.requiresApproval}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, requiresApproval: event.target.checked }))
                  }
                />
                Require approval
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.allowWaitlist}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, allowWaitlist: event.target.checked }))
                  }
                />
                Allow waitlist
              </label>
            </div>
            <button
              className="rounded-2xl bg-[color:var(--accent-3)] px-4 py-3 text-sm font-semibold text-white"
              onClick={handleCreateEvent}
              type="button"
            >
              Create event
            </button>
            {message ? <p className="text-sm text-[color:var(--accent)]">{message}</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-xl text-[color:var(--accent-3)]">
            Event list
          </h2>
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <button
                key={event.id}
                className="w-full rounded-2xl border border-black/10 bg-white p-4 text-left"
                onClick={() => loadEventDetails(event.id)}
                type="button"
              >
                <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                  {event.title}
                </p>
                <p className="text-xs text-muted">
                  {formatDate(event.startTime)} · {event.location || "TBD"}
                </p>
              </button>
            ))}
            {!events.length ? (
              <p className="text-sm text-muted">No events yet.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="font-display text-xl text-[color:var(--accent-3)]">
            Event roster
          </h2>
          {!selectedEvent ? (
            <p className="mt-2 text-sm text-muted">Select an event to view signups.</p>
          ) : (
            <>
              <div className="mt-2 text-sm text-muted">
                {selectedEvent.title} · {formatDate(selectedEvent.startTime)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                <span className="rounded-full bg-white px-3 py-1">
                  Approved: {selectedEvent.statusCounts?.APPROVED || 0}
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  Pending: {selectedEvent.statusCounts?.PENDING || 0}
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  Waitlist: {selectedEvent.statusCounts?.WAITLISTED || 0}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {signups.map((signup) => (
                  <div key={signup.id} className="rounded-2xl border border-black/10 bg-white p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                          {signup.user.name}
                        </p>
                        <p className="text-xs text-muted">
                          {signup.user.email} · {signup.status}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold"
                          onClick={() => handleSignupAction(signup.id, "approve")}
                          type="button"
                        >
                          Approve
                        </button>
                        <button
                          className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold"
                          onClick={() => handleSignupAction(signup.id, "decline")}
                          type="button"
                        >
                          Decline
                        </button>
                        <button
                          className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold"
                          onClick={() => handleSignupAction(signup.id, "check-in")}
                          type="button"
                        >
                          Check-in
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {!signups.length ? (
                  <p className="text-sm text-muted">No signups yet.</p>
                ) : null}
              </div>
            </>
          )}
        </div>

        {selectedEvent ? (
          <div className="card p-6">
            <h3 className="font-display text-lg text-[color:var(--accent-3)]">
              QR tokens
            </h3>
            <p className="mt-2 text-xs text-muted">
              Use the signup QR on posters. Check-in QR is shown only if you created
              the event.
            </p>
            <div className="mt-4 space-y-2 text-xs text-muted">
              <div>
                <span className="font-semibold text-[color:var(--accent-3)]">Signup QR:</span>{" "}
                {selectedEvent.qrToken || "Not available"}
              </div>
              <div>
                <span className="font-semibold text-[color:var(--accent-3)]">Check-in QR:</span>{" "}
                {selectedEvent.checkInToken || "Not available"}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
