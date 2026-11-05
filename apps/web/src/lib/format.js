// Format angka, uang, dan tanggal untuk antarmuka aplikasi (gaya "Rp75.000", "4 Jun 2026").
const rupiahNumber = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export function formatRupiah(value) {
  const amount = Math.round(Number(value ?? 0));
  return (amount < 0 ? '-' : '') + 'Rp' + rupiahNumber.format(Math.abs(amount));
}

// Gaya lama (dengan spasi, "Rp 17.050.000"). Hanya dipakai Public Display agar tampilannya tidak berubah.
export function formatRupiahLegacy(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

export function formatDate(value, options = {}) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T') + (String(value).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date).replace(/\./g, ':') + ' WIB';
}

export function toInputDate(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
