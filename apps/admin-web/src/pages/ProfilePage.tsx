import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { Modal, ModalActions, ModalError } from '../components/Modal';
import { colors, pageTitleStyle, primaryBtn, outlineBtn, inputStyle, labelStyle, cardStyle } from '../theme';

interface ProfileData { admin_id: number; username: string; email?: string | null; role: string; is_active: boolean; }

const ROLE_LABELS: Record<string, string> = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin' };

export function ProfilePage() {
  const { refreshAdmin } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const res = await apiClient.get<ProfileData>('/profile');
    setProfile(res.data);
  }

  function openEdit() {
    if (!profile) return;
    setEditUsername(profile.username);
    setEditEmail(profile.email || '');
    setEditError(null);
    setEditOpen(true);
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault();
    setEditError(null);
    try {
      await apiClient.put('/profile', { username: editUsername.trim(), email: editEmail.trim() || null });
      setEditOpen(false);
      await loadProfile();
      await refreshAdmin();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update profile');
    }
  }

  function openChangePassword() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwError(null);
    setShowPw(false);
    setPwOpen(true);
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
      setPwError('New password must be at least 8 characters and include 1 number');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    try {
      await apiClient.put('/profile', { currentPassword, newPassword });
      setPwOpen(false);
    } catch (err: any) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    }
  }

  if (!profile) return null;

  return (
    <div>
      <h1 style={pageTitleStyle}>My Profile</h1>

      <div style={{ ...cardStyle, padding: 24, maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: colors.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
            {profile.username.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{profile.username}</div>
            <div style={{ color: colors.textMuted, fontSize: 13 }}>{ROLE_LABELS[profile.role] || profile.role}</div>
          </div>
        </div>

        <label style={labelStyle}>Username</label>
        <input style={{ ...inputStyle, backgroundColor: '#f7f7f7' }} value={profile.username} readOnly />

        <label style={labelStyle}>Email</label>
        <input style={{ ...inputStyle, backgroundColor: '#f7f7f7' }} value={profile.email || ''} readOnly />

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Role</label>
            <input style={{ ...inputStyle, backgroundColor: '#f7f7f7' }} value={ROLE_LABELS[profile.role] || profile.role} readOnly />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Account Status</label>
            <input style={{ ...inputStyle, backgroundColor: '#f7f7f7' }} value={profile.is_active ? 'Active' : 'Inactive'} readOnly />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button style={primaryBtn} onClick={openEdit}>Edit Profile</button>
          <button style={outlineBtn} onClick={openChangePassword}>Change Password</button>
        </div>
      </div>

      {editOpen && (
        <Modal title="Edit Profile" onClose={() => setEditOpen(false)}>
          <form onSubmit={handleEditSave}>
            <label style={labelStyle}>Username</label>
            <input style={inputStyle} value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            <ModalError>{editError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save Changes</button>
              <button type="button" style={outlineBtn} onClick={() => setEditOpen(false)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {pwOpen && (
        <Modal title="Change Password" onClose={() => setPwOpen(false)}>
          <form onSubmit={handleChangePassword}>
            <label style={labelStyle}>Current Password</label>
            <input type={showPw ? 'text' : 'password'} style={inputStyle} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <label style={labelStyle}>New Password</label>
            <input type={showPw ? 'text' : 'password'} style={inputStyle} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <label style={labelStyle}>Confirm New Password</label>
            <input type={showPw ? 'text' : 'password'} style={inputStyle} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} /> Show passwords
            </label>
            <ModalError>{pwError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Change Password</button>
              <button type="button" style={outlineBtn} onClick={() => setPwOpen(false)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
