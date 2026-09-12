import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { Modal, NoteBox, ModalActions, ModalError } from '../components/Modal';
import { IconEdit, IconDelete } from '../components/icons';
import {
  colors, pageTitleStyle, primaryBtn, outlineBtn, dangerBtn, inputStyle, labelStyle,
  tableWrapStyle, thStyle, tdStyle, linkBtnStyle, dangerLinkBtnStyle,
} from '../theme';

interface Module { module_id: number; module_code: string; module_name: string; }
interface Session { session_id: number; module_id: number; }

export function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addName, setAddName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const [editModule, setEditModule] = useState<Module | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteModule, setDeleteModule] = useState<Module | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [m, s] = await Promise.all([
      apiClient.get<Module[]>('/modules'),
      apiClient.get<Session[]>('/sessions'),
    ]);
    setModules(m.data);
    setSessions(s.data);
  }

  function sessionCount(moduleId: number) {
    return sessions.filter((s) => s.module_id === moduleId).length;
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addCode.trim() || !addName.trim()) {
      setAddError('All fields are required');
      return;
    }
    try {
      await apiClient.post('/modules', { module_code: addCode.trim(), module_name: addName.trim() });
      setAddOpen(false);
      setAddCode('');
      setAddName('');
      loadAll();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to add module');
    }
  }

  function openEdit(mod: Module) {
    setEditModule(mod);
    setEditCode(mod.module_code);
    setEditName(mod.module_name);
    setEditError(null);
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault();
    if (!editModule) return;
    setEditError(null);
    try {
      await apiClient.put(`/modules/${editModule.module_id}`, { module_code: editCode.trim(), module_name: editName.trim() });
      setEditModule(null);
      loadAll();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update module');
    }
  }

  async function handleDelete() {
    if (!deleteModule) return;
    setDeleteError(null);
    try {
      await apiClient.delete(`/modules/${deleteModule.module_id}`);
      setDeleteModule(null);
      loadAll();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete module');
    }
  }

  return (
    <div>
      <h1 style={pageTitleStyle}>Modules</h1>

      <button style={{ ...primaryBtn, marginBottom: 16 }} onClick={() => { setAddCode(''); setAddName(''); setAddError(null); setAddOpen(true); }}>
        + Add Module
      </button>

      <div style={tableWrapStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Module Code</th>
              <th style={thStyle}>Module Name</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {modules.length === 0 && (
              <tr><td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted }}>No modules found</td></tr>
            )}
            {modules.map((m) => (
              <tr key={m.module_id}>
                <td style={tdStyle}>{m.module_code}</td>
                <td style={tdStyle}>{m.module_name}</td>
                <td style={tdStyle}>
                  <button style={linkBtnStyle} onClick={() => openEdit(m)}><IconEdit /> Edit</button>
                  <button style={dangerLinkBtnStyle} onClick={() => { setDeleteError(null); setDeleteModule(m); }}><IconDelete /> Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <Modal title="Add Module" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAdd}>
            <label style={labelStyle}>Module Code</label>
            <input style={inputStyle} value={addCode} onChange={(e) => setAddCode(e.target.value)} />
            <label style={labelStyle}>Module Name</label>
            <input style={inputStyle} value={addName} onChange={(e) => setAddName(e.target.value)} />
            <ModalError>{addError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save</button>
              <button type="button" style={outlineBtn} onClick={() => setAddOpen(false)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {editModule && (
        <Modal title="Edit Module" onClose={() => setEditModule(null)}>
          <form onSubmit={handleEditSave}>
            <label style={labelStyle}>Module Code</label>
            <input style={inputStyle} value={editCode} onChange={(e) => setEditCode(e.target.value)} />
            <label style={labelStyle}>Module Name</label>
            <input style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} />
            <ModalError>{editError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save Changes</button>
              <button type="button" style={outlineBtn} onClick={() => setEditModule(null)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {deleteModule && (
        <Modal title="Delete Module" headerColor={colors.modalRed} onClose={() => setDeleteModule(null)}>
          <p style={{ marginTop: 0 }}>Delete "{deleteModule.module_code} - {deleteModule.module_name}"? This cannot be undone.</p>
          {sessionCount(deleteModule.module_id) > 0 && (
            <NoteBox>
              This module is used in {sessionCount(deleteModule.module_id)} scheduled session(s).<br />
              Deleting it will remove those sessions too.
            </NoteBox>
          )}
          <ModalError>{deleteError}</ModalError>
          <ModalActions>
            <button style={dangerBtn} onClick={handleDelete}>Delete</button>
            <button style={outlineBtn} onClick={() => setDeleteModule(null)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}
