import { useEffect, useState } from 'react';
import { CircleDollarSign, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const { loading, user, setupRequired, login, setup } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  if (loading) {
    return <div className="auth-screen"><div className="auth-loading">Memeriksa konfigurasi IKHLAS...</div></div>;
  }

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: setupRequired ? 'Membuat akun admin...' : 'Memeriksa akun...' });

    try {
      if (setupRequired) {
        await setup(form);
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate('/', { replace: true });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <div className="auth-screen">
      <main className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo"><CircleDollarSign size={27} /></span>
          <div><strong>IKHLAS</strong><span>Sistem Informasi Manajemen Masjid</span></div>
        </div>

        <div className="auth-heading">
          <span className="auth-kicker"><ShieldCheck size={15} /> {setupRequired ? 'Setup awal' : 'Area pengurus'}</span>
          <h1>{setupRequired ? 'Buat akun Admin pertama' : 'Masuk ke IKHLAS'}</h1>
          <p>
            {setupRequired
              ? 'Belum ada akun pada instalasi ini. Akun pertama otomatis menjadi Admin/Pengurus.'
              : 'Gunakan akun Admin/Pengurus atau Bendahara yang telah terdaftar.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {setupRequired && (
            <label className="field">
              <span>Nama lengkap</span>
              <input
                autoComplete="name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
                minLength="2"
                maxLength="100"
                placeholder="Nama pengurus"
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
              placeholder="nama@contoh.id"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="password-field">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={setupRequired ? 'new-password' : 'current-password'}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
                minLength={setupRequired ? 10 : 1}
                maxLength="128"
                placeholder={setupRequired ? 'Minimal 10 karakter' : 'Masukkan password'}
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {status.type !== 'idle' && (
            <div className={`notice ${status.type === 'error' ? 'error' : ''}`}>{status.message}</div>
          )}

          <button className="button primary auth-submit" disabled={status.type === 'loading'}>
            {status.type === 'loading' ? 'Memproses...' : setupRequired ? 'Buat Admin & Masuk' : 'Masuk'}
          </button>
        </form>

        <p className="auth-footnote">
          Sesi login disimpan sebagai secure server-side session cookie. Credential tidak disimpan di localStorage.
        </p>
      </main>
    </div>
  );
}
