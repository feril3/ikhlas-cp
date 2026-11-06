# IKHLAS

**IKHLAS** adalah capstone **Sistem Informasi Manajemen Masjid Terintegrasi Berbasis Web dengan Monitoring Keuangan dan Public Information Display**.

Aplikasi sengaja dibagi menjadi dua surface utama:

- **Operate UI** untuk Admin/Pengurus dan Bendahara. Alur transaksi dibuat mobile-first.
- **Public Display** khusus TV masjid. Layout tidak mewarisi density dashboard admin.

## Fitur Saat Ini

### Keuangan
- Kas masuk dan kas keluar oleh Ketua/Admin maupun Bendahara.
- Perubahan yang diajukan Bendahara (buat, edit, hapus, dan penggantian dokumen) masuk jalur review Ketua/Admin sebelum diposting ke saldo, laporan, dan Public Display.
- Ketua/Admin dapat menyetujui pengajuan atau meminta revisi dengan catatan; Bendahara dapat memperbaiki data/dokumen lalu mengirim ulang.
- Ketua/Admin dapat membantu pencatatan transaksi langsung saat Bendahara tidak tersedia.
- Kategori transaksi dinamis yang dikelola Admin.
- Kas masuk memiliki sumber dana + detail sumber terpisah.
- Saldo awal dapat dikonfigurasi Admin lengkap dengan tanggal dan catatan.
- Saldo otomatis dari saldo awal + kas masuk - kas keluar.
- Pembeda Cash/Kotak Amal dan Transfer.
- Bukti transaksi dan mutasi rekening.
- Bukti kas keluar wajib pada UI.
- File bukti disimpan privat di Google Drive. Selama kredensial Drive belum diisi (atau Drive gagal dihubungi), file disimpan di tabel `attachment_blobs` pada basis data (Turso) dan tetap hanya bisa dibuka pengguna yang login.
- Riwayat transaksi.
- Laporan berdasarkan periode.
- Export transaksi ke CSV.
- Menu **Perlu review** dengan badge jumlah pengajuan; notifikasi push PWA ke Ketua/Admin saat ada pengajuan baru dan ke Bendahara saat pengajuan disetujui atau perlu revisi.
- Audit trail untuk aktivitas penting.

### Operasional Masjid
- Waktu adzan otomatis dari public prayer-time API menggunakan metode Kementerian Agama RI untuk koordinat RS Elizabeth Situbondo.
- Cache jadwal salat SQLite + last-known-good fallback ketika API/internet bermasalah.
- Iqamah dihitung otomatis 8 menit setelah adzan.
- Dashboard hanya mengelola petugas Jumat (imam, khatib, bilal) untuk Jumat-Jumat mendatang; tanggal yang sudah lewat otomatis tidak tampil di UI.
- Pengelolaan kegiatan.
- Konfigurasi identitas masjid dan rekening donasi.
- Live Masjid melalui YouTube embed.
- Public Display V2 khusus signage 16:9: fixed 100dvh, tanpa vertical/horizontal scroll.
- Jam, next prayer, countdown, tanggal Masehi + Hijriah, dan lima waktu salat selalu terlihat pada posisi konsisten.
- Secondary-content carousel untuk kegiatan, live stream, transparansi keuangan, transaksi terbaru, pengumuman, dan donasi.
- Recent transaksi publik yang disanitasi; detail sumber, bukti, mutasi, dan user pencatat tidak diekspos.
- Footer/ticker untuk rotasi ayat/hadits terverifikasi, pengumuman, dan pesan masjid.

### Akses & Keamanan
- Initial setup tanpa password bawaan.
- Login Ketua/Admin dan Bendahara.
- Role-based access dengan pemisahan tugas: Ketua/Admin mengelola informasi/config, monitoring, review transaksi, dan dapat membantu mencatat transaksi; Bendahara membuat pengajuan transaksi dan bukti untuk direview sebelum posting.
- Password di-hash dengan PBKDF2-HMAC-SHA256.
- Server-side session dengan HttpOnly cookie.
- Rate limiting sederhana untuk login/setup.
- Security response headers.
- Audit log.
- Upload file dibatasi JPG, PNG, WEBP, PDF dan maksimal 4 MB per file (total satu pengajuan 4,4 MB karena batas request Vercel 4,5 MB).

### Mobile & Reliability
- Form transaksi mobile-first.
- Dashboard responsive.
- PWA yang bisa dipasang di ponsel (Android, iPhone, desktop) dengan ikon, pintasan, dan navigasi bawah.
- Foto bukti langsung dari kamera ponsel; foto dikompres otomatis sebelum diunggah.
- Service worker untuk app shell dan notifikasi push.
- Database libSQL: Turso di produksi, berkas SQLite lokal untuk pengembangan.
- Backup database (snapshot JSON) lokal manual dan auto backup harian ke Google Drive dengan retention.

## Stack

- React + Vite
- React Router
- Node.js + Express
- libSQL / SQLite (`@libsql/client`, Turso untuk produksi)
- Zod
- Multer
- Google Drive API
- Web Push (VAPID, paket `web-push`)
- YouTube Embed
- Hugeicons dan design token (Plus Jakarta Sans, warna semantik)

## Menjalankan Project

```bash
npm ci
cp .env.example .env
npm run db:init
npm run dev
```

Akses:

- Web: `http://localhost:5173`
- API health: `http://localhost:3001/api/health`
- Public Display: `http://localhost:5173/public-display`

Public Display ditargetkan untuk layar landscape 16:9 (1366×768 sampai 4K), bukan halaman web yang perlu di-scroll.

Pada instalasi baru, buka Web. Karena belum ada pengguna, IKHLAS akan meminta membuat **akun Admin pertama**. Tidak ada username/password default yang ditanam di source code.

## Deploy Gratis (Vercel + Turso)

Frontend dan API dideploy sebagai satu project Vercel (Hobby, tanpa kartu kredit): frontend statis dari `apps/web/dist`, API Express sebagai Vercel Function (`api/index.js`), dan database di Turso (libSQL). Backup harian dipicu Vercel Cron. Langkah lengkap ada di `docs/DEPLOY_VERCEL.md`.

## Google Drive untuk Bukti Transaksi

> **Fallback basis data.** Jika `GOOGLE_DRIVE_*` belum diisi, bukti tersimpan di tabel `attachment_blobs` (ID berawalan `db:`). File lama tetap terbaca setelah Drive dikonfigurasi; file baru otomatis ke Drive. Tabel ini tidak ikut snapshot backup JSON.

## Akun demo / seed akun

Buat atau perbarui akun tanpa menyimpan kata sandi di repositori (login boleh email atau nama pengguna):

```bash
SEED_ACCOUNTS='[{"login":"admin-demo","password":"minimal10karakter","role":"ADMIN","name":"Admin Demo"}]' npm run db:seed-accounts -w apps/api
```

Untuk Turso, jalankan dengan `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` di environment.

Bukti transaksi dan mutasi rekening tidak disimpan sebagai blob di SQLite dan tidak disimpan permanen di filesystem server. File diteruskan ke Google Drive menggunakan OAuth 2.0. SQLite hanya menyimpan `fileId`, nama asli, dan MIME type sebagai referensi.

Setup ringkas:

```bash
cp .env.example .env
# isi GOOGLE_DRIVE_CLIENT_ID dan GOOGLE_DRIVE_CLIENT_SECRET
npm run drive:auth -w @ikhlas/api
# salin refresh token yang tampil ke GOOGLE_DRIVE_REFRESH_TOKEN
```

Jika `GOOGLE_DRIVE_FOLDER_ID` kosong, IKHLAS otomatis membuat folder **IKHLAS - Bukti Transaksi** di My Drive akun OAuth. Lihat `docs/GOOGLE_DRIVE.md` untuk langkah lengkap.

## Notifikasi push (PWA)

Buat sepasang kunci VAPID sekali saja:

```bash
npx web-push generate-vapid-keys
```

Isi pada `.env` (lokal) atau Environment Variables Vercel:

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:email-pengelola@contoh.id
```

Tanpa kunci ini aplikasi tetap berjalan; badge jumlah pengajuan di aplikasi tetap tampil, hanya notifikasi ke ponsel yang nonaktif. Setiap pengguna mengaktifkan notifikasi dari Beranda atau menu akun di perangkatnya. Di iPhone, notifikasi hanya bekerja setelah aplikasi dipasang ke Layar Utama (iOS 16.4 ke atas).

## Backup Database

Backup lokal manual:

```bash
npm run db:backup
```

Backup langsung ke Google Drive:

```bash
npm run db:backup:drive
```

Untuk auto backup di VPS/server lokal, aktifkan:

```env
GOOGLE_DRIVE_BACKUP_ENABLED=true
GOOGLE_DRIVE_BACKUP_HOUR=2
GOOGLE_DRIVE_BACKUP_MINUTE=0
GOOGLE_DRIVE_BACKUP_TIMEZONE=Asia/Jakarta
GOOGLE_DRIVE_BACKUP_RETENTION=30
```

Default tersebut berarti satu snapshot konsisten setiap hari pukul **02:00 WIB**, dengan **30 backup terakhir** dipertahankan. File disimpan private di folder **IKHLAS - Backup Database** pada Google Drive. Jika server baru hidup setelah jam backup dan snapshot hari itu belum ada, scheduler akan membuat backup yang tertinggal.

Jalankan scheduler hanya pada satu instance API utama agar deployment multi-instance tidak membuat backup ganda. Di Vercel scheduler internal tidak dipakai; backup dipicu Vercel Cron ke `/api/cron/daily-backup` (wajib `CRON_SECRET`). Detail setup dan restore ada di `docs/GOOGLE_DRIVE.md`.

## Struktur Repo

```text
ikhlas-cp/
├── apps/
│   ├── api/
│   │   ├── data/              # SQLite & backups (ignored)
│   │   └── src/
│   └── web/
│       ├── public/            # manifest, service worker, icon
│       └── src/
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── GOOGLE_DRIVE.md
│   ├── RESEARCH.md
│   └── SECURITY.md
├── .impeccable/design.json
├── DESIGN.md
└── PRODUCT.md
```

## Catatan Scope

Laporan yang tersedia sekarang adalah **laporan kas operasional**, bukan implementasi penuh laporan keuangan formal ISAK 35. Implementasi ISAK 35 penuh memerlukan kebijakan akuntansi, klasifikasi aset/liabilitas/aset neto, dan catatan laporan keuangan yang berada di luar scope proposal capstone saat ini.
