import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { Modal, ModalActions, ModalError } from '../components/Modal';
import { colors, fonts, pageTitleStyle, primaryBtn, outlineBtn, amberBtn, inputStyle, labelStyle, cardStyle } from '../theme';

interface Settings {
  side_duration_seconds: number;
  poll_interval_seconds: number;
  upcoming_soon_threshold_min: number;
  max_upcoming_per_slide: number;
  institution_name: string;
}

const DEFAULTS: Settings = {
  side_duration_seconds: 8,
  poll_interval_seconds: 30,
  upcoming_soon_threshold_min: 15,
  max_upcoming_per_slide: 5,
  institution_name: 'Sparkline Academy',
};

export function SignageSettingsPage() {
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await apiClient.get<Settings>('/signage-settings');
      setForm(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaveMessage(null);
    try {
      const res = await apiClient.put<Settings>('/signage-settings', form);
      setForm(res.data);
      setSaveMessage('Settings saved.');
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Failed to save settings');
    }
  }

  async function handleReset() {
    setResetError(null);
    try {
      const res = await apiClient.post<Settings>('/signage-settings/reset');
      setForm(res.data);
      setResetOpen(false);
    } catch (err: any) {
      setResetError(err.response?.data?.message || 'Failed to reset settings');
    }
  }

  if (loading) return <div style={{ color: colors.textMuted, fontFamily: fonts.base }}>Loading...</div>;

  return (
    <div>
      <h1 style={pageTitleStyle}>Signage Settings</h1>

      <form onSubmit={handleSave} style={{ ...cardStyle, padding: 24, maxWidth: 640 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Slide Duration (Seconds)</label>
            <input type="number" style={inputStyle} value={form.side_duration_seconds}
              onChange={(e) => setForm({ ...form, side_duration_seconds: Number(e.target.value) })} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Display Poll Interval (seconds)</label>
            <input type="number" style={inputStyle} value={form.poll_interval_seconds}
              onChange={(e) => setForm({ ...form, poll_interval_seconds: Number(e.target.value) })} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>"Upcoming Soon" Threshold (min)</label>
            <input type="number" style={inputStyle} value={form.upcoming_soon_threshold_min}
              onChange={(e) => setForm({ ...form, upcoming_soon_threshold_min: Number(e.target.value) })} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Max Upcoming Sessions per Slide</label>
            <input type="number" style={inputStyle} value={form.max_upcoming_per_slide}
              onChange={(e) => setForm({ ...form, max_upcoming_per_slide: Number(e.target.value) })} />
          </div>
        </div>

        <label style={labelStyle}>Institution Name</label>
        <input style={inputStyle} value={form.institution_name}
          onChange={(e) => setForm({ ...form, institution_name: e.target.value })} />

        {saveError && <p style={{ color: colors.danger, fontSize: 13 }}>{saveError}</p>}
        {saveMessage && <p style={{ color: colors.modalGreen, fontSize: 13 }}>{saveMessage}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="submit" style={primaryBtn}>Save Settings</button>
          <button type="button" style={outlineBtn} onClick={() => setResetOpen(true)}>Reset</button>
        </div>
      </form>

      {resetOpen && (
        <Modal title="Reset to Default Settings" headerColor={colors.modalAmber} onClose={() => setResetOpen(false)}>
          <p style={{ marginTop: 0, fontWeight: 700 }}>Reset all signage settings to their default values?</p>
          <p style={{ color: colors.textMuted, fontSize: 14, lineHeight: 1.8 }}>
            Slide duration: {DEFAULTS.side_duration_seconds} sec<br />
            Poll interval: {DEFAULTS.poll_interval_seconds} sec<br />
            Upcoming Soon: {DEFAULTS.upcoming_soon_threshold_min} min<br />
            Max Upcoming: {DEFAULTS.max_upcoming_per_slide}<br />
            Institution: {DEFAULTS.institution_name}
          </p>
          <ModalError>{resetError}</ModalError>
          <ModalActions>
            <button style={amberBtn} onClick={handleReset}>Reset to Defaults</button>
            <button style={outlineBtn} onClick={() => setResetOpen(false)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}
