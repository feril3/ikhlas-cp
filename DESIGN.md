---
name: "Sistem Informasi Manajemen Masjid"
description: "Calm, trustworthy, mobile-first operational design system for mosque finance, administration, and public information."
colors:
  amanah-green: "#146B5A"
  amanah-green-deep: "#0D4B3F"
  warm-paper: "#F7F5EF"
  surface: "#FFFFFF"
  ink: "#17211E"
  muted-ink: "#66736E"
  border-soft: "#DDE5E0"
  display-dark: "#0B1F1A"
  success: "#18794E"
  warning: "#A15C00"
  danger: "#B42318"
  info: "#2563EB"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
  12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.amanah-green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.amanah-green-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "48px"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
    height: "48px"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Sistem Informasi Manajemen Masjid

## Overview

**Creative North Star: "Amanah yang Terlihat"**

Sistem harus terasa tenang, dapat dipercaya, dan sangat mudah dipindai. Identitas visual tidak mengejar estetika dashboard SaaS generik dan tidak menjadikan simbol religius sebagai ornamen berulang. Rasa “masjid” muncul melalui keteraturan, ketenangan, ruang yang cukup, bahasa yang sopan, dan transparansi informasi. Data keuangan harus terlihat seperti catatan yang serius tetapi tidak menakutkan.

Surface Admin dan Bendahara berada dalam mode **Operate**: desain melayani pekerjaan. Kecepatan input, kejelasan status, hierarki informasi, dan konsistensi lebih penting daripada efek visual. Surface Public Display berada dalam konteks **Read-at-a-distance**: informasi harus langsung terbaca dari TV, dengan jumlah elemen per layar lebih sedikit dan kontras lebih tinggi.

Arah ini merupakan **seed design system** untuk proyek yang belum memiliki incumbent UI. Token dapat disesuaikan setelah mockup atau implementasi pertama, tetapi prinsip inti tidak boleh hilang: mobile-first untuk pekerjaan operasional, transparansi tanpa kebisingan visual, dan Public Display yang benar-benar dirancang sebagai layar publik.

**Key Characteristics:**
- Calm operational UI, bukan landing page yang mencoba menjual sesuatu.
- Mobile-first untuk seluruh alur input transaksi.
- Green-teal dipakai sebagai tanda identitas dan aksi, bukan sebagai cat satu layar penuh.
- Warm neutral background untuk mengurangi kesan dingin dan korporat.
- Financial numbers diberi hierarki kuat dan memakai tabular numerals.
- Card digunakan hanya ketika grouping benar-benar diperlukan.
- Public Display memakai layout dan density sendiri.
- Ikon membantu scanning tetapi tidak menggantikan label teks.

## Colors

Palet berangkat dari hijau-teal yang tenang dan netral hangat. Warna utama harus terasa amanah dan stabil, bukan neon, gradient-heavy, atau “fintech agresif”.

### Primary
- **Amanah Green**: warna aksi utama, active navigation, key highlight, dan elemen identitas. Gunakan dengan hemat agar tetap memiliki bobot.
- **Amanah Green Deep**: hover/pressed state, header tertentu, atau area yang memerlukan kontras lebih kuat.

### Secondary
Tidak ada secondary accent dekoratif pada seed ini. Status dan informasi khusus menggunakan semantic colors, bukan menambah warna brand baru sekadar supaya layar lebih “ramai”.

### Tertiary
Tidak digunakan pada seed awal.

### Neutral
- **Warm Paper**: background utama aplikasi pada surface internal.
- **Surface**: form, panel, dialog, sheet, dan container yang memerlukan pemisahan dari background.
- **Ink**: teks utama dan angka keuangan penting.
- **Muted Ink**: metadata, helper text, label sekunder.
- **Border Soft**: separator dan outline yang perlu ada tanpa mendominasi.
- **Display Dark**: background khusus mode Public Display gelap bila diperlukan.

### Semantic
- **Success**: transaksi berhasil, status valid, atau keadaan positif.
- **Warning**: kondisi yang memerlukan perhatian tetapi tidak fatal.
- **Danger**: destructive action, error, atau kas keluar ketika semantik konteks memerlukannya.
- **Info**: informasi netral yang perlu dibedakan dari aksi utama.

**The One Accent Rule.** Amanah Green adalah accent utama. Jangan menambahkan gradient ungu-biru, neon, atau accent kedua hanya untuk dekorasi.

**The Meaning Before Color Rule.** Kas masuk dan kas keluar tidak boleh dibedakan hanya dengan hijau vs merah. Selalu sertakan label, tanda +/- bila tepat, ikon, atau bahasa status yang eksplisit.

**The Public Contrast Rule.** Surface TV harus memprioritaskan keterbacaan dari jarak jauh; muted text yang masih aman di dashboard laptop belum tentu layak di Public Display.

## Typography

**Display Font:** Plus Jakarta Sans (fallback: system-ui, sans-serif)  
**Body Font:** Plus Jakarta Sans (fallback: system-ui, sans-serif)

**Character:** geometris tetapi ramah, modern tanpa terasa seperti aplikasi startup generik. Satu keluarga font menjaga konsistensi pada mobile, desktop, dan TV sekaligus menekan biaya visual yang tidak diperlukan pada UI operasional.

### Hierarchy
- **Display** (700, responsive 32–48px, line-height 1.15): judul utama Public Display atau angka/waktu yang benar-benar menjadi focal point.
- **Headline** (700, 24px, line-height 1.3): judul halaman dashboard dan section utama.
- **Title** (700, 18px, line-height 1.4): judul card, dialog, sheet, atau group.
- **Body** (400, 15px, line-height 1.55): konten aplikasi, tabel/list, helper text panjang.
- **Label** (600, 13px, line-height 1.4): form label, metadata ringkas, chip, dan navigation labels.

Angka uang, saldo, tanggal penting, dan hitungan harus menggunakan **tabular numerals** agar kolom dan perubahan nilai mudah dipindai. Format uang tidak boleh diperkecil hanya agar muat di card; layout yang harus menyesuaikan.

**The Numbers Are Content Rule.** Nilai uang bukan dekorasi KPI. Berikan ruang, alignment, dan ukuran yang membuatnya mudah dibandingkan tanpa memaksa pengguna membaca font kecil.

**The No Mystery Label Rule.** Jangan mengandalkan ikon tanpa teks untuk aksi finansial, upload bukti, filter, submit, atau navigasi inti.

## Layout

Sistem menggunakan **mobile-first spatial model**. Default layout adalah satu kolom dengan gutter 16px. Lebar bertambah secara progresif, bukan desktop layout yang dipaksa mengecil.

### Mobile operational layout
- Gutter halaman: 16px.
- Vertical rhythm utama: 16–24px.
- Form transaksi: satu kolom.
- Input terkait dapat menjadi dua kolom hanya ketika ruang dan keterbacaan cukup.
- Primary action pada form panjang dapat menggunakan sticky action area di bagian bawah, dengan mempertimbangkan safe area perangkat.
- Upload bukti harus tampil sebagai field yang jelas dengan preview setelah file dipilih.
- Daftar transaksi menggunakan list row/card ringan. Jangan memaksa tabel desktop selebar beberapa kolom ke viewport mobile.
- Filter harus dapat diakses tanpa menutupi data penting; gunakan collapsible filter panel atau bottom sheet ketika jumlah filter bertambah.

### Tablet and desktop
- Navigasi dapat berubah dari drawer/mobile navigation menjadi sidebar tetap.
- Main content memiliki batas lebar agar form tidak melebar absurd di monitor besar.
- Form content idealnya berada pada container sekitar 640–720px, kecuali halaman memang memerlukan grid data.
- Dashboard dapat memakai grid, tetapi KPI yang berhubungan lebih baik dikelompokkan dalam satu financial summary region daripada membuat empat kartu identik yang saling berlomba meminta perhatian.
- Tabel penuh digunakan pada desktop ketika perbandingan antarbaris memang penting.

### Public Display
Public Display bukan breakpoint desktop biasa. Ia adalah surface tersendiri.
- Gunakan safe margins lebih besar daripada dashboard.
- Batasi jumlah blok informasi per slide/screen.
- Jadwal salat, countdown, waktu, dan pengumuman utama memiliki prioritas tertinggi sesuai konteks layar.
- Ringkasan keuangan harus ringkas: saldo saat ini, total masuk/keluar periode yang relevan, tanpa menampilkan detail sensitif.
- Carousel tidak boleh bergerak terlalu cepat atau memuat perubahan layout yang membuat pembacaan terputus.
- Jangan gunakan hover-dependent information pada surface TV.

### Responsive reference breakpoints
- **sm: 640px**
- **md: 768px**
- **lg: 1024px**
- **xl: 1280px**

Breakpoint adalah titik adaptasi, bukan target device. Layout harus tetap aman di antara nilai tersebut.

**The Thumb First Rule.** Halaman transaksi harus selesai dipakai dari layar kecil tanpa zoom, horizontal scroll, atau tombol utama yang sulit dijangkau.

**The TV Is Not a Big Laptop Rule.** Public Display tidak boleh mewarisi sidebar, tabel admin, atau density dashboard hanya karena resolusinya besar.

## Elevation & Depth

Sistem bersifat **flat-by-default dengan tonal layering**. Hierarki utama berasal dari warna permukaan, spacing, separator, dan typography. Shadow digunakan hanya ketika komponen benar-benar berada di atas layer lain, misalnya dialog, dropdown, bottom sheet, sticky action surface, atau floating menu.

### Shadow Vocabulary
- **Raised Low** (`0 1px 3px rgba(23, 33, 30, 0.08), 0 8px 24px rgba(23, 33, 30, 0.06)`): dropdown, sticky action region, card yang benar-benar elevated.
- **Overlay** (`0 16px 48px rgba(23, 33, 30, 0.18)`): modal atau sheet besar.

**The Flat-by-Default Rule.** Surface yang bisa dipisahkan dengan spacing atau border tidak perlu shadow. Bayangan adalah informasi kedalaman, bukan make-up.

## Shapes

Bahasa bentuk menggunakan sudut yang lembut tetapi tidak “bubble UI”. Radius kecil-menengah menjaga kesan modern sekaligus serius.

- Input dan button: 8px.
- Card/panel: 12px.
- Modal/sheet besar: hingga 16px.
- Chip/status: pill hanya ketika bentuk memang merepresentasikan tag/status.
- Avatar atau indicator circular boleh bulat penuh.
- Border 1px digunakan sebagai separator ringan pada input, tabel, atau panel.
- Jangan membuat semua icon berada dalam rounded-square tile; ikon dapat berdiri sendiri ketika konteksnya sudah jelas.

**The Radius Has a Job Rule.** Gunakan radius untuk menyatakan affordance dan grouping. Jangan menaikkan radius hanya agar UI terlihat “friendly”.

## Components

Komponen mengikuti pola operasional yang familiar. Keunikan brand muncul dari proporsi, warna, spacing, copy, dan consistency, bukan affordance aneh.

### Buttons
- **Shape:** gently rounded (8px).
- **Height:** 48px pada mobile operational forms; desktop boleh 40–44px untuk secondary density bila tetap nyaman.
- **Primary:** Amanah Green dengan teks putih; satu primary action dominan per region.
- **Hover / Focus:** hover menjadi Amanah Green Deep; focus-visible menggunakan ring yang jelas di luar button tanpa menggeser layout.
- **Secondary:** surface/transparent dengan border halus dan text Ink/Amanah Green.
- **Ghost:** hanya untuk aksi ringan seperti cancel, close, atau utility action.
- **Destructive:** Danger hanya untuk aksi yang benar-benar merusak/menghapus data.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Surface di atas Warm Paper.
- **Shadow Strategy:** flat by default; gunakan border atau tonal separation lebih dulu.
- **Internal Padding:** 16px mobile, 20–24px desktop bila konten memerlukan ruang.
- Jangan membuat card di dalam card kecuali ada hubungan containment yang benar-benar perlu dipahami.

### Inputs / Fields
- **Style:** background Surface, border 1px Border Soft, radius 8px, min-height 48px.
- Label selalu berada di atas field; placeholder bukan pengganti label.
- Field nominal harus memprioritaskan numeric input dan format yang mudah diverifikasi sebelum submit.
- **Focus:** border menjadi Amanah Green disertai focus ring yang terlihat.
- **Error:** gunakan Danger + teks error spesifik; jangan hanya memberi border merah.
- **Disabled:** tampil berbeda tetapi tetap terbaca.
- Helper text dipakai untuk menjelaskan format atau konsekuensi, bukan mengulang label.

### Transaction Amount Field
Field nominal adalah signature operational component.
- Nilai harus lebih menonjol daripada field biasa ketika konteks transaksi memerlukannya.
- Gunakan prefix “Rp” secara konsisten.
- Input tidak boleh menyembunyikan digit karena formatting agresif.
- Preview nilai terformat dapat muncul tanpa menghambat editing.
- Hindari modal keypad custom; gunakan affordance input perangkat.

### Upload Evidence
- Area upload harus menerima tap pada seluruh region.
- Berikan pilihan file/kamera sesuai kemampuan browser/perangkat.
- Setelah dipilih, tampilkan nama/preview serta aksi ganti atau hapus sebelum submit.
- Status upload dan kegagalan harus eksplisit.
- Jangan menjadikan drag-and-drop sebagai satu-satunya cara input karena workflow utama bersifat mobile.

### Transaction List / Table
- Mobile: row/list card dengan urutan informasi `nominal → jenis/sumber → tanggal/waktu → keterangan/status`.
- Desktop: tabel dapat dipakai untuk scanning lintas transaksi.
- Kas masuk/keluar memiliki label eksplisit.
- Bukti transaksi, mutasi, dan tindakan detail tidak perlu semuanya menjadi kolom permanen di mobile.

### Financial Summary
- Gunakan satu region ringkasan yang berisi Saldo Awal, Kas Masuk, Kas Keluar, dan Saldo Saat Ini.
- Saldo Saat Ini memiliki hierarki terbesar.
- Hindari empat kartu KPI yang seluruhnya memiliki shadow, icon tile, badge, dan dekorasi yang sama.
- Perubahan periode harus terlihat jelas agar pengguna tidak salah membaca angka.

### Navigation
- Mobile: top app bar + drawer atau compact navigation; jangan memasukkan seluruh struktur admin ke bottom navigation bila jumlah menu terlalu banyak.
- Frequent actions seperti “Tambah Kas Masuk/Keluar” dapat memperoleh shortcut yang mudah ditemukan.
- Desktop: sidebar tetap diperbolehkan dengan active state jelas.
- Role dan user identity terlihat secukupnya, tidak mengambil ruang utama.
- Public Display tidak memakai navigation chrome admin.

### Feedback & Notifications
- Setelah transaksi disimpan, berikan confirmation state yang menjelaskan transaksi berhasil dicatat.
- Jangan menjadikan notifikasi Telegram sebagai satu-satunya feedback bahwa submit berhasil.
- Error network atau validasi harus mempertahankan input pengguna sejauh memungkinkan.
- Loading state tidak boleh mengubah layout secara liar.

### Public Display Panels
- Setiap panel harus memiliki satu tujuan informasi yang jelas.
- Waktu/jadwal memakai typography besar.
- Countdown hanya ditampilkan ketika relevan terhadap waktu salat/iqamah.
- Informasi keuangan menggunakan ringkasan, bukan tabel.
- Live streaming tidak boleh membuat informasi inti hilang tanpa strategi fallback.
- Rekening donasi harus mudah dibaca dan disalin secara visual, tanpa kerumitan ornamentasi.

## Do's and Don'ts

### Do:
- **Do** mulai setiap flow transaksi dari desain mobile satu kolom.
- **Do** gunakan hierarchy yang kuat pada nominal dan Saldo Saat Ini.
- **Do** kelompokkan informasi finansial yang saling terkait dalam region yang koheren.
- **Do** gunakan label dan helper text yang eksplisit pada cash, transfer, bukti transaksi, dan mutasi rekening.
- **Do** ubah tabel menjadi list/card representation ketika viewport sempit.
- **Do** pertahankan satu primary action yang jelas pada form.
- **Do** sediakan visible focus state dan error message yang dapat dipahami.
- **Do** desain Public Display sebagai surface TV terpisah.
- **Do** gunakan spacing dan typography sebelum menambahkan card, border, atau shadow.
- **Do** pertahankan format tanggal, waktu, dan Rupiah secara konsisten di seluruh aplikasi.

### Don't:
- **Don't** menggunakan gradient dekoratif, glassmorphism, neon, atau visual “AI SaaS” yang tidak punya fungsi.
- **Don't** menggunakan empat atau lebih KPI card identik sebagai default dashboard hanya karena itu pola template umum.
- **Don't** menaruh icon di dalam rounded-square tile di setiap heading.
- **Don't** menggunakan icon-only control untuk aksi transaksi penting.
- **Don't** memaksa tabel desktop melakukan horizontal scroll sebagai pengalaman utama mobile.
- **Don't** mengecilkan teks nominal atau metadata penting hanya agar card tidak berubah ukuran.
- **Don't** menggunakan warna sebagai satu-satunya pembeda kas masuk, kas keluar, sukses, atau error.
- **Don't** menampilkan bukti transaksi atau mutasi rekening sensitif pada Public Display.
- **Don't** menyalin navigation/admin chrome ke layar TV.
- **Don't** menambah ornamen islami berulang bila tidak membantu fungsi, hierarki, atau identitas yang sudah disepakati.