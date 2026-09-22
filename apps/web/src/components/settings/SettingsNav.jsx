import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const items = [
  ['general', 'Umum'],
  ['finance', 'Keuangan'],
  ['categories', 'Kategori'],
  ['display', 'Public Display'],
  ['users', 'Pengguna'],
  ['audit', 'Audit']
];

export function SettingsNav({ value, onChange }) {
  return (
    <>
      <div className="md:hidden">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {items.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <nav className="hidden rounded-xl border bg-card p-2 md:block" aria-label="Bagian pengaturan">
        {items.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${value === id ? 'bg-accent text-accent-foreground shadow-[inset_3px_0_0_var(--ui-primary)]' : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
