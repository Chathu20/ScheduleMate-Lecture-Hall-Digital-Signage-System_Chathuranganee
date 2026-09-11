import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { colors, pageTitleStyle, tableWrapStyle, thStyle, tdStyle, statusPillStyle } from '../theme';

interface DashboardCounts {
  ongoing: number;
  upcoming: number;
  cancelled: number;
  rescheduled: number;
}

interface Session {
  session_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;
  room: { room_code: string };
  module: { module_name: string };
  lecturer: { full_name: string };
}

function getStatusLabel(session: Session) {
  if (session.status !== 'ACTIVE') return session.status;
  const now = new Date();
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  if (start <= now && now < end) return 'ONGOING';
  if (start > now) return 'UPCOMING';
  return 'COMPLETED';
}

function StatCard({ label, value, backgroundColor, textColor }: { label: string; value: number; backgroundColor: string; textColor: string }) {
  return (
    <div style={{ flex: 1, minWidth: 200, backgroundColor, borderRadius: 10, padding: '18px 24px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 15, color: textColor, fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 34, lineHeight: 1, fontWeight: 700, color: '#000' }}>{value}</div>
    </div>
  );
}

export function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [countsRes, sessionsRes] = await Promise.all([
          apiClient.get<DashboardCounts>('/dashboard'),
          apiClient.get<Session[]>('/sessions'),
        ]);
        setCounts(countsRes.data);

        // Session dates are UTC-stamped wall-clock values (see the backend's
        // Date.UTC-based day boundaries), so "today" must be compared in UTC too.
        const todayUtc = new Date().toISOString().slice(0, 10);
        const filteredSessions = sessionsRes.data
          .filter((session) => session.session_date.slice(0, 10) === todayUtc)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        setTodaySessions(filteredSessions);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const currentDateTime = new Date().toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const currentTime = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div>
      <h1 style={pageTitleStyle}>Dashboard</h1>
      <div style={{ marginTop: -14, marginBottom: 24, fontSize: 14, color: colors.textMuted }}>
        {currentDateTime} &bull; {currentTime}
      </div>

      {loading && <div style={{ padding: 20, color: colors.textMuted }}>Loading dashboard...</div>}

      {!loading && counts && (
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Ongoing Now" value={counts.ongoing} backgroundColor={colors.ongoingBg} textColor={colors.ongoingText} />
          <StatCard label="Upcoming Today" value={counts.upcoming} backgroundColor={colors.upcomingBg} textColor={colors.upcomingText} />
          <StatCard label="Cancelled Today" value={counts.cancelled} backgroundColor={colors.cancelledBg} textColor={colors.cancelledText} />
          <StatCard label="Rescheduled" value={counts.rescheduled} backgroundColor={colors.rescheduledBg} textColor={colors.rescheduledText} />
        </div>
      )}

      <div style={tableWrapStyle}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, fontWeight: 700, fontSize: 16 }}>
          Today's Schedule
        </div>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Room</th>
                <th style={thStyle}>Module</th>
                <th style={thStyle}>Lecturer</th>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {todaySessions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted, padding: '24px 12px' }}>
                    No sessions today
                  </td>
                </tr>
              )}
              {todaySessions.map((session) => (
                <tr key={session.session_id}>
                  <td style={tdStyle}>{session.room.room_code}</td>
                  <td style={tdStyle}>{session.module.module_name}</td>
                  <td style={tdStyle}>{session.lecturer.full_name}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    {new Date(session.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })}
                    {' - '}
                    {new Date(session.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })}
                  </td>
                  <td style={tdStyle}>
                    <span style={statusPillStyle(getStatusLabel(session))}>{getStatusLabel(session)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
