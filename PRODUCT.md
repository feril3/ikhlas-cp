# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Frontend: ReactJS
- Backend: NodeJS
- Database: SQLite
- Integration: Telegram Bot API
- Streaming: YouTube Embed / YouTube Live
- Delivery surface: web browser on mobile, desktop, and TV/Public Display

## Users

### Admin / Pengurus Masjid
Mengelola informasi masjid, petugas Jumat (imam, khatib, bilal), kegiatan, konfigurasi sistem, dan memonitor kondisi keuangan. Waktu salat harian berasal dari provider dan tidak diedit manual.

### Bendahara
Mencatat kas masuk dan kas keluar, membedakan penerimaan cash/kotak amal dan transfer, mengunggah bukti transaksi atau mutasi rekening, serta melihat saldo dan laporan transaksi.

### Jamaah
Mengakses informasi yang dipublikasikan, khususnya ringkasan kondisi keuangan, jadwal ibadah, petugas Jumat, kegiatan, kajian, tanggal Masehi/Hijriah, dan informasi masjid melalui halaman publik atau TV/Public Display.

## Product Purpose

Sistem ini memusatkan pengelolaan informasi dan keuangan masjid dalam satu aplikasi web. Tujuan utamanya adalah mempermudah pencatatan dan monitoring operasional oleh pengurus serta meningkatkan transparansi informasi keuangan dan kegiatan kepada jamaah.

Keberhasilan produk berarti:
- Bendahara dapat mencatat transaksi dengan cepat, terutama dari perangkat mobile.
- Pengurus dapat memonitor saldo dan aktivitas tanpa selalu menghubungi bendahara.
- Jamaah dapat melihat informasi keuangan dan kegiatan yang memang dipublikasikan.
- Informasi masjid tidak tersebar di banyak media yang tidak terkoordinasi.
- Public Display dapat dibaca dengan jelas dari jarak penggunaan TV masjid.

## Positioning

Produk menggabungkan tiga kebutuhan yang biasanya terpisah: pencatatan keuangan internal, monitoring operasional pengurus, dan penyampaian informasi publik kepada jamaah. Data yang sama menjadi sumber untuk dashboard internal, notifikasi Telegram, laporan transaksi, dan ringkasan yang dipublikasikan.

## Operating Context

- Bendahara dapat melakukan pencatatan transaksi langsung setelah aktivitas kas terjadi.
- Pencatatan operasional harus nyaman dari smartphone, bukan hanya sekadar dapat dibuka di layar kecil.
- Pengurus menggunakan dashboard untuk monitoring berkala.
- Bukti transaksi dan mutasi rekening digunakan sebagai dokumentasi pendukung transaksi.
- Telegram digunakan untuk memberi tahu grup pengurus setelah transaksi berhasil disimpan.
- Jamaah tidak mengakses fungsi administrasi; mereka menerima informasi melalui halaman publik dan TV/Public Display.
- Public Display berjalan dalam konteks layar besar yang dilihat dari jarak tertentu dan dapat menampilkan jadwal, kegiatan, keuangan, waktu, donasi, serta Live Masjid.

## Capabilities and Constraints

### Confirmed capabilities
- Login dan logout untuk Admin/Pengurus dan Bendahara.
- Role-based access.
- Dashboard ringkasan saldo awal, kas masuk, kas keluar, dan saldo saat ini.
- Pencatatan kas masuk dan kas keluar.
- Pembeda penerimaan Cash/Kotak Amal dan Transfer.
- Upload bukti transaksi.
- Upload mutasi rekening dan pengaitan mutasi dengan transaksi.
- Perhitungan saldo otomatis.
- Jadwal adzan otomatis dari provider, iqamah otomatis +8 menit, serta pengelolaan imam/khatib/bilal khusus Jumat mendatang.
- Pengelolaan kajian serta kegiatan rutin atau periodik masjid.
- Live Masjid dengan YouTube Embed / YouTube Live.
- Public Display untuk jamaah.
- Telegram Bot notification setelah transaksi tersimpan.
- Laporan transaksi berdasarkan periode.

### UX constraints
- Halaman input operasional wajib mobile-first.
- Dashboard Admin dan Bendahara wajib responsive.
- Mobile web tetap merupakan platform web, bukan aplikasi native.
- Public Display memiliki layout khusus TV dan tidak sekadar memperbesar layout dashboard mobile.
- Akses jamaah bersifat monitoring terhadap informasi yang dipublikasikan.

## Evidence on Hand

- Proposal capstone yang telah disepakati sebagai source of truth untuk kebutuhan fungsional, kebutuhan non-fungsional, user stories, alur sistem, dan spesifikasi teknis.
- Belum ada identitas visual, logo, font, atau brand guideline final yang dikonfirmasi.
- Belum ada incumbent UI yang harus dipertahankan.

## Product Principles

1. **Amanah harus mudah dilihat.** Informasi keuangan yang dipublikasikan harus terbaca jelas dan tidak tersembunyi oleh dekorasi.
2. **Input harus lebih cepat daripada rekap manual.** Alur transaksi harus singkat, jelas, dan nyaman digunakan dari smartphone.
3. **Satu sumber data, banyak surface.** Dashboard, laporan, notifikasi, dan Public Display harus berasal dari data yang konsisten.
4. **Hak akses harus terasa jelas.** Admin/Pengurus, Bendahara, dan Jamaah tidak boleh dibuat bingung mengenai tindakan yang tersedia bagi mereka.
5. **Informasi masjid harus mudah dipindai.** Jadwal, kegiatan, saldo, dan transaksi penting harus dapat dikenali tanpa membaca halaman seperti dokumen panjang.

## Accessibility & Inclusion

- Informasi penting tidak boleh bergantung pada warna saja.
- Semua kontrol interaktif harus memiliki focus state yang terlihat.
- Ukuran target sentuh pada surface mobile harus memadai untuk penggunaan satu tangan.
- Teks inti harus menjaga kontras yang kuat terhadap latar.
- Public Display harus menggunakan ukuran teks dan kepadatan informasi yang sesuai untuk pembacaan dari jarak TV masjid.
- Motion harus bersifat pendukung; pengguna dengan preferensi reduced motion tetap memperoleh pengalaman lengkap.
