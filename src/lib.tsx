import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
let supa: SupabaseClient | null = null;
let configPromise: Promise<SupabaseClient> | null = null;
export async function supabase() {
  if (!configPromise)
    configPromise = fetch("/api/config")
      .then(async (r) => {
        const v = await r.json();
        if (!r.ok) throw new Error(v.error);
        const { createClient } = await import("@supabase/supabase-js");
        supa = createClient(v.url, v.publishableKey, {
          auth: { flowType: "pkce", detectSessionInUrl: true },
        });
        return supa;
      })
      .catch((e) => {
        configPromise = null;
        throw e;
      });
  return configPromise;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (supa) {
    const { data } = await supa.auth.getSession();
    if (data.session)
      headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  if (typeof options.body === "string")
    headers.set("Content-Type", "application/json");
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(20_000)])
      : AbortSignal.timeout(20_000),
  });
  const value = await response.json();
  if (!response.ok)
    throw new ApiError(
      value.error || "Permintaan belum berhasil.",
      response.status,
    );
  return value;
}
export const mutate = <T,>(path: string, method: string, value?: unknown) =>
  api<T>(path, {
    method,
    ...(value === undefined ? {} : { body: JSON.stringify(value) }),
  });
export function useData<T>(path: string, initial: T, enabled = true) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<T>(path, { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, enabled, nonce]);
  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}
interface AuthState {
  user: User | null;
  admin: boolean;
  loading: boolean;
  unavailable: string;
  refresh: () => Promise<void>;
}
const AuthContext = createContext<AuthState>({
  user: null,
  admin: false,
  loading: true,
  unavailable: "",
  refresh: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState("");
  const refresh = async () => {
    try {
      const sb = await supabase();
      const { data } = await sb.auth.getSession();
      setUser(data.session?.user ?? null);
      if (data.session) {
        const me = await api<{ admin: boolean }>("/me");
        setAdmin(me.admin);
      } else setAdmin(false);
      setUnavailable("");
    } catch (e) {
      setAdmin(false);
      setUnavailable((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let cleanup = () => {};
    let disposed = false;
    supabase()
      .then((sb) => {
        if (disposed) return;
        const { data } = sb.auth.onAuthStateChange(() => {
          setTimeout(() => {
            if (!disposed) void refresh();
          }, 0);
        });
        cleanup = () => data.subscription.unsubscribe();
        void refresh();
      })
      .catch((e) => {
        setUnavailable(e.message);
        setLoading(false);
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{ user, admin, loading, unavailable, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
const ToastContext = createContext<(message: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(t);
  }, [message]);
  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      <div className={`toast ${message ? "visible" : ""}`} role="status">
        {message}
        <button aria-label="Tutup pemberitahuan" onClick={() => setMessage("")}>
          ×
        </button>
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
export const date = (v: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(v));
export const mediaUrl = (path: string) =>
  `/api/media/${encodeURIComponent(path)}`;
export function PrivateImage({
  path,
  alt,
  className = "",
}: {
  path: string | null;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!path) return;
    let disposed = false;
    let objectUrl = "";
    (async () => {
      const sb = await supabase();
      const { data } = await sb.auth.getSession();
      const response = await fetch(mediaUrl(path), {
        headers: { Authorization: `Bearer ${data.session?.access_token}` },
      });
      if (!response.ok) throw new Error("Gambar belum tersedia.");
      const blob = await response.blob();
      if (disposed) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    })().catch((e) => {
      if (!disposed) setError(e.message);
    });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl("");
    };
  }, [path]);
  return path ? (
    url ? (
      <img src={url} alt={alt} className={className} />
    ) : (
      <p className="muted">{error || "Memuat gambar…"}</p>
    )
  ) : (
    <p className="muted">Belum ada gambar.</p>
  );
}
