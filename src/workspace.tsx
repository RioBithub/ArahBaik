import React, { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Empty,
  ErrorBox,
  Icon,
  Loading,
  PageHead,
  SignOut,
} from "./components";
import {
  api,
  date,
  money,
  mutate,
  PrivateImage,
  supabase,
  useAuth,
  useData,
  useToast,
} from "./lib";
import {
  categories,
  submissionSchema,
  validationMessage,
  type Submission,
  type SubmissionInput,
  type LedgerEntry,
} from "../shared/schema";

export function Account() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(
    params.get("mode") === "reset" ? "reset" : "login",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const auth = useAuth();
  const navigate = useNavigate();
  const target = params.get("next");
  const next =
    target?.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
  useEffect(() => {
    if (auth.user && mode === "login") navigate(next, { replace: true });
  }, [auth.user, mode, next, navigate]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") || "");
    const password = String(f.get("password") || "");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const sb = await supabase();
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await auth.refresh();
        navigate(next);
      } else if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/akun?next=/dashboard`,
          },
        });
        if (error) throw error;
        if (data.session) {
          await auth.refresh();
          navigate("/dashboard");
        } else
          setMessage(
            "Periksa email untuk mengonfirmasi akun. Setelah verifikasi, kembali ke sini untuk masuk.",
          );
      } else if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/akun?mode=reset`,
        });
        if (error) throw error;
        setMessage(
          "Jika email terdaftar, tautan pemulihan akan dikirim. Buka di browser yang sama.",
        );
      } else {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Kata sandi berhasil diperbarui.");
        setMode("login");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const titles: Record<string, string> = {
    login: "Selamat datang kembali.",
    signup: "Mulai langkah baikmu.",
    forgot: "Temukan aksesmu kembali.",
    reset: "Buat kata sandi baru.",
  };
  return (
    <section className="container auth-section">
      <div className="auth-intro">
        <span className="eyebrow">SATU AKUN, BANYAK KEBAIKAN</span>
        <h1>
          Ikut merawat
          <br />
          <em>arah yang baik.</em>
        </h1>
        <p>
          Simpan tempat favorit atau bantu lembagamu ditemukan oleh orang yang
          ingin berbagi.
        </p>
        <img
          src="/assets/children.webp"
          alt="Kebersamaan dan senyum anak-anak"
        />
      </div>
      <div className="auth-card">
        <Link className="breadcrumb" to="/">
          ← Kembali ke beranda
        </Link>
        <h2>{titles[mode]}</h2>
        <p>
          {mode === "signup"
            ? "Daftar gratis. Verifikasi email untuk mengaktifkan akun."
            : mode === "reset"
              ? "Gunakan tautan pemulihan dari email terlebih dahulu."
              : "Kebaikanmu menunggu untuk dilanjutkan."}
        </p>
        {message && (
          <div className="success-box" role="status">
            {message}
          </div>
        )}
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        <form className="stack" onSubmit={submit}>
          {mode !== "reset" && (
            <label>
              Alamat email
              <input
                name="email"
                type="email"
                required
                maxLength={200}
                autoComplete="email"
                placeholder="nama@email.com"
              />
            </label>
          )}
          {mode !== "forgot" && (
            <label>
              Kata sandi
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder={
                  mode === "login" ? "Kata sandimu" : "Minimal 12 karakter"
                }
              />
            </label>
          )}
          <button className="btn full" disabled={busy}>
            {busy
              ? "Memproses…"
              : mode === "login"
                ? "Masuk"
                : mode === "signup"
                  ? "Buat akun"
                  : mode === "forgot"
                    ? "Kirim tautan pemulihan"
                    : "Simpan kata sandi"}
            <Icon name="arrow" size={18} />
          </button>
        </form>
        <div className="auth-switch">
          {mode === "login" ? (
            <>
              <button
                className="text-link"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                }}
              >
                Lupa kata sandi?
              </button>
              <p>
                Belum punya akun?{" "}
                <button
                  className="text-link"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                  }}
                >
                  Daftar sekarang
                </button>
              </p>
            </>
          ) : (
            <button
              className="text-link"
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Kembali ke masuk
            </button>
          )}
        </div>
        <p className="fine">
          Dengan menggunakan akun, kamu memahami{" "}
          <Link to="/privasi">privasi dan ketentuan layanan</Link> ArahBaik.
        </p>
      </div>
    </section>
  );
}
const statusLabel: Record<string, string> = {
  draft: "Draf",
  pending: "Menunggu pemeriksaan",
  approved: "Tayang",
  rejected: "Perlu perbaikan",
  archived: "Diarsipkan",
};
export function Dashboard() {
  const result = useData("/submissions", [] as Submission[]);
  const auth = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState("");
  async function withdraw(id: string) {
    setBusy(id);
    try {
      await mutate(`/submissions/${id}/withdraw`, "POST");
      toast(
        "Profil ditarik dari publik. Kamu bisa mengedit dan mengajukannya kembali.",
      );
      result.reload();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageHead
        label="RUANG PENGELOLA"
        title="Rawat ceritamu."
        accent="Luaskan manfaatnya."
      >
        Kelola informasi lembaga dan pantau proses pemeriksaan di satu tempat.
      </PageHead>
      <section className="container workspace-section">
        <div className="workspace-bar">
          <span>
            Masuk sebagai <b>{auth.user?.email}</b>
          </span>
          <div>
            {auth.admin && (
              <Link className="btn outline small" to="/admin">
                Ruang admin <Icon name="shield" size={16} />
              </Link>
            )}
            <SignOut />
            <Link className="btn small" to="/dashboard/baru">
              Tambah tempat <Icon name="plus" size={17} />
            </Link>
          </div>
        </div>
        <div className="soft-note">
          <Icon name="shield" />
          <p>
            Hanya profil yang sudah diperiksa yang tampil ke publik. Untuk
            mengubah profil yang tayang, tarik dahulu lalu ajukan kembali.
            Kontak pengelola hanya dilihat pemilik akun dan admin.
          </p>
        </div>
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <ErrorBox message={result.error} retry={result.reload} />
        ) : result.data.length ? (
          <div className="submission-list">
            {result.data.map((s) => (
              <article className="submission-card" key={s.id}>
                <div>
                  <span
                    className={`pill ${s.status === "approved" ? "green" : ""}`}
                  >
                    {statusLabel[s.status]}
                  </span>
                  <h3>{s.name}</h3>
                  <p>
                    {s.category} · {s.city} · Diperbarui {date(s.updated_at)}
                  </p>
                  {s.review_notes && (
                    <p className="review-note">
                      <b>Catatan tim:</b> {s.review_notes}
                    </p>
                  )}
                </div>
                <div className="submission-actions">
                  {["draft", "rejected"].includes(s.status) ? (
                    <Link className="btn small" to={`/dashboard/${s.id}`}>
                      Edit & ajukan <Icon name="arrow" size={17} />
                    </Link>
                  ) : (
                    <button
                      className="btn outline small"
                      disabled={busy === s.id}
                      onClick={() => withdraw(s.id)}
                    >
                      Tarik untuk diedit
                    </button>
                  )}
                  {s.status === "approved" && (
                    <Link className="text-link" to={`/tempat/${s.id}`}>
                      Lihat profil publik ↗
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Ceritakan tempat yang kamu rawat.">
            <p>
              Siapkan informasi lembaga, foto, dan QRIS asli. Mulai dengan
              menyimpan draf.
            </p>
            <Link className="btn" to="/dashboard/baru">
              Buat pengajuan pertama <Icon name="plus" />
            </Link>
          </Empty>
        )}
      </section>
    </>
  );
}
const blank: SubmissionInput = {
  name: "",
  category: "Masjid",
  city: "",
  address: "",
  summary: "",
  story: "",
  needs: [],
  manager_name: "",
  manager_email: "",
  manager_phone: "",
  recipient_name: "",
  photo_path: null,
  qr_path: null,
  consent: true,
};
export function SubmissionEditor() {
  const { id } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [value, setValue] = useState<SubmissionInput>({
    ...blank,
    manager_email: auth.user?.email || "",
  });
  const [needs, setNeeds] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const result = useData("/submissions", [] as Submission[], !!id);
  useEffect(() => {
    if (!id) return;
    const s = result.data.find((v) => v.id === id);
    if (s) {
      setValue({
        name: s.name,
        category: s.category,
        city: s.city,
        address: s.address,
        summary: s.summary,
        story: s.story,
        needs: s.needs,
        manager_name: s.manager_name,
        manager_email: s.manager_email,
        manager_phone: s.manager_phone,
        recipient_name: s.recipient_name,
        photo_path: s.photo_path,
        qr_path: s.qr_path,
        consent: true,
      });
      setNeeds(s.needs.join(", "));
      setConsent(s.consent);
    }
  }, [id, result.data]);
  const field = (key: keyof SubmissionInput, text: string) =>
    setValue((v) => ({ ...v, [key]: text }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const parsed = submissionSchema.safeParse({
        ...value,
        needs: needs
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        consent,
      });
      if (!parsed.success) throw new Error(validationMessage(parsed.error));
      const s = await mutate<Submission>(
        id ? `/submissions/${id}` : "/submissions",
        id ? "PUT" : "POST",
        parsed.data,
      );
      toast("Draf tersimpan. Lengkapi foto dan QRIS sebelum mengajukan.");
      if (!id) navigate(`/dashboard/${s.id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined, key: "photo_path" | "qr_path") {
    if (!file || !id) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Batas berkas 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const v = await api<{ path: string }>(`/submissions/${id}/upload`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type },
      });
      const next = {
        ...value,
        [key]: v.path,
        needs: needs
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        consent: true as const,
      };
      await mutate(`/submissions/${id}`, "PUT", next);
      setValue(next);
      toast("Berkas terunggah dan tersimpan.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const parsed = submissionSchema.parse({
        ...value,
        needs: needs
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        consent,
      });
      await mutate(`/submissions/${id}`, "PUT", parsed);
      await mutate(`/submissions/${id}/submit`, "POST");
      toast("Pengajuan terkirim. Pantau hasil pemeriksaan di dashboard.");
      navigate("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (id && result.loading) return <Loading />;
  if (id && result.error)
    return (
      <div className="container section">
        <ErrorBox message={result.error} retry={result.reload} />
      </div>
    );
  if (id && !result.data.find((v) => v.id === id))
    return (
      <div className="container section">
        <Empty title="Pengajuan tidak ditemukan.">
          <Link to="/dashboard">Kembali ke dashboard</Link>
        </Empty>
      </div>
    );
  if (
    id &&
    !["draft", "rejected"].includes(
      result.data.find((v) => v.id === id)!.status,
    )
  )
    return (
      <div className="container section">
        <Empty title="Pengajuan sedang diperiksa atau sudah tayang.">
          <p>Tarik pengajuan dari dashboard sebelum mengedit.</p>
          <Link to="/dashboard" className="btn">
            Ke dashboard
          </Link>
        </Empty>
      </div>
    );
  return (
    <>
      <PageHead
        label="PENGAJUAN TEMPAT"
        title={id ? "Lengkapi ceritamu." : "Mulai dari ceritamu."}
        accent="Buka jalan kebaikan."
      >
        Data publik dan kontak pengelola diisi terpisah. Simpan draf terlebih
        dahulu untuk mengunggah berkas.
      </PageHead>
      <section className="container editor-section">
        <Link to="/dashboard" className="breadcrumb">
          ← Dashboard pengelola
        </Link>
        {error && <ErrorBox message={error} />}
        <form onSubmit={save} className="editor-form">
          <fieldset disabled={busy}>
            <legend>
              <span>01</span> Profil publik lembaga
            </legend>
            <div className="form-grid">
              <label>
                Nama lembaga
                <input
                  required
                  minLength={3}
                  maxLength={120}
                  value={value.name}
                  onChange={(e) => field("name", e.target.value)}
                />
              </label>
              <label>
                Kategori
                <select
                  value={value.category}
                  onChange={(e) => field("category", e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Kota
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={value.city}
                  onChange={(e) => field("city", e.target.value)}
                  placeholder="Contoh: Depok"
                />
              </label>
              <label>
                Nama penerima sesuai QRIS
                <input
                  required
                  minLength={3}
                  maxLength={120}
                  value={value.recipient_name}
                  onChange={(e) => field("recipient_name", e.target.value)}
                  placeholder="Persis seperti di aplikasi pembayaran"
                />
              </label>
              <label className="span-2">
                Alamat lembaga
                <textarea
                  rows={2}
                  required
                  minLength={8}
                  maxLength={400}
                  value={value.address}
                  onChange={(e) => field("address", e.target.value)}
                />
              </label>
              <label className="span-2">
                Ringkasan <small>20–220 karakter</small>
                <textarea
                  rows={2}
                  required
                  minLength={20}
                  maxLength={220}
                  value={value.summary}
                  onChange={(e) => field("summary", e.target.value)}
                />
              </label>
              <label className="span-2">
                Cerita & kegiatan <small>50–6.000 karakter</small>
                <textarea
                  rows={7}
                  required
                  minLength={50}
                  maxLength={6000}
                  value={value.story}
                  onChange={(e) => field("story", e.target.value)}
                />
              </label>
              <label className="span-2">
                Kebutuhan{" "}
                <small>Pisahkan dengan koma, maksimal 8 kebutuhan</small>
                <input
                  required
                  maxLength={640}
                  value={needs}
                  onChange={(e) => setNeeds(e.target.value)}
                  placeholder="Pendidikan, sembako, perawatan fasilitas"
                />
              </label>
            </div>
          </fieldset>
          <fieldset disabled={busy}>
            <legend>
              <span>02</span> Penanggung jawab{" "}
              <small>Hanya untuk pengelola & admin</small>
            </legend>
            <div className="form-grid">
              <label>
                Nama lengkap
                <input
                  required
                  minLength={3}
                  maxLength={100}
                  value={value.manager_name}
                  onChange={(e) => field("manager_name", e.target.value)}
                />
              </label>
              <label>
                Email aktif
                <input
                  type="email"
                  required
                  maxLength={200}
                  value={value.manager_email}
                  onChange={(e) => field("manager_email", e.target.value)}
                />
              </label>
              <label>
                Nomor telepon
                <input
                  type="tel"
                  required
                  minLength={8}
                  maxLength={30}
                  value={value.manager_phone}
                  onChange={(e) => field("manager_phone", e.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <label className="checkbox">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Saya berwenang mewakili lembaga ini, informasi yang diberikan
              benar, dan memiliki izin atas foto serta QRIS yang akan
              diterbitkan sesuai <Link to="/privasi">ketentuan layanan</Link>.
            </span>
          </label>
          <button className="btn" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan draf"}
            <Icon name="check" size={18} />
          </button>
        </form>
        <div className="upload-section">
          <h2>
            <span>03</span> Foto & QRIS asli
          </h2>
          {!id ? (
            <p className="soft-note">
              Simpan draf profil terlebih dahulu untuk membuka unggahan.
            </p>
          ) : (
            <>
              <p className="muted">
                PNG, JPG, atau WebP. Maksimal 5 MB per gambar. Berkas yang sudah
                diunggah tidak bisa ditimpa; unggahan baru menggunakan berkas
                baru.
              </p>
              <div className="upload-grid">
                {(
                  [
                    ["photo_path", "Foto kegiatan / lembaga"],
                    ["qr_path", "QRIS resmi lembaga"],
                  ] as const
                ).map(([key, title]) => (
                  <div className="upload-card" key={key}>
                    <b>{title}</b>
                    <PrivateImage path={value[key]} alt={title} />
                    <label className="btn outline small">
                      {value[key] ? "Unggah pengganti" : "Pilih gambar"}
                      <input
                        className="file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={busy || !consent}
                        onChange={(e) => {
                          void upload(e.target.files?.[0], key);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <div className="submit-review">
                <div>
                  <h3>Sudah siap diperiksa?</h3>
                  <p>
                    Profil belum tampil ke publik sampai tim menyetujui
                    identitas dan QRIS.
                  </p>
                </div>
                <button
                  className="btn"
                  disabled={
                    busy || !consent || !value.qr_path || !value.photo_path
                  }
                  onClick={submit}
                >
                  Ajukan pemeriksaan <Icon name="northeast" size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

interface Report {
  id: string;
  organization_id: string;
  reason: string;
  message: string;
  resolved_at: string | null;
  resolution: string | null;
  created_at: string;
}
interface Audit {
  id: number;
  entity_id: string;
  action: string;
  detail: string | null;
  created_at: string;
}
function ReviewCard({ s, onDone }: { s: Submission; onDone: () => void }) {
  const [notes, setNotes] = useState("");
  const [identity, setIdentity] = useState(false);
  const [qris, setQris] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function review(decision: string) {
    setBusy(true);
    try {
      await mutate(`/admin/submissions/${s.id}/review`, "POST", {
        decision,
        notes,
        identity_checked: identity,
        qris_checked: qris,
      });
      toast("Keputusan tersimpan dan status publik diperbarui.");
      onDone();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="review-card">
      <summary>
        <div>
          <span className={`pill ${s.status === "approved" ? "green" : ""}`}>
            {statusLabel[s.status]}
          </span>
          <h3>{s.name}</h3>
          <span>
            {s.category} · {s.city}
          </span>
        </div>
        <Icon name="plus" />
      </summary>
      <div className="review-content">
        <div className="review-info">
          <p>
            <b>Alamat:</b> {s.address}
          </p>
          <p>
            <b>Ringkasan:</b> {s.summary}
          </p>
          <p className="pre-line">{s.story}</p>
          <p>
            <b>Kebutuhan:</b> {s.needs.join(", ")}
          </p>
          <div className="private-contact">
            <b>Kontak penanggung jawab (privat)</b>
            <p>
              {s.manager_name} · {s.manager_email} · {s.manager_phone}
            </p>
          </div>
          <p>
            <b>Nama penerima QRIS:</b> {s.recipient_name}
          </p>
          <div className="review-images">
            <div>
              <b>Foto lembaga</b>
              <PrivateImage path={s.photo_path} alt={`Foto ${s.name}`} />
            </div>
            <div>
              <b>QRIS diajukan</b>
              <PrivateImage path={s.qr_path} alt={`QRIS diajukan ${s.name}`} />
            </div>
          </div>
          {s.review_notes && (
            <p>
              <b>Catatan terakhir:</b> {s.review_notes}
            </p>
          )}
        </div>
        {s.status !== "rejected" && (
          <div className="review-decision">
            <h3>
              {s.status === "approved"
                ? "Tarik persetujuan"
                : "Pemeriksaan manual"}
            </h3>
            <p className="fine">
              Hubungi penanggung jawab dan periksa kesesuaian identitas lembaga.
              Pindai QRIS di aplikasi pembayaran untuk membandingkan nama tanpa
              menyelesaikan pembayaran.
            </p>
            {s.status === "pending" && (
              <>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={identity}
                    onChange={(e) => setIdentity(e.target.checked)}
                  />
                  <span>
                    Identitas dan kewenangan pengelola telah dikonfirmasi.
                  </span>
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={qris}
                    onChange={(e) => setQris(e.target.checked)}
                  />
                  <span>
                    QRIS bisa dibaca dan nama penerima sesuai lembaga.
                  </span>
                </label>
              </>
            )}
            <label>
              Catatan keputusan
              <textarea
                rows={4}
                minLength={5}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ringkas bukti pemeriksaan atau perbaikan yang diperlukan."
              />
            </label>
            <div className="review-buttons">
              {s.status === "pending" ? (
                <>
                  <button
                    className="btn small"
                    disabled={
                      busy || !identity || !qris || notes.trim().length < 5
                    }
                    onClick={() => review("approve")}
                  >
                    Setujui & terbitkan
                  </button>
                  <button
                    className="btn outline small"
                    disabled={busy || notes.trim().length < 5}
                    onClick={() => review("reject")}
                  >
                    Minta perbaikan
                  </button>
                </>
              ) : (
                <button
                  className="btn danger small"
                  disabled={busy || notes.trim().length < 5}
                  onClick={() => review("revoke")}
                >
                  Tarik dari publik
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
export function Admin() {
  const [tab, setTab] = useState("submissions");
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const submissions = useData("/admin/submissions", [] as Submission[]);
  const reports = useData("/admin/reports", [] as Report[], tab === "reports");
  const audit = useData("/admin/audit", [] as Audit[], tab === "audit");
  const ledger = useData(
    "/ledger",
    { items: [] as LedgerEntry[], total: 0, totals: { income: 0, expense: 0 } },
    tab === "ledger",
  );
  async function record(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    try {
      await mutate("/admin/ledger", "POST", {
        entry_date: f.get("entry_date"),
        kind: f.get("kind"),
        category: f.get("category"),
        description: f.get("description"),
        amount: Number(f.get("amount")),
        reference: f.get("reference"),
      });
      toast("Transaksi dicatat dan tampil di laporan publik.");
      form.reset();
      ledger.reload();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        label="RUANG ADMIN · AXURA TEAM"
        title="Jaga kepercayaan."
        accent="Rawat kebaikan."
      >
        Pemeriksaan profil, laporan pengguna, dan pencatatan operasional.
      </PageHead>
      <section className="container workspace-section">
        <div className="workspace-bar">
          <Link className="text-arrow" to="/dashboard">
            ← Dashboard pengelola
          </Link>
          <SignOut />
        </div>
        <div className="segmented admin-tabs">
          {[
            ["submissions", "Pengajuan"],
            ["reports", "Laporan pengguna"],
            ["ledger", "Operasional"],
            ["audit", "Jejak audit"],
          ].map(([v, label]) => (
            <button key={v} aria-pressed={tab === v} onClick={() => setTab(v)}>
              {label}
            </button>
          ))}
        </div>
        {tab === "submissions" && (
          <>
            <div className="chips">
              {["pending", "approved", "rejected"].map((v) => (
                <button
                  key={v}
                  aria-pressed={filter === v}
                  onClick={() => setFilter(v)}
                >
                  {statusLabel[v]} (
                  {submissions.data.filter((s) => s.status === v).length})
                </button>
              ))}
            </div>
            <p className="fine">
              Menampilkan maksimal 200 pengajuan terbaru. Jejak keputusan
              tersimpan di audit.
            </p>
            {submissions.loading ? (
              <Loading />
            ) : submissions.error ? (
              <ErrorBox
                message={submissions.error}
                retry={submissions.reload}
              />
            ) : submissions.data.filter((s) => s.status === filter).length ? (
              submissions.data
                .filter((s) => s.status === filter)
                .map((s) => (
                  <ReviewCard
                    key={s.id}
                    s={s}
                    onDone={() => {
                      submissions.reload();
                      audit.reload();
                    }}
                  />
                ))
            ) : (
              <Empty title="Tidak ada pengajuan pada status ini.">
                <p>
                  Pengajuan baru akan muncul setelah dikirim oleh pengelola.
                </p>
              </Empty>
            )}
          </>
        )}
        {tab === "reports" &&
          (reports.loading ? (
            <Loading />
          ) : reports.error ? (
            <ErrorBox message={reports.error} retry={reports.reload} />
          ) : reports.data.length ? (
            <div className="report-list">
              {reports.data.map((r) => (
                <article key={r.id} className="panel">
                  <span className="pill">
                    {r.resolved_at ? "Selesai" : "Perlu ditinjau"}
                  </span>
                  <h3>
                    {r.reason} · {date(r.created_at)}
                  </h3>
                  <Link
                    className="text-link"
                    to={`/tempat/${r.organization_id}`}
                  >
                    Buka profil terkait ↗
                  </Link>
                  <p className="pre-line">{r.message}</p>
                  {r.resolved_at ? (
                    <p>
                      <b>Penyelesaian:</b> {r.resolution}
                    </p>
                  ) : (
                    <form
                      className="stack"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        setBusy(true);
                        try {
                          await mutate(
                            `/admin/reports/${r.id}/resolve`,
                            "POST",
                            { resolution: f.get("resolution") },
                          );
                          toast("Penyelesaian dicatat.");
                          reports.reload();
                        } catch (err) {
                          toast((err as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <label>
                        Hasil tindak lanjut
                        <textarea
                          name="resolution"
                          required
                          minLength={5}
                          maxLength={1000}
                          rows={3}
                        />
                      </label>
                      <button className="btn small" disabled={busy}>
                        Tandai selesai
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <Empty title="Belum ada laporan pengguna.">
              <p>Laporan profil masuk ke halaman ini untuk ditindaklanjuti.</p>
            </Empty>
          ))}
        {tab === "ledger" && (
          <>
            <div className="soft-note">
              <Icon name="chart" />
              <p>
                Catat hanya transaksi platform yang benar-benar terjadi. Semua
                catatan langsung tampil di Transparansi. Jangan masukkan data
                rekening, email pribadi, atau nominal donasi penerima.
              </p>
            </div>
            <form className="panel form-grid ledger-form" onSubmit={record}>
              <label>
                Tanggal
                <input
                  type="date"
                  name="entry_date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </label>
              <label>
                Jenis
                <select name="kind">
                  <option value="income">Pemasukan platform</option>
                  <option value="expense">Pengeluaran operasional</option>
                </select>
              </label>
              <label>
                Kategori
                <input
                  name="category"
                  required
                  minLength={3}
                  maxLength={80}
                  placeholder="Hosting / Domain / Kerja sama"
                />
              </label>
              <label>
                Nominal (Rupiah)
                <input
                  name="amount"
                  type="number"
                  min={1}
                  max={1000000000}
                  step={1}
                  required
                />
              </label>
              <label className="span-2">
                Keterangan publik
                <input
                  name="description"
                  required
                  minLength={10}
                  maxLength={300}
                />
              </label>
              <label className="span-2">
                Referensi publik (opsional, tanpa data pribadi)
                <input name="reference" maxLength={160} />
              </label>
              <button className="btn" disabled={busy}>
                Catat & publikasikan <Icon name="check" size={17} />
              </button>
            </form>
            <h3>25 catatan terbaru</h3>
            <p>
              <Link className="text-link" to="/transparansi">
                Lihat seluruh laporan publik ↗
              </Link>
            </p>
            {ledger.error ? (
              <ErrorBox message={ledger.error} retry={ledger.reload} />
            ) : (
              ledger.data.items.map((v) => (
                <article className="ledger-admin panel" key={v.id}>
                  <div>
                    <span className="pill">
                      {v.voided_at
                        ? "Dibatalkan"
                        : v.kind === "income"
                          ? "Pemasukan"
                          : "Pengeluaran"}
                    </span>
                    <h3>{v.description}</h3>
                    <p>
                      {date(v.entry_date)} · {money(Number(v.amount))} ·{" "}
                      {v.category}
                    </p>
                  </div>
                  {v.voided_at ? (
                    <p>{v.void_reason}</p>
                  ) : (
                    <form
                      className="void-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        setBusy(true);
                        try {
                          await mutate(`/admin/ledger/${v.id}/void`, "POST", {
                            reason: f.get("reason"),
                          });
                          toast(
                            "Catatan dibatalkan. Alasan tetap terlihat publik.",
                          );
                          ledger.reload();
                        } catch (err) {
                          toast((err as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <label>
                        Alasan koreksi
                        <input
                          name="reason"
                          required
                          minLength={5}
                          maxLength={300}
                        />
                      </label>
                      <button className="btn outline small" disabled={busy}>
                        Batalkan catatan
                      </button>
                    </form>
                  )}
                </article>
              ))
            )}
          </>
        )}
        {tab === "audit" &&
          (audit.loading ? (
            <Loading />
          ) : audit.error ? (
            <ErrorBox message={audit.error} retry={audit.reload} />
          ) : (
            <div className="table-wrap">
              <table>
                <caption>
                  100 aktivitas terbaru, hanya dapat dilihat admin.
                </caption>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Aksi</th>
                    <th>Entitas</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.data.map((a) => (
                    <tr key={a.id}>
                      <td>{date(a.created_at)}</td>
                      <td>{a.action}</td>
                      <td>
                        <code>{a.entity_id}</code>
                      </td>
                      <td>{a.detail || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </section>
    </>
  );
}
