import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { Modal, NoteBox, ModalActions, ModalError } from '../components/Modal';
import { IconEdit, IconDelete, IconDeactivate, IconReactivate } from '../components/icons';
import {
  colors, pageTitleStyle, primaryBtn, outlineBtn, dangerBtn, amberBtn, greenBtn, inputStyle, labelStyle,
  tableWrapStyle, thStyle, tdStyle, linkBtnStyle, dangerLinkBtnStyle, statusPillStyle,
} from '../theme';

interface Admin { admin_id: number; username: string; email?: string | null; role: string; is_active: boolean; }

const ROLE_LABELS: Record<string, string> = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin' };

function emptyAddForm() { return { username: '', email: '', password: '', role: 'ADMIN' }; }

export function ManageAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm());
  const [addError, setAddError] = useState<string | null>(null);

  const [editAdmin, setEditAdmin] = useState<Admin | null>(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', role: 'ADMIN' });
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteAdmin, setDeleteAdmin] = useState<Admin | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [deactivateAdmin, setDeactivateAdmin] = useState<Admin | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const [reactivateAdmin, setReactivateAdmin] = useState<Admin | null>(null);
  const [reactivateError, setReactivateError] = useState<string | null>(null);

  useEffect(() => { loadAdmins(); }, []);

  async function loadAdmins() {
    const res = await apiClient.get<Admin[]>('/admins');
    setAdmins(res.data);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addForm.username.trim() || !addForm.password.trim() || !addForm.role) {
      setAddError('Username, temporary password, and role are required');
      return;
    }
    try {
      await apiClient.post('/admins', {
        username: addForm.username.trim(),
        email: addForm.email.trim() || undefined,
        password: addForm.password,
        role: addForm.role,
      });
      setAddOpen(false);
      setAddForm(emptyAddForm());
      loadAdmins();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to add admin');
    }
  }

  function openEdit(admin: Admin) {
    setEditAdmin(admin);
    setEditForm({ username: admin.username, email: admin.email || '', role: admin.role });
    setEditError(null);
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault();
    if (!editAdmin) return;
    setEditError(null);
    try {
      await apiClient.put(`/admins/${editAdmin.admin_id}`, {
        username: editForm.username.trim(),
        email: editForm.email.trim() || null,
        role: editForm.role,
      });
      setEditAdmin(null);
      loadAdmins();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update admin');
    }
  }

  async function handleDelete() {
    if (!deleteAdmin) return;
    setDeleteError(null);
    try {
      await apiClient.delete(`/admins/${deleteAdmin.admin_id}`);
      setDeleteAdmin(null);
      loadAdmins();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete admin');
    }
  }

  async function handleDeactivate() {
    if (!deactivateAdmin) return;
    setDeactivateError(null);
    try {
      await apiClient.patch(`/admins/${deactivateAdmin.admin_id}/deactivate`);
      setDeactivateAdmin(null);
      loadAdmins();
    } catch (err: any) {
      setDeactivateError(err.response?.data?.message || 'Failed to deactivate admin');
    }
  }

  async function handleReactivate() {
    if (!reactivateAdmin) return;
    setReactivateError(null);
    try {
      await apiClient.patch(`/admins/${reactivateAdmin.admin_id}/reactivate`);
      setReactivateAdmin(null);
      loadAdmins();
    } catch (err: any) {
      setReactivateError(err.response?.data?.message || 'Failed to reactivate admin');
    }
  }

  return (
    <div>
      <h1 style={pageTitleStyle}>Manage Admin Accounts</h1>

      <button style={{ ...primaryBtn, marginBottom: 16 }} onClick={() => { setAddForm(emptyAddForm()); setAddError(null); setAddOpen(true); }}>
        + Add New Admin
      </button>

      <div style={tableWrapStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.admin_id}>
                <td style={tdStyle}>{a.username}</td>
                <td style={tdStyle}>{a.email || '-'}</td>
                <td style={tdStyle}>{ROLE_LABELS[a.role] || a.role}</td>
                <td style={tdStyle}><span style={statusPillStyle(a.is_active ? 'ACTIVE' : 'INACTIVE')}>{a.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                <td style={tdStyle}>
                  <button style={linkBtnStyle} onClick={() => openEdit(a)}><IconEdit /> Edit</button>
                  {a.is_active ? (
                    <button style={dangerLinkBtnStyle} onClick={() => { setDeactivateError(null); setDeactivateAdmin(a); }}><IconDeactivate /> Deactivate</button>
                  ) : (
                    <button style={linkBtnStyle} onClick={() => { setReactivateError(null); setReactivateAdmin(a); }}><IconReactivate /> Reactivate</button>
                  )}
                  <button style={dangerLinkBtnStyle} onClick={() => { setDeleteError(null); setDeleteAdmin(a); }}><IconDelete /> Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <Modal title="Add New Admin" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAdd}>
            <label style={labelStyle}>Username</label>
            <input style={inputStyle} value={addForm.username} onChange={(e) => setAddForm({ ...addForm, username: e.target.value })} />
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
            <label style={labelStyle}>Temporary Password</label>
            <input type="password" style={inputStyle} value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} />
            <label style={labelStyle}>Role</label>
            <select style={inputStyle} value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <ModalError>{addError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Add Admin</button>
              <button type="button" style={outlineBtn} onClick={() => setAddOpen(false)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {editAdmin && (
        <Modal title="Edit Admin" onClose={() => setEditAdmin(null)}>
          <form onSubmit={handleEditSave}>
            <label style={labelStyle}>Username</label>
            <input style={inputStyle} value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <label style={labelStyle}>Role</label>
            <select style={inputStyle} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <ModalError>{editError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save Changes</button>
              <button type="button" style={outlineBtn} onClick={() => setEditAdmin(null)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {deleteAdmin && (
        <Modal title="Delete Admin" headerColor={colors.modalRed} onClose={() => setDeleteAdmin(null)}>
          <p style={{ marginTop: 0 }}>Delete "{deleteAdmin.username}"? This cannot be undone.</p>
          <NoteBox>Consider Deactivate instead &mdash; it blocks login while preserving this admin&apos;s history.</NoteBox>
          <ModalError>{deleteError}</ModalError>
          <ModalActions>
            <button style={dangerBtn} onClick={handleDelete}>Delete</button>
            <button style={outlineBtn} onClick={() => setDeleteAdmin(null)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}

      {deactivateAdmin && (
        <Modal title="Deactivate Admin" headerColor={colors.modalAmber} onClose={() => setDeactivateAdmin(null)}>
          <p style={{ marginTop: 0, fontWeight: 700 }}>Deactivate "{deactivateAdmin.username}"?</p>
          <p style={{ color: colors.textMuted, fontSize: 14 }}>
            They will no longer be able to log in.<br />
            Sessions and admin actions they created will be kept for record-keeping.
          </p>
          <ModalError>{deactivateError}</ModalError>
          <ModalActions>
            <button style={amberBtn} onClick={handleDeactivate}>Deactivate</button>
            <button style={outlineBtn} onClick={() => setDeactivateAdmin(null)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}

      {reactivateAdmin && (
        <Modal title="Reactivate Admin" headerColor={colors.modalGreen} onClose={() => setReactivateAdmin(null)}>
          <p style={{ marginTop: 0, fontWeight: 700 }}>Reactivate "{reactivateAdmin.username}"?</p>
          <p style={{ color: colors.textMuted, fontSize: 14 }}>They will be able to log in again with their existing username and password.</p>
          <ModalError>{reactivateError}</ModalError>
          <ModalActions>
            <button style={greenBtn} onClick={handleReactivate}>Reactivate</button>
            <button style={outlineBtn} onClick={() => setReactivateAdmin(null)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}
