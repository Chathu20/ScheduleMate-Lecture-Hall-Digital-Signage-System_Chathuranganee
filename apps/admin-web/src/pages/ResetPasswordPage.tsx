import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import { colors, fonts, primaryBtn, inputStyle, labelStyle } from '../theme';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
      setError('Password must be at least 8 characters and include 1 number');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { email, token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sidebarBg, fontFamily: fonts.base }}>
      <div style={{ width: 400, maxWidth: '92vw', backgroundColor: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '36px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: colors.textDark }}>Success</h1>
            <div style={{ width: 64, height: 64, borderRadius: '50%', border: `2px solid ${colors.modalGreen}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px auto', fontSize: 28, color: colors.modalGreen }}>
              &#10003;
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 10px' }}>Password reset successful</h2>
            <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: 22 }}>You can now log in with your new password.</p>
            <button onClick={() => navigate('/login')} style={{ ...primaryBtn, width: '100%', padding: '11px 0', fontSize: 15 }}>
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, textAlign: 'center', color: colors.textDark }}>Set New Password</h1>
            <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 4 }}>Step 3 of 3</p>
            <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '16px 0 24px' }} />

            <form onSubmit={handleSubmit}>
              <label style={labelStyle} htmlFor="newPassword">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 38 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }}
                >
                  {showPassword ? '\u{1F441}\u{FE0F}' : '\u{1F441}\u{FE0F}\u{200D}\u{1F5E8}\u{FE0F}'}
                </button>
              </div>
              <p style={{ marginTop: -8, marginBottom: 14, fontSize: 12, color: colors.textMuted }}>Minimum 8 characters, 1 number</p>

              <label style={labelStyle} htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
                required
              />

              {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>{error}</p>}

              <button type="submit" disabled={loading} style={{ ...primaryBtn, width: '100%', padding: '11px 0', fontSize: 15 }}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <Link to="/login" style={{ color: colors.linkBlue, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>&larr; Back to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
