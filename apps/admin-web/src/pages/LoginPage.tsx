import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, primaryBtn, inputStyle, labelStyle } from '../theme';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sidebarBg, fontFamily: fonts.base }}>
      <div style={{ width: 380, maxWidth: '92vw', backgroundColor: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '36px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, textAlign: 'center', color: colors.textDark }}>ScheduleMate Admin</h1>
        <p style={{ marginTop: 6, marginBottom: 28, textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>Sign in to continue</p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle} htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            required
          />

          <label style={labelStyle} htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 38 }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: colors.textMuted }}
            >
              {showPassword ? '\u{1F441}\u{FE0F}' : '\u{1F441}\u{FE0F}\u{200D}\u{1F5E8}\u{FE0F}'}
            </button>
          </div>

          {error && <p style={{ color: colors.danger, fontSize: 13, marginTop: 4, marginBottom: 12 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ ...primaryBtn, width: '100%', padding: '11px 0', fontSize: 15, marginTop: 8 }}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link to="/forgot-password" style={{ color: colors.linkBlue, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>

        <p style={{ textAlign: 'center', marginTop: 22, marginBottom: 0, fontSize: 12, color: colors.textMuted }}>
          No public sign up &mdash; accounts are created by a Super Admin
        </p>
      </div>
    </div>
  );
}
