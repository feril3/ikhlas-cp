# Deploy IKHLAS ke Vercel + Turso (Free Tier)

Dokumen ini menjelaskan cara menjalankan IKHLAS tanpa VPS dan tanpa kartu kredit:

| Komponen | Layanan | Keterangan |
|---|---|---|
| Frontend (React/Vite) | Vercel static hosting | Hasil build `apps/web/dist` |
| API (Express) | Vercel Function `api/index.js` | Region `hnd1` (Tokyo), `maxDuration` 60 detik |
| Database | Turso (libSQL) | Region AWS `ap-northeast-1` (Tokyo), dekat dengan function |
| Bukti transaksi | Google Drive | Tidak berubah, lihat `docs/GOOGLE_DRIVE.md` |
| Backup harian | Vercel Cron → Google Drive | `0 19 * * *` UTC = 02:00 WIB |

Semua konfigurasi build ada di `vercel.json`, sehingga project Vercel cukup diimpor dari root repo.

## Batasan yang perlu diketahui

- **Vercel Hobby** hanya untuk penggunaan non-komersial. Cocok untuk capstone/masjid, bukan untuk dijual.
- **Batas body request 4,5 MB.** Karena itu unggahan dibatasi 4 MB per file dan total 4,4 MB per pengajuan (bukti + mutasi).
- **Cron Hobby hanya sekali sehari** dengan toleransi waktu ±1 jam.
- **Cold start**: permintaan pertama setelah lama tidak dipakai terasa lebih lambat beberapa detik. Skema database diperiksa sekali per instance (`ensureDatabase`).
- **Rate limit login** disimpan di memori tiap instance function, jadi bersifat best-effort.
- Kuota free tier Turso jauh di atas kebutuhan satu masjid; cek halaman pricing Turso untuk angka terbaru.

## 1. Turso

1. Buka dashboard Turso dan pastikan database IKHLAS sudah ada di region **AWS AP NorthEast (Tokyo)**.
2. Salin **Database URL** (format `libsql://<nama-db>-<org>.aws-ap-northeast-1.turso.io`).
3. Buat token: menu database → **Create Token** → akses **Read & Write**, tanpa kedaluwarsa (atau sesuai kebijakan Anda).
   Alternatif lewat CLI:

   ```bash
   turso db tokens create <nama-db>
   ```

4. Simpan token di password manager. Token hanya ditempel ke Environment Variables Vercel, **jangan** di-commit ke repo.

Tabel dibuat otomatis pada permintaan API pertama. Database produksi tidak diisi data contoh (`SEED_DEMO_DATA` default `false` saat memakai Turso).

### Opsional: memindahkan data dari server lama

Jika masih punya berkas `ikhlas.db` dari VPS:

```bash
sqlite3 ikhlas.db .dump > ikhlas.sql
turso db shell <nama-db> < ikhlas.sql
```

Lakukan sebelum ada data baru di Turso agar tidak bentrok.

## 2. Vercel

1. **Add New → Project**, impor repo `ikhlas-cp` dari GitHub (izinkan Vercel GitHub App mengakses repo ini).
2. Biarkan **Root Directory** di root repo dan **Framework Preset** `Other`. Build, install, dan output sudah diatur `vercel.json`.
3. Isi **Environment Variables** (Production):

   | Variabel | Wajib | Isi |
   |---|---|---|
   | `TURSO_DATABASE_URL` | Ya | URL dari langkah Turso |
   | `TURSO_AUTH_TOKEN` | Ya | Token dari langkah Turso |
   | `CRON_SECRET` | Ya bila backup aktif | String acak ≥ 16 karakter |
   | `GOOGLE_DRIVE_CLIENT_ID` | Ya untuk unggah bukti | Lihat `docs/GOOGLE_DRIVE.md` |
   | `GOOGLE_DRIVE_CLIENT_SECRET` | Ya untuk unggah bukti | |
   | `GOOGLE_DRIVE_REFRESH_TOKEN` | Ya untuk unggah bukti | Hasil `npm run drive:auth -w @ikhlas/api` di laptop |
   | `GOOGLE_DRIVE_FOLDER_ID` | Tidak | Kosong = folder dibuat otomatis |
   | `GOOGLE_DRIVE_BACKUP_ENABLED` | Tidak | `true` untuk backup harian |
   | `GOOGLE_DRIVE_BACKUP_RETENTION` | Tidak | Default `30` |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Tidak | Notifikasi push PWA. Buat dengan `npx web-push generate-vapid-keys` |
   | `VAPID_SUBJECT` | Tidak | `mailto:` email pengelola aplikasi |

   Jangan isi `VITE_API_URL`, `CORS_ORIGIN`, `DATABASE_PATH`, atau `PORT` di Vercel. Frontend dan API berada di domain yang sama (`/api`).

4. Klik **Deploy**.

## 3. Setelah deploy

1. Buka `https://<project>.vercel.app/api/health` → harus `{"status":"ok",...}`.
2. Buka `https://<project>.vercel.app` → buat **akun Admin pertama** (hanya muncul selama belum ada pengguna). Segera lakukan setelah deploy agar halaman setup tidak diambil orang lain.
3. Atur profil masjid, kategori, dan rekening di menu Pengaturan.
4. Public Display: `https://<project>.vercel.app/public-display`.
5. Bila backup aktif, cek **Settings → Cron Jobs** di Vercel; tombol **Run** bisa dipakai untuk uji manual.

## Pengembangan lokal

Tanpa `TURSO_DATABASE_URL`, API memakai berkas SQLite lokal (`DATABASE_PATH`, default `apps/api/data/ikhlas.db`) melalui `@libsql/client`, sama seperti sebelumnya:

```bash
npm ci
cp .env.example .env
npm run db:init
npm run dev
```

Untuk menguji terhadap Turso dari laptop, isi `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` di `.env` lalu jalankan `npm run dev`.
