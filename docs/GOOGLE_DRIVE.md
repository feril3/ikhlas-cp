# Google Drive Attachment Storage

IKHLAS memakai Google Drive untuk dua kebutuhan: **binary file bukti transaksi/mutasi rekening** dan **arsip backup SQLite**. Database operasional tetap berjalan dari storage lokal server; Google Drive hanya menjadi penyimpanan dokumen dan backup.

## Kenapa OAuth user, bukan service account

Untuk instalasi capstone yang memakai akun Gmail/Google pribadi, pendekatan paling sederhana adalah OAuth 2.0 atas nama akun Google manusia.

Google menjelaskan bahwa file yang dibuat memakai OAuth user dimiliki user tersebut dan menggunakan kuota My Drive user. Service account tidak memiliki storage quota dan tidak cocok untuk My Drive personal tanpa Shared Drive atau impersonation.

## Scope

IKHLAS meminta scope:

`https://www.googleapis.com/auth/drive.file`

Scope ini membatasi aplikasi ke file yang dibuat/diakses oleh aplikasi, sehingga lebih kecil daripada full `drive` scope.

## Setup Google Cloud

1. Buat/select Google Cloud project.
2. Enable **Google Drive API**.
3. Konfigurasi OAuth consent screen.
4. Buat **OAuth 2.0 Client ID** bertipe **Web application**.
5. Tambahkan Authorized redirect URI:

   `http://localhost:53682/oauth2callback`

6. Salin Client ID dan Client Secret ke `.env`:

```env
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:53682/oauth2callback
```

## Mendapatkan refresh token

Dari root repo:

```bash
npm run drive:auth -w @ikhlas/api
```

Script akan menampilkan URL Google OAuth. Login dengan akun Google Drive yang akan dipakai IKHLAS. Setelah callback berhasil, terminal menampilkan refresh token.

Simpan ke:

```env
GOOGLE_DRIVE_REFRESH_TOKEN=...
```

Refresh token adalah secret. Jangan commit ke Git.

## Folder storage

Secara default `GOOGLE_DRIVE_FOLDER_ID` dibiarkan kosong.

IKHLAS akan mencari folder yang sebelumnya dibuat oleh aplikasi. Jika belum ada, aplikasi membuat folder:

**IKHLAS - Bukti Transaksi**

di My Drive akun OAuth.

Nama folder bisa diubah:

```env
GOOGLE_DRIVE_FOLDER_NAME=IKHLAS - Bukti Transaksi
```

`GOOGLE_DRIVE_FOLDER_ID` hanya perlu diisi bila deployment memang menggunakan folder yang sudah dapat diakses oleh credential OAuth aplikasi, misalnya pada konfigurasi Shared Drive tertentu.

## Alur upload

```text
HP Bendahara
   |
   | multipart/form-data
   v
IKHLAS API
   |
   | file berada sementara di RAM (maks. 5 MB)
   v
Google Drive API
   |
   +--> private file di Drive
   |
   +--> fileId + metadata --> SQLite
```

File tidak ditulis permanen ke `apps/api/data/uploads`.

## Download / preview

Browser tidak membuka public sharing link Google Drive.

Alurnya:

1. User sudah login ke IKHLAS.
2. Browser memanggil endpoint attachment IKHLAS.
3. Backend mengecek session.
4. Backend membaca file dari Google Drive API.
5. Backend melakukan stream file ke browser.

Dengan begitu bukti transaksi tidak perlu dibuat publik di Drive.

## Auto backup SQLite ke Google Drive

IKHLAS menggunakan `better-sqlite3.backup()` untuk membuat snapshot konsisten dari database yang sedang aktif. File snapshot dibuat sementara di direktori temporary OS, di-upload ke Google Drive, lalu file temporary dihapus.

Folder default backup:

**IKHLAS - Backup Database**

Konfigurasi:

```env
GOOGLE_DRIVE_BACKUP_ENABLED=true

# Opsional. Kosongkan agar IKHLAS membuat/mencari folder backup sendiri.
GOOGLE_DRIVE_BACKUP_FOLDER_ID=
GOOGLE_DRIVE_BACKUP_FOLDER_NAME=IKHLAS - Backup Database

# Default: setiap hari pukul 02:00 WIB.
GOOGLE_DRIVE_BACKUP_HOUR=2
GOOGLE_DRIVE_BACKUP_MINUTE=0
GOOGLE_DRIVE_BACKUP_TIMEZONE=Asia/Jakarta

# Jumlah snapshot terbaru yang dipertahankan. Range 1-365.
GOOGLE_DRIVE_BACKUP_RETENTION=30
```

### Perilaku scheduler

Scheduler berjalan di proses API ketika `GOOGLE_DRIVE_BACKUP_ENABLED=true`.

- Setiap hari hanya satu snapshot dibuat.
- Jika API mati pada jam 02:00 lalu hidup kembali pukul 08:00 dan backup hari itu belum ada, backup langsung dijalankan.
- Sebelum membuat backup susulan, aplikasi mengecek folder Drive agar restart server tidak menghasilkan backup duplikat.
- Setelah upload berhasil, retention dijalankan dan backup yang lebih lama dari batas akan dihapus.
- Jika upload gagal, snapshot temporary lokal tetap dibersihkan dan scheduler akan mencoba lagi pada pemeriksaan berikutnya.
- Pada deployment multi-instance, aktifkan scheduler hanya di **satu** instance untuk menghindari race/backup ganda.

Nama file backup berbentuk:

```text
ikhlas-db-2026-09-22T02-00-00-000Z.sqlite3
```

Waktu pada nama file menggunakan UTC ISO agar filename konsisten; jadwal tetap mengikuti timezone yang dikonfigurasi.

### Backup manual ke Drive

Untuk menguji credential dan alur backup tanpa menunggu scheduler:

```bash
npm run db:backup:drive
```

Command akan:
1. membuat snapshot SQLite;
2. upload ke folder backup Google Drive;
3. menjalankan retention;
4. menampilkan Drive file ID dan ukuran file.

### Restore

Restore sengaja tidak dibuat otomatis karena operasi ini destruktif.

Prosedur aman:

1. Stop API IKHLAS.
2. Backup database aktif yang lama sebagai salinan tambahan.
3. Download snapshot `.sqlite3` yang dipilih dari folder **IKHLAS - Backup Database**.
4. Ganti file database yang ditunjuk oleh `DATABASE_PATH`.
5. Pastikan tidak ada file `-wal` / `-shm` lama dari database sebelumnya.
6. Jalankan `npm run db:init` untuk memastikan schema/migration kompatibel.
7. Start API dan verifikasi dashboard serta transaksi.

## Catatan production

- Gunakan HTTPS.
- Simpan Client Secret dan Refresh Token di secret manager/environment deployment.
- Jangan membuat permission `anyone` untuk folder atau file bukti.
- Backup SQLite tetap diperlukan karena database menyimpan hubungan antara transaksi dan Drive file ID.
- Backup Drive terpisah tetap masuk akal untuk dokumen penting organisasi.

## Referensi

- https://developers.google.com/workspace/drive/api/guides/create-file
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
- https://developers.google.com/workspace/drive/api/guides/folder
- https://developers.google.com/workspace/drive/api/guides/about-shareddrives
