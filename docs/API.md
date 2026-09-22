# API

Base URL lokal: `http://localhost:3001/api`

Endpoint internal menggunakan HttpOnly session cookie.

## Public

- `GET /health`
- `GET /auth/status`
- `POST /auth/setup` — hanya saat belum ada user
- `POST /auth/login`
- `GET /public/display?date=YYYY-MM-DD`

## Authentication

- `GET /auth/me`
- `POST /auth/logout`

## Dashboard

- `GET /dashboard?date=YYYY-MM-DD`

## Transactions

- `GET /transactions?type=INCOME|EXPENSE&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /transactions` — multipart/form-data. Field transaksi + file `evidence` dan/atau `mutation` dikirim dalam satu request.
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

- `GET /prayer-schedules?date=YYYY-MM-DD`
- `PUT /prayer-schedules/:date` — Admin

## Activities

- `GET /activities?from=YYYY-MM-DD`
- `POST /activities` — Admin
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
- `POST /transactions` dan penggantian attachment hanya untuk Bendahara.

## Audit

- `GET /audit-logs?limit=100` — Admin
