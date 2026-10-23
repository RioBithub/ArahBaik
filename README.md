# ArahBaik · by Tim Axura

Direktori kebaikan untuk masjid, panti, dan komunitas. Pengguna menemukan profil lalu berdonasi **langsung ke QRIS penerima**. Platform tidak menampung dana, memproses pembayaran, atau mengarang nominal donasi.

**React + TypeScript + Vite · Cloudflare Workers API & Static Assets · Supabase Auth, Postgres, Storage.** Branding Axura Team dan kredit kolaborasi Seismiks disertakan.

Versi desain terbaru merapikan layout HP/tablet, warna, ukuran teks, kartu, dan form. [Lihat hasil pemeriksaan responsivitas](docs/ui-review.md) atau [cara menerapkan update pada website aktif](docs/updating.md).

## Yang sudah diimplementasikan

- Beranda responsif dengan animasi ringan, panduan, FAQ pencarian, cerita tim, serta privasi.
- Direktori dari database dengan pencarian, kategori, kota, dan pagination. Detail penerima, unduhan QRIS asli, bagikan tautan, dan favorit lintas perangkat.
- Akun email/password dengan verifikasi email, pemulihan kata sandi, keluar, dan pembaruan sesi.
- Dashboard pengelola: buat/edit draf, unggah foto dan QRIS, ajukan pemeriksaan, baca catatan admin, dan tarik profil.
- Dashboard admin: periksa kontak privat, foto, nama penerima dan QRIS; setujui, minta perbaikan, atau tarik persetujuan. Keputusan dicatat dalam audit.
- Pelaporan profil yang disimpan di database dan tindak lanjut admin.
- Buku operasional publik: pemasukan, pengeluaran, saldo kumulatif, pembatalan beserta alasan; transaksi koreksi tetap terlihat.
- RLS, berkas privat sebelum disetujui, unggahan immutable, validasi API, batas ukuran, pembatasan permintaan, dan security headers.

**Database kosong secara sengaja.** Tidak ada lembaga fiktif, QRIS contoh yang bisa dibayar, status verifikasi palsu, atau transaksi simulasi di produksi. Profil pertama tampil setelah pengelola mendaftar dan admin memeriksanya.

## Jalankan lokal

Gunakan Node.js 22.12+ (disarankan Node 24).

```bash
npm ci
cp .dev.vars.example .dev.vars
```

Isi `.dev.vars` dengan URL project Supabase dan **publishable key** (`sb_publishable_…`) atau legacy **anon** key. Kedua nilai ini memang konfigurasi publik untuk SDK Auth. Aplikasi **tidak membutuhkan service-role/secret key**. Pemeriksaan hak akses memakai JWT pengguna dan RLS, termasuk di Worker.

Setelah migrasi database dijalankan:

```bash
npm run dev
```

Buka `http://localhost:8787`. Perintah ini membangun frontend lalu menjalankan Worker dan aset pada origin yang sama. Sesudah mengubah frontend, jalankan `npm run build` pada terminal lain untuk memperbarui aset.

Untuk iterasi antarmuka dengan HMR: jalankan `npx wrangler dev` dan `npm run dev:web` di dua terminal. Vite pada port 5173 meneruskan `/api` ke port 8787. Tambahkan kedua origin lokal ke URL Auth Supabase. Untuk pengujian konfigurasi keamanan produksi, gunakan origin Worker 8787.

## Siapkan Supabase

1. Buat project Supabase. Ambil **Project URL** dan **publishable/anon key** di pengaturan API.
2. Jalankan file [`supabase/migrations/202610220001_initial.sql`](supabase/migrations/202610220001_initial.sql) di SQL Editor **sekali pada database baru**, atau gunakan CLI untuk riwayat migrasi:

   ```bash
   npx supabase login
   npx supabase link --project-ref PROJECT_REF
   npx supabase db push
   ```

3. Di **Authentication → URL Configuration**, isi Site URL dengan domain Worker final. Tambahkan redirect yang diperbolehkan untuk `/akun` (termasuk query string), misalnya `https://DOMAIN_KAMU/akun**`. Untuk lokal: `http://localhost:8787/**` dan `http://localhost:5173/**`. Gunakan pola produksi sesempit mungkin dan cek email konfirmasi/pemulihan.
4. Aktifkan konfirmasi email, tetapkan password minimum 12 karakter, dan pasang SMTP produksi agar email akun terkirim kepada pengguna umum. Atur batas Auth sesuai kebutuhan.
5. Daftar lewat aplikasi dan verifikasi email. Tambahkan UUID akun admin melalui SQL Editor sebagai operator database:

   ```sql
   insert into public.admin_members(user_id)
   select id from auth.users where email = 'EMAIL_ADMIN_KAMU'
   on conflict do nothing;
   ```

   Email di atas adalah placeholder. Peran admin tidak bisa didapat melalui form, metadata pengguna, atau API publik. Keluar/masuk kembali, lalu buka `/admin`.

Migrasi membuat tabel, fungsi transaksi, RLS, dan bucket privat `organization-files` (PNG/JPG/WebP, 5 MB). Tidak perlu membuat bucket public atau menambahkan policy lain. Lihat [`docs/architecture.md`](docs/architecture.md) untuk batas akses.

Supabase lokal opsional: `npx supabase start` lalu `npx supabase db reset` (membutuhkan Docker). `supabase/config.toml` sudah disertakan. Jangan menjalankan reset pada database yang berisi data penting.

## Deploy Cloudflare Workers

Setelah database dan Auth siap:

```bash
npx wrangler login
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npm run deploy
```

Masukkan nilainya melalui prompt Wrangler. Jangan menaruh key di source atau commit `.dev.vars`. Jika Wrangler meminta membuat Worker `arahbaik` saat memasukkan secret pertama, pilih buat; deployment berikutnya mengisi kode aplikasinya.

`wrangler.jsonc` sudah mengatur Worker API `/api/*`, Static Assets, SPA fallback untuk deep link, dan rate limit 60 permintaan per IP per menit. Semua respons API memakai `no-store`; QRIS ditarik ulang melalui akses database, sehingga penarikan persetujuan menghentikan akses baru ke berkas publik. Berkas yang telah diunduh orang lain tidak dapat ditarik dari perangkat mereka.

Alternatif deployment GitHub: workflow **Deploy Cloudflare Workers** hanya dijalankan manual lewat Actions. Isi repository secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_URL`, dan `SUPABASE_PUBLISHABLE_KEY`. Token Cloudflare memerlukan izin Workers Scripts edit dan Workers Ratelimits sesuai akun. Workflow memeriksa kode, deploy, lalu mengisi konfigurasi Supabase melalui Wrangler secrets. Jalankan migrasi sebelum workflow. Ada jeda konfigurasi singkat saat deployment pertama; API mengembalikan 503 sampai konfigurasi tersedia.

Untuk Cloudflare Workers Builds yang terhubung langsung ke repo: build command `npm ci && npm run check`; deploy command `npx wrangler deploy`; masukkan dua konfigurasi Supabase pada Worker Settings → Variables and Secrets. Tidak ada variabel `VITE_*` atau build-time secret yang dibutuhkan.

## Verifikasi

Untuk aplikasi yang sudah aktif, baca [panduan update tanpa instal ulang](docs/updating.md). Perubahan desain tidak memerlukan migrasi database baru. Konfigurasi Wrangler mempertahankan variabel runtime yang sudah diatur di dashboard Cloudflare.

```bash
npm run check
npm run deploy:check
```

Tes PostgreSQL memakai PGlite dan menjalankan migrasi yang sama dengan skema Auth/Storage minimal. Menguji kepemilikan, kebocoran kontak, eskalasi admin, pemeriksaan QRIS, penarikan profil, RLS Storage, favorit, laporan, buku operasional, dan pembatalan. Tes Worker menguji konfigurasi, larangan secret key, asal request, autentikasi, rate limit, validasi berkas, dan input. Tes ini tidak menggantikan percobaan email dan Storage API pada project Supabase nyata.

Sebelum menerima pengelola publik, lakukan alur nyata sekali: daftar → email → draf → unggah → ajukan → admin konfirmasi → profil & QRIS publik → tarik → pastikan publik tidak bisa mengakses kembali. Panduan lengkap ada di [`docs/launch.md`](docs/launch.md).

## Struktur

```text
src/                   Antarmuka dan halaman publik/pengelola/admin
worker/index.ts        API Cloudflare; validasi identitas di server
shared/schema.ts       Tipe dan validasi input
supabase/migrations/   SQL, RLS, RPC transaksi, bucket dan policy
tests/                 Pengujian API dan siklus database
public/assets/         Logo Axura, font lokal, dan foto ilustrasi
docs/                  Arsitektur, operasi, dan panduan aktivasi
```

Admin saat ini menampilkan 200 pengajuan/laporan terbaru dan 100 aktivitas terbaru; direktori dan buku operasional publik memakai pagination. Untuk volume lebih besar, tambahkan pagination admin. Supabase yang memakai custom domain memerlukan penyesuaian `connect-src` CSP di Worker dan `public/_headers` (headers aset statis).

## Kredit

Inisiatif dan engineering **Tim Axura**, berkolaborasi dengan **Seismiks**. Logo Axura merupakan aset yang diberikan pemilik project. Foto ilustrasi dan font dicatat di [`docs/assets.md`](docs/assets.md). Foto beranda adalah ilustrasi umum; hanya foto yang diajukan pengelola dan disetujui admin tampil sebagai profil penerima.
