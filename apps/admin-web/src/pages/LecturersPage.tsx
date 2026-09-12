import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { getFloatingNow } from '../lib/time';
import { Modal, NoteBox, ModalActions, ModalError } from '../components/Modal';
import { IconEdit, IconDelete } from '../components/icons';
import {
  colors, pageTitleStyle, primaryBtn, outlineBtn, dangerBtn, inputStyle, labelStyle,
  tableWrapStyle, thStyle, tdStyle, linkBtnStyle, dangerLinkBtnStyle,
} from '../theme';

interface Lecturer { lecturer_id: number; full_name: string; email: string; }
interface Session { session_id: number; lecturer_id: number; status: string; session_date: string; }

export function LecturersPage() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const [editLecturer, setEditLecturer] = useState<Lecturer | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteLecturer, setDeleteLecturer] = useState<Lecturer | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [l, s] = await Promise.all([
      apiClient.get<Lecturer[]>('/lecturers'),
      apiClient.get<Session[]>('/sessions'),
    ]);
    setLecturers(l.data);
    setSessions(s.data);
  }

  function upcomingCount(lecturerId: number) {
    const now = getFloatingNow();
    return sessions.filter((s) =>
      s.lecturer_id === lecturerId &&
      (s.status === 'ACTIVE' || s.status === 'RESCHEDULED') &&
      new Date(s.session_date) >= now
    ).length;
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addName.trim() || !addEmail.trim()) {
      setAddError('All fields are required');
      return;
    }
    try {
      await apiClient.post('/lecturers', { full_name: addName.trim(), email: addEmail.trim() });
      setAddOpen(false);
      setAddName('');
      setAddEmail('');
      loadAll();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to add lecturer');
    }
  }

  function openEdit(lecturer: Lecturer) {
    setEditLecturer(lecturer);
    setEditName(lecturer.full_name);
    setEditEmail(lecturer.email);
    setEditError(null);
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault();
    if (!editLecturer) return;
    setEditError(null);
    try {
      await apiClient.put(`/lecturers/${editLecturer.lecturer_id}`, { full_name: editName.trim(), email: editEmail.trim() });
      setEditLecturer(null);
      loadAll();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update lecturer');
    }
  }

  async function handleDelete() {
    if (!deleteLecturer) return;
    setDeleteError(null);
    try {
      await apiClient.delete(`/lecturers/${deleteLecturer.lecturer_id}`);
      setDeleteLecturer(null);
      loadAll();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete lecturer');
    }
  }

  return (
    <div>
      <h1 style={pageTitleStyle}>Lecturers</h1>

      <button style={{ ...primaryBtn, marginBottom: 16 }} onClick={() => { setAddName(''); setAddEmail(''); setAddError(null); setAddOpen(true); }}>
        + Add Lecturer
      </button>

      <div style={tableWrapStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Full Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lecturers.length === 0 && (
              <tr><td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted }}>No lecturers found</td></tr>
            )}
            {lecturers.map((l) => (
              <tr key={l.lecturer_id}>
                <td style={tdStyle}>{l.full_name}</td>
                <td style={tdStyle}>{l.email}</td>
                <td style={tdStyle}>
                  <button style={linkBtnStyle} onClick={() => openEdit(l)}><IconEdit /> Edit</button>
                  <button style={dangerLinkBtnStyle} onClick={() => { setDeleteError(null); setDeleteLecturer(l); }}><IconDelete /> Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <Modal title="Add Lecturer" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAdd}>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} value={addName} onChange={(e) => setAddName(e.target.value)} />
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
            <ModalError>{addError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save</button>
              <button type="button" style={outlineBtn} onClick={() => setAddOpen(false)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {editLecturer && (
        <Modal title="Edit Lecturer" onClose={() => setEditLecturer(null)}>
          <form onSubmit={handleEditSave}>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} />
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            <ModalError>{editError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save Changes</button>
              <button type="button" style={outlineBtn} onClick={() => setEditLecturer(null)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {deleteLecturer && (
        <Modal title="Delete Lecturer" headerColor={colors.modalRed} onClose={() => setDeleteLecturer(null)}>
          <p style={{ marginTop: 0 }}>Delete "{deleteLecturer.full_name}"? This cannot be undone.</p>
          {upcomingCount(deleteLecturer.lecturer_id) > 0 && (
            <NoteBox>
              This lecturer is assigned to {upcomingCount(deleteLecturer.lecturer_id)} upcoming session(s).<br />
              Reassign or cancel those sessions before deleting.
            </NoteBox>
          )}
          <ModalError>{deleteError}</ModalError>
          <ModalActions>
            <button style={dangerBtn} onClick={handleDelete}>Delete</button>
            <button style={outlineBtn} onClick={() => setDeleteLecturer(null)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}
