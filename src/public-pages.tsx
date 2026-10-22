import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Card, Empty, ErrorBox, Icon, Loading, PageHead } from "./components";
import {
  api,
  date,
  mediaUrl,
  money,
  mutate,
  useAuth,
  useData,
  useToast,
} from "./lib";
import type { Organization, LedgerEntry } from "../shared/schema";

export function Directory() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get("q") ?? "");
  const page = Number(params.get("page") || 1);
  const q = params.get("q") || "";
  const category = params.get("category") || "";
  const city = params.get("city") || "";
  const stats = useData("/stats", { total: 0, cities: [] as string[] });
  const result = useData(
    `/directory?${new URLSearchParams({ page: String(Number.isInteger(page) && page > 0 ? page : 1), ...(q ? { q } : {}), ...(category ? { category } : {}), ...(city ? { city } : {}) })}`,
    { items: [] as Organization[], total: 0, limit: 12 },
  );
  const filter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  useEffect(() => setInput(q), [q]);
  return (
    <>
      <PageHead
        label="DIREKTORI KEBAIKAN"
        title="Temukan tempat."
        accent="Temukan makna."
      >
        Ada banyak cerita di sekitar kita. Mulai dari yang paling dekat dengan
        hatimu.
      </PageHead>
      <section className="container directory-section">
        <form
          className="filter-bar"
          onSubmit={(e) => {
            e.preventDefault();
            filter("q", input);
          }}
        >
          <label className="search">
            <Icon name="search" />
            <input
              aria-label="Cari nama tempat"
              placeholder="Cari nama masjid, panti, atau komunitas…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </label>
          <label className="city-filter">
            <Icon name="location" size={18} />
            <select
              aria-label="Pilih kota"
              value={city}
              onChange={(e) => filter("city", e.target.value)}
            >
              <option value="">Semua kota</option>
              {stats.data.cities
                .slice()
                .sort()
                .map((c) => (
                  <option key={c}>{c}</option>
                ))}
            </select>
          </label>
          <button className="btn" type="submit">
            Cari tempat <Icon name="arrow" size={18} />
          </button>
        </form>
        <div className="directory-toolbar">
          <div className="chips">
            {["", "Masjid", "Panti", "Komunitas"].map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                onClick={() => filter("category", c)}
              >
                {c || "Semua tempat"}
              </button>
            ))}
          </div>
          <Link className="text-arrow" to="/tersimpan">
            <Icon name="heart" size={17} />
            Tersimpan
          </Link>
        </div>
        <div className="result-line">
          <span>
            {result.loading ? (
              "Mencari tujuan baik…"
            ) : (
              <>
                <b>{result.data.total}</b> tempat ditemukan
              </>
            )}
          </span>
          {(q || category || city) && (
            <button
              className="text-link"
              onClick={() => {
                setParams({});
                setInput("");
              }}
            >
              Hapus filter ×
            </button>
          )}
        </div>
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <ErrorBox message={result.error} retry={result.reload} />
        ) : result.data.items.length ? (
          <>
            <div className="card-grid">
              {result.data.items.map((item) => (
                <Card key={item.id} item={item} />
              ))}
            </div>
            <div className="pagination">
              <button
                className="btn outline small"
                disabled={page <= 1}
                onClick={() => {
                  const n = new URLSearchParams(params);
                  n.set("page", String(page - 1));
                  setParams(n);
                }}
              >
                Sebelumnya
              </button>
              <span>Halaman {page}</span>
              <button
                className="btn outline small"
                disabled={page * result.data.limit >= result.data.total}
                onClick={() => {
                  const n = new URLSearchParams(params);
                  n.set("page", String(page + 1));
                  setParams(n);
                }}
              >
                Berikutnya
              </button>
            </div>
          </>
        ) : (
          <Empty
            title={
              q || city || category
                ? "Belum ada yang cocok."
                : "Direktori ini menunggu cerita pertamanya."
            }
          >
            <p>
              {q || city || category
                ? "Coba nama, kota, atau kategori lain."
                : "Profil penerima akan tampil setelah didaftarkan dan diperiksa oleh tim."}
            </p>
            <Link className="btn" to="/dashboard">
              Daftarkan tempat <Icon name="northeast" size={18} />
            </Link>
          </Empty>
        )}
        <div className="soft-note">
          <Icon name="shield" />
          <p>
            <b>Kenali dulu, baru berbagi.</b> Profil yang tampil telah melalui
            pemeriksaan identitas dan QRIS. Tetap cocokkan nama penerima di
            aplikasi pembayaran sebelum mengonfirmasi.
          </p>
        </div>
      </section>
    </>
  );
}
export function Detail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const result = useData<Organization | null>(`/directory/${id}`, null);
  useEffect(() => {
    if (!user) return;
    api<{ organization_id: string }[]>("/favorites")
      .then((v) => setSaved(v.some((f) => f.organization_id === id)))
      .catch(() => {});
  }, [user, id]);
  if (result.loading) return <Loading />;
  if (result.error || !result.data)
    return (
      <div className="container section">
        <ErrorBox message={result.error || "Profil belum tersedia."} />
        <Link className="text-arrow" to="/jelajahi">
          Kembali ke direktori <Icon name="arrow" />
        </Link>
      </div>
    );
  const item = result.data;
  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      await mutate(`/favorites/${id}`, saved ? "DELETE" : "PUT");
      setSaved(!saved);
      toast(saved ? "Dihapus dari tempat tersimpan." : "Disimpan ke akunmu.");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Tautan profil disalin.");
    } catch {
      toast("Salin tautan profil dari bilah alamat browser.");
    }
  }
  return (
    <section className="container detail-section">
      <Link className="breadcrumb" to="/jelajahi">
        ← Jelajahi kebaikan / {item.category}
      </Link>
      <div className="detail-grid">
        <div>
          <div className="detail-photo">
            <img
              src={
                item.photo_path
                  ? mediaUrl(item.photo_path)
                  : "/assets/community.webp"
              }
              alt={item.name}
            />
            <span className="pill white">{item.category}</span>
          </div>
          <div className="detail-heading">
            <span className="verified">
              <Icon name="shield" size={17} /> Identitas & QRIS diperiksa ·{" "}
              {date(item.verified_at)}
            </span>
            <h1>{item.name}</h1>
            <p className="location">
              <Icon name="location" size={17} />
              {item.city}
            </p>
            <p className="lead">{item.summary}</p>
            <div className="detail-actions">
              {user ? (
                <button
                  className="btn outline small"
                  disabled={busy}
                  onClick={save}
                >
                  <Icon name="heart" size={17} />
                  {saved ? "Tersimpan" : "Simpan tempat"}
                </button>
              ) : (
                <Link className="btn outline small" to="/akun">
                  Masuk untuk menyimpan
                </Link>
              )}
              <button className="btn outline small" onClick={share}>
                Bagikan profil <Icon name="northeast" size={17} />
              </button>
            </div>
          </div>
          <article className="story">
            <h2>
              Cerita di balik <em>tempat ini.</em>
            </h2>
            <p className="pre-line">{item.story}</p>
            <h3>Kebaikan yang sedang dibutuhkan</h3>
            <div className="tags large">
              {item.needs.map((n) => (
                <span key={n}>
                  <Icon name="check" size={15} />
                  {n}
                </span>
              ))}
            </div>
            <h3>Alamat lembaga</h3>
            <p>
              {item.address}, {item.city}
            </p>
            <p className="muted">
              Hubungi pengelola melalui kanal resmi lembaga jika perlu
              konfirmasi tambahan. Jangan mengirim PIN atau OTP kepada siapa
              pun.
            </p>
          </article>
        </div>
        <aside>
          <div className="donate-panel">
            <span className="eyebrow">SALURKAN KEBAIKAN LANGSUNG</span>
            <h2>
              Sedikit darimu.
              <br />
              <em>Berarti bagi mereka.</em>
            </h2>
            <div className="qris-image">
              <img
                src={mediaUrl(item.qr_path)}
                alt={`QRIS ${item.name}; nama penerima ${item.recipient_name}`}
              />
            </div>
            <span className="muted">Nama penerima yang diperiksa</span>
            <b className="recipient-name">{item.recipient_name}</b>
            <a
              className="btn full"
              href={`${mediaUrl(item.qr_path)}?download=1`}
              download
            >
              Unduh QRIS <Icon name="download" size={18} />
            </a>
            <ol>
              <li>Simpan atau pindai QRIS.</li>
              <li>Buka aplikasi bank / dompet digitalmu.</li>
              <li>Cocokkan nama penerima, lalu konfirmasi.</li>
            </ol>
            <p className="panel-note">
              <Icon name="shield" size={17} />
              Dana langsung ke penerima. ArahBaik tidak memproses pembayaran.
            </p>
          </div>
          <div className="report-note">
            <p>Menemukan informasi yang tidak sesuai?</p>
            {user ? (
              <button
                className="text-link"
                onClick={() => setReporting(!reporting)}
              >
                {reporting ? "Tutup laporan" : "Laporkan profil ↗"}
              </button>
            ) : (
              <Link className="text-link" to="/akun">
                Masuk untuk melaporkan ↗
              </Link>
            )}
            {reporting && (
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  setBusy(true);
                  try {
                    await mutate("/reports", "POST", {
                      organization_id: id,
                      reason: f.get("reason"),
                      message: f.get("message"),
                    });
                    toast("Laporan diterima. Tim akan meninjau informasi ini.");
                    setReporting(false);
                  } catch (err) {
                    toast((err as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Jenis laporan
                  <select name="reason">
                    <option value="qris">Ketidaksesuaian QRIS</option>
                    <option value="identity">Identitas lembaga</option>
                    <option value="information">Informasi profil</option>
                    <option value="other">Lainnya</option>
                  </select>
                </label>
                <label>
                  Rincian
                  <textarea
                    name="message"
                    minLength={20}
                    maxLength={2000}
                    rows={4}
                    required
                    placeholder="Jelaskan temuanmu, minimal 20 karakter."
                  />
                </label>
                <button className="btn small" disabled={busy}>
                  Kirim laporan
                </button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
export function Favorites() {
  const result = useData(
    "/favorites",
    [] as { organization_id: string; directory: Organization }[],
  );
  return (
    <>
      <PageHead
        label="TEMPAT TERSIMPAN"
        title="Cerita yang dekat"
        accent="di hati."
      >
        Daftar ini tersimpan di akunmu dan dapat dibuka kembali dari perangkat
        lain.
      </PageHead>
      <section className="container section compact">
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <ErrorBox message={result.error} retry={result.reload} />
        ) : result.data.length ? (
          <div className="card-grid">
            {result.data
              .filter((v) => v.directory)
              .map((v) => (
                <Card item={v.directory} key={v.organization_id} />
              ))}
          </div>
        ) : (
          <Empty title="Belum ada tempat tersimpan.">
            <p>Simpan profil yang ingin kamu bantu nanti.</p>
            <Link className="btn" to="/jelajahi">
              Temukan tempat <Icon name="arrow" />
            </Link>
          </Empty>
        )}
      </section>
    </>
  );
}
export function Transparency() {
  const [page, setPage] = useState(1);
  const result = useData(`/ledger?page=${page}`, {
    items: [] as LedgerEntry[],
    total: 0,
    totals: { income: 0, expense: 0 },
  });
  const { income, expense } = result.data.totals;
  return (
    <>
      <PageHead
        label="TRANSPARANSI PLATFORM"
        title="Niat baik."
        accent="Catatan terbuka."
      >
        Kamu berhak tahu bagaimana platform ini berjalan. Pemasukan, biaya, dan
        sisa saldo ditampilkan dari pencatatan operasional.
      </PageHead>
      <section className="container section compact">
        <div className="funds-flow">
          <div>
            <span className="eyebrow">DONASI KEPADA PENERIMA</span>
            <Icon name="heart" size={30} />
            <h3>Donatur → QRIS penerima</h3>
            <p>
              Langsung melalui aplikasi pembayaranmu. ArahBaik tidak menampung,
              mencatat nominal transaksi, atau mengambil potongan donasi.
            </p>
          </div>
          <div>
            <span className="eyebrow">OPERASIONAL ARAHBAIK</span>
            <Icon name="chart" size={30} />
            <h3>Pendapatan → biaya platform</h3>
            <p>
              Pemasukan iklan atau kerja sama, jika ada, dicatat terpisah untuk
              mendukung domain, hosting, pemeliharaan, dan pengembangan.
            </p>
          </div>
        </div>
        <div className="section-heading ledger-heading">
          <div>
            <span className="eyebrow">LAPORAN KUMULATIF</span>
            <h2>
              Terlihat <em>angkanya.</em>
            </h2>
          </div>
          <span className="pill">
            <span className="live-dot" />
            Data operasional tercatat
          </span>
        </div>
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <ErrorBox message={result.error} retry={result.reload} />
        ) : (
          <>
            <div className="finance-grid">
              <div>
                <span>Total pemasukan</span>
                <b>{money(income)}</b>
                <small>Pendapatan platform yang dicatat</small>
              </div>
              <div>
                <span>Total pengeluaran</span>
                <b>{money(expense)}</b>
                <small>Biaya operasional yang dicatat</small>
              </div>
              <div className="balance">
                <span>Sisa saldo operasional</span>
                <b>{money(income - expense)}</b>
                <small>Pemasukan dikurangi pengeluaran</small>
              </div>
            </div>
            {result.data.total ? (
              <>
                <div className="table-wrap">
                  <table>
                    <caption>
                      Catatan transaksi operasional ArahBaik. Transaksi
                      dibatalkan tetap ditampilkan.
                    </caption>
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Keterangan</th>
                        <th>Jenis</th>
                        <th>Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.items.map((v) => (
                        <tr className={v.voided_at ? "voided" : ""} key={v.id}>
                          <td>{date(v.entry_date)}</td>
                          <td>
                            <b>{v.description}</b>
                            <small>
                              {v.category}
                              {v.reference && ` · Referensi: ${v.reference}`}
                              {v.voided_at && ` · Dibatalkan: ${v.void_reason}`}
                            </small>
                          </td>
                          <td>
                            <span
                              className={`pill ${v.kind === "income" ? "green" : ""}`}
                            >
                              {v.voided_at
                                ? "Dibatalkan"
                                : v.kind === "income"
                                  ? "Pemasukan"
                                  : "Pengeluaran"}
                            </span>
                          </td>
                          <td className="nowrap">{money(Number(v.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <button
                    className="btn outline small"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Sebelumnya
                  </button>
                  <span>Halaman {page}</span>
                  <button
                    className="btn outline small"
                    disabled={page * 25 >= result.data.total}
                    onClick={() => setPage(page + 1)}
                  >
                    Berikutnya
                  </button>
                </div>
              </>
            ) : (
              <Empty title="Belum ada transaksi operasional yang dicatat.">
                <p>
                  Angka nol berarti belum ada catatan pemasukan atau pengeluaran
                  di sistem. Laporan akan bertambah ketika tim mencatat
                  transaksi yang benar-benar terjadi.
                </p>
              </Empty>
            )}
          </>
        )}
        <div className="transparency-notes">
          <article>
            <h3>Bagaimana dengan surplus?</h3>
            <p>
              Sisa saldo bukan otomatis profit yang dibagikan. Penggunaan
              surplus untuk cadangan, pengembangan, atau kompensasi tim perlu
              disepakati dan dicatat sebagai pengeluaran yang jelas.
            </p>
          </article>
          <article>
            <h3>Bagaimana koreksi laporan?</h3>
            <p>
              Transaksi tidak dihapus diam-diam. Catatan yang salah dibatalkan
              beserta alasannya, tetap terlihat, lalu diganti dengan catatan
              yang benar.
            </p>
          </article>
          <article>
            <h3>Apa yang belum tercakup?</h3>
            <p>
              Ini merupakan pencatatan internal, bukan laporan audit independen.
              Nominal donasi penerima tidak tercakup karena pembayaran tidak
              melewati platform.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
