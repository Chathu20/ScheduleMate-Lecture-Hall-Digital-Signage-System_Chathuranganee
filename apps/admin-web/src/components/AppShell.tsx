import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import { colors, fonts } from '../theme';

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  display: 'block',
  padding: '11px 22px',
  color: isActive ? '#fff' : '#333',
  backgroundColor: isActive ? colors.navy : 'transparent',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 600 as const,
});

export function AppShell() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: fonts.base }}>
      <header
        style={{
          backgroundColor: colors.headerNavy, color: '#fff', padding: '14px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 10,
        }}
      >
        <div>
          <span style={{ fontSize: 20, fontWeight: 700 }}>ScheduleMate</span>{' '}
          <span style={{ fontSize: 12, color: '#9aa5b8' }}>Admin Console</span>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: '50%' }}
          >
            <Avatar username={admin?.username} photoUrl={admin?.profile_photo} />
          </button>

          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(false)} />
              <div
                style={{
                  position: 'absolute', right: 0, top: 44, width: 220, backgroundColor: colors.navy,
                  borderRadius: 10, padding: 18, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 20,
                }}
              >
                <div style={{ color: '#8fb3e8', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>WELCOME</div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{admin?.username}</div>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                  style={{
                    width: '100%', padding: '10px 0', backgroundColor: '#fff', border: 'none', borderRadius: 6,
                    fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10,
                  }}
                >
                  Profile
                </button>
                <button
                  onClick={() => { setMenuOpen(false); logout(); navigate('/login'); }}
                  style={{
                    width: '100%', padding: '10px 0', backgroundColor: 'transparent', border: `1.5px solid ${colors.danger}`,
                    borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', color: colors.danger,
                  }}
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        <nav style={{ width: 200, flexShrink: 0, backgroundColor: colors.sidebarBg, borderRight: `1px solid ${colors.border}`, paddingTop: 12 }}>
          <NavLink to="/" end style={navLinkStyle}>Dashboard</NavLink>
          <NavLink to="/campus-structure" style={navLinkStyle}>Buildings / Rooms</NavLink>
          <NavLink to="/modules" style={navLinkStyle}>Modules</NavLink>
          <NavLink to="/lecturers" style={navLinkStyle}>Lecturers</NavLink>
          <NavLink to="/sessions" style={navLinkStyle}>Schedule</NavLink>
          <NavLink to="/displays" style={navLinkStyle}>Displays</NavLink>
          {admin?.role === 'SUPER_ADMIN' && (
            <>
              <NavLink to="/manage-admins" style={navLinkStyle}>Manage Admins</NavLink>
              <NavLink to="/signage-settings" style={navLinkStyle}>Signage Settings</NavLink>
            </>
          )}
        </nav>

        <main style={{ flex: 1, backgroundColor: '#fff', padding: 24, minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
