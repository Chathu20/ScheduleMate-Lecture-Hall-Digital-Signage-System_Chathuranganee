import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { Modal, NoteBox, ModalActions, ModalError } from '../components/Modal';
import {
  colors, pageTitleStyle, primaryBtn, outlineBtn, dangerBtn, inputStyle, labelStyle,
  tableWrapStyle, thStyle, tdStyle, filterBarStyle, selectStyle, linkBtnStyle, dangerLinkBtnStyle,
} from '../theme';

interface Building { building_id: number; name: string; }
interface Floor { floor_id: number; building_id: number; floor_number: number; }
interface Side { side_id: number; floor_id: number; side_code: string; }
interface Room { room_id: number; side_id: number; room_code: string; capacity: number; room_type: string; }
interface Session { session_id: number; room_id: number; session_date: string; status: string; }

const ROOM_TYPES = ['Lecture', 'Lab', 'Large Hall'];

function emptyRoomForm() {
  return { building_id: '', floor_id: '', side_id: '', room_code: '', capacity: '', room_type: '' };
}

export function CampusStructurePage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [sides, setSides] = useState<Side[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterSide, setFilterSide] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyRoomForm());
  const [addError, setAddError] = useState<string | null>(null);

  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [editForm, setEditForm] = useState(emptyRoomForm());
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [b, f, s, r, se] = await Promise.all([
      apiClient.get<Building[]>('/buildings'),
      apiClient.get<Floor[]>('/floors'),
      apiClient.get<Side[]>('/sides'),
      apiClient.get<Room[]>('/rooms'),
      apiClient.get<Session[]>('/sessions'),
    ]);
    setBuildings(b.data);
    setFloors(f.data);
    setSides(s.data);
    setRooms(r.data);
    setSessions(se.data);
  }

  function buildingName(buildingId: number) {
    return buildings.find((b) => b.building_id === buildingId)?.name || '-';
  }
  function sideOf(sideId: number) { return sides.find((s) => s.side_id === sideId); }
  function floorOf(floorId: number) { return floors.find((f) => f.floor_id === floorId); }

  function roomLocation(room: Room) {
    const side = sideOf(room.side_id);
    const floor = side ? floorOf(side.floor_id) : undefined;
    return {
      buildingId: floor?.building_id,
      floorNumber: floor?.floor_number,
      sideCode: side?.side_code,
    };
  }

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const loc = roomLocation(room);
      if (filterBuilding && String(loc.buildingId) !== filterBuilding) return false;
      if (filterFloor && String(loc.floorNumber) !== filterFloor) return false;
      if (filterSide && loc.sideCode !== filterSide) return false;
      return true;
    });
  }, [rooms, sides, floors, filterBuilding, filterFloor, filterSide]);

  const floorsForFilterBuilding = floors.filter((f) => !filterBuilding || String(f.building_id) === filterBuilding);
  const sidesForFilterFloor = sides.filter((s) => {
    if (!filterFloor) return true;
    const f = floorOf(s.floor_id);
    return f && String(f.floor_number) === filterFloor;
  });

  // --- Add Room form cascading dropdowns ---
  const floorsForAddBuilding = floors.filter((f) => String(f.building_id) === addForm.building_id);
  const sidesForAddFloor = sides.filter((s) => String(s.floor_id) === addForm.floor_id);
  const floorsForEditBuilding = floors.filter((f) => String(f.building_id) === editForm.building_id);
  const sidesForEditFloor = sides.filter((s) => String(s.floor_id) === editForm.floor_id);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addForm.side_id || !addForm.room_code.trim() || !addForm.capacity || !addForm.room_type) {
      setAddError('All fields are required');
      return;
    }
    try {
      await apiClient.post('/rooms', {
        side_id: Number(addForm.side_id),
        room_code: addForm.room_code.trim(),
        capacity: Number(addForm.capacity),
        room_type: addForm.room_type,
      });
      setAddOpen(false);
      setAddForm(emptyRoomForm());
      loadAll();
    } catch (err: any) {
      setAddError(err.response?.data?.message || 'Failed to add room');
    }
  }

  function openEdit(room: Room) {
    const loc = roomLocation(room);
    setEditForm({
      building_id: loc.buildingId ? String(loc.buildingId) : '',
      floor_id: sideOf(room.side_id)?.floor_id ? String(sideOf(room.side_id)!.floor_id) : '',
      side_id: String(room.side_id),
      room_code: room.room_code,
      capacity: String(room.capacity),
      room_type: room.room_type,
    });
    setEditError(null);
    setEditRoom(room);
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault();
    if (!editRoom) return;
    setEditError(null);
    try {
      await apiClient.put(`/rooms/${editRoom.room_id}`, {
        room_code: editForm.room_code.trim(),
        capacity: Number(editForm.capacity),
        room_type: editForm.room_type,
      });
      setEditRoom(null);
      loadAll();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update room');
    }
  }

  function upcomingSessionCount(roomId: number) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return sessions.filter((s) => {
      if (s.room_id !== roomId) return false;
      if (s.status !== 'ACTIVE' && s.status !== 'RESCHEDULED') return false;
      const d = new Date(s.session_date);
      return d >= now && d <= in30;
    }).length;
  }

  async function handleDelete() {
    if (!deleteRoom) return;
    setDeleteError(null);
    try {
      await apiClient.delete(`/rooms/${deleteRoom.room_id}`);
      setDeleteRoom(null);
      loadAll();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete room');
    }
  }

  return (
    <div>
      <h1 style={pageTitleStyle}>Building &amp; Rooms</h1>

      <div style={filterBarStyle}>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted }}>Filter</span>
        <select style={selectStyle} value={filterBuilding} onChange={(e) => { setFilterBuilding(e.target.value); setFilterFloor(''); setFilterSide(''); }}>
          <option value="">Building</option>
          {buildings.map((b) => <option key={b.building_id} value={b.building_id}>{b.name}</option>)}
        </select>
        <select style={selectStyle} value={filterFloor} onChange={(e) => { setFilterFloor(e.target.value); setFilterSide(''); }}>
          <option value="">Floor</option>
          {[...new Set(floorsForFilterBuilding.map((f) => f.floor_number))].map((fn) => <option key={fn} value={fn}>Floor {fn}</option>)}
        </select>
        <select style={selectStyle} value={filterSide} onChange={(e) => setFilterSide(e.target.value)}>
          <option value="">Side</option>
          {[...new Set(sidesForFilterFloor.map((s) => s.side_code))].map((sc) => <option key={sc} value={sc}>Side {sc}</option>)}
        </select>
      </div>

      <button style={{ ...primaryBtn, marginBottom: 16 }} onClick={() => { setAddForm(emptyRoomForm()); setAddError(null); setAddOpen(true); }}>
        + Add Room
      </button>

      <div style={tableWrapStyle}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, fontWeight: 700, fontSize: 16 }}>
          Rooms &amp; Labs
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Room</th>
                <th style={thStyle}>Building</th>
                <th style={thStyle}>Floor / Side</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Capacity</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.length === 0 && (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted }}>No rooms found</td></tr>
              )}
              {filteredRooms.map((room) => {
                const loc = roomLocation(room);
                return (
                  <tr key={room.room_id}>
                    <td style={tdStyle}>{room.room_code}</td>
                    <td style={tdStyle}>{loc.buildingId ? buildingName(loc.buildingId) : '-'}</td>
                    <td style={tdStyle}>{loc.floorNumber ?? '-'} / {loc.sideCode ?? '-'}</td>
                    <td style={tdStyle}>{room.room_type}</td>
                    <td style={tdStyle}>{room.capacity}</td>
                    <td style={tdStyle}>
                      <button style={linkBtnStyle} onClick={() => openEdit(room)}>Edit</button>
                      <button style={dangerLinkBtnStyle} onClick={() => { setDeleteError(null); setDeleteRoom(room); }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <Modal title="Add Room" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAdd}>
            <label style={labelStyle}>Building</label>
            <select
              style={{ ...inputStyle }}
              value={addForm.building_id}
              onChange={(e) => setAddForm({ ...addForm, building_id: e.target.value, floor_id: '', side_id: '' })}
            >
              <option value="">Select Building...</option>
              {buildings.map((b) => <option key={b.building_id} value={b.building_id}>{b.name}</option>)}
            </select>

            <label style={labelStyle}>Floor</label>
            <select
              style={{ ...inputStyle }}
              value={addForm.floor_id}
              onChange={(e) => setAddForm({ ...addForm, floor_id: e.target.value, side_id: '' })}
              disabled={!addForm.building_id}
            >
              <option value="">Select Floor...</option>
              {floorsForAddBuilding.map((f) => <option key={f.floor_id} value={f.floor_id}>Floor {f.floor_number}</option>)}
            </select>

            <label style={labelStyle}>Side</label>
            <select
              style={{ ...inputStyle }}
              value={addForm.side_id}
              onChange={(e) => setAddForm({ ...addForm, side_id: e.target.value })}
              disabled={!addForm.floor_id}
            >
              <option value="">Select Side...</option>
              {sidesForAddFloor.map((s) => <option key={s.side_id} value={s.side_id}>{s.side_code} Side</option>)}
            </select>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Room Code</label>
                <input style={inputStyle} value={addForm.room_code} onChange={(e) => setAddForm({ ...addForm, room_code: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Capacity</label>
                <input type="number" style={inputStyle} value={addForm.capacity} onChange={(e) => setAddForm({ ...addForm, capacity: e.target.value })} />
              </div>
            </div>

            <label style={labelStyle}>Room Type</label>
            <select style={inputStyle} value={addForm.room_type} onChange={(e) => setAddForm({ ...addForm, room_type: e.target.value })}>
              <option value="">Select Room Type...</option>
              {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <ModalError>{addError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save</button>
              <button type="button" style={outlineBtn} onClick={() => setAddOpen(false)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {editRoom && (
        <Modal title="Edit Room" onClose={() => setEditRoom(null)}>
          <form onSubmit={handleEditSave}>
            <label style={labelStyle}>Building</label>
            <select style={inputStyle} value={editForm.building_id} onChange={(e) => setEditForm({ ...editForm, building_id: e.target.value, floor_id: '', side_id: '' })}>
              {buildings.map((b) => <option key={b.building_id} value={b.building_id}>{b.name}</option>)}
            </select>

            <label style={labelStyle}>Floor</label>
            <select style={inputStyle} value={editForm.floor_id} onChange={(e) => setEditForm({ ...editForm, floor_id: e.target.value, side_id: '' })}>
              {floorsForEditBuilding.map((f) => <option key={f.floor_id} value={f.floor_id}>Floor {f.floor_number}</option>)}
            </select>

            <label style={labelStyle}>Side</label>
            <select style={inputStyle} value={editForm.side_id} onChange={(e) => setEditForm({ ...editForm, side_id: e.target.value })}>
              {sidesForEditFloor.map((s) => <option key={s.side_id} value={s.side_id}>{s.side_code} Side</option>)}
            </select>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Room Code</label>
                <input style={inputStyle} value={editForm.room_code} onChange={(e) => setEditForm({ ...editForm, room_code: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Capacity</label>
                <input type="number" style={inputStyle} value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })} />
              </div>
            </div>

            <label style={labelStyle}>Room Type</label>
            <select style={inputStyle} value={editForm.room_type} onChange={(e) => setEditForm({ ...editForm, room_type: e.target.value })}>
              {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <ModalError>{editError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save Changes</button>
              <button type="button" style={outlineBtn} onClick={() => setEditRoom(null)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {deleteRoom && (
        <Modal title="Delete Room" headerColor={colors.modalRed} onClose={() => setDeleteRoom(null)}>
          <p style={{ marginTop: 0 }}>Delete "{deleteRoom.room_code}"? This cannot be undone.</p>
          {upcomingSessionCount(deleteRoom.room_id) > 0 && (
            <NoteBox>
              This room has {upcomingSessionCount(deleteRoom.room_id)} session(s) scheduled in the next 30 days.<br />
              Deleting it will also remove those sessions.
            </NoteBox>
          )}
          <ModalError>{deleteError}</ModalError>
          <ModalActions>
            <button style={dangerBtn} onClick={handleDelete}>Delete</button>
            <button style={outlineBtn} onClick={() => setDeleteRoom(null)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}
