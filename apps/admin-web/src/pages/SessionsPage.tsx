import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import apiClient from '../lib/apiClient';
import { getFloatingNow } from '../lib/time';
import { Modal, NoteBox, ModalActions, ModalError } from '../components/Modal';
import { IconEdit, IconDelete, IconCancel, IconReschedule } from '../components/icons';
import {
  colors, pageTitleStyle, primaryBtn, outlineBtn, dangerBtn, inputStyle, labelStyle,
  tableWrapStyle, thStyle, tdStyle, filterBarStyle, selectStyle, linkBtnStyle, dangerLinkBtnStyle,
  statusPillStyle,
} from '../theme';

interface Building { building_id: number; name: string; }
interface Floor { floor_id: number; building_id: number; floor_number: number; }
interface Side { side_id: number; floor_id: number; side_code: string; }
interface Room { room_id: number; side_id: number; room_code: string; }
interface ModuleItem { module_id: number; module_code: string; module_name: string; }
interface Lecturer { lecturer_id: number; full_name: string; }

interface SessionChange {
  change_id: number;
  change_type: string;
  reason?: string | null;
  new_date?: string | null;
  new_start_time?: string | null;
  new_end_time?: string | null;
  new_room_id?: number | null;
  changed_at: string;
}

interface Session {
  session_id: number;
  room_id: number;
  module_id: number;
  lecturer_id: number;
  session_date: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  status: string;
  session_type: string;
  recurrence_group_id?: string | null;
  room: { room_id: number; room_code: string; side_id: number; side?: { floor_id: number; side_code: string; floor?: { building_id: number; floor_number: number } } };
  module: { module_name: string };
  lecturer: { full_name: string };
  changes: SessionChange[];
}

interface ConflictInfo { module: string; lecturer: string; room: string; start_time: string; end_time: string; }

function effectiveSlot(session: Session) {
  if (session.status === 'RESCHEDULED') {
    const latest = session.changes.find((c) => c.change_type === 'RESCHEDULE');
    if (latest && latest.new_date && latest.new_start_time && latest.new_end_time) {
      return {
        room_id: latest.new_room_id ?? session.room_id,
        session_date: latest.new_date,
        start_time: latest.new_start_time,
        end_time: latest.new_end_time,
      };
    }
  }
  return { room_id: session.room_id, session_date: session.session_date, start_time: session.start_time, end_time: session.end_time };
}

function effectiveStatusLabel(session: Session) {
  if (session.status === 'CANCELLED') return 'CANCELLED';
  const now = getFloatingNow();
  const eff = effectiveSlot(session);
  const start = new Date(eff.start_time);
  const end = new Date(eff.end_time);
  const base = session.status === 'RESCHEDULED' ? 'RESCHEDULED' : null;
  if (start <= now && now < end) return base ? 'RESCHEDULED' : 'ONGOING';
  if (start > now) return base ? 'RESCHEDULED' : 'UPCOMING';
  return base ? 'RESCHEDULED' : 'COMPLETED';
}

function isOngoingNow(session: Session) {
  if (session.status === 'CANCELLED') return false;
  const now = getFloatingNow();
  const eff = effectiveSlot(session);
  return new Date(eff.start_time) <= now && now < new Date(eff.end_time);
}

// Session times are stored as UTC-stamped wall-clock values (see backend's
// Date.UTC-based "today" boundaries), so display must stay pinned to UTC
// rather than the viewer's local timezone, or times would drift per-browser.
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', timeZone: 'UTC' });
}
function toDateInput(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
function toTimeInput(iso: string) {
  return new Date(iso).toISOString().slice(11, 16);
}

function emptySessionForm() {
  return { building_id: '', side_id: '', room_id: '', module_id: '', lecturer_id: '', session_type: 'LECTURE', date: '', start: '', end: '', repeat_weekly: false };
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [sides, setSides] = useState<Side[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);

  const [filterDate, setFilterDate] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterSide, setFilterSide] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptySessionForm());
  const [createError, setCreateError] = useState<string | null>(null);
  const [createConflict, setCreateConflict] = useState<ConflictInfo | null>(null);

  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editForm, setEditForm] = useState(emptySessionForm());
  const [editError, setEditError] = useState<string | null>(null);
  const [editConflict, setEditConflict] = useState<ConflictInfo | null>(null);

  const [rescheduleSession, setRescheduleSession] = useState<Session | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ room_id: '', date: '', start: '', end: '' });
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleConflict, setRescheduleConflict] = useState<ConflictInfo | null>(null);

  const [cancelSession, setCancelSession] = useState<Session | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [deleteSession, setDeleteSession] = useState<Session | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [deleteRecurring, setDeleteRecurring] = useState<Session | null>(null);
  const [deleteRecurringError, setDeleteRecurringError] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [se, b, f, s, r, m, l] = await Promise.all([
      apiClient.get<Session[]>('/sessions'),
      apiClient.get<Building[]>('/buildings'),
      apiClient.get<Floor[]>('/floors'),
      apiClient.get<Side[]>('/sides'),
      apiClient.get<Room[]>('/rooms'),
      apiClient.get<ModuleItem[]>('/modules'),
      apiClient.get<Lecturer[]>('/lecturers'),
    ]);
    setSessions(se.data);
    setBuildings(b.data);
    setFloors(f.data);
    setSides(s.data);
    setRooms(r.data);
    setModules(m.data);
    setLecturers(l.data);
  }

  function sideLabel(sideId: number) {
    const side = sides.find((s) => s.side_id === sideId);
    const floor = side ? floors.find((f) => f.floor_id === side.floor_id) : undefined;
    return side && floor ? `${floor.floor_number} - ${side.side_code} Side` : '-';
  }

  const floorsForFilterBuilding = floors.filter((f) => !filterBuilding || String(f.building_id) === filterBuilding);
  const sidesForFilterBuilding = sides.filter((s) => floorsForFilterBuilding.some((f) => f.floor_id === s.floor_id));

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const eff = effectiveSlot(session);
      if (filterDate && toDateInput(eff.session_date) !== filterDate) return false;
      if (filterBuilding || filterSide) {
        const room = rooms.find((r) => r.room_id === eff.room_id);
        if (!room) return false;
        const side = sides.find((s) => s.side_id === room.side_id);
        if (!side) return false;
        const floor = floors.find((f) => f.floor_id === side.floor_id);
        if (filterBuilding && (!floor || String(floor.building_id) !== filterBuilding)) return false;
        if (filterSide && String(side.side_id) !== filterSide) return false;
      }
      return true;
    });
  }, [sessions, rooms, sides, floors, filterDate, filterBuilding, filterSide]);

  // --- Create form cascading ---
  const floorsForCreateBuilding = floors.filter((f) => String(f.building_id) === createForm.building_id);
  const sidesForCreateBuilding = sides.filter((s) => floorsForCreateBuilding.some((f) => f.floor_id === s.floor_id));
  const roomsForCreateSide = rooms.filter((r) => String(r.side_id) === createForm.side_id);

  const floorsForEditBuilding = floors.filter((f) => String(f.building_id) === editForm.building_id);
  const sidesForEditBuilding = sides.filter((s) => floorsForEditBuilding.some((f) => f.floor_id === s.floor_id));
  const roomsForEditSide = rooms.filter((r) => String(r.side_id) === editForm.side_id);

  function buildingIdOfSide(sideId: number) {
    const side = sides.find((s) => s.side_id === sideId);
    const floor = side ? floors.find((f) => f.floor_id === side.floor_id) : undefined;
    return floor?.building_id;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateConflict(null);
    const { room_id, module_id, lecturer_id, session_type, date, start, end } = createForm;
    if (!room_id || !module_id || !lecturer_id || !session_type || !date || !start || !end) {
      setCreateError('All fields are required');
      return;
    }
    try {
      await apiClient.post('/sessions', {
        room_id: Number(room_id),
        module_id: Number(module_id),
        lecturer_id: Number(lecturer_id),
        session_date: new Date(date).toISOString(),
        start_time: new Date(`${date}T${start}:00Z`).toISOString(),
        end_time: new Date(`${date}T${end}:00Z`).toISOString(),
        session_type,
        repeat_weekly: createForm.repeat_weekly,
      });
      setCreateOpen(false);
      setCreateForm(emptySessionForm());
      loadAll();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create session');
      if (err.response?.data?.conflictingSession) setCreateConflict(err.response.data.conflictingSession);
    }
  }

  function openEdit(session: Session) {
    const eff = effectiveSlot(session);
    const buildingId = buildingIdOfSide(rooms.find((r) => r.room_id === eff.room_id)?.side_id ?? session.room.side_id);
    setEditForm({
      building_id: buildingId ? String(buildingId) : '',
      side_id: String(rooms.find((r) => r.room_id === eff.room_id)?.side_id ?? session.room.side_id),
      room_id: String(eff.room_id),
      module_id: String(session.module_id),
      lecturer_id: String(session.lecturer_id),
      session_type: session.session_type,
      date: toDateInput(eff.session_date),
      start: toTimeInput(eff.start_time),
      end: toTimeInput(eff.end_time),
      repeat_weekly: false,
    });
    setEditError(null);
    setEditConflict(null);
    setEditSession(session);
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault();
    if (!editSession) return;
    setEditError(null);
    setEditConflict(null);
    try {
      await apiClient.put(`/sessions/${editSession.session_id}`, {
        room_id: Number(editForm.room_id),
        module_id: Number(editForm.module_id),
        lecturer_id: Number(editForm.lecturer_id),
        session_date: new Date(editForm.date).toISOString(),
        start_time: new Date(`${editForm.date}T${editForm.start}:00Z`).toISOString(),
        end_time: new Date(`${editForm.date}T${editForm.end}:00Z`).toISOString(),
        session_type: editForm.session_type,
      });
      setEditSession(null);
      loadAll();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update session');
      if (err.response?.data?.conflictingSession) setEditConflict(err.response.data.conflictingSession);
    }
  }

  function openReschedule(session: Session) {
    const eff = effectiveSlot(session);
    setRescheduleForm({ room_id: String(eff.room_id), date: toDateInput(eff.session_date), start: toTimeInput(eff.start_time), end: toTimeInput(eff.end_time) });
    setRescheduleError(null);
    setRescheduleConflict(null);
    setRescheduleSession(session);
  }

  async function handleReschedule(e: FormEvent) {
    e.preventDefault();
    if (!rescheduleSession) return;
    setRescheduleError(null);
    setRescheduleConflict(null);
    try {
      await apiClient.patch(`/sessions/${rescheduleSession.session_id}/reschedule`, {
        new_room_id: Number(rescheduleForm.room_id),
        new_date: new Date(rescheduleForm.date).toISOString(),
        new_start_time: new Date(`${rescheduleForm.date}T${rescheduleForm.start}:00Z`).toISOString(),
        new_end_time: new Date(`${rescheduleForm.date}T${rescheduleForm.end}:00Z`).toISOString(),
      });
      setRescheduleSession(null);
      loadAll();
    } catch (err: any) {
      setRescheduleError(err.response?.data?.message || 'Failed to reschedule session');
      if (err.response?.data?.conflictingSession) setRescheduleConflict(err.response.data.conflictingSession);
    }
  }

  async function handleCancelConfirm() {
    if (!cancelSession) return;
    setCancelError(null);
    try {
      await apiClient.patch(`/sessions/${cancelSession.session_id}/cancel`, { reason: cancelReason || undefined });
      setCancelSession(null);
      setCancelReason('');
      loadAll();
    } catch (err: any) {
      setCancelError(err.response?.data?.message || 'Failed to cancel session');
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteSession) return;
    setDeleteError(null);
    try {
      await apiClient.delete(`/sessions/${deleteSession.session_id}`);
      setDeleteSession(null);
      loadAll();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete session');
    }
  }

  function futureRecurringCount(session: Session) {
    if (!session.recurrence_group_id) return 0;
    const now = getFloatingNow();
    return sessions.filter((s) => s.recurrence_group_id === session.recurrence_group_id && new Date(s.session_date) >= now).length;
  }

  async function handleDeleteRecurringConfirm() {
    if (!deleteRecurring || !deleteRecurring.recurrence_group_id) return;
    setDeleteRecurringError(null);
    try {
      await apiClient.delete(`/sessions/recurring/${deleteRecurring.recurrence_group_id}`);
      setDeleteRecurring(null);
      loadAll();
    } catch (err: any) {
      setDeleteRecurringError(err.response?.data?.message || 'Failed to delete recurring schedule');
    }
  }

  function ConflictNote({ conflict }: { conflict: ConflictInfo | null }) {
    if (!conflict) return null;
    return (
      <NoteBox kind="danger">
        Conflicts with: {conflict.module} ({conflict.lecturer}), Room {conflict.room},{' '}
        {fmtTime(conflict.start_time)} - {fmtTime(conflict.end_time)}
      </NoteBox>
    );
  }

  return (
    <div>
      <h1 style={pageTitleStyle}>Schedule</h1>

      <div style={filterBarStyle}>
        <input type="date" style={selectStyle} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        <select style={selectStyle} value={filterBuilding} onChange={(e) => { setFilterBuilding(e.target.value); setFilterSide(''); }}>
          <option value="">Building</option>
          {buildings.map((b) => <option key={b.building_id} value={b.building_id}>{b.name}</option>)}
        </select>
        <select style={selectStyle} value={filterSide} onChange={(e) => setFilterSide(e.target.value)}>
          <option value="">Floor / Side</option>
          {sidesForFilterBuilding.map((s) => <option key={s.side_id} value={s.side_id}>{sideLabel(s.side_id)}</option>)}
        </select>
        <button
          style={{ ...primaryBtn, marginLeft: 'auto' }}
          onClick={() => { setCreateForm(emptySessionForm()); setCreateError(null); setCreateConflict(null); setCreateOpen(true); }}
        >
          + Add Session
        </button>
      </div>

      <div style={tableWrapStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Room</th>
                <th style={thStyle}>Module</th>
                <th style={thStyle}>Lecturer</th>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 && (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: colors.textMuted }}>No sessions found</td></tr>
              )}
              {filteredSessions.map((session) => {
                const eff = effectiveSlot(session);
                const room = rooms.find((r) => r.room_id === eff.room_id);
                const statusLabel = effectiveStatusLabel(session);
                const ongoing = isOngoingNow(session);
                const canEditCancel = session.status === 'ACTIVE' && !ongoing;
                const canReschedule = !ongoing;
                const canDeleteSession = !ongoing;
                const canDeleteRecurring = !!session.recurrence_group_id;

                return (
                  <tr key={session.session_id}>
                    <td style={tdStyle}>{fmtDate(eff.session_date)}</td>
                    <td style={tdStyle}>{room?.room_code || session.room.room_code}</td>
                    <td style={tdStyle}>{session.module.module_name}</td>
                    <td style={tdStyle}>{session.lecturer.full_name}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtTime(eff.start_time)} - {fmtTime(eff.end_time)}</td>
                    <td style={tdStyle}><span style={statusPillStyle(statusLabel)}>{statusLabel}</span></td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      {canEditCancel && <button style={linkBtnStyle} onClick={() => openEdit(session)}><IconEdit /> Edit</button>}
                      {canReschedule && <button style={linkBtnStyle} onClick={() => openReschedule(session)}><IconReschedule /> Reschedule</button>}
                      {canEditCancel && <button style={linkBtnStyle} onClick={() => { setCancelError(null); setCancelReason(''); setCancelSession(session); }}><IconCancel /> Cancel</button>}
                      {canDeleteSession && <button style={dangerLinkBtnStyle} onClick={() => { setDeleteError(null); setDeleteSession(session); }}><IconDelete /> Delete Session</button>}
                      {canDeleteRecurring && <button style={dangerLinkBtnStyle} onClick={() => { setDeleteRecurringError(null); setDeleteRecurring(session); }}><IconDelete /> Delete Recurring Schedule</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <Modal title="Create Session" width={620} onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Building</label>
                <select style={inputStyle} value={createForm.building_id} onChange={(e) => setCreateForm({ ...createForm, building_id: e.target.value, side_id: '', room_id: '' })}>
                  <option value="">Select building...</option>
                  {buildings.map((b) => <option key={b.building_id} value={b.building_id}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Floor / Side</label>
                <select style={inputStyle} value={createForm.side_id} onChange={(e) => setCreateForm({ ...createForm, side_id: e.target.value, room_id: '' })} disabled={!createForm.building_id}>
                  <option value="">Select floor &amp; side...</option>
                  {sidesForCreateBuilding.map((s) => <option key={s.side_id} value={s.side_id}>{sideLabel(s.side_id)}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Room</label>
                <select style={inputStyle} value={createForm.room_id} onChange={(e) => setCreateForm({ ...createForm, room_id: e.target.value })} disabled={!createForm.side_id}>
                  <option value="">Select room...</option>
                  {roomsForCreateSide.map((r) => <option key={r.room_id} value={r.room_id}>{r.room_code}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Module</label>
                <select style={inputStyle} value={createForm.module_id} onChange={(e) => setCreateForm({ ...createForm, module_id: e.target.value })}>
                  <option value="">Select module...</option>
                  {modules.map((m) => <option key={m.module_id} value={m.module_id}>{m.module_code} - {m.module_name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Lecturer</label>
                <select style={inputStyle} value={createForm.lecturer_id} onChange={(e) => setCreateForm({ ...createForm, lecturer_id: e.target.value })}>
                  <option value="">Select lecturer...</option>
                  {lecturers.map((l) => <option key={l.lecturer_id} value={l.lecturer_id}>{l.full_name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Session Type</label>
                <select style={inputStyle} value={createForm.session_type} onChange={(e) => setCreateForm({ ...createForm, session_type: e.target.value })}>
                  <option value="LECTURE">Lecture</option>
                  <option value="LAB">Lab</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Date</label>
                <input type="date" style={inputStyle} value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Start Time</label>
                <input type="time" style={inputStyle} value={createForm.start} onChange={(e) => setCreateForm({ ...createForm, start: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>End Time</label>
                <input type="time" style={inputStyle} value={createForm.end} onChange={(e) => setCreateForm({ ...createForm, end: e.target.value })} />
              </div>
            </div>

            <ConflictNote conflict={createConflict} />
            <ModalError>{createError}</ModalError>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, margin: '4px 0 14px' }}>
              <input type="checkbox" checked={createForm.repeat_weekly} onChange={(e) => setCreateForm({ ...createForm, repeat_weekly: e.target.checked })} />
              Repeat weekly on this day
            </label>

            <ModalActions>
              <button type="submit" style={primaryBtn}>Save Session</button>
              <button type="button" style={outlineBtn} onClick={() => setCreateOpen(false)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {editSession && (
        <Modal title="Edit Session" width={620} onClose={() => setEditSession(null)}>
          <form onSubmit={handleEditSave}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Building</label>
                <select style={inputStyle} value={editForm.building_id} onChange={(e) => setEditForm({ ...editForm, building_id: e.target.value, side_id: '', room_id: '' })}>
                  {buildings.map((b) => <option key={b.building_id} value={b.building_id}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Floor / Side</label>
                <select style={inputStyle} value={editForm.side_id} onChange={(e) => setEditForm({ ...editForm, side_id: e.target.value, room_id: '' })}>
                  {sidesForEditBuilding.map((s) => <option key={s.side_id} value={s.side_id}>{sideLabel(s.side_id)}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Room</label>
                <select style={inputStyle} value={editForm.room_id} onChange={(e) => setEditForm({ ...editForm, room_id: e.target.value })}>
                  {roomsForEditSide.map((r) => <option key={r.room_id} value={r.room_id}>{r.room_code}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Module</label>
                <select style={inputStyle} value={editForm.module_id} onChange={(e) => setEditForm({ ...editForm, module_id: e.target.value })}>
                  {modules.map((m) => <option key={m.module_id} value={m.module_id}>{m.module_code} - {m.module_name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Lecturer</label>
                <select style={inputStyle} value={editForm.lecturer_id} onChange={(e) => setEditForm({ ...editForm, lecturer_id: e.target.value })}>
                  {lecturers.map((l) => <option key={l.lecturer_id} value={l.lecturer_id}>{l.full_name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Session Type</label>
                <select style={inputStyle} value={editForm.session_type} onChange={(e) => setEditForm({ ...editForm, session_type: e.target.value })}>
                  <option value="LECTURE">Lecture</option>
                  <option value="LAB">Lab</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Date</label>
                <input type="date" style={inputStyle} value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Start Time</label>
                <input type="time" style={inputStyle} value={editForm.start} onChange={(e) => setEditForm({ ...editForm, start: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>End Time</label>
                <input type="time" style={inputStyle} value={editForm.end} onChange={(e) => setEditForm({ ...editForm, end: e.target.value })} />
              </div>
            </div>

            <ConflictNote conflict={editConflict} />
            <ModalError>{editError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save Changes</button>
              <button type="button" style={outlineBtn} onClick={() => setEditSession(null)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {rescheduleSession && (
        <Modal title="Reschedule Session" onClose={() => setRescheduleSession(null)}>
          <form onSubmit={handleReschedule}>
            <p style={{ marginTop: 0, color: colors.textMuted, fontSize: 13 }}>
              Current: Room {rescheduleSession.room.room_code}, {fmtDate(effectiveSlot(rescheduleSession).session_date)},{' '}
              {fmtTime(effectiveSlot(rescheduleSession).start_time)} - {fmtTime(effectiveSlot(rescheduleSession).end_time)}
            </p>

            <label style={labelStyle}>New Room</label>
            <select style={inputStyle} value={rescheduleForm.room_id} onChange={(e) => setRescheduleForm({ ...rescheduleForm, room_id: e.target.value })}>
              {rooms.map((r) => <option key={r.room_id} value={r.room_id}>{r.room_code}</option>)}
            </select>

            <label style={labelStyle}>New Date</label>
            <input type="date" style={inputStyle} value={rescheduleForm.date} onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })} />

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>New Start Time</label>
                <input type="time" style={inputStyle} value={rescheduleForm.start} onChange={(e) => setRescheduleForm({ ...rescheduleForm, start: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>New End Time</label>
                <input type="time" style={inputStyle} value={rescheduleForm.end} onChange={(e) => setRescheduleForm({ ...rescheduleForm, end: e.target.value })} />
              </div>
            </div>

            <ConflictNote conflict={rescheduleConflict} />
            <ModalError>{rescheduleError}</ModalError>
            <ModalActions>
              <button type="submit" style={primaryBtn}>Save</button>
              <button type="button" style={outlineBtn} onClick={() => setRescheduleSession(null)}>Cancel</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {cancelSession && (
        <Modal title="Cancel Session" onClose={() => setCancelSession(null)}>
          <p style={{ marginTop: 0 }}>
            Room {cancelSession.room.room_code} &mdash; {cancelSession.module.module_name}<br />
            {fmtDate(cancelSession.session_date)}, {fmtTime(cancelSession.start_time)} - {fmtTime(cancelSession.end_time)}
          </p>
          <label style={labelStyle}>Reason (Optional)</label>
          <input style={inputStyle} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          <ModalError>{cancelError}</ModalError>
          <ModalActions>
            <button style={dangerBtn} onClick={handleCancelConfirm}>Confirm Cancel</button>
            <button style={outlineBtn} onClick={() => setCancelSession(null)}>Back</button>
          </ModalActions>
        </Modal>
      )}

      {deleteSession && (
        <Modal title="Delete Session" headerColor={colors.modalRed} onClose={() => setDeleteSession(null)}>
          <p style={{ marginTop: 0 }}>
            Delete "{deleteSession.module.module_name} - {fmtDate(deleteSession.session_date)}, {fmtTime(deleteSession.start_time)} - {fmtTime(deleteSession.end_time)}, Room {deleteSession.room.room_code}"? This cannot be undone.
          </p>
          <NoteBox>
            Deleting removes this session&apos;s record entirely.<br />
            To keep a history entry instead, use Cancel Session.
          </NoteBox>
          <ModalError>{deleteError}</ModalError>
          <ModalActions>
            <button style={dangerBtn} onClick={handleDeleteConfirm}>Delete</button>
            <button style={outlineBtn} onClick={() => setDeleteSession(null)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}

      {deleteRecurring && (
        <Modal title="Delete Recurring Schedule" headerColor={colors.modalRed} onClose={() => setDeleteRecurring(null)}>
          <p style={{ marginTop: 0 }}>
            Delete "{deleteRecurring.module.module_name} (weekly, {deleteRecurring.day_of_week.charAt(0)}{deleteRecurring.day_of_week.slice(1).toLowerCase()})"? This cannot be undone.
          </p>
          <NoteBox>
            This will delete all {futureRecurringCount(deleteRecurring)} future occurrence(s).<br />
            Past occurrences are kept for history.
          </NoteBox>
          <ModalError>{deleteRecurringError}</ModalError>
          <ModalActions>
            <button style={dangerBtn} onClick={handleDeleteRecurringConfirm}>Delete</button>
            <button style={outlineBtn} onClick={() => setDeleteRecurring(null)}>Cancel</button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}
