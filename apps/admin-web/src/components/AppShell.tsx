import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AppShell() {
  const { admin, logout } = useAuth();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <nav style={{ width: 200, borderRight: '1px solid #333', padding: 16 }}>
        <h3>ScheduleMate</h3>
        <ul style={{ listStyle: 'none', padding: 0, lineHeight: 2 }}>
          <li><NavLink to="/">Dashboard</NavLink></li>
          <li><NavLink to="/campus-structure">Buildings / Rooms</NavLink></li>
          <li><NavLink to="/modules-lecturers">Modules & Lecturers</NavLink></li>
          <li><NavLink to="/sessions">Schedule</NavLink></li>
        </ul>
        <hr />
        <p style={{ fontSize: 14 }}>{admin?.username} ({admin?.role})</p>
        <button onClick={logout}>Logout</button>
      </nav>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}