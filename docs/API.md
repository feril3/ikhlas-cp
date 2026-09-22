# API

Base URL lokal: `http://localhost:3001/api`

Endpoint internal menggunakan HttpOnly session cookie.

## Public

- `GET /health`
- `GET /auth/status`
- `POST /auth/setup` — hanya saat belum ada user
- `POST /auth/login`
- `GET /public/display?date=YYYY-MM-DD` — termasuk jadwal salat hari ini + besok, lokasi Situbondo, transaksi publik aman, carousel content, dan messages

## Authentication

- `GET /auth/me`
- `POST /auth/logout`

## Dashboard

- `GET /dashboard?date=YYYY-MM-DD`

## Transactions

- `GET /transactions?type=INCOME|EXPENSE&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /transactions` — multipart/form-data. Field transaksi + file `evidence` dan/atau `mutation` dikirim dalam satu request.
- `PUT /transactions/:id` — Admin/Bendahara; edit nominal, tanggal, metode, kategori, sumber, dan keterangan. Jenis INCOME/EXPENSE tidak diubah. Before/after masuk audit trail.
- `DELETE /transactions/:id` — Admin/Bendahara; transaksi dihapus dari ledger, snapshot penuh masuk audit trail, file Google Drive dipertahankan untuk audit.
- `POST /transactions/:id/attachments` — mengganti/menambah dokumen transaksi; multipart, field `evidence` dan/atau `mutation`
- `GET /transactions/:id/attachments/evidence`
- `GET /transactions/:id/attachments/mutation`

Field transaksi:

```text
type=INCOME
amount=500000
transactionDate=2026-09-22
method=TRANSFER
categoryId=2
sourceDetail=Donatur tetap / detail sumber (opsional, khusus kas masuk)
description=Transfer donatur
evidence=<file opsional untuk kas masuk, wajib untuk kas keluar>
mutation=<file opsional>
```

File diteruskan ke Google Drive. Database hanya menyimpan Google Drive file ID dan metadata referensi.

## Transaction Categories

- `GET /transaction-categories?type=INCOME|EXPENSE` — Admin melihat semua, Bendahara hanya kategori aktif
- `POST /transaction-categories` — Admin
- `PUT /transaction-categories/:id` — Admin

## Reports

- `GET /reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /reports/transactions.csv?from=YYYY-MM-DD&to=YYYY-MM-DD`

## Prayer Schedule

- `GET /friday-schedules?from=YYYY-MM-DD&limit=8` — daftar tanggal Jumat mendatang mulai `from`; tanggal yang sudah lewat tidak ikut payload dashboard.
- `GET /friday-schedules?date=YYYY-MM-DD` — satu jadwal petugas Jumat untuk tanggal tertentu.
- `PUT /friday-schedules/:date` — Admin; khusus tanggal Jumat, menyimpan imam, khatib, bilal.
- `GET /prayer-schedules?date=YYYY-MM-DD` — jadwal adzan read-only dari AlAdhan API dengan method 20 (Kementerian Agama RI), termasuk metadata tanggal Hijriah `hijriDate`.

Provider location:
- RS Elizabeth Situbondo
- Jl. WR. Supratman No.2, Mulyautama, Patokan, Kec. Situbondo, Kabupaten Situbondo, Jawa Timur 68312
- latitude `-7.7074`
- longitude `113.9969`
- timezone `Asia/Jakarta`

Jadwal provider dicache di tabel `prayer_time_cache`. Jika API gagal, backend memakai cache terakhir; jika cache belum tersedia, backend jatuh ke jadwal lokal sebagai fallback.

## Activities

- `GET /activities?from=YYYY-MM-DD`
- `POST /activities` — Admin
- `PUT /activities/:id` — Admin; edit agenda publik yang sudah ada
- `DELETE /activities/:id` — Admin

## Users

- `GET /users` — Admin
- `POST /users` — Admin

## Settings

- `GET /settings` — Admin
- `PUT /settings` — Admin; termasuk saldo awal, tanggal saldo awal, dan catatan

## Public Display Messages

- `GET /public-messages` — Admin
- `POST /public-messages` — Admin
- `PUT /public-messages/:id` — Admin
- `DELETE /public-messages/:id` — Admin

Endpoint publik `GET /public/display` mengembalikan transaksi terbaru yang sudah disanitasi (jenis, nominal, tanggal, kategori) dan konten Public Display aktif. Data sumber detail, keterangan internal, bukti, mutasi, dan user pencatat tidak diekspos.

## Authorization Summary

- Admin/Pengurus: pencatatan kas masuk/keluar, monitoring transaksi & laporan, jadwal/kegiatan, kategori, settings, user, audit, konten Public Display.
- Bendahara: pencatatan kas masuk/keluar, bukti/mutasi, riwayat transaksi, laporan.
- `POST /transactions` dan penggantian attachment dapat dilakukan Admin/Pengurus maupun Bendahara sesuai baseline produksi terbaru.

## Audit

- `GET /audit-logs?limit=100` — Admin


## Public Display focus mode

Public Display memakai tiga fase khusus di sekitar adzan/iqamah:
- 5 menit sebelum adzan: layar hanya menampilkan label adzan tujuan dan countdown `MM:SS`.
- mulai tepat waktu adzan selama 2 menit: layar hanya menampilkan `Waktunya Adzan <nama salat>`.
- iqamah ditetapkan 8 menit setelah adzan. Countdown iqamah mengambil alih layar hanya pada 5 menit terakhir sebelum iqamah.

Contoh Ashar 14:29:
- 14:24–14:28:59 → countdown menuju adzan.
- 14:29–14:30:59 → `Waktunya Adzan Ashar`.
- 14:31–14:31:59 → layout normal.
- 14:32–14:36:59 → countdown menuju iqamah.
- 14:37 → iqamah; layout normal kembali.

Di luar window tersebut, layout normal tetap menampilkan video, keuangan, jadwal salat, agenda publik, dan running text.

Pada hari Jumat, payload Public Display menambahkan `fridaySchedule` berisi `imam`, `khatib`, dan `bilal` bila jadwal telah diinput Admin.


## Public Display calendar

Header Public Display menampilkan kalender ganda:
- hari + tanggal Masehi;
- tanggal Hijriah dari metadata AlAdhan pada jadwal hari tersebut.

Jika payload cache lama atau fallback lokal belum membawa metadata Hijriah, backend memakai kalender `islamic-umalqura` sebagai fallback agar tanggal tetap tersedia.
