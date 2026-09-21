import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    user: null,
    setupRequired: false
  });

  async function refresh() {
    try {
      const result = await api.authStatus();
      setState({
        loading: false,
        user: result.user ?? null,
        setupRequired: Boolean(result.setupRequired)
      });
      return result;
    } catch {
      setState((current) => ({ ...current, loading: false, user: null }));
      return null;
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(input) {
    const result = await api.login(input);
    setState({ loading: false, user: result.user, setupRequired: false });
    return result;
  }

  async function setup(input) {
    const result = await api.setup(input);
    setState({ loading: false, user: result.user, setupRequired: false });
    return result;
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      setState((current) => ({ ...current, user: null }));
    }
  }

  const value = useMemo(() => ({
    ...state,
    login,
    setup,
    logout,
    refresh
  }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return context;
}
