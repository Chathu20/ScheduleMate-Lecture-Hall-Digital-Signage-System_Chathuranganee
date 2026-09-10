import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';


interface DashboardCounts {
  date: string;
  ongoing: number;
  upcoming: number;
  cancelled: number;
  rescheduled: number;
}

export function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await apiClient.get<DashboardCounts>('/dashboard');
        setCounts(res.data);
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchCounts();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Dashboard</h1>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {counts && (
        <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
          <StatCard label="Ongoing Now" value={counts.ongoing} color="#2e7d32" />
          <StatCard label="Upcoming Today" value={counts.upcoming} color="#1565c0" />
          <StatCard label="Cancelled Today" value={counts.cancelled} color="#c62828" />
          <StatCard label="Rescheduled Today" value={counts.rescheduled} color="#f9a825" />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        border: `2px solid ${color}`,
        borderRadius: 8,
        padding: 16,
        minWidth: 140,
      }}
    >
      <p style={{ margin: 0, fontSize: 14, color: '#666' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 'bold' }}>{value}</p>
    </div>
  );
}