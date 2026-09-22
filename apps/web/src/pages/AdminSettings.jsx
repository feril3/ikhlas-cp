import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api.js';
import { LoadingState } from '../components/LoadingState.jsx';
import { PageHeader } from '../components/app/PageHeader.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { SettingsNav } from '../components/settings/SettingsNav.jsx';
import { GeneralSettings } from '../components/settings/GeneralSettings.jsx';
import { FinanceSettings } from '../components/settings/FinanceSettings.jsx';
import { CategorySettings } from '../components/settings/CategorySettings.jsx';
import { PublicDisplaySettings } from '../components/settings/PublicDisplaySettings.jsx';
import { UserSettings } from '../components/settings/UserSettings.jsx';
import { AuditSettings } from '../components/settings/AuditSettings.jsx';

export default function AdminSettings() {
  const { user } = useAuth();
  const [active, setActive] = useState('general');
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingError, setLoadingError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  async function load() {
    try {
      const [settingsData, usersData, auditData, categoryData, messageData] = await Promise.all([
        api.settings(),
        api.users(),
        api.auditLogs(100),
        api.transactionCategories(),
        api.publicMessages()
      ]);
      setSettings(settingsData);
      setUsers(usersData.data);
      setLogs(auditData.data);
      setCategories(categoryData.data);
      setMessages(messageData.data);
      setLoadingError('');
    } catch (error) {
      setLoadingError(error.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveSettings(event) {
    event.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const saved = await api.updateSettings({
        ...settings,
        openingBalance: Number(settings.openingBalance || 0)
      });
      setSettings(saved);
      toast.success('Pengaturan berhasil disimpan.');
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingSettings(false);
    }
  }

  if (!settings && !loadingError) return <LoadingState label="Memuat pengaturan..." />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengaturan"
        description="Kelola identitas masjid, keuangan awal, kategori, Public Display, pengguna, dan audit tanpa menumpuk semuanya dalam satu halaman."
      />

      {loadingError && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
          {loadingError}
        </div>
      )}

      {settings && (
        <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-start">
          <SettingsNav value={active} onChange={setActive} />
          <div className="min-w-0 max-w-5xl">
            {active === 'general' && <GeneralSettings settings={settings} setSettings={setSettings} onSave={saveSettings} saving={savingSettings} />}
            {active === 'finance' && <FinanceSettings settings={settings} setSettings={setSettings} onSave={saveSettings} saving={savingSettings} />}
            {active === 'categories' && <CategorySettings categories={categories} api={api} reload={load} />}
            {active === 'display' && <PublicDisplaySettings messages={messages} api={api} reload={load} />}
            {active === 'users' && <UserSettings users={users} currentUser={user} api={api} reload={load} />}
            {active === 'audit' && <AuditSettings logs={logs} />}
          </div>
        </div>
      )}
    </div>
  );
}
