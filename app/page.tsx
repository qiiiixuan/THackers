export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="glow-peach float-slow absolute -top-48 right-[-120px] h-[520px] w-[520px] rounded-full blur-3xl opacity-70" />
        <div className="glow-mint absolute left-[-140px] top-36 h-[420px] w-[420px] rounded-full blur-3xl opacity-70" />
        <div className="grid-dots absolute inset-0 opacity-40" />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-lg font-semibold text-white">
            M
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
              MINDS Singapore
            </p>
            <p className="font-display text-lg text-[color:var(--accent-3)]">
              MINDS Connect
            </p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-[color:var(--accent-3)] md:flex">
          <a href="#interfaces">Interfaces</a>
          <a href="#flows">Flows</a>
          <a href="#operations">Operations</a>
          <a href="#security">Security</a>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-24">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="fade-up space-y-6">
            <span className="pill">QR-first sign-ups</span>
            <h1 className="font-display text-4xl leading-tight text-[color:var(--accent-3)] sm:text-5xl lg:text-6xl">
              Event sign-ups that respect every ability and every caregiver.
            </h1>
            <p className="text-lg text-muted sm:text-xl">
              MINDS Connect is a dual-interface platform that lets individuals
              self-register with a scan, while caregivers can assist, approve,
              and manage on their behalf. Staff get clean, consolidated rosters
              with capacity limits, waitlists, and attendance tracking.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                className="rounded-full bg-[color:var(--accent-3)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(39,65,86,0.25)] transition hover:-translate-y-0.5"
                href="#interfaces"
              >
                View interfaces
              </a>
              <a
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[color:var(--accent-3)] transition hover:-translate-y-0.5"
                href="#flows"
              >
                See the flow
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card fade-up p-4" style={{ animationDelay: "0.1s" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Students
                </p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--accent-3)]">
                  One scan, one action
                </p>
                <p className="mt-1 text-sm text-muted">
                  Large buttons, clear icons, and a calm, guided layout.
                </p>
              </div>
              <div className="card fade-up p-4" style={{ animationDelay: "0.2s" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Caregivers
                </p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--accent-3)]">
                  Approve in seconds
                </p>
                <p className="mt-1 text-sm text-muted">
                  Scan student QR, confirm event, and sync instantly.
                </p>
              </div>
              <div className="card fade-up p-4" style={{ animationDelay: "0.3s" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Staff
                </p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--accent-3)]">
                  Clean rosters
                </p>
                <p className="mt-1 text-sm text-muted">
                  Capacity, waitlist, approvals, and attendance in one view.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card fade-up space-y-6 p-6" style={{ animationDelay: "0.15s" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                    Student view
                  </p>
                  <p className="font-display text-xl text-[color:var(--accent-3)]">
                    Simple, guided actions
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-white text-xs font-semibold text-muted">
                  QR
                </div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[color:var(--surface-2)] p-4">
                <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                  Scan event QR to join
                </p>
                <p className="mt-2 text-sm text-muted">
                  Auto-fills your profile and confirms your spot.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                    Upcoming events
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    Activity calendar with one-tap reminders.
                  </p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                    My sign-ups
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    Clear list of confirmed and waitlisted events.
                  </p>
                </div>
              </div>
            </div>

            <div className="card fade-up space-y-4 p-6" style={{ animationDelay: "0.25s" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                    Caregiver view
                  </p>
                  <p className="font-display text-xl text-[color:var(--accent-3)]">
                    Scan, approve, assist
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-white text-xs font-semibold text-muted">
                  QR
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                    Daniel Tan
                  </p>
                  <p className="text-xs text-muted">Student profile linked</p>
                </div>
                <span className="rounded-full bg-[color:var(--surface-2)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-3)]">
                  Verified
                </span>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[color:var(--surface-2)] p-4">
                <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                  Choose event to register
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                  <span className="rounded-full bg-white px-3 py-1">
                    Art Studio (6 slots)
                  </span>
                  <span className="rounded-full bg-white px-3 py-1">
                    Digital Skills (Waitlist)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="interfaces"
          className="mt-20 grid gap-8 lg:grid-cols-[1fr_1.1fr]"
        >
          <div className="space-y-4">
            <h2 className="font-display text-3xl text-[color:var(--accent-3)]">
              Designed for every tech comfort
            </h2>
            <p className="text-muted">
              Individuals can sign up in one tap, while caregivers can step in
              for approvals or full registration. The interface is optimized
              for large targets, short prompts, and minimal text.
            </p>
            <div className="flex flex-wrap gap-2 text-sm font-semibold text-muted">
              <span className="rounded-full bg-white px-3 py-1">
                Large buttons
              </span>
              <span className="rounded-full bg-white px-3 py-1">
                Visual cues
              </span>
              <span className="rounded-full bg-white px-3 py-1">
                Calm screens
              </span>
              <span className="rounded-full bg-white px-3 py-1">
                Bilingual ready
              </span>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-display text-xl text-[color:var(--accent-3)]">
              Two QR entry points
            </h3>
            <p className="mt-2 text-sm text-muted">
              Event posters include an event QR, and every individual has a
              personal QR for caregiver-assisted sign-ups.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Event QR
                </p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--accent-3)]">
                  Auto-register for students
                </p>
                <p className="mt-2 text-xs text-muted">
                  Triggers a simple confirmation screen.
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Student QR
                </p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--accent-3)]">
                  Caregiver-assisted sign-up
                </p>
                <p className="mt-2 text-xs text-muted">
                  Caregiver signs in before viewing details.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="flows" className="mt-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h2 className="font-display text-3xl text-[color:var(--accent-3)]">
                Simple flows, zero confusion
              </h2>
              <p className="text-muted">
                Every journey is short, guided, and focused on one action per
                screen.
              </p>
            </div>
            <div className="flex gap-3 text-sm font-semibold text-muted">
              <span className="rounded-full bg-white px-3 py-1">QR scan</span>
              <span className="rounded-full bg-white px-3 py-1">
                Auto-fill data
              </span>
              <span className="rounded-full bg-white px-3 py-1">
                Confirm spot
              </span>
            </div>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="card space-y-4 p-6">
              <h3 className="font-display text-xl text-[color:var(--accent-3)]">
                Individual flow
              </h3>
              <div className="space-y-3 text-sm text-muted">
                <p>
                  <span className="font-semibold text-[color:var(--accent-3)]">
                    1.
                  </span>{" "}
                  Scan event QR on posters or flyers.
                </p>
                <p>
                  <span className="font-semibold text-[color:var(--accent-3)]">
                    2.
                  </span>{" "}
                  Profile auto-fills with saved details.
                </p>
                <p>
                  <span className="font-semibold text-[color:var(--accent-3)]">
                    3.
                  </span>{" "}
                  Confirm attendance and receive reminders.
                </p>
              </div>
            </div>
            <div className="card space-y-4 p-6">
              <h3 className="font-display text-xl text-[color:var(--accent-3)]">
                Caregiver flow
              </h3>
              <div className="space-y-3 text-sm text-muted">
                <p>
                  <span className="font-semibold text-[color:var(--accent-3)]">
                    1.
                  </span>{" "}
                  Sign in and scan the student QR.
                </p>
                <p>
                  <span className="font-semibold text-[color:var(--accent-3)]">
                    2.
                  </span>{" "}
                  Review profile and choose event.
                </p>
                <p>
                  <span className="font-semibold text-[color:var(--accent-3)]">
                    3.
                  </span>{" "}
                  Approve or waitlist instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="operations" className="mt-20 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="font-display text-3xl text-[color:var(--accent-3)]">
              Staff operations without spreadsheets
            </h2>
            <p className="text-muted">
              Staff can create events, set capacity limits, and approve
              registrations while the system consolidates data across programs.
            </p>
            <div className="flex flex-wrap gap-2 text-sm font-semibold text-muted">
              <span className="rounded-full bg-white px-3 py-1">
                Capacity limits
              </span>
              <span className="rounded-full bg-white px-3 py-1">Waitlist</span>
              <span className="rounded-full bg-white px-3 py-1">
                Attendance QR
              </span>
              <span className="rounded-full bg-white px-3 py-1">
                Export rosters
              </span>
            </div>
          </div>
          <div className="card space-y-4 p-6">
            <h3 className="font-display text-xl text-[color:var(--accent-3)]">
              Attendance tracking built-in
            </h3>
            <p className="text-sm text-muted">
              Scan a check-in QR at the venue to mark attendance and reconcile
              no-shows instantly. Waitlist promotions trigger right away.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                  Live roster
                </p>
                <p className="mt-2 text-xs text-muted">
                  Track confirmed, waitlisted, and checked-in.
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold text-[color:var(--accent-3)]">
                  Instant notifications
                </p>
                <p className="mt-2 text-xs text-muted">
                  Alert caregivers when slots open.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="mt-20">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <h2 className="font-display text-3xl text-[color:var(--accent-3)]">
                Sensitive data handled with care
              </h2>
              <p className="text-muted">
                Personal details are minimized, protected, and only shown to
                verified caregivers and staff. Students see only what they
                need.
              </p>
              <div className="flex flex-wrap gap-2 text-sm font-semibold text-muted">
                <span className="rounded-full bg-white px-3 py-1">Name</span>
                <span className="rounded-full bg-white px-3 py-1">Gender</span>
                <span className="rounded-full bg-white px-3 py-1">
                  ID number
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  NOK contact
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  Disability type
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  Caregiver details
                </span>
              </div>
            </div>
            <div className="card space-y-4 p-6">
              <h3 className="font-display text-xl text-[color:var(--accent-3)]">
                Security highlights
              </h3>
              <div className="space-y-3 text-sm text-muted">
                <p>
                  Role-based access: students, caregivers, and staff see only
                  what they need.
                </p>
                <p>
                  Signed QR tokens with expiry to prevent reuse or tampering.
                </p>
                <p>
                  Consent records with audit logs for caregiver actions.
                </p>
                <p>
                  Data masking for ID numbers and sensitive fields.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Built for MINDS
              </p>
              <h3 className="font-display text-2xl text-[color:var(--accent-3)]">
                Ready for a live demo?
              </h3>
              <p className="mt-2 text-sm text-muted">
                Next.js frontend with Supabase auth, policies, and event data.
              </p>
            </div>
            <a
              className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,143,122,0.25)] transition hover:-translate-y-0.5"
              href="/auth"
            >
              Launch prototype
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
