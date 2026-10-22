import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Icon, PageHead } from "./components";
import { useData } from "./lib";
export function Home() {
  const stats = useData("/stats", { total: 0, cities: [] as string[] });
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> SEBUAH RUANG UNTUK BERBUAT BAIK
          </span>
          <h1>
            Kebaikanmu,
            <br />
            temukan
            <br />
            <em>arahnya.</em>
            <span className="hero-spark">✳</span>
          </h1>
          <p>
            Di dekat kita, selalu ada yang bisa dibantu. Temukan masjid, panti,
            dan komunitas — lalu salurkan kebaikan langsung ke mereka.
          </p>
          <div className="hero-buttons">
            <Link className="btn" to="/jelajahi">
              Mulai berbagi kebaikan <Icon name="northeast" />
            </Link>
            <Link className="watch-link" to="/panduan">
              <span>
                <Icon name="arrow" size={16} />
              </span>
              Kenali cara kerjanya
            </Link>
          </div>
          <div className="hero-trust">
            <span>
              <Icon name="check" size={15} />
              Langsung ke penerima
            </span>
            <span>
              <Icon name="check" size={15} />
              Gratis diakses
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit" />
          <div className="hero-photo">
            <img
              src="/assets/mosque.webp"
              alt="Masjid dengan suasana hangat saat senja"
              fetchPriority="high"
            />
            <div className="photo-caption">
              <span>BERAWAL DARI YANG DEKAT</span>
              <b>
                Satu niat baik.
                <br />
                Banyak kemungkinan.
              </b>
            </div>
          </div>
          <div className="hero-small">
            <img
              src="/assets/children.webp"
              alt="Anak-anak berkegiatan bersama"
            />
            <span>
              Untuk senyum
              <br />
              yang terus tumbuh.
            </span>
          </div>
          <div className="float-card float-one">
            <span className="circle lime">
              <Icon name="heart" size={23} />
            </span>
            <div>
              <b>Tanpa perantara dana</b>
              <small>QRIS langsung milik penerima</small>
            </div>
            <Icon name="northeast" size={17} />
          </div>
          <div className="float-card float-two">
            <span className="circle forest">
              <Icon name="shield" />
            </span>
            <div>
              <b>Lebih jelas, lebih tenang</b>
              <small>Kenali tempat sebelum berbagi</small>
            </div>
          </div>
          <div className="stamp">
            <span>NIAT BAIK · ARAH BAIK ·</span>
            <Icon name="northeast" size={42} />
          </div>
          <span className="visual-dot">✳</span>
        </div>
      </section>
      <div className="ticker" aria-hidden="true">
        <div>
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i}>
              Niat baik, bertemu tujuan <i>✳</i> Langkah kecil, cerita besar{" "}
              <i>✳</i>
            </span>
          ))}
        </div>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ADA BANYAK CARA UNTUK PEDULI</span>
            <h2>
              Ke mana kebaikanmu
              <br />
              ingin <em>berlabuh?</em>
            </h2>
          </div>
          <p>
            Mulai dari tempat yang dekat di hati.
            <br />
            Setiap tujuan punya cerita dan kebutuhannya sendiri.
          </p>
        </div>
        <div className="category-grid">
          {[
            [
              "Masjid",
              "Rumah ibadah, rumah kebaikan.",
              "Dukung kegiatan masjid, musala, dan ruang belajar di sekitarmu.",
              "mosque.webp",
              "01",
            ],
            [
              "Panti",
              "Bersama, tumbuh lebih hangat.",
              "Temani kebutuhan harian, pendidikan, dan kehidupan yang lebih layak.",
              "children.webp",
              "02",
            ],
            [
              "Komunitas",
              "Banyak tangan, satu kepedulian.",
              "Bertemu gerakan sosial, pendidikan, lingkungan, dan kemanusiaan.",
              "community.webp",
              "03",
            ],
          ].map(([name, title, description, img, n]) => (
            <Link
              to={`/jelajahi?category=${name}`}
              className="category-card"
              key={name}
            >
              <img src={`/assets/${img}`} alt="" loading="lazy" />
              <span className="category-num">
                {n} / {name === "Masjid" ? "Masjid & musala" : name}
              </span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="circle white">
                  <Icon name="northeast" />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="actual-stats">
          <div>
            <b>{stats.error ? "—" : stats.data.total}</b>
            <span>profil tersedia</span>
          </div>
          <div>
            <b>{stats.error ? "—" : stats.data.cities.length}</b>
            <span>kota terjangkau</span>
          </div>
          <div>
            <b>Langsung</b>
            <span>ke QRIS penerima</span>
          </div>
          <p>
            Angka profil berasal dari direktori aktif.
            <br />
            Kami tidak menghitung nominal donasi yang tidak kami proses.
          </p>
        </div>
      </section>
      <section className="how-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SEDERHANA LANGKAHNYA</span>
              <h2>
                Dari niat,
                <br />
                jadi <em>manfaat.</em>
              </h2>
            </div>
            <Link className="btn outline" to="/panduan">
              Lihat panduan lengkap <Icon name="arrow" />
            </Link>
          </div>
          <div className="steps">
            {[
              [
                "01",
                "Temukan yang ingin dibantu",
                "Jelajahi tempat berdasarkan kategori dan kota. Baca cerita serta kebutuhan mereka.",
                "search",
              ],
              [
                "02",
                "Kenali, lalu periksa",
                "Lihat profil dan nama penerima QRIS. Pastikan tujuan donasimu sesuai.",
                "shield",
              ],
              [
                "03",
                "Salurkan langsung",
                "Pindai atau unggah QRIS di aplikasi pembayaranmu. Dana menuju penerima.",
                "heart",
              ],
            ].map(([n, title, p, icon]) => (
              <div className="step" key={n}>
                <div className="step-top">
                  <span>{n}</span>
                  <Icon name={icon} size={28} />
                </div>
                <h3>{title}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
          <div className="direct-note">
            <Icon name="shield" size={28} />
            <p>
              <b>Kepercayaan dimulai dari alur yang jelas.</b>
              <br />
              ArahBaik membantu menemukan penerima. Dana tidak ditampung di
              rekening platform.
            </p>
            <span className="pill">Langsung. Terbuka. Bermakna.</span>
          </div>
        </div>
      </section>
      <section className="container section mission-grid">
        <div className="mission-image">
          <img
            src="/assets/learning.webp"
            alt="Kegiatan belajar bersama di ruang kelas"
            loading="lazy"
          />
          <span>
            Yang kecil hari ini,
            <br />
            <em>bisa berarti esok nanti.</em>
          </span>
        </div>
        <div>
          <span className="eyebrow">DIBANGUN DENGAN NIAT BAIK</span>
          <h2>
            Teknologi yang
            <br />
            mendekatkan
            <br />
            <em>kepedulian.</em>
          </h2>
          <p>
            Kadang bukan karena kita tidak ingin membantu. Kita hanya belum tahu
            harus mulai dari mana.
          </p>
          <p>
            ArahBaik hadir sebagai titik temu: tempat mengenal kebutuhan,
            menemukan penerima, dan mengambil langkah pertama.
          </p>
          <Link className="text-arrow" to="/tentang">
            Kenali cerita ArahBaik <Icon name="northeast" />
          </Link>
          <div className="mini-brand">
            <img src="/assets/axura-team.webp" alt="Axura Team" />
            <span>
              Sebuah inisiatif sosial
              <br />
              <b>oleh Tim Axura & Seismiks</b>
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
const faqs = [
  [
    "donatur",
    "Apakah dana donasi melewati ArahBaik?",
    "Tidak. QRIS di setiap profil adalah QRIS milik penerima yang telah diperiksa tim. Pembayaran berlangsung di aplikasi bank atau dompet digitalmu, langsung kepada penerima.",
  ],
  [
    "donatur",
    "Apa arti identitas dan QRIS diperiksa?",
    "Tim meninjau informasi pengelola, keberadaan lembaga, dan kesesuaian nama penerima QRIS sebelum profil diterbitkan. Pemeriksaan ini bukan jaminan penggunaan dana atau audit menyeluruh. Tetap baca profil dan periksa nama di aplikasi pembayaran.",
  ],
  [
    "donatur",
    "Apakah ArahBaik memotong donasi?",
    "ArahBaik tidak mengambil potongan donasi. Ketentuan atau biaya dari penyedia layanan pembayaran mengikuti layanan yang kamu gunakan.",
  ],
  [
    "donatur",
    "Bagaimana berdonasi dari satu HP?",
    "Buka profil, unduh gambar QRIS, lalu pilih fitur pindai dari galeri di aplikasi pembayaran yang mendukungnya. Periksa nama penerima sebelum memasukkan nominal dan mengonfirmasi pembayaran.",
  ],
  [
    "donatur",
    "Apakah ada bukti pembayaran di ArahBaik?",
    "Bukti transaksi berasal dari aplikasi pembayaranmu. ArahBaik tidak menerima data pembayaran, sehingga tidak menerbitkan kuitansi atau menampilkan total donasi.",
  ],
  [
    "pengelola",
    "Bagaimana cara mendaftarkan tempat?",
    "Buat akun, verifikasi email, lalu isi data lembaga di dashboard. Unggah foto dan QRIS, periksa kembali data, lalu ajukan untuk ditinjau. Profil tidak langsung tayang.",
  ],
  [
    "pengelola",
    "Bolehkah mengubah QRIS setelah profil tayang?",
    "Boleh melalui pemeriksaan ulang. Tarik profil dari publik, perbarui datanya, lalu ajukan kembali. Berkas QRIS yang telah diperiksa tidak bisa ditimpa diam-diam.",
  ],
  [
    "umum",
    "Bagaimana platform membiayai operasional?",
    "Pendapatan platform yang benar-benar diterima, misalnya iklan atau kerja sama, dicatat terpisah dari donasi penerima. Biaya operasional dan saldo dicatat di halaman Transparansi.",
  ],
  [
    "umum",
    "Bagaimana melaporkan informasi yang keliru?",
    "Buka profil terkait, pilih Laporkan profil, lalu kirim rincian setelah masuk ke akun. Laporan diterima di dashboard admin untuk ditinjau. Jangan mengirim PIN, OTP, atau data rekening pribadi.",
  ],
  [
    "umum",
    "Apakah ada kewajiban menyumbang?",
    "Tidak. Kamu juga bisa membantu dengan membagikan profil, mengajak pengelola bergabung, atau menyampaikan masukan kepada tim.",
  ],
];
export function Guide() {
  const [audience, setAudience] = useState("donatur");
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("semua");
  return (
    <>
      <PageHead
        label="PANDUAN KEBAIKAN"
        title="Niatnya baik."
        accent="Caranya mudah."
      >
        Kenali alurnya, periksa tujuannya, lalu berbagi dengan lebih tenang.
      </PageHead>
      <section className="container section compact">
        <div className="segmented">
          <button
            aria-pressed={audience === "donatur"}
            onClick={() => setAudience("donatur")}
          >
            Saya ingin membantu
          </button>
          <button
            aria-pressed={audience === "pengelola"}
            onClick={() => setAudience("pengelola")}
          >
            Saya pengelola tempat
          </button>
        </div>
        <div className="guide-grid">
          <div className="guide-visual">
            <div className="phone">
              <div className="phone-top" />
              <span className="eyebrow">ARAHBAIK</span>
              <Icon
                name={audience === "donatur" ? "heart" : "shield"}
                size={54}
              />
              <h3>
                {audience === "donatur"
                  ? "Kebaikan, langsung."
                  : "Ceritamu layak ditemukan."}
              </h3>
              <p>
                {audience === "donatur"
                  ? "Temukan tempat. Kenali penerima. Salurkan kepedulian."
                  : "Daftarkan tempat. Lengkapi informasi. Ajukan pemeriksaan."}
              </p>
              <div className="phone-line" />
              <div className="phone-line short" />
              <Link
                className="btn"
                to={audience === "donatur" ? "/jelajahi" : "/dashboard"}
              >
                Mulai sekarang <Icon name="arrow" size={17} />
              </Link>
            </div>
            <span className="guide-star">✳</span>
          </div>
          <div className="guide-steps">
            {(audience === "donatur"
              ? [
                  [
                    "Cari tujuan yang dekat di hati",
                    "Gunakan pencarian, kategori, dan kota. Baca cerita serta kebutuhan di profil penerima.",
                  ],
                  [
                    "Periksa profil & nama QRIS",
                    "Lihat catatan pemeriksaan dan nama penerima. Unduh QRIS jika menggunakan satu HP.",
                  ],
                  [
                    "Bayar dari aplikasi pilihanmu",
                    "Pindai atau unggah gambar QRIS. Cocokkan nama, tentukan nominal, dan simpan bukti dari aplikasimu.",
                  ],
                ]
              : [
                  [
                    "Buat akun & lengkapi profil",
                    "Verifikasi email. Masukkan nama lembaga, alamat, cerita, kebutuhan, serta kontak penanggung jawab.",
                  ],
                  [
                    "Unggah foto & QRIS asli",
                    "Simpan draf, lalu unggah foto dan QRIS milik lembaga. Pastikan nama penerima sesuai. Kontak pengelola tidak ditampilkan ke publik.",
                  ],
                  [
                    "Ajukan, lalu tunggu tinjauan",
                    "Tim memeriksa identitas dan QRIS sebelum profil tayang. Pantau status dan catatan perbaikan di dashboard.",
                  ],
                ]
            ).map(([title, p], i) => (
              <article key={title}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{p}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="faq-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">BIAR MAKIN JELAS</span>
              <h2>
                Masih <em>penasaran?</em>
              </h2>
            </div>
            <label className="search small-search">
              <Icon name="search" />
              <input
                placeholder="Cari pertanyaan…"
                aria-label="Cari pertanyaan"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
          </div>
          <div className="chips">
            {["semua", "donatur", "pengelola", "umum"].map((v) => (
              <button
                key={v}
                aria-pressed={topic === v}
                onClick={() => setTopic(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="faq-list">
            {faqs
              .filter(
                ([t, title, p]) =>
                  (topic === "semua" || t === topic) &&
                  `${title} ${p}`.toLowerCase().includes(q.toLowerCase()),
              )
              .map(([, title, p]) => (
                <details key={title}>
                  <summary>
                    {title}
                    <Icon name="plus" />
                  </summary>
                  <p>{p}</p>
                </details>
              ))}
          </div>
        </div>
      </section>
    </>
  );
}
export function About() {
  return (
    <>
      <PageHead
        label="CERITA DI BALIK ARAHBAIK"
        title="Bukan harus besar."
        accent="Yang penting dimulai."
      >
        Dari pertanyaan sederhana: bagaimana kalau kebaikan di sekitar kita
        lebih mudah ditemukan?
      </PageHead>
      <section className="container about-story">
        <img
          src="/assets/community.webp"
          alt="Relawan berbagi waktu dan tenaga untuk komunitas"
        />
        <div>
          <span className="eyebrow">SEBUAH TITIK TEMU</span>
          <h2>
            Karena niat baik
            <br />
            butuh <em>arah.</em>
          </h2>
          <p>
            Kita sering menemukan QRIS masjid, panti, atau gerakan sosial yang
            tersebar di berbagai tempat. Di sisi lain, ada orang yang ingin
            membantu tetapi belum tahu harus menuju siapa.
          </p>
          <p>
            ArahBaik mempertemukan keduanya dalam satu direktori. Informasi
            penerima dibuat lebih mudah dicari, ceritanya lebih mudah dikenali,
            dan donasinya tetap langsung ke mereka.
          </p>
          <p>
            Platform ini tumbuh dari inisiatif Tim Axura bersama Seismiks. Kami
            membuka ruang untuk ide, kontribusi teknis, dan kerja bersama yang
            membawa manfaat.
          </p>
        </div>
      </section>
      <section className="container section">
        <div className="section-heading">
          <h2>
            Prinsip yang
            <br />
            kami <em>pegang.</em>
          </h2>
        </div>
        <div className="values-grid">
          {[
            [
              "heart",
              "Langsung ke penerima",
              "Dana donasi tidak ditampung oleh platform. Penerima menggunakan QRIS mereka sendiri.",
            ],
            [
              "shield",
              "Jelas sebelum tayang",
              "Identitas dan QRIS ditinjau tim; perubahan penting harus diperiksa ulang.",
            ],
            [
              "chart",
              "Terbuka soal operasional",
              "Pemasukan platform, biaya, dan saldo disajikan terpisah dari donasi.",
            ],
          ].map(([icon, title, p]) => (
            <div key={title}>
              <Icon name={icon} size={30} />
              <h3>{title}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="team-section">
        <div className="container team-grid">
          <div className="team-art">
            <img src="/assets/axura-team.webp" alt="Logo resmi Axura Team" />
            <span>TECHNOLOGY WITH PURPOSE</span>
          </div>
          <div>
            <span className="eyebrow light">DIBANGUN OLEH TIM AXURA</span>
            <h2>
              Kode yang bekerja.
              <br />
              <em>Kepedulian yang bergerak.</em>
            </h2>
            <p>
              Kami percaya kemampuan membangun teknologi bisa dipakai untuk
              mendekatkan orang dengan hal yang bermakna.
            </p>
            <p>
              ArahBaik adalah ruang kolaborasi Axura & Seismiks: membangun,
              belajar, dan bertanggung jawab pada sistem yang kami hadirkan.
            </p>
            <div className="tags">
              <span>Engineering</span>
              <span>Design</span>
              <span>Social impact</span>
            </div>
          </div>
        </div>
      </section>
      <section className="container section narrow">
        <span className="eyebrow">TUMBUH DENGAN TERUKUR</span>
        <h2>
          Arah pengembangan <em>kami.</em>
        </h2>
        <div className="roadmap">
          {[
            [
              "01",
              "Mulai dengan alur yang jelas",
              "Direktori, akun pengelola, proses tinjauan, dan laporan operasional.",
            ],
            [
              "02",
              "Bangun jejaring penerima",
              "Ajak lembaga bergabung, periksa informasi, dan rawat kualitas direktori.",
            ],
            [
              "03",
              "Belajar dari penggunaan",
              "Perbaiki aksesibilitas dan pencarian berdasarkan kebutuhan pengguna serta masukan penerima.",
            ],
          ].map(([n, title, p]) => (
            <article key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{p}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="muted">
          Penerimaan lembaga bergantung pada pemeriksaan tim. Angka dan laporan
          publik mengikuti data yang benar-benar tersedia.
        </p>
      </section>
    </>
  );
}
export function Privacy() {
  return (
    <>
      <PageHead
        label="PRIVASI & KETENTUAN"
        title="Jelas soal data."
        accent="Tenang saat berbagi."
      >
        Ringkasan cara ArahBaik menangani informasi dan batas layanan.
      </PageHead>
      <article className="container section narrow prose">
        <h2>Data akun dan pengelola</h2>
        <p>
          Email dan data akun digunakan untuk masuk, pemulihan akun, serta
          mengelola pengajuan. Nama, email, dan telepon penanggung jawab hanya
          dapat diakses oleh pemilik akun dan admin yang memeriksa pengajuan.
          Penyimpanan dan autentikasi menggunakan Supabase.
        </p>
        <h2>Informasi yang diterbitkan</h2>
        <p>
          Dengan mengajukan profil, pengelola mengizinkan penerbitan nama,
          kategori, kota, alamat lembaga, cerita, kebutuhan, foto, QRIS, dan
          nama penerima setelah disetujui. Hindari data pribadi penghuni panti,
          alamat rumah pribadi, atau foto anak tanpa izin yang sesuai. Pengelola
          wajib memiliki hak atas berkas yang diunggah.
        </p>
        <h2>Alur donasi</h2>
        <p>
          ArahBaik menyediakan direktori, bukan layanan penitipan dana.
          Pembayaran dilakukan langsung ke penerima melalui penyedia pembayaran
          pilihan pengguna. Periksa kembali nama penerima sebelum mengonfirmasi.
          Kami tidak meminta PIN, OTP, data kartu, atau bukti transfer pribadi.
        </p>
        <h2>Pemeriksaan dan pelaporan</h2>
        <p>
          Pemeriksaan profil tidak menggantikan penilaian pengguna dan bukan
          jaminan penggunaan dana. Laporkan ketidaksesuaian melalui profil
          terkait. Admin dapat menarik profil dari publik selama peninjauan.
          Laporan dan catatan pemeriksaan disimpan untuk tindak lanjut.
        </p>
        <h2>Penyimpanan di perangkat</h2>
        <p>
          Sesi akun disimpan di perangkat oleh SDK Supabase agar kamu tetap
          masuk. Gunakan tombol Keluar saat memakai perangkat bersama. Aplikasi
          ini tidak memasang pelacak iklan. Jika model pendapatan berubah,
          informasi ini perlu diperbarui oleh tim.
        </p>
        <h2>Perubahan dan penghapusan</h2>
        <p>
          Pengelola dapat menarik profil dari dashboard kapan saja. Untuk
          penghapusan akun atau berkas, sampaikan permintaan melalui kanal tim
          yang kamu gunakan saat bergabung, atau ajukan laporan pada profil
          terkait dengan akunmu. Penghapusan dilakukan oleh admin melalui
          Supabase setelah identitas pemohon diperiksa. Catatan akuntansi dan
          audit yang diperlukan dapat dipertahankan tanpa data yang tidak lagi
          diperlukan.
        </p>
        <h2>Pendapatan platform</h2>
        <p>
          Pendapatan iklan atau kerja sama, jika ada, dicatat sebagai pendapatan
          platform. Biaya dan sisa saldo ditampilkan di Transparansi. Pembagian
          surplus atau kompensasi tim perlu disepakati dan dicatat secara
          terbuka; tidak diambil dari pembayaran donasi langsung.
        </p>
        <Link className="text-arrow" to="/panduan">
          Baca pertanyaan lainnya <Icon name="arrow" />
        </Link>
      </article>
    </>
  );
}
export function NotFound() {
  return (
    <section className="container section narrow">
      <span className="eyebrow">404 · JALANNYA BELUM KETEMU</span>
      <h1>
        Mari kembali ke
        <br />
        <em>arah yang baik.</em>
      </h1>
      <p>Halaman ini tidak ditemukan.</p>
      <Link className="btn" to="/">
        Kembali ke beranda <Icon name="arrow" />
      </Link>
    </section>
  );
}
