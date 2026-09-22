import { useEffect, useState } from 'react';
import {
  IconBuildingMosque,
  IconEye,
  IconEyeOff,
  IconLock,
  IconShieldCheck
} from '@tabler/icons-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Alert, AlertDescription } from '../components/ui/alert.jsx';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../components/ui/field.jsx';
import { Input } from '../components/ui/input.jsx';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '../components/ui/input-group.jsx';
import { Spinner } from '../components/ui/spinner.jsx';

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
    return (
      <div className="dashboard-shell grid min-h-svh place-items-center bg-background px-5">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner className="size-5" />
          Memeriksa sesi IKHLAS...
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: 'loading', message: '' });

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
    <div className="dashboard-shell min-h-svh bg-background text-foreground">
      <div className="grid min-h-svh lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <aside className="hidden flex-col justify-between bg-sidebar px-10 py-9 text-sidebar-foreground lg:flex xl:px-14 xl:py-12">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center text-sidebar-primary">
              <IconBuildingMosque className="size-8" stroke={1.6} />
            </div>
            <div>
              <strong className="block text-sm font-bold tracking-[0.08em]">IKHLAS</strong>
              <span className="text-xs text-sidebar-foreground/60">Sistem Informasi Manajemen Masjid</span>
            </div>
          </div>

          <div className="max-w-lg">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-sidebar-primary">Administrasi masjid</p>
            <h1 className="text-[clamp(2.35rem,4.2vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
              Keuangan dan kegiatan, tercatat dengan jelas.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-sidebar-foreground/65">
              IKHLAS membantu pengurus mengelola kas, agenda, Public Display, dan audit aktivitas dalam satu sistem operasional.
            </p>
          </div>

          <div className="border-t border-sidebar-border pt-5 text-xs leading-5 text-sidebar-foreground/55">
            Masjid Al-Fath · Akses internal pengurus dan bendahara
          </div>
        </aside>

        <main className="flex min-h-svh items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-7 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2.5">
                <IconBuildingMosque className="size-7 text-primary" stroke={1.7} />
                <div><strong className="block text-sm tracking-[0.08em]">IKHLAS</strong><span className="text-[11px] text-muted-foreground">Masjid Al-Fath</span></div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/public-display" target="_blank" rel="noreferrer">Tampilan Publik</Link>
              </Button>
            </div>

            <Card className="rounded-xl shadow-sm">
              <CardHeader className="gap-2 p-6 pb-4 sm:p-7 sm:pb-4">
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                  <IconShieldCheck className="size-5" stroke={1.8} />
                </div>
                <CardTitle className="text-2xl tracking-[-0.035em]">
                  {setupRequired ? 'Siapkan akun Admin' : 'Masuk ke IKHLAS'}
                </CardTitle>
                <CardDescription className="max-w-sm leading-6">
                  {setupRequired
                    ? 'Instalasi ini belum memiliki pengguna. Akun pertama akan menjadi Admin/Pengurus.'
                    : 'Gunakan akun Admin/Pengurus atau Bendahara yang sudah terdaftar.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-2 sm:p-7 sm:pt-2">
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <FieldGroup>
                    {setupRequired && (
                      <Field>
                        <FieldLabel htmlFor="auth-name">Nama lengkap</FieldLabel>
                        <Input
                          id="auth-name"
                          autoComplete="name"
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                          required
                          minLength={2}
                          maxLength={100}
                          placeholder="Nama pengurus"
                        />
                      </Field>
                    )}

                    <Field>
                      <FieldLabel htmlFor="auth-email">Email</FieldLabel>
                      <Input
                        id="auth-email"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        required
                        placeholder="nama@contoh.id"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="auth-password">Password</FieldLabel>
                      <InputGroup className="h-10 rounded-md">
                        <InputGroupAddon><IconLock /></InputGroupAddon>
                        <InputGroupInput
                          id="auth-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={setupRequired ? 'new-password' : 'current-password'}
                          value={form.password}
                          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                          required
                          minLength={setupRequired ? 10 : 1}
                          maxLength={128}
                          placeholder={setupRequired ? 'Minimal 10 karakter' : 'Masukkan password'}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            size="icon-xs"
                            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                            onClick={() => setShowPassword((value) => !value)}
                          >
                            {showPassword ? <IconEyeOff /> : <IconEye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                      {setupRequired && <FieldDescription>Password awal minimal 10 karakter.</FieldDescription>}
                    </Field>
                  </FieldGroup>

                  {status.type === 'error' && (
                    <Alert variant="destructive" aria-live="polite">
                      <AlertDescription>{status.message}</AlertDescription>
                    </Alert>
                  )}

                  <Button className="h-11 w-full" disabled={status.type === 'loading'}>
                    {status.type === 'loading' && <Spinner />}
                    {status.type === 'loading'
                      ? setupRequired ? 'Membuat akun...' : 'Memeriksa akun...'
                      : setupRequired ? 'Buat Admin & Masuk' : 'Masuk'}
                  </Button>
                </form>

                <div className="mt-6 flex items-start gap-2 border-t pt-5 text-[11px] leading-5 text-muted-foreground">
                  <IconShieldCheck className="mt-0.5 size-4 shrink-0" stroke={1.7} />
                  <span>Sesi disimpan sebagai secure server-side cookie. Credential tidak disimpan di localStorage.</span>
                </div>
              </CardContent>
            </Card>

            <div className="mt-5 hidden justify-center lg:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/public-display" target="_blank" rel="noreferrer">Buka Tampilan Publik</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
