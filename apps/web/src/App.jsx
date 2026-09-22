import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell.jsx';
import { LoadingState } from './components/LoadingState.jsx';
import { useAuth } from './auth/AuthContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TransactionForm from './pages/TransactionForm.jsx';
import Transactions from './pages/Transactions.jsx';
import Schedule from './pages/Schedule.jsx';
import PublicDisplay from './pages/PublicDisplay.jsx';
import Login from './pages/Login.jsx';
import Reports from './pages/Reports.jsx';
import AdminSettings from './pages/AdminSettings.jsx';

function ProtectedShell() {
  const { loading, user } = useAuth();
  if (loading) return <LoadingState label="Memeriksa sesi..." />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function AdminOnly() {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}

function TreasurerOnly() {
  const { user } = useAuth();
  if (user?.role !== 'TREASURER') return <Navigate to="/transactions" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/public-display" element={<PublicDisplay />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route element={<TreasurerOnly />}>
          <Route path="/transactions/income" element={<TransactionForm type="INCOME" />} />
          <Route path="/transactions/expense" element={<TransactionForm type="EXPENSE" />} />
        </Route>
        <Route path="/reports" element={<Reports />} />
        <Route path="/schedule" element={<Schedule />} />

        <Route element={<AdminOnly />}>
          <Route path="/settings" element={<AdminSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
