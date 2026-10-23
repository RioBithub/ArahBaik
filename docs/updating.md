# Update website yang sudah aktif

Sumber aplikasi ada di branch **main** repo **RioBithub/ArahBaik**. Versi desain ini memperbaiki navigasi tablet/HP, hero, keterbacaan, kartu direktori, form, laporan, dan jarak antarelemen. Perubahan ini **tidak membutuhkan migrasi SQL baru**. Jangan jalankan ulang file migrasi awal pada database yang sudah aktif.

## Jika Cloudflare terhubung langsung ke GitHub

Alurnya: **commit ke main → Cloudflare menjalankan build → deploy berhasil → website memakai versi baru**.

Di Cloudflare, buka Worker **arahbaik → Settings → Builds** dan pastikan repo `RioBithub/ArahBaik`, production branch `main`, build command `npm ci && npm run check`, serta deploy command `npx wrangler deploy`. Status setiap build dapat dilihat dari tab **Deployments**. Cocokkan commit SHA dengan commit terbaru di GitHub.

Jika repo belum terhubung, gunakan **Settings → Builds → Connect** pada Worker yang sudah aktif. Nama Worker harus cocok dengan `name: arahbaik` dalam `wrangler.jsonc`. Pilih salah satu jalur deployment agar tidak menjalankan dua sistem deploy untuk commit yang sama.

## Jika memakai workflow GitHub manual

Buka **GitHub → ArahBaik → Actions → Deploy Cloudflare Workers → Run workflow**, pilih `main`, lalu jalankan. Workflow ini tetap manual. Dibutuhkan repository secrets Cloudflare dan Supabase yang tercantum di README.

**Quality checks** hanya menjalankan pemeriksaan kode/build. Status hijau pada workflow ini tidak berarti website Cloudflare sudah diperbarui; periksa hasil deployment secara terpisah.

## Jika deploy dari laptop

```bash
git pull --ff-only origin main
npm ci
npm run deploy
```

Gunakan checkout tanpa perubahan lokal yang belum disimpan, akun Cloudflare yang benar, dan Worker yang sama. Konfigurasi Supabase yang sudah aktif tetap digunakan. `keep_vars: true` pada `wrangler.jsonc` mempertahankan variabel runtime yang diatur lewat dashboard; secrets juga tetap tersimpan. File `.dev.vars` tidak perlu dikirim ke GitHub.

## Sesudah deploy

1. Buka alamat website yang biasa digunakan, lalu refresh. Aset JS/CSS memakai nama hash baru setiap build.
2. Periksa `/api/health` dan `/api/stats`, lalu uji masuk, direktori, halaman detail, dan dashboard.
3. Pada HP, periksa menu, tombol pencarian, form, QRIS, dan tabel. Tabel laporan dapat digeser di dalam kartunya tanpa menggeser seluruh halaman.
4. Jika hasil deploy bermasalah, kembalikan deployment Worker ke versi sebelumnya dari dashboard. Untuk perubahan kode berikutnya, buat commit koreksi/revert; tidak perlu mereset database.

Referensi: [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) dan [Wrangler source of truth / keep_vars](https://developers.cloudflare.com/workers/wrangler/configuration/#source-of-truth).
