const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

async function request(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    headers
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();

  if (!response.ok) {
    const error = new Error(body?.message ?? 'Permintaan gagal diproses.');
    error.status = response.status;
    error.details = body?.errors;
    throw error;
  }

  return body;
}

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}

export const api = {
  authStatus: () => request('/auth/status'),
  setup: (input) => request('/auth/setup', { method: 'POST', body: JSON.stringify(input) }),
  login: (input) => request('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  dashboard: (date) => request(`/dashboard${queryString({ date })}`),
  publicDisplay: (date) => request(`/public/display${queryString({ date })}`),

  transactions: (filters = {}) => request(`/transactions${queryString(filters)}`),
  createTransaction: (input, { evidence, mutation } = {}) => {
    const formData = new FormData();
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    if (evidence) formData.append('evidence', evidence);
    if (mutation) formData.append('mutation', mutation);

    return request('/transactions', {
      method: 'POST',
      body: formData
    });
  },
  updateTransaction: (id, input) => request(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input)
  }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  uploadTransactionAttachments: (id, { evidence, mutation }) => {
    const formData = new FormData();
    if (evidence) formData.append('evidence', evidence);
    if (mutation) formData.append('mutation', mutation);
    return request(`/transactions/${id}/attachments`, {
      method: 'POST',
      body: formData
    });
  },
  attachmentUrl: (id, kind) => `${API_URL}/transactions/${id}/attachments/${kind}`,

  transactionCategories: (type) => request(`/transaction-categories${queryString({ type })}`),
  createTransactionCategory: (input) => request('/transaction-categories', {
    method: 'POST',
    body: JSON.stringify(input)
  }),
  updateTransactionCategory: (id, input) => request(`/transaction-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input)
  }),

  reportSummary: (from, to) => request(`/reports/summary${queryString({ from, to })}`),
  async downloadTransactionsCsv(from, to) {
    const response = await fetch(`${API_URL}/reports/transactions.csv${queryString({ from, to })}`, {
      credentials: 'include',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Laporan CSV gagal diunduh.');

    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `ikhlas-transaksi-${from}-${to}.csv`;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  fridaySchedule: (date) => request(`/friday-schedules${queryString({ date })}`),
  fridaySchedules: (from, limit = 8) => request(`/friday-schedules${queryString({ from, limit })}`),
  updateFridaySchedule: (date, input) => request(`/friday-schedules/${date}`, {
    method: 'PUT',
    body: JSON.stringify(input)
  }),

  prayerSchedule: (date) => request(`/prayer-schedules${queryString({ date })}`),
  updatePrayerSchedule: (date, items) => request(`/prayer-schedules/${date}`, {
    method: 'PUT',
    body: JSON.stringify({ items })
  }),

  activities: (from) => request(`/activities${queryString({ from })}`),
  createActivity: (input) => request('/activities', {
    method: 'POST',
    body: JSON.stringify(input)
  }),
  updateActivity: (id, input) => request(`/activities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input)
  }),
  deleteActivity: (id) => request(`/activities/${id}`, { method: 'DELETE' }),

  users: () => request('/users'),
  createUser: (input) => request('/users', {
    method: 'POST',
    body: JSON.stringify(input)
  }),

  settings: () => request('/settings'),
  updateSettings: (input) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify(input)
  }),

  publicMessages: () => request('/public-messages'),
  createPublicMessage: (input) => request('/public-messages', {
    method: 'POST',
    body: JSON.stringify(input)
  }),
  updatePublicMessage: (id, input) => request(`/public-messages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input)
  }),
  deletePublicMessage: (id) => request(`/public-messages/${id}`, { method: 'DELETE' }),

  auditLogs: (limit = 100) => request(`/audit-logs${queryString({ limit })}`)
};
