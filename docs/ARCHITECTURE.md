# Architecture

## Surfaces

### Operate UI
Digunakan Admin/Pengurus dan Bendahara. Seluruh halaman input transaksi dimulai dari layout mobile satu kolom dan meningkat ke tablet/desktop.

### Public Display
Surface terpisah untuk TV masjid. Tidak mewarisi sidebar, tabel, atau density dashboard operasional.

## Runtime

```text
Browser (React/Vite)
        |
        | JSON / HTTP
        v
Node.js / Express API
        |
        v
SQLite
```

## Data Direction

Transaksi tersimpan menjadi sumber untuk:

1. perhitungan saldo;
2. dashboard pengurus;
3. riwayat dan laporan;
4. notifikasi Telegram (milestone berikutnya);
5. ringkasan Public Display yang aman untuk dipublikasikan.

## Money Representation

Nominal Rupiah disimpan sebagai integer, bukan floating point. Indonesia tidak menggunakan pecahan sen untuk workflow kas ini sehingga `125000` berarti Rp125.000.

## Current Boundaries

- Bukti transaksi dan mutasi pada UI sudah memiliki affordance pemilihan file, tetapi penyimpanan file belum diaktifkan pada baseline.
- Belum ada authentication/session.
- Jadwal dan kegiatan pada baseline menggunakan seeded SQLite data.
- Public Display tidak menampilkan bukti transaksi atau mutasi rekening.
