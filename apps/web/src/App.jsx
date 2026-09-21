import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TransactionForm from './pages/TransactionForm.jsx';
import Transactions from './pages/Transactions.jsx';
import Schedule from './pages/Schedule.jsx';
import PublicDisplay from './pages/PublicDisplay.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/public-display" element={<PublicDisplay />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/transactions/income" element={<TransactionForm type="INCOME" />} />
        <Route path="/transactions/expense" element={<TransactionForm type="EXPENSE" />} />
        <Route path="/schedule" element={<Schedule />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
