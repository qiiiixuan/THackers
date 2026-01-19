export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type SessionInfo = {
  accessToken: string;
  refreshToken?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

const storageKey = "miinds-session";

export const getApiUrl = () =>
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const getSession = (): SessionInfo | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionInfo;
  } catch {
    return null;
  }
};

export const setSession = (session: SessionInfo) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(session));
};

export const clearSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
};

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const session = getSession();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !data?.success) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
};
