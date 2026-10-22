# Aktivasi dan pemeriksaan akhir

Kode lengkap tersedia di repo, tetapi layanan akun/data baru aktif setelah project Supabase dan konfigurasi Worker diisi. Tidak ada kredensial production atau domain Cloudflare yang diasumsikan.

1. Jalankan migrasi pada project baru; pastikan bucket tetap private dan RLS aktif.
2. Konfigurasikan Site URL, redirect `/akun`, verifikasi email, password minimum, SMTP dan batas Auth Supabase.
3. Deploy Worker dengan URL dan publishable/anon key. Periksa `GET /api/health` mengembalikan `ok: true`. Ini memeriksa konfigurasi, bukan keterjangkauan database; periksa juga `/api/stats` dan `/api/ledger`.
4. Daftar akun pengelola dan admin terpisah. Verifikasi kedua email. Tambahkan UUID admin lewat SQL, bukan metadata pengguna.
5. Dengan akun pengelola, simpan draf lengkap, unggah foto berizin dan QRIS asli, lalu ajukan. Sebelum persetujuan, pastikan profil dan gambar tidak bisa diakses tanpa login.
6. Dengan akun admin, konfirmasi kewenangan pengelola melalui kontak resminya, cocokkan foto/alamat, dan pindai QRIS untuk memeriksa nama. Jangan menyelesaikan pembayaran hanya untuk memverifikasi nama.
7. Setujui dengan kedua checklist dan catatan. Buka profil pada browser tanpa sesi. Uji pencarian, unduhan QRIS, nama penerima, dan share.
8. Tarik profil dari pengelola. Pastikan profil publik dan akses baru ke gambar menjadi tidak tersedia. Uji edit, ajukan ulang, tolak, dan persetujuan ulang.
9. Uji akun lain tidak bisa membaca kontak atau berkas draft. Uji favorit tersimpan ke akun. Kirim laporan dan selesaikan sebagai admin.
10. Catat transaksi operasional asli; pastikan tampil dan saldo benar. Jika catatan salah, batalkan dengan alasan lalu buat pengganti. Jangan masukkan transaksi uji ke laporan publik produksi.
11. Uji email pemulihan, sesi berakhir, layar HP, navigasi keyboard, dan reduced motion pada domain final. Hapus akun dan berkas uji melalui operator setelah selesai.
12. Tetapkan penanggung jawab tindak lanjut laporan, pemeriksaan rutin QRIS, backup, retensi, serta permintaan penghapusan. Tambahkan kanal kontak publik resmi tim ketika tersedia.

Jika API mengembalikan 503: pastikan key adalah publishable/anon (bukan secret/service_role), URL benar, migrasi terpasang, dan project tidak sedang tidak tersedia. Jika 403: periksa status konfirmasi email, keanggotaan admin, kepemilikan, dan status pengajuan. Jangan mengatasi masalah dengan mematikan RLS atau membuat bucket public.

Deployment ini tidak menginstal iklan. Model kerja sama, pembagian surplus, dan kompensasi harus disepakati tim serta dicatat jika mulai diterapkan. Pemeriksaan identitas/QRIS bukan audit penggunaan donasi.
