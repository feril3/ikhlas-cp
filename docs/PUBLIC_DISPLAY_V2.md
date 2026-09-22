# Public Display V2

## Tujuan

Public Display IKHLAS adalah **digital signage** untuk TV landscape, bukan dashboard desktop yang dibesarkan. Versi V2 menggunakan satu komposisi viewport yang tidak membutuhkan scroll atau input pengguna.

## Prinsip layout

Informasi primer selalu berada pada posisi konsisten:
- waktu sekarang;
- next prayer;
- countdown;
- lima waktu salat.

Informasi sekunder berada pada satu carousel:
- kegiatan;
- Live Masjid / video default;
- transparansi keuangan;
- transaksi terbaru yang sudah disanitasi;
- pengumuman;
- rekening donasi.

Footer hanya menjadi ticker pesan/pengumuman dan informasi donasi. Link operasional Admin tidak ditampilkan pada TV publik.

Constraint teknis:
- target landscape 16:9;
- `height: 100dvh`;
- `position: fixed; inset: 0`;
- `overflow: hidden`;
- tidak ada konten di bawah fold;
- prayer strip tidak ikut carousel.

## Jadwal salat

Waktu **adzan** berasal dari AlAdhan public API dengan:
- calculation method: `20` — Kementerian Agama Republik Indonesia;
- latitude: `-7.7074`;
- longitude: `113.9969`;
- timezone: `Asia/Jakarta`;
- lokasi: RS Elizabeth Situbondo.

Data **iqamah, imam, dan bilal** tetap merupakan data internal masjid di SQLite.

Backend mengambil jadwal hari ini dan besok. Jadwal besok diperlukan agar setelah Isya Public Display dapat langsung menghitung countdown menuju Subuh berikutnya.

## Reliability

Provider tidak dipanggil langsung dari browser TV. Flow:

```text
Public Display
     |
     v
IKHLAS API
     |
     +--> prayer_time_cache (SQLite)
     |
     +--> AlAdhan API (cache miss)
     |
     +--> local prayer_schedules (last fallback)
```

Dengan demikian Public Display masih mempunyai last-known-good schedule ketika provider atau internet sementara tidak tersedia.

## Dasar desain

Arah ini mengikuti temuan riset yang dilakukan sebelum implementasi:
- MosqueOS / East London Mosque: waktu salat sebaiknya tetap pada posisi konsisten, bukan menjadi full-screen slide yang membuat jamaah menunggu informasi primer.
- Bendinelli & Paternò, *Design Criteria for Public Display User Interfaces*: public display membutuhkan hierarki informasi yang kuat, teks ringkas, dan jumlah area informasi utama terbatas.
- Literatur glanceable visualization: informasi primer harus dapat dipahami dalam waktu tatap yang singkat.

Referensi:
- https://medium.com/mosque/design-concept-direction-for-mosque-screens-51c4f9bb82
- https://github.com/MosqueOS/Mosque-Prayer-Display-Screen
- https://www.researchgate.net/publication/290894947_Design_Criteria_for_Public_Display_User_Interfaces
- https://api.aladhan.com/v1/methods
- https://aladhan.com/calculation-methods
