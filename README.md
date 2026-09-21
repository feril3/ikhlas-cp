# IKHLAS

**IKHLAS** adalah capstone **Sistem Informasi Manajemen Masjid Terintegrasi Berbasis Web dengan Monitoring Keuangan dan Public Information Display**.

Aplikasi sengaja dibagi menjadi dua surface utama:

- **Operate UI** untuk Admin/Pengurus dan Bendahara. Alur transaksi dibuat mobile-first.
- **Public Display** khusus TV masjid. Layout tidak mewarisi density dashboard admin.

## Fitur Saat Ini

### Keuangan
- Kas masuk dan kas keluar.
- Saldo otomatis dari saldo awal + kas masuk - kas keluar.
- Pembeda Cash/Kotak Amal dan Transfer.
- Bukti transaksi dan mutasi rekening.
- Bukti kas keluar wajib pada UI.
- File bukti disimpan privat di Google Drive. SQLite hanya menyimpan file ID dan metadata referensi.
- Riwayat transaksi.
- Laporan berdasarkan periode.
- Export transaksi ke CSV.
- Notifikasi Telegram setelah transaksi tersimpan.
- Audit trail untuk aktivitas penting.

### Operasional Masjid
- Jadwal salat, imam, bilal, dan iqamah.
- Pengelolaan kegiatan.
- Konfigurasi identitas masjid dan rekening donasi.
- Live Masjid melalui YouTube embed.
- Public Display dengan waktu real-time, countdown 5 menit menjelang adzan/iqamah, agenda, keuangan, donasi, dan live stream.

### Akses & Keamanan
- Initial setup tanpa password bawaan.
- Login Admin/Pengurus dan Bendahara.
- Role-based access.
- Password di-hash dengan PBKDF2-HMAC-SHA256.
- Server-side session dengan HttpOnly cookie.
- Rate limiting sederhana untuk login/setup.
- Security response headers.
- Audit log.
- Upload file dibatasi JPG, PNG, WEBP, PDF dan maksimal 5 MB.

### Mobile & Reliability
- Form transaksi mobile-first.
- Dashboard responsive.
- Installable PWA shell.
- Service worker untuk app shell setelah kunjungan pertama.
- SQLite WAL mode.
- Perintah backup SQLite.

## Stack

- React + Vite
- React Router
- Node.js + Express
- SQLite (`better-sqlite3`)
- Zod
- Multer
- Google Drive API
- Telegram Bot API
- YouTube Embed
- Lucide React

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

Pada instalasi baru, buka Web. Karena belum ada pengguna, IKHLAS akan meminta membuat **akun Admin pertama**. Tidak ada username/password default yang ditanam di source code.

## Google Drive untuk Bukti Transaksi

Bukti transaksi dan mutasi rekening tidak disimpan sebagai blob di SQLite dan tidak disimpan permanen di filesystem server. File diteruskan ke Google Drive menggunakan OAuth 2.0. SQLite hanya menyimpan `fileId`, nama asli, dan MIME type sebagai referensi.

Setup ringkas:

```bash
cp .env.example .env
# isi GOOGLE_DRIVE_CLIENT_ID dan GOOGLE_DRIVE_CLIENT_SECRET
npm run drive:auth -w @ikhlas/api
# salin refresh token yang tampil ke GOOGLE_DRIVE_REFRESH_TOKEN
```

Jika `GOOGLE_DRIVE_FOLDER_ID` kosong, IKHLAS otomatis membuat folder **IKHLAS - Bukti Transaksi** di My Drive akun OAuth. Lihat `docs/GOOGLE_DRIVE.md` untuk langkah lengkap.

## Telegram

Isi pada `.env`:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Jika dua value ini kosong, transaksi tetap tersimpan dan notifikasi Telegram dilewati.

## Backup Database

```bash
npm run db:backup
```

Snapshot disimpan ke `apps/api/data/backups/` dan direktori tersebut di-ignore oleh Git.

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
