import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import { colors, fonts, primaryBtn, outlineBtn, inputStyle, labelStyle } from '../theme';

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sidebarBg, fontFamily: fonts.base }}>
      <div style={{ width: 400, maxWidth: '92vw', backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: '36px 32px', boxShadow: `0 4px 20px ${colors.shadowSm}` }}>
        {children}
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function sendResetLink() {
    setError(null);
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setStep(2);
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await sendResetLink();
  }

  if (step === 2) {
    return (
      <AuthCard>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, textAlign: 'center', color: colors.textDark }}>Forgot Password</h1>
        <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 4 }}>Step 2 of 3</p>
        <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '16px 0 24px' }} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: `2px solid ${colors.modalGreen}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 28, color: colors.modalGreen }}>
            &#9993;
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>Check your email</h2>
          <p style={{ fontSize: 14, color: colors.textMuted, margin: '0 0 6px' }}>We&apos;ve sent a password reset link to</p>
          <p style={{ fontSize: 14, color: colors.linkBlue, fontWeight: 600, margin: '0 0 18px' }}>{email}</p>
          <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
            Didn&apos;t get it? Check spam{resendCooldown > 0 ? `, or wait ${resendCooldown}s to resend` : ''}
          </p>

          <button
            type="button"
            onClick={sendResetLink}
            disabled={resendCooldown > 0 || loading}
            style={{ ...outlineBtn, width: '100%', marginLeft: 0, padding: '10px 0', opacity: resendCooldown > 0 ? 0.5 : 1 }}
          >
            Resend Email
          </button>

          {error && <p style={{ color: colors.danger, fontSize: 13, marginTop: 12 }}>{error}</p>}

          <div style={{ marginTop: 20 }}>
            <Link to="/login" style={{ color: colors.linkBlue, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>&larr; Back to Login</Link>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, textAlign: 'center', color: colors.textDark }}>Forgot Password</h1>
      <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 4 }}>Step 1 of 3</p>
      <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '16px 0 24px' }} />

      <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: 20 }}>
        Enter the email linked to your admin account, and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit}>
        <label style={labelStyle} htmlFor="email">Email Address</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />

        {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ ...primaryBtn, width: '100%', padding: '11px 0', fontSize: 15 }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <Link to="/login" style={{ color: colors.linkBlue, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>&larr; Back to Login</Link>
      </div>
    </AuthCard>
  );
}
