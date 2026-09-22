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


## Visual language V3

Public Display tidak memakai pola visual dashboard admin. Versi ornamental mengambil referensi dari screen masjid yang benar-benar digunakan dan dari ornamentasi arsitektur Islam, tetapi tidak menyalin satu desain tertentu.

Prinsip visual:
- deep emerald / almost-black sebagai bidang utama;
- muted brass sebagai accent, bukan warna dominan;
- mihrab arch sebagai focal architecture untuk jam dan next prayer;
- eight-point-star geometry untuk divider dan marker;
- geometric lattice sangat halus sebagai background texture;
- corner line ornament dan frieze tipis untuk framing;
- prayer times menjadi satu continuous rail, bukan lima kartu SaaS;
- secondary carousel tetap mudah dibaca dari jauh dan ornament tidak boleh mengalahkan konten.

Ornamen dibuat sebagai SVG/CSS code-native agar tajam di TV 4K, ringan, dan tidak bergantung wallpaper atau gambar hasil generatif.

Referensi visual dan historis:
- MAWAQIT TV / mosque screens: penggunaan theme, wallpaper, prayer hierarchy, dan always-visible prayer information.
- MosqueOS / East London Mosque: single-view prayer-time model.
- The Metropolitan Museum of Art, *Islamic Art and Geometric Design*: kombinasi geometric, vegetal, dan architectural framing pada mihrab.
- Discover Islamic Art: mihrab dengan layered borders, geometric networks, dan ornamental framing.

Referensi:
- https://www.mawaqit.net/
- https://medium.com/mosque/design-concept-direction-for-mosque-screens-51c4f9bb82
- https://github.com/MosqueOS/Mosque-Prayer-Display-Screen
- https://resources.metmuseum.org/resources/metpublications/pdf/Islamic_Art_and_Geometric_Design_Activities_for_Learning.pdf
- https://islamicart.museumwnf.org/


## Media-first layout V4

Public Display V4 memprioritaskan konsumsi jamaah dari jarak jauh dengan komposisi tetap:

- kiri ±21%: waktu sekarang, adzan berikutnya, countdown menuju adzan, dan countdown iqamah bila sedang dalam jendela 5 menit setelah adzan;
- tengah ±57%: YouTube sebagai media/focal terbesar;
- kanan ±20%: saldo, kas masuk, kas keluar selalu berada di rail keuangan; area bawah rail berotasi hanya untuk transaksi terbaru dan rekening donasi;
- bawah main: lima jadwal salat dalam satu rail penuh;
- row paling bawah: running text khusus `VERSE` (ayat/hadits) yang dapat memiliki banyak item aktif.

Iqamah pada Public Display selalu dihitung sebagai **adzan + 5 menit**. Nilai iqamah manual lama tidak dipakai untuk tampilan jamaah.

Running text dikelola Admin melalui `public_messages`. Item dapat ditambah, diedit, diurutkan, dinonaktifkan, dan dihapus. Seed awal menggunakan referensi:
- QS. At-Taubah 9:18;
- Sahih al-Bukhari 527;
- Sahih al-Bukhari 645;
- Sahih Muslim 2588;
- QS. Al-Baqarah 2:261.

Seed menggunakan `seed_key` supaya idempotent dan tidak muncul berulang ketika database diinisialisasi kembali.
