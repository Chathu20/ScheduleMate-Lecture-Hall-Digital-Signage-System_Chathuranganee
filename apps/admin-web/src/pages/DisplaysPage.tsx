import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { Modal, NoteBox, ModalActions, ModalError } from '../components/Modal';
import {
  colors, pageTitleStyle, primaryBtn, outlineBtn, dangerBtn, amberBtn, greenBtn, inputStyle, labelStyle,
  tableWrapStyle, thStyle, tdStyle, linkBtnStyle, dangerLinkBtnStyle, statusPillStyle,
} from '../theme';

interface Building { building_id: number; name: string; }
interface Floor { floor_id: number; building_id: number; floor_number: number; }
interface Side { side_id: number; floor_id: number; side_code: string; }
interface Display { display_id: number; device_name: string; side_id: number; status: string; is_active: boolean; }

function emptyForm() { return { device_name: '', building_id: '', floor_id: '', side_id: '' }; }

export function DisplaysPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [sides, setSides] = useState<Side[]>([]);
  const [displays, setDisplays] = useState<Display[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm());
  const [addError, setAddError] = useState<string | null>(null);

  const [editDisplay, setEditDisplay] = useState<Display | null>(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteDisplay, setDeleteDisplay] = useState<Display | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [deactivateDisplay, setDeactivateDisplay] = useState<Display | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const [reactivateDisplay, setReactivateDisplay] = useState<Display | null>(null);
  const [reactivateError, setReactivateError] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [b, f, s, d] = await Promise.all([
      apiClient.get<Building[]>('/buildings'),
      apiClient.get<Floor[]>('/floors'),
      apiClient.get<Side[]>('/sides'),
      apiClient.get<Display[]>('/displays'),
    ]);
    setBuildings(b.data);
    setFloors(f.data);
    setSides(s.data);
    setDisplays(d.data);
  }

  function sideOf(sideId: number) { return sides.find((s) => s.side_id === sideId); }
  function floorOf(floorId: number) { return floors.find((f) => f.floor_id === floorId); }
  function buildingName(id?: number) { return buildings.find((b) => b.building_id === id)?.name || '-'; }

  function displayLocation(display: Display) {
    const side = sideOf(display.side_id);
    const floor = side ? floorOf(side.floor_id) : undefined;
    return { buildingId: floor?.building_id, floorNumber: floor?.floor_number, sideCode: side?.side_code };
  }

  const floorsForAddBuilding = floors.filter((f) => String(f.building_id) === addForm.building_id);
  const sidesForAddFloor = sides.filter((s) => String(s.floor_id) === addForm.floor_id);
  const floorsForEditBuilding = floors.filter((f) => String(f.building_id) === editForm.building_id);
  const sidesForEditFloor = sides.filter((s) => String(s.floor_id) === editForm.floor_id);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addForm.device_name.trim() || !addForm.side_id) {
      setAddError('All fields are required');
      return;
    }
    try {
      await apiClient.post('/displays', { device_name: addForm.device_name.trim(), side_id: Number(addForm.side_id) });
      setAddOpen(false);
      setAddForm(emptyForm());
      loadAll();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to add display');
    }
  }

  function openEdit(display: Display) {
    const loc = displayLocation(display);
    setEditForm({
      device_name: display.device_name,
      building_id: loc.buildingId ? String(loc.buildingId) : '',
      floor_id: sideOf(display.side_id)?.floor_id ? String(sideOf(display.side_id)!.floor_id) : '',
      side_id: String(display.side_id),
    });
    setEditError(null);
    setEditDisplay(display);
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault();
    if (!editDisplay) return;
    setEditError(null);
    try {
      await apiClient.put(`/displays/${editDisplay.display_id}`, {
        device_name: editForm.device_name.trim(),
        side_id: Number(editForm.side_id),
      });
      setEditDisplay(null);
      loadAll();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update display');
    }
  }

  async function handleDelete() {
    if (!deleteDisplay) return;
    setDeleteError(null);
    try {
      await apiClient.delete(`/displays/${deleteDisplay.display_id}`);
      setDeleteDisplay(null);
      loadAll();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete display');
    }
  }

  async function handleDeactivate() {
    if (!deactivateDisplay) return;
    setDeactivateError(null);
    try {
      await apiClient.patch(`/displays/${deactivateDisplay.display_id}/deactivate`);
      setDeactivateDisplay(null);
      loadAll();
    } catch (err: any) {
      setDeactivateError(err.response?.data?.message || 'Failed to deactivate display');
    }
  }

  async function handleReactivate() {
    if (!reactivateDisplay) return;
    setReactivateError(null);
    try {
      await apiClient.patch(`/displays/${reactivateDisplay.display_id}/reactivate`);
      setReactivateDisplay(null);
      loadAll();
    } catch (err: any) {
      setReactivateError(err.response?.data?.message || 'Failed to reactivate display');
    }
  }

  return (
    <div>
      <h1 style={pageTitleStyle}>Display Devices</h1>

      <button style={{ ...primaryBtn, marginBottom: 16 }} onClick={() => { setAddForm(emptyForm()); setAddError(null); setAddOpen(true); }}>
        + Add Display
      </button>

      <div style={tableWrapStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Device Name</th>
              <th style={thStyle}>Building</th>
              <th style={thStyle}>Floor / Side</th>
              <th style={thStyle}>Connection</th>
              <th style={thStyle}>Active</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displays.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted }}>No display devices found</td></tr>
            )}
            {displays.map((d) => {
              const loc = displayLocation(d);
              return (
                <tr key={d.display_id}>
                  <td style={tdStyle}>{d.device_name}</td>
                  <td style={tdStyle}>{buildingName(loc.buildingId)}</td>
                  <td style={tdStyle}>{loc.floorNumber ?? '-'} / {loc.sideCode ?? '-'}</td>
                  <td style={tdStyle}><span style={statusPillStyle(d.status)}>{d.status}</span></td>
                  <td style={tdStyle}><span style={statusPillStyle(d.is_active ? 'ACTIVE' : 'INACTIVE')}>{d.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                  <td style={tdStyle}>
                    <button style={linkBtnStyle} onClick={() => openEdit(d)}>Edit</button>
                    {d.is_active ? (
                      <button style={dangerLinkBtnStyle} onClick={() => { setDeactivateError(null); setDeactivateDisplay(d); }}>Deactivate</button>
                    ) : (
                      <button style={linkBtnStyle} onClick={() => { setReactivateError(null); setReactivateDisplay(d); }}>Reactivate</button>
                    )}
                    <button style={dangerLinkBtnStyle} onClick={() => { setDeleteError(null); setDeleteDisplay(d); }}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <Modal title="Add Display" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAdd}>
            <label style={labelStyle}>Device Name</label>
            <input style={inputStyle} value={addForm.device_name} onChange={(e) => setAddForm({ ...addForm, device_name: e.target.value })} />

            <label style={labelStyle}>Building</label>
            <select style={inputStyle} value={addForm.building_id} onChange={(e) => setAddForm({ ...addForm, building_id: e.target.value, floor_id: '', side_id: '' })}>
              <option value="">Select Building...</option>
              {buildings.map((b) => <option key={b.building_id} value={b.building_id}>{b.name}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Floor</label>
                <select style={inputStyle} value={addForm.floor_id} onChange={(e) => setAddForm({ ...addForm, floor_id: e.target.value, side_id: '' })} disabled={!addForm.building_id}>
                  <option value="">Select Floor...</option>
                  {floorsForAddBuilding.map((f) => <option key={f.floor_id} value={f.floor_id}>{f.floor_number}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Side</label>
                <select style={inputStyle} value={addForm.side_id} onChange={(e) => setAddForm({ ...addForm, side_id: e.target.value })} disabled={!addForm.floor_id}>
                  <option value="">Select Side...</option>
                  {sidesForAddFloor.map((s) => <option key={s.side_id} value={s.side_id}>{s.side_code}</option>)}
                </select>
              </div>
            </div>

            <ModalError>{addError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save</button>
              <button type="button" style={outlineBtn} onClick={() => setAddOpen(false)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {editDisplay && (
        <Modal title="Edit Display" onClose={() => setEditDisplay(null)}>
          <form onSubmit={handleEditSave}>
            <label style={labelStyle}>Device Name</label>
            <input style={inputStyle} value={editForm.device_name} onChange={(e) => setEditForm({ ...editForm, device_name: e.target.value })} />

            <label style={labelStyle}>Building</label>
            <select style={inputStyle} value={editForm.building_id} onChange={(e) => setEditForm({ ...editForm, building_id: e.target.value, floor_id: '', side_id: '' })}>
              {buildings.map((b) => <option key={b.building_id} value={b.building_id}>{b.name}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Floor</label>
                <select style={inputStyle} value={editForm.floor_id} onChange={(e) => setEditForm({ ...editForm, floor_id: e.target.value, side_id: '' })}>
                  {floorsForEditBuilding.map((f) => <option key={f.floor_id} value={f.floor_id}>{f.floor_number}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Side</label>
                <select style={inputStyle} value={editForm.side_id} onChange={(e) => setEditForm({ ...editForm, side_id: e.target.value })}>
                  {sidesForEditFloor.map((s) => <option key={s.side_id} value={s.side_id}>{s.side_code}</option>)}
                </select>
              </div>
            </div>

            <ModalError>{editError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save Changes</button>
              <button type="button" style={outlineBtn} onClick={() => setEditDisplay(null)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {deleteDisplay && (
        <Modal title="Delete Display Device" headerColor={colors.modalRed} onClose={() => setDeleteDisplay(null)}>
          <p style={{ marginTop: 0 }}>Delete "{deleteDisplay.device_name}"? This cannot be undone.</p>
          <NoteBox>
            This side will show no signage screen until a new display device is registered.
          </NoteBox>
          <ModalError>{deleteError}</ModalError>
          <ModalActions>
            <button style={dangerBtn} onClick={handleDelete}>Delete</button>
            <button style={outlineBtn} onClick={() => setDeleteDisplay(null)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}

      {deactivateDisplay && (
        <Modal title="Deactivate Display" headerColor={colors.modalAmber} onClose={() => setDeactivateDisplay(null)}>
          <p style={{ marginTop: 0, fontWeight: 700 }}>Deactivate "{deactivateDisplay.device_name}"?</p>
          <p style={{ color: colors.textMuted, fontSize: 14 }}>
            This side will show no signage screen until it&apos;s reactivated.<br />
            The device configuration is kept, so no need to re-add it later.
          </p>
          <ModalError>{deactivateError}</ModalError>
          <ModalActions>
            <button style={amberBtn} onClick={handleDeactivate}>Deactivate</button>
            <button style={outlineBtn} onClick={() => setDeactivateDisplay(null)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}

      {reactivateDisplay && (
        <Modal title="Reactivate Display" headerColor={colors.modalGreen} onClose={() => setReactivateDisplay(null)}>
          <p style={{ marginTop: 0, fontWeight: 700 }}>Reactivate "{reactivateDisplay.device_name}"?</p>
          <p style={{ color: colors.textMuted, fontSize: 14 }}>It will resume showing the schedule for its assigned side.</p>
          <ModalError>{reactivateError}</ModalError>
          <ModalActions>
            <button style={greenBtn} onClick={handleReactivate}>Reactivate</button>
            <button style={outlineBtn} onClick={() => setReactivateDisplay(null)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}
