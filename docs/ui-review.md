# Pemeriksaan desain dan responsivitas · 23 Oktober 2026

Perbaikan ini menggunakan satu palet hijau, ivory, dan aksen lime. Konten kartu tidak lagi bergantung pada teks di atas foto. Hero memakai grid dan alur dokumen biasa; dekorasi yang menyebabkan halaman melebar ke samping sudah dihapus. Menu tablet/HP memiliki ruang sentuh lebih besar dan dapat ditutup dengan Escape, memilih tautan, atau berpindah ke luar menu.

## Pemeriksaan browser

Browser Chrome digunakan untuk memeriksa 8 halaman pada 8 lebar viewport: **320, 375, 600, 768, 900, 1024, 1280, dan 1440 piksel**. Semua 64 kombinasi tidak memiliki overflow horizontal pada halaman. Tabel keuangan tetap dapat digeser di dalam pembungkusnya sendiri.

Halaman yang diperiksa: beranda, direktori dengan nama profil panjang, transparansi dengan nominal besar, panduan, tentang, akun, form pengajuan, dan detail profil. Form pengajuan dirender statis untuk pemeriksaan tata letak; pengujian ini tidak masuk ke akun produksi atau mengubah data Supabase. Data contoh untuk pemeriksaan kartu/laporan hanya berada di direktori pratinjau lokal, tidak di source produksi dan tidak diunggah ke database.

Pada HP 375 piksel, menu juga diuji dengan klik tautan dan tombol Escape. Tombol menu kembali ke status tertutup setelah kedua interaksi.

## Pemeriksaan otomatis

37 pemeriksaan lolos: pengujian akses/database dan Worker yang sudah ada, render halaman, serta 7 pasangan warna teks normal dengan rasio kontras minimal **4,5:1**. Build frontend dan bundel Worker untuk deployment juga berhasil.

Ini merupakan pemeriksaan pada build lokal. Alamat Cloudflare produksi belum tersedia di percakapan, sehingga tampilan dan status deployment pada domain aktif perlu diperiksa setelah build Cloudflare selesai.

![Pratinjau desktop dari build lokal](screenshots/desktop.jpg)
