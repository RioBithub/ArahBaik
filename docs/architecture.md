# Arsitektur dan model akses

Browser memuat React dari Cloudflare Static Assets. Auth memakai Supabase SDK dengan PKCE dan penyegaran sesi. Permintaan aplikasi menuju `/api` pada Worker yang sama dengan bearer access token; tidak ada sesi autentikasi berbasis cookie. Worker memvalidasi token lewat `auth.getUser`, bukan mempercayai ID/role dari browser. Query selanjutnya memakai token pengguna, sehingga RLS tetap berlaku. Tidak ada service-role key di Worker.

| Data | Pengunjung | Pengelola | Admin |
| --- | --- | --- | --- |
| `directory` | Baca profil yang diterbitkan | Baca | Baca; perubahan melalui keputusan RPC |
| `organization_submissions` | Tidak bisa membaca | Baca milik sendiri; simpan lewat RPC | Baca semua; tinjau lewat RPC |
| `admin_members` | Tidak bisa mengubah | Baca keanggotaan sendiri | Operator SQL mengatur keanggotaan |
| `favorites` | Tidak bisa mengakses | Baca/tambah/hapus milik sendiri | Tidak bisa membaca favorit pengguna lain |
| `ledger_public` | Baca kolom laporan | Baca | Baca |
| `ledger_entries` | Tidak bisa mengakses | Tidak bisa menulis | Catat/batalkan melalui RPC |
| `reports` | Tidak bisa mengakses | Kirim laporan; baca milik sendiri | Baca dan selesaikan laporan |
| `audit_events` | Tidak bisa mengakses | Tidak bisa mengakses | Baca; ditulis fungsi transaksi |
| Storage | Hanya berkas yang dirujuk direktori aktif | Baca berkas sendiri; unggah ke draf sendiri | Baca berkas untuk ditinjau |

`directory` adalah snapshot publik terpisah dari pengajuan privat. Tidak ada email, telepon, ID akun pemilik, atau catatan tinjauan di tabel publik. `ledger_public` sengaja merupakan view definer dengan proyeksi kolom publik yang tetap; kolom identitas pencatat tidak diekspos.

Status pengajuan: **draft → pending → approved / rejected**. Pemilik hanya bisa mengedit draft/rejected. Menarik pengajuan mengembalikan status ke draft dan menghapus snapshot publik dalam transaksi yang sama. Pengajuan ulang memerlukan persetujuan baru. Admin bisa mencabut approved menjadi rejected. RPC mengunci baris agar keputusan tidak saling menimpa.

Berkas menggunakan nama acak `user_id/submission_id/uuid.ext`. Bucket privat, tanpa policy update/delete untuk pengguna. Worker memeriksa signature gambar, MIME, dan batas 5 MB. SQL memeriksa path kepemilikan dan keberadaan berkas ketika pengajuan/persetujuan. Mengunggah pengganti membuat objek baru dan menunggu pemeriksaan ulang, bukan menimpa QRIS yang sudah disetujui.

Anggota admin hanya ditambahkan melalui operator SQL/Supabase Dashboard. Jangan berikan hak insert/update pada tabel admin, pengajuan, direktori, laporan, audit, atau buku operasional kepada client. Fungsi security definer memakai search path kosong dan tabel yang dirujuk eksplisit. Pemanggilan RPC dibatasi role authenticated dan setiap fungsi penting memeriksa email terkonfirmasi.

Pemasukan/biaya platform tidak sama dengan donasi. Transaksi dibatalkan tetap ditampilkan; perhitungan total mengecualikan yang dibatalkan. Tidak ada saldo donasi, endpoint pembayaran, komisi donasi, atau integrasi iklan aktif pada versi ini.

Worker memblokir write lintas origin, memakai bearer token, CSP, batas body, validasi input, no-store, dan rate limit Cloudflare. Pembatasan Worker tidak menggantikan RLS atau batas Supabase Auth karena API Supabase juga dapat dipanggil langsung. Maksimum 10 pengajuan per akun dan 5 laporan per hari diperiksa juga pada fungsi SQL.

Operator perlu merawat backup database, retensi berkas, admin yang aktif, email SMTP, dan biaya Storage. Objek yang tergantikan tidak otomatis dihapus: hapus lewat operator hanya setelah memastikan objek tidak dirujuk pengajuan atau direktori. Audit tidak berisi token, password, PIN, atau isi pembayaran. Pembukaan data kontak admin dan kebijakan retensi perlu ditinjau tim sesuai penggunaan nyata.
