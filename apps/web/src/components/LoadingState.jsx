export function LoadingState({ label = 'Memuat data...' }) {
  return <div className="loading-state"><span className="spinner" />{label}</div>;
}
