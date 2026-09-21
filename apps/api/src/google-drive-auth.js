import 'dotenv/config';
import http from 'node:http';
import { google } from 'googleapis';

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI?.trim()
  || 'http://localhost:53682/oauth2callback';

if (!clientId || !clientSecret) {
  console.error('Isi GOOGLE_DRIVE_CLIENT_ID dan GOOGLE_DRIVE_CLIENT_SECRET terlebih dahulu.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const scope = 'https://www.googleapis.com/auth/drive.file';
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [scope]
});

const redirect = new URL(redirectUri);
const port = Number(redirect.port || 53682);
const hostname = redirect.hostname;

console.log('\nBuka URL berikut di browser lalu login dengan akun Google Drive yang akan dipakai IKHLAS:\n');
console.log(authUrl);
console.log(`\nMenunggu callback di ${redirectUri}\n`);

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, redirectUri);

    if (requestUrl.pathname !== redirect.pathname) {
      res.writeHead(404).end('Not found');
      return;
    }

    const error = requestUrl.searchParams.get('error');
    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`OAuth gagal: ${error}`);
      console.error(`OAuth gagal: ${error}`);
      server.close();
      return;
    }

    const code = requestUrl.searchParams.get('code');
    if (!code) {
      res.writeHead(400).end('Authorization code tidak ditemukan.');
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Google Drive berhasil dihubungkan. Kembali ke terminal.');

    console.log('\nOAuth berhasil.');
    if (tokens.refresh_token) {
      console.log('\nSalin value berikut ke GOOGLE_DRIVE_REFRESH_TOKEN di .env:\n');
      console.log(tokens.refresh_token);
    } else {
      console.log('\nRefresh token tidak dikirim oleh Google.');
      console.log('Hapus akses app dari akun Google lalu jalankan lagi dengan prompt=consent.');
    }

    server.close();
  } catch (error) {
    console.error(error);
    res.writeHead(500).end('OAuth gagal. Lihat terminal.');
    server.close();
  }
});

server.listen(port, hostname, () => {
  console.log(`OAuth helper aktif di http://${hostname}:${port}`);
});
