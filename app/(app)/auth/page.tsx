"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setSession } from "@/app/lib/api";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthSession = {
  access_token: string;
  refresh_token: string;
};

const roles = [
  { value: "STUDENT", label: "Student" },
  { value: "CAREGIVER", label: "Caregiver" },
  { value: "STAFF", label: "Staff" },
];

const genders = [
  { value: "", label: "Select gender (optional)" },
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

const caregiverTypes = [
  { value: "", label: "Select caregiver type (optional)" },
  { value: "MEDICAL", label: "Medical" },
  { value: "TEACHER", label: "Teacher" },
  { value: "STAFF", label: "Staff" },
  { value: "FAMILY", label: "Family" },
  { value: "OTHER", label: "Other" },
];

const stripEmpty = (obj: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== "")
  );

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STUDENT",
    gender: "",
    nationalId: "",
    nokName: "",
    nokContact: "",
    disabilityType: "",
    supportNeeds: "",
    contactNumber: "",
    caregiverType: "",
    organization: "",
    jobTitle: "",
  });

  const roleLabel = useMemo(
    () => roles.find((role) => role.value === registerForm.role)?.label || "",
    [registerForm.role]
  );

  const redirectForRole = (role: string) => {
    if (role === "CAREGIVER") return router.push("/caregiver");
    if (role === "STAFF") return router.push("/staff");
    return router.push("/student");
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    try {
      const response = await apiFetch<{ user: AuthUser; session: AuthSession }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify(loginForm),
        }
      );

      if (!response.data) throw new Error("No session returned");
      setSession({
        accessToken: response.data.session.access_token,
        refreshToken: response.data.session.refresh_token,
        user: {
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          role: response.data.user.role,
        },
      });
      setStatus("Signed in successfully.");
      redirectForRole(response.data.user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const studentProfile = stripEmpty({
      gender: registerForm.gender,
      nationalId: registerForm.nationalId,
      nokName: registerForm.nokName,
      nokContact: registerForm.nokContact,
      disabilityType: registerForm.disabilityType,
      supportNeeds: registerForm.supportNeeds,
    });

    const caregiverProfile = stripEmpty({
      contactNumber: registerForm.contactNumber,
      caregiverType: registerForm.caregiverType,
      organization: registerForm.organization,
      jobTitle: registerForm.jobTitle,
    });

    const payload: Record<string, unknown> = {
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      role: registerForm.role,
    };

    if (registerForm.role === "STUDENT" && Object.keys(studentProfile).length) {
      payload.studentProfile = studentProfile;
    }

    if (registerForm.role !== "STUDENT" && Object.keys(caregiverProfile).length) {
      payload.caregiverProfile = caregiverProfile;
    }

    try {
      const response = await apiFetch<{ user: AuthUser; session: AuthSession }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!response.data) throw new Error("No session returned");
      setSession({
        accessToken: response.data.session.access_token,
        refreshToken: response.data.session.refresh_token,
        user: {
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          role: response.data.user.role,
        },
      });
      setStatus("Account created.");
      redirectForRole(response.data.user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="card p-6">
        <p className="pill">Authentication</p>
        <h1 className="font-display mt-4 text-3xl text-[color:var(--accent-3)]">
          Sign in or register
        </h1>
        <p className="mt-2 text-sm text-muted">
          Use your MIINDS Connect account to access student, caregiver, or staff
          tools.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mode === "login"
                ? "bg-[color:var(--accent-3)] text-white"
                : "border border-black/10"
            }`}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mode === "register"
                ? "bg-[color:var(--accent-3)] text-white"
                : "border border-black/10"
            }`}
            onClick={() => setMode("register")}
            type="button"
          >
            Register
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {status ? <p className="mt-4 text-sm text-[color:var(--accent)]">{status}</p> : null}
      </div>

      <div className="card p-6">
        {mode === "login" ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="text-xs font-semibold text-muted">Email</label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                type="email"
                required
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted">Password</label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                type="password"
                required
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
            </div>
            <button
              className="w-full rounded-2xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Sign in
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted">Name</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                  required
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">Role</label>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                  value={registerForm.role}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, role: event.target.value }))
                  }
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted">Email</label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                type="email"
                required
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted">Password</label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                type="password"
                required
                minLength={6}
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
            </div>

            <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {roleLabel} details (optional)
              </p>
              {registerForm.role === "STUDENT" ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <select
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                    value={registerForm.gender}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, gender: event.target.value }))
                    }
                  >
                    {genders.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                    placeholder="National ID"
                    value={registerForm.nationalId}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        nationalId: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                    placeholder="NOK name"
                    value={registerForm.nokName}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, nokName: event.target.value }))
                    }
                  />
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                    placeholder="NOK contact"
                    value={registerForm.nokContact}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        nokContact: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                    placeholder="Disability type"
                    value={registerForm.disabilityType}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        disabilityType: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                    placeholder="Support needs"
                    value={registerForm.supportNeeds}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        supportNeeds: event.target.value,
                      }))
                    }
                  />
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                    placeholder="Contact number"
                    value={registerForm.contactNumber}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        contactNumber: event.target.value,
                      }))
                    }
                  />
                  <select
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                    value={registerForm.caregiverType}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        caregiverType: event.target.value,
                      }))
                    }
                  >
                    {caregiverTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                    placeholder="Organization"
                    value={registerForm.organization}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        organization: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                    placeholder="Job title"
                    value={registerForm.jobTitle}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, jobTitle: event.target.value }))
                    }
                  />
                </div>
              )}
            </div>

            <button
              className="w-full rounded-2xl bg-[color:var(--accent-3)] px-4 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Create account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
