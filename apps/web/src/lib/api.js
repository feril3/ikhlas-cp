const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body.message ?? 'Permintaan gagal diproses.');
    error.details = body.errors;
    throw error;
  }

  return body;
}

export const api = {
  dashboard: () => request('/dashboard'),
  transactions: (type) => request(`/transactions${type ? `?type=${type}` : ''}`),
  createTransaction: (input) => request('/transactions', {
    method: 'POST',
    body: JSON.stringify(input)
  })
};
