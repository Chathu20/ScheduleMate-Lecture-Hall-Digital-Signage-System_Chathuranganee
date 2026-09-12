import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import apiClient from '../lib/apiClient';
import { getFloatingNow } from '../lib/time';
import { colors, pageTitleStyle, thStyle, tdStyle, statusPillStyle } from '../theme';

interface DashboardCounts {
  ongoing: number;
  upcoming: number;
  cancelled: number;
  rescheduled: number;
}

interface SessionChange {
  change_id: number;
  change_type: string;
  reason?: string | null;
  changed_at: string;
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
  changes: SessionChange[];
}

const CARD_THEMES = {
  ongoing: { from: '#8b7cf6', to: '#6a5cf0' },
  upcoming: { from: '#D2EEC1', to: '#27632A' },
  cancelled: { from: '#f76a89', to: '#ef4767' },
  rescheduled: { from: '#f7ae5a', to: '#f28a3f' },
};

function getStatusLabel(session: Session) {
  if (session.status !== 'ACTIVE') return session.status;
  const now = getFloatingNow();
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  if (start <= now && now < end) return 'ONGOING';
  if (start > now) return 'UPCOMING';
  return 'COMPLETED';
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function IconCircle({ children }: { children: ReactNode }) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

const iconProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const ICONS: Record<keyof typeof CARD_THEMES, ReactNode> = {
  ongoing: (
    <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
  ),
  upcoming: (
    <svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  ),
  cancelled: (
    <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5l5 5M14.5 9.5l-5 5" /></svg>
  ),
  rescheduled: (
    <svg {...iconProps}><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" /><path d="M18 3v4h-4M6 21v-4h4" /></svg>
  ),
};

function GradientStatCard({ kind, label, value }: { kind: keyof typeof CARD_THEMES; label: string; value: number }) {
  const theme = CARD_THEMES[kind];
  return (
    <div style={{
      flex: '1 1 200px', minWidth: 190, borderRadius: 16, padding: '20px 22px',
      background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
      boxShadow: `0 10px 24px -8px ${theme.to}99`, color: '#fff', boxSizing: 'border-box',
    }}>
      <IconCircle>{ICONS[kind]}</IconCircle>
      <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, opacity: 0.92, marginTop: 6 }}>{label}</div>
    </div>
  );
}

const cardPanelStyle = {
  backgroundColor: '#fff', borderRadius: 16, padding: 22,
  boxShadow: '0 4px 20px rgba(20, 30, 60, 0.06)', border: `1px solid ${colors.border}`,
  boxSizing: 'border-box' as const,
};

function getMondayOfWeek(): Date {
  const now = getFloatingNow();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday));
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeeklyChart({ sessions }: { sessions: Session[] }) {
  const { points, maxValue, todayIndex } = useMemo(() => {
    const monday = getMondayOfWeek();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday.getTime() + i * 86400000);
      return d.toISOString().slice(0, 10);
    });
    const counts = days.map((day) => sessions.filter((s) => s.session_date.slice(0, 10) === day).length);
    const max = Math.max(1, ...counts);
    const todayStr = getFloatingNow().toISOString().slice(0, 10);
    return { points: counts, maxValue: max, todayIndex: days.indexOf(todayStr) };
  }, [sessions]);

  const width = 700;
  const height = 200;
  const top = 16;
  const baseline = height - 30;
  const stepX = width / (points.length - 1);

  const coords = points.map((v, i) => ({
    x: i * stepX,
    y: baseline - (v / maxValue) * (baseline - top),
    value: v,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x},${c.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x},${baseline} L ${coords[0].x},${baseline} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 220, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b7cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b7cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#weeklyFill)" />
      <path d={linePath} fill="none" stroke="#6a5cf0" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x} cy={c.y}
          r={i === todayIndex ? 7 : 4.5}
          fill={i === todayIndex ? '#6a5cf0' : '#fff'}
          stroke="#6a5cf0"
          strokeWidth={i === todayIndex ? 3 : 2}
        />
      ))}
      {DAY_LABELS.map((label, i) => (
        <text key={label} x={i * stepX} y={height - 6} textAnchor="middle" fontSize="12" fill={colors.textMuted}>
          {label}
        </text>
      ))}
    </svg>
  );
}

const DONUT_SEGMENTS: { key: keyof DashboardCounts; label: string; color: string }[] = [
  { key: 'ongoing', label: 'Ongoing', color: '#6a5cf0' },
  { key: 'upcoming', label: 'Upcoming', color: '#D2EEC1' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4767' },
  { key: 'rescheduled', label: 'Rescheduled', color: '#f28a3f' },
];

function StatusDonut({ counts }: { counts: DashboardCounts }) {
  const total = counts.ongoing + counts.upcoming + counts.cancelled + counts.rescheduled;
  const radius = 54;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={140} height={140} viewBox="0 0 120 120">
          <g transform="rotate(-90 60 60)">
            {total === 0 ? (
              <circle cx="60" cy="60" r={radius} fill="none" stroke={colors.border} strokeWidth={strokeWidth} />
            ) : (
              DONUT_SEGMENTS.map((seg) => {
                const value = counts[seg.key];
                if (value === 0) return null;
                const length = (value / total) * circumference;
                const dasharray = `${length} ${circumference - length}`;
                const dashoffset = -cumulative;
                cumulative += length;
                return (
                  <circle
                    key={seg.key}
                    cx="60" cy="60" r={radius}
                    fill="none" stroke={seg.color} strokeWidth={strokeWidth}
                    strokeDasharray={dasharray} strokeDashoffset={dashoffset}
                  />
                );
              })
            )}
          </g>
          <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight={800} fill={colors.textDark}>{total}</text>
          <text x="60" y="74" textAnchor="middle" fontSize="10.5" fill={colors.textMuted}>Sessions Today</text>
        </svg>
      </div>

      <div style={{ marginTop: 10 }}>
        {DONUT_SEGMENTS.map((seg) => (
          <div key={seg.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 2px', fontSize: 13.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: seg.color, display: 'inline-block' }} />
              <span style={{ color: colors.textDark }}>{seg.label}</span>
            </div>
            <span style={{ fontWeight: 700, color: colors.textDark }}>{counts[seg.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity({ sessions }: { sessions: Session[] }) {
  const items = useMemo(() => {
    return sessions
      .flatMap((s) => s.changes.map((c) => ({ ...c, module: s.module.module_name, room: s.room.room_code })))
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
      .slice(0, 5);
  }, [sessions]);

  if (items.length === 0) {
    return <div style={{ color: colors.textMuted, fontSize: 14, padding: '12px 0' }}>No recent activity</div>;
  }

  return (
    <div>
      {items.map((item) => {
        const isCancel = item.change_type === 'CANCEL';
        const color = isCancel ? '#ef4767' : '#f28a3f';
        return (
          <div key={item.change_id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, marginTop: 5, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: colors.textDark }}>
                {item.module} (Room {item.room}) {isCancel ? 'was cancelled' : 'was rescheduled'}
              </div>
              {item.reason && <div style={{ fontSize: 12.5, color: colors.textMuted, marginTop: 2 }}>Reason: {item.reason}</div>}
              <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{timeAgo(item.changed_at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
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
        setSessions(sessionsRes.data);

        // Session dates are floating wall-clock values (see lib/time.ts), so
        // "today" must be computed the same way, not from the real UTC clock.
        const todayUtc = getFloatingNow().toISOString().slice(0, 10);
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

  if (loading || !counts) {
    return (
      <div>
        <h1 style={pageTitleStyle}>Dashboard</h1>
        <div style={{ padding: 20, color: colors.textMuted }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={pageTitleStyle}>Dashboard</h1>
      <div style={{ marginTop: -14, marginBottom: 24, fontSize: 14, color: colors.textMuted }}>
        {currentDateTime} &bull; {currentTime}
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        <GradientStatCard kind="ongoing" label="Ongoing Now" value={counts.ongoing} />
        <GradientStatCard kind="upcoming" label="Upcoming Today" value={counts.upcoming} />
        <GradientStatCard kind="cancelled" label="Cancelled Today" value={counts.cancelled} />
        <GradientStatCard kind="rescheduled" label="Rescheduled" value={counts.rescheduled} />
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ ...cardPanelStyle, flex: '2 1 420px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.textDark, marginBottom: 4 }}>Sessions This Week</div>
          <div style={{ fontSize: 12.5, color: colors.textMuted, marginBottom: 8 }}>Scheduled sessions by day (Mon &ndash; Sun)</div>
          <WeeklyChart sessions={sessions} />
        </div>

        <div style={{ ...cardPanelStyle, flex: '1 1 240px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.textDark, marginBottom: 12 }}>Today&apos;s Breakdown</div>
          <StatusDonut counts={counts} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ ...cardPanelStyle, flex: '1 1 280px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.textDark, marginBottom: 6 }}>Recent Activity</div>
          <RecentActivity sessions={sessions} />
        </div>

        <div style={{ ...cardPanelStyle, flex: '2 1 480px', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px 4px', fontWeight: 700, fontSize: 16, color: colors.textDark }}>
            Today&apos;s Schedule
          </div>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', marginTop: 10 }}>
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
    </div>
  );
}
