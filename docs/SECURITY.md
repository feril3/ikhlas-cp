# Security Baseline

Dokumen ini menjelaskan baseline keamanan implementasi, bukan klaim bahwa aplikasi telah menjalani penetration test.

## Authentication

- Tidak ada credential default.
- User pertama dibuat lewat initial setup.
- Password minimal 10 karakter pada UI/API.
- Password di-hash menggunakan PBKDF2-HMAC-SHA256 dengan random salt.
- Session token dibuat random dan hanya hash token yang disimpan di database.
- Session cookie menggunakan HttpOnly, SameSite=Lax, Path=/, dan Secure pada production.
- Login/setup memiliki limiter per IP.

## Authorization

- Semua endpoint internal memakai server-side authorization.
- Admin dapat mengelola settings, jadwal, kegiatan, pengguna, dan audit log.
- Admin dan Bendahara dapat mengelola transaksi.
- Public Display menggunakan endpoint publik tersendiri dan tidak menerima bukti transaksi/mutasi.

## File Upload

- Jenis file allow-list: JPEG, PNG, WEBP, PDF.
- Maksimal 5 MB per file.
- Nama file pada disk dibuat random.
- File disimpan di luar webroot frontend.
- Download membutuhkan authenticated session.
- Production deployment tetap disarankan menambahkan malware scanning bila volume upload meningkat.

## HTTP

API mengirim baseline security headers:
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy
- HSTS pada NODE_ENV=production

## Secrets

Jangan commit:
- Telegram bot token.
- Telegram chat ID bila dianggap sensitif.
- Database production.
- Upload bukti transaksi.
- Backup database.

Semua sudah diarahkan melalui `.env` dan `.gitignore`.

## Deployment

Untuk production:
1. gunakan HTTPS;
2. jalankan frontend dan API pada origin/site yang terkontrol;
3. set `NODE_ENV=production`;
4. set `CORS_ORIGIN` ke origin frontend yang pasti;
5. set `TRUST_PROXY=true` hanya jika memang berada di belakang reverse proxy yang dipercaya;
6. backup database secara terjadwal dan simpan salinan di media terpisah;
7. batasi akses filesystem server.
