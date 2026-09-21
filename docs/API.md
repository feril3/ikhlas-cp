# API Baseline

Base URL lokal: `http://localhost:3001/api`

## Health

`GET /health`

## Dashboard

`GET /dashboard`

Mengembalikan ringkasan saldo, transaksi terbaru, jadwal terdekat, dan kegiatan mendatang.

## Transactions

### List

`GET /transactions?type=INCOME|EXPENSE`

### Create

`POST /transactions`

Contoh payload:

```json
{
  "type": "INCOME",
  "amount": 500000,
  "transactionDate": "2026-09-21",
  "method": "TRANSFER",
  "category": "Donasi Jamaah",
  "description": "Transfer donatur"
}
```

Validasi awal dilakukan dengan Zod. File attachment belum diterima pada endpoint baseline ini.
