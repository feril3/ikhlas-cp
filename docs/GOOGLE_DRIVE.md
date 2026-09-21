# Google Drive Attachment Storage

IKHLAS menyimpan **binary file** bukti transaksi dan mutasi rekening di Google Drive. SQLite hanya menyimpan identifier dan metadata yang dibutuhkan untuk mengaitkan file dengan transaksi.

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
