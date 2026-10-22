import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z, ZodError } from "zod";
import {
  submissionSchema,
  reviewSchema,
  ledgerSchema,
  reportSchema,
  validationMessage,
} from "../shared/schema";

export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
  API_RATE_LIMIT?: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function validConfig(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return false;
  try {
    const url = new URL(env.SUPABASE_URL);
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(url.hostname)
      )
    )
      return false;
    if (env.SUPABASE_PUBLISHABLE_KEY.startsWith("sb_secret_")) return false;
    if (env.SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_"))
      return !env.SUPABASE_PUBLISHABLE_KEY.includes("REPLACE");
    const payload = JSON.parse(
      atob(
        env.SUPABASE_PUBLISHABLE_KEY.split(".")[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/"),
      ),
    );
    return payload.role === "anon";
  } catch {
    return false;
  }
}
export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
function checked<T>(result: {
  data: T;
  error: { code?: string; message: string } | null;
}): T {
  if (result.error) {
    const code = result.error.code ?? "";
    const status =
      code === "42501" ? 403 : /^(22|23|PGRST116)/.test(code) ? 400 : 503;
    throw new HttpError(
      status,
      status === 503
        ? "Layanan data belum tersedia. Coba lagi beberapa saat."
        : result.error.message,
    );
  }
  return result.data;
}
async function bytes(request: Request, max: number) {
  if (Number(request.headers.get("content-length")) > max)
    throw new HttpError(413, "Berkas atau data terlalu besar.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Data tidak boleh kosong.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "Berkas atau data terlalu besar.");
    }
    chunks.push(chunk.value);
  }
  const value = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    value.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return value;
}
async function body(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Gunakan data JSON.");
  try {
    return JSON.parse(new TextDecoder().decode(await bytes(request, 32_768)));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Data JSON tidak valid.");
  }
}
export function imageType(value: Uint8Array): "png" | "jpg" | "webp" | null {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => value[i] === n))
    return "png";
  if (value[0] === 255 && value[1] === 216 && value[2] === 255) return "jpg";
  const s = new TextDecoder().decode(value.slice(0, 12));
  return s.startsWith("RIFF") && s.slice(8) === "WEBP" ? "webp" : null;
}
function client(env: Env, token?: string) {
  return createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
}
async function identity(request: Request, env: Env, admin = false) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) throw new HttpError(401, "Masuk ke akun terlebih dahulu.");
  const db = client(env, token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user || !data.user.email_confirmed_at)
    throw new HttpError(
      401,
      "Sesi berakhir atau email belum terverifikasi. Silakan masuk kembali.",
    );
  if (admin && !checked(await db.rpc("is_admin")))
    throw new HttpError(403, "Halaman ini hanya untuk admin.");
  return { db, user: data.user };
}
function id(value: string) {
  return z.uuid().parse(value);
}
async function rpc(
  db: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
) {
  return checked(await db.rpc(name, args));
}

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");
  const method = request.method;
  if (path === "/api/health")
    return json(
      {
        ok: validConfig(env),
        service: "arahbaik",
        configured: validConfig(env),
      },
      validConfig(env) ? 200 : 503,
    );
  if (!validConfig(env))
    throw new HttpError(
      503,
      "ArahBaik sedang disiapkan. Koneksi layanan belum diaktifkan oleh tim.",
    );
  if (
    env.API_RATE_LIMIT &&
    !(
      await env.API_RATE_LIMIT.limit({
        key: request.headers.get("CF-Connecting-IP") ?? "local",
      })
    ).success
  )
    return new Response(
      JSON.stringify({
        error: "Terlalu banyak permintaan. Coba lagi sebentar.",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      },
    );
  if (!["GET", "HEAD"].includes(method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin)
      throw new HttpError(403, "Asal permintaan tidak diizinkan.");
  }
  if (path === "/api/config" && method === "GET")
    return json({
      url: env.SUPABASE_URL,
      publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    });
  if (path === "/api/directory" && method === "GET") {
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .parse(url.searchParams.get("page") ?? 1);
    const limit = 12;
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    let query = client(env).from("directory").select("*", { count: "exact" });
    if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
    const category = url.searchParams.get("category");
    if (category)
      query = query.eq(
        "category",
        z.enum(["Masjid", "Panti", "Komunitas"]).parse(category),
      );
    const city = url.searchParams.get("city");
    if (city) query = query.eq("city", city.slice(0, 80));
    const result = await query
      .order("published_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    const data = checked(result);
    return json({ items: data, total: result.count ?? 0, page, limit });
  }
  if (path === "/api/stats" && method === "GET")
    return json(checked(await client(env).rpc("directory_stats")));
  const detail = path.match(/^\/api\/directory\/([^/]+)$/);
  if (detail && method === "GET") {
    const result = await client(env)
      .from("directory")
      .select("*")
      .eq("id", id(detail[1]))
      .maybeSingle();
    const item = checked(result);
    if (!item)
      throw new HttpError(404, "Profil tidak ditemukan atau sedang ditinjau.");
    return json(item);
  }
  if (path === "/api/ledger" && method === "GET") {
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .parse(url.searchParams.get("page") ?? 1);
    const result = await client(env)
      .from("ledger_public")
      .select("*", { count: "exact" })
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range((page - 1) * 25, page * 25 - 1);
    return json({
      items: checked(result),
      total: result.count ?? 0,
      totals: checked(await client(env).rpc("ledger_totals")),
    });
  }
  const media = path.match(/^\/api\/media\/(.+)$/);
  if (media && method === "GET") {
    const name = decodeURIComponent(media[1]);
    if (
      !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(
        name,
      )
    )
      throw new HttpError(404, "Berkas tidak ditemukan.");
    const db = request.headers.has("authorization")
      ? (await identity(request, env)).db
      : client(env);
    const { data, error } = await db.storage
      .from("organization-files")
      .download(name);
    if (error || !data) throw new HttpError(404, "Berkas tidak tersedia.");
    return new Response(data, {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...(url.searchParams.has("download")
          ? {
              "Content-Disposition": `attachment; filename="arahbaik-qris.${name.split(".").pop()}"`,
            }
          : {}),
      },
    });
  }
  // Everything below uses a server-validated Supabase identity and that user's RLS context.
  const { db, user } = await identity(
    request,
    env,
    path.startsWith("/api/admin/"),
  );
  if (path === "/api/me" && method === "GET")
    return json({
      id: user.id,
      email: user.email,
      admin: checked(await db.rpc("is_admin")),
    });
  if (path === "/api/submissions" && method === "GET")
    return json(
      checked(
        await db
          .from("organization_submissions")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),
      ),
    );
  if (path === "/api/submissions" && method === "POST")
    return json(
      await rpc(db, "save_submission", {
        p_data: submissionSchema.parse(await body(request)),
        p_id: null,
      }),
      201,
    );
  const submission = path.match(
    /^\/api\/submissions\/([^/]+)(?:\/(submit|withdraw|upload))?$/,
  );
  if (submission) {
    const key = id(submission[1]);
    const action = submission[2];
    if (method === "PUT" && !action)
      return json(
        await rpc(db, "save_submission", {
          p_data: submissionSchema.parse(await body(request)),
          p_id: key,
        }),
      );
    if (method === "POST" && (action === "submit" || action === "withdraw")) {
      await rpc(db, `${action}_organization`, { p_id: key });
      return json({ ok: true });
    }
    if (method === "POST" && action === "upload") {
      const org = checked(
        await db
          .from("organization_submissions")
          .select("owner_id,status")
          .eq("id", key)
          .maybeSingle(),
      );
      if (
        !org ||
        org.owner_id !== user.id ||
        !["draft", "rejected"].includes(org.status)
      )
        throw new HttpError(403, "Simpan draf milikmu sebelum mengunggah.");
      const value = await bytes(request, 5 * 1024 * 1024);
      const extension = imageType(value);
      const mime = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
      if (!extension || request.headers.get("content-type") !== mime)
        throw new HttpError(
          415,
          "Unggah gambar PNG, JPG, atau WebP yang valid, maksimal 5 MB.",
        );
      const name = `${user.id}/${key}/${crypto.randomUUID()}.${extension}`;
      const { error } = await db.storage
        .from("organization-files")
        .upload(name, value, {
          contentType: mime,
          upsert: false,
          cacheControl: "0",
        });
      if (error)
        throw new HttpError(
          400,
          "Unggahan gagal. Periksa jenis, ukuran, dan status pengajuan.",
        );
      return json({ path: name }, 201);
    }
  }
  if (path === "/api/favorites" && method === "GET")
    return json(
      checked(
        await db
          .from("favorites")
          .select("organization_id,directory(*)")
          .eq("user_id", user.id),
      ),
    );
  const favorite = path.match(/^\/api\/favorites\/([^/]+)$/);
  if (favorite && ["PUT", "DELETE"].includes(method)) {
    const key = id(favorite[1]);
    if (method === "PUT")
      checked(
        await db
          .from("favorites")
          .upsert(
            { user_id: user.id, organization_id: key },
            { onConflict: "user_id,organization_id", ignoreDuplicates: true },
          ),
      );
    else
      checked(
        await db
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("organization_id", key),
      );
    return json({ ok: true });
  }
  if (path === "/api/reports" && method === "POST") {
    const value = reportSchema.parse(await body(request));
    await rpc(db, "create_report", {
      p_organization_id: value.organization_id,
      p_reason: value.reason,
      p_message: value.message,
    });
    return json({ ok: true }, 201);
  }
  if (path === "/api/admin/submissions" && method === "GET")
    return json(
      checked(
        await db
          .from("organization_submissions")
          .select("*")
          .in("status", ["pending", "approved", "rejected"])
          .order("updated_at", { ascending: false })
          .limit(200),
      ),
    );
  const review = path.match(/^\/api\/admin\/submissions\/([^/]+)\/review$/);
  if (review && method === "POST") {
    const v = reviewSchema.parse(await body(request));
    await rpc(db, "review_organization", {
      p_id: id(review[1]),
      p_decision: v.decision,
      p_notes: v.notes,
      p_identity_checked: v.identity_checked,
      p_qris_checked: v.qris_checked,
    });
    return json({ ok: true });
  }
  if (path === "/api/admin/ledger" && method === "POST")
    return json(
      await rpc(db, "record_ledger", {
        p_data: ledgerSchema.parse(await body(request)),
      }),
      201,
    );
  const voidEntry = path.match(/^\/api\/admin\/ledger\/([^/]+)\/void$/);
  if (voidEntry && method === "POST") {
    const v = z
      .object({ reason: z.string().trim().min(5).max(300) })
      .strict()
      .parse(await body(request));
    await rpc(db, "void_ledger", {
      p_id: id(voidEntry[1]),
      p_reason: v.reason,
    });
    return json({ ok: true });
  }
  if (path === "/api/admin/reports" && method === "GET")
    return json(
      checked(
        await db
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
      ),
    );
  const report = path.match(/^\/api\/admin\/reports\/([^/]+)\/resolve$/);
  if (report && method === "POST") {
    const v = z
      .object({ resolution: z.string().trim().min(5).max(1000) })
      .strict()
      .parse(await body(request));
    await rpc(db, "resolve_report", {
      p_id: id(report[1]),
      p_resolution: v.resolution,
    });
    return json({ ok: true });
  }
  if (path === "/api/admin/audit" && method === "GET")
    return json(
      checked(
        await db
          .from("audit_events")
          .select("id,entity_id,action,detail,created_at")
          .order("created_at", { ascending: false })
          .limit(100),
      ),
    );
  throw new HttpError(404, "Endpoint tidak ditemukan.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    let response: Response;
    try {
      response = new URL(request.url).pathname.startsWith("/api/")
        ? await api(request, env)
        : await env.ASSETS.fetch(request);
    } catch (error) {
      if (error instanceof ZodError)
        response = json(
          {
            error: validationMessage(error),
          },
          400,
        );
      else if (error instanceof HttpError)
        response = json({ error: error.message }, error.status);
      else
        response = json(
          { error: "Terjadi kendala pada layanan. Silakan coba lagi." },
          500,
        );
    }
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
    );
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
