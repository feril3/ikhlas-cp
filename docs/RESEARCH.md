# Research Notes — Fitur IKHLAS

Tanggal riset: 22 September 2026.

Dokumen ini mencatat alasan beberapa capability ditambahkan ke IKHLAS. Research dipakai sebagai pengaya requirement, bukan untuk memperluas scope tanpa batas.

## 1. Pola fitur sistem manajemen masjid

Open Masjid, proyek open-source sistem manajemen masjid Indonesia, menempatkan dashboard, laporan keuangan, import mutasi bank, program donasi, TV display, jadwal kegiatan, public profile, dan mobile-friendly jamaah portal sebagai capability inti/roadmap.

Masjidina juga menonjolkan laporan keuangan, program kegiatan, dan tertib administrasi sebagai bagian penting dari sistem informasi masjid.

Implikasi untuk IKHLAS:
- Bukti transaksi/mutasi benar-benar disimpan, bukan hanya mockup field.
- Laporan periode dan export dibutuhkan untuk monitoring.
- Public Display dipertahankan sebagai surface terpisah.
- Identitas masjid dan rekening donasi perlu configurable.
- Payment gateway, CRM jamaah, mustahik, zakat/qurban tidak dimasukkan karena tidak menjadi masalah utama proposal.

Sumber:
- https://github.com/motiolabs-space/open-masjid
- https://www.masjidina.com/

## 2. Laporan organisasi nonlaba

Ikatan Akuntan Indonesia mengesahkan ISAK 35 mengenai penyajian laporan keuangan entitas berorientasi nonlaba dan PPSAK 13 yang mencabut PSAK 45, efektif untuk periode tahun buku mulai 1 Januari 2020.

IKHLAS saat ini hanya membuat **rekap kas operasional berdasarkan periode**. UI sengaja tidak menyebut rekap tersebut sebagai implementasi penuh ISAK 35.

Sumber:
- https://web.iaiglobal.or.id/Berita-IAI/detail/pengesahan-isak-35-amendemen-psak-1-penyesuaian-tahunan-psak-1-dan-ppsak-13

## 3. Authentication dan session

OWASP menekankan password tidak boleh disimpan plaintext dan session identifier harus sulit ditebak. OWASP juga memperingatkan untuk tidak menyimpan session ID/token autentikasi di localStorage/sessionStorage.

IKHLAS:
- tidak memiliki password default;
- instalasi pertama membuat Admin secara eksplisit;
- password disimpan sebagai slow hash;
- session token random disimpan sebagai hash di database;
- browser menerima HttpOnly session cookie;
- role Admin dan Bendahara dibatasi di backend, tidak hanya melalui UI.

Sumber:
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie

## 4. Upload bukti transaksi

OWASP merekomendasikan allow-list tipe file, batas ukuran, nama file buatan aplikasi, serta menyimpan upload di luar webroot bila memungkinkan.

IKHLAS:
- menerima JPG/JPEG, PNG, WEBP, dan PDF;
- limit 5 MB per file;
- file tidak dipersist permanen di filesystem server;
- file dikirim ke Google Drive melalui OAuth 2.0 scope `drive.file`;
- SQLite hanya menyimpan file ID dan metadata referensi;
- file tetap private dan diberikan ke user melalui endpoint backend yang memerlukan session.

Sumber:
- https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- https://developers.google.com/workspace/drive/api/guides/create-file
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
- https://developers.google.com/workspace/drive/api/guides/folder

## 5. Audit logging

OWASP merekomendasikan application logging karena berguna untuk keamanan maupun operasional.

IKHLAS mencatat event seperti login, gagal login, pembuatan pengguna, transaksi, attachment, update jadwal, update settings, dan export laporan.

Sumber:
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

## 6. Telegram notification

Telegram Bot API menyediakan metode `sendMessage` dengan `chat_id` dan `text`. Karena Telegram merupakan side effect eksternal, kegagalannya tidak membatalkan transaksi yang sudah berhasil disimpan.

Sumber:
- https://core.telegram.org/bots/api

## 7. PWA dan penggunaan mobile

Progressive Web App memungkinkan web app dipasang dan memiliki app shell yang lebih tahan terhadap koneksi buruk melalui service worker/cache.

IKHLAS menerapkan manifest dan service worker untuk shell. Data finansial tidak diantrekan offline karena transaksi keuangan lebih aman gagal secara eksplisit daripada berisiko duplikasi ketika koneksi kembali.

Sumber:
- https://developers.google.com/web/shows/google-io/2016/instant-loading-building-offline-first-progressive-web-apps-google-io-2016
- https://developers.google.com/codelabs/pwa-training/pwa03--going-offline

## 8. Accessibility

WCAG 2.2 menambahkan Target Size minimum 24x24 CSS px dan menekankan focus yang terlihat/tidak tertutup. Design system IKHLAS mempertahankan kontrol mobile utama sekitar 44–48 px dan visible focus ring.

Sumber:
- https://www.w3.org/TR/wcag/
- https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/

## 9. SQLite reliability

SQLite WAL meningkatkan concurrency sehingga reader dan writer dapat berjalan bersamaan. SQLite juga menyediakan Online Backup API untuk snapshot database berjalan.

IKHLAS menggunakan WAL dan `better-sqlite3.backup()` untuk perintah backup.

Sumber:
- https://www.sqlite.org/wal.html
- https://www.sqlite.org/backup.html
