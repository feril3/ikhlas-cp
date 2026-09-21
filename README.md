# IKHLAS

**IKHLAS** adalah starter implementation untuk capstone **Sistem Informasi Manajemen Masjid Terintegrasi Berbasis Web dengan Monitoring Keuangan dan Public Information Display**.

Fokus implementasi awal:

- Dashboard Admin/Bendahara yang responsive.
- Alur Kas Masuk dan Kas Keluar yang mobile-first.
- Ringkasan saldo otomatis dari transaksi.
- Riwayat transaksi.
- Seed jadwal imam/bilal dan kegiatan.
- Public Display khusus layar TV.
- Fondasi API Node.js + SQLite.
- Design system berbasis Impeccable melalui `PRODUCT.md`, `DESIGN.md`, dan `.impeccable/design.json`.

## Stack

- React + Vite
- React Router
- Node.js + Express
- SQLite (`better-sqlite3`)
- Zod untuk validasi API
- Lucide React untuk ikon UI

## Menjalankan Project

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev
```

Akses:

- Web: `http://localhost:5173`
- API health: `http://localhost:3001/api/health`
- Public Display: `http://localhost:5173/public-display`

Database demo dibuat otomatis di `apps/api/data/ikhlas.db` dan tidak dikomit ke Git.

## Struktur Repo

```text
ikhlas-cp/
├── apps/
│   ├── api/                 # Express + SQLite
│   └── web/                 # React + Vite
├── docs/
│   ├── API.md
│   └── ARCHITECTURE.md
├── .impeccable/
│   └── design.json
├── DESIGN.md
├── PRODUCT.md
└── README.md
```

## Status

Ini adalah baseline implementasi. Authentication, file upload permanen, Telegram Bot delivery, pengelolaan jadwal penuh, laporan, dan integrasi YouTube masih menjadi milestone berikutnya.
