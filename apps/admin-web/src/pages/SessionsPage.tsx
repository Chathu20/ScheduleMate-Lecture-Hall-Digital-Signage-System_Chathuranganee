import { useEffect, useState, FormEvent } from 'react';
import apiClient from '../lib/apiClient';

interface Building { building_id: number; name: string; }
interface Floor { floor_id: number; building_id: number; floor_number: number; }
interface Side { side_id: number; floor_id: number; side_code: string; }
interface Room { room_id: number; side_id: number; room_code: string; }
interface Module { module_id: number; module_code: string; module_name: string; }
interface Lecturer { lecturer_id: number; full_name: string; }

interface Session {
  session_id: number;
  session_date: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  status: string;
  session_type: string;
  room: { room_code: string };
  module: { module_name: string };
  lecturer: { full_name: string };
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [sides, setSides] = useState<Side[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);

  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedSide, setSelectedSide] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [selectedLecturer, setSelectedLecturer] = useState<number | null>(null);
  const [sessionType, setSessionType] = useState('LECTURE');
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [conflictInfo, setConflictInfo] = useState<any>(null);

  useEffect(() => {
    fetchSessions();
    apiClient.get<Building[]>('/buildings').then((r) => setBuildings(r.data));
    apiClient.get<Floor[]>('/floors').then((r) => setFloors(r.data));
    apiClient.get<Side[]>('/sides').then((r) => setSides(r.data));
    apiClient.get<Room[]>('/rooms').then((r) => setRooms(r.data));
    apiClient.get<Module[]>('/modules').then((r) => setModules(r.data));
    apiClient.get<Lecturer[]>('/lecturers').then((r) => setLecturers(r.data));
  }, []);

  async function fetchSessions() {
    const res = await apiClient.get<Session[]>('/sessions');
    setSessions(res.data);
  }

  const floorsForBuilding = floors.filter((f) => f.building_id === selectedBuilding);
  const sidesForFloor = sides.filter((s) => s.floor_id === selectedFloor);
  const roomsForSide = rooms.filter((r) => r.side_id === selectedSide);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setConflictInfo(null);

    if (!selectedRoom || !selectedModule || !selectedLecturer || !sessionDate || !startTime || !endTime) {
      setError('All fields are required');
      return;
    }

    try {
      await apiClient.post('/sessions', {
        room_id: selectedRoom,
        module_id: selectedModule,
        lecturer_id: selectedLecturer,
        session_date: new Date(sessionDate).toISOString(),
        start_time: new Date(`${sessionDate}T${startTime}:00Z`).toISOString(),
        end_time: new Date(`${sessionDate}T${endTime}:00Z`).toISOString(),
        session_type: sessionType,
      });
      // reset form
      setSelectedRoom(null);
      setSelectedModule(null);
      setSelectedLecturer(null);
      setSessionDate('');
      setStartTime('');
      setEndTime('');
      fetchSessions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create session');
      if (err.response?.data?.conflictingSession) {
        setConflictInfo(err.response.data.conflictingSession);
      }
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Sessions / Schedule</h1>

      <form onSubmit={handleCreate} style={{ marginBottom: 24, border: '1px solid #ccc', padding: 16 }}>
        <h3>Create Session</h3>

        <select value={selectedBuilding ?? ''} onChange={(e) => { setSelectedBuilding(Number(e.target.value) || null); setSelectedFloor(null); setSelectedSide(null); setSelectedRoom(null); }}>
          <option value="">Building...</option>
          {buildings.map((b) => <option key={b.building_id} value={b.building_id}>{b.name}</option>)}
        </select>

        <select value={selectedFloor ?? ''} onChange={(e) => { setSelectedFloor(Number(e.target.value) || null); setSelectedSide(null); setSelectedRoom(null); }} disabled={!selectedBuilding}>
          <option value="">Floor...</option>
          {floorsForBuilding.map((f) => <option key={f.floor_id} value={f.floor_id}>Floor {f.floor_number}</option>)}
        </select>

        <select value={selectedSide ?? ''} onChange={(e) => { setSelectedSide(Number(e.target.value) || null); setSelectedRoom(null); }} disabled={!selectedFloor}>
          <option value="">Side...</option>
          {sidesForFloor.map((s) => <option key={s.side_id} value={s.side_id}>Side {s.side_code}</option>)}
        </select>

        <select value={selectedRoom ?? ''} onChange={(e) => setSelectedRoom(Number(e.target.value) || null)} disabled={!selectedSide}>
          <option value="">Room...</option>
          {roomsForSide.map((r) => <option key={r.room_id} value={r.room_id}>{r.room_code}</option>)}
        </select>

        <br /><br />

        <select value={selectedModule ?? ''} onChange={(e) => setSelectedModule(Number(e.target.value) || null)}>
          <option value="">Module...</option>
          {modules.map((m) => <option key={m.module_id} value={m.module_id}>{m.module_code} - {m.module_name}</option>)}
        </select>

        <select value={selectedLecturer ?? ''} onChange={(e) => setSelectedLecturer(Number(e.target.value) || null)}>
          <option value="">Lecturer...</option>
          {lecturers.map((l) => <option key={l.lecturer_id} value={l.lecturer_id}>{l.full_name}</option>)}
        </select>

        <select value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
          <option value="LECTURE">Lecture</option>
          <option value="LAB">Lab</option>
        </select>

        <br /><br />

        <label>Date: <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} /></label>{' '}
        <label>Start: <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>{' '}
        <label>End: <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>

        <br /><br />
        <button type="submit">Save Session</button>

        {error && (
          <div style={{ color: 'red', marginTop: 8 }}>
            <p>{error}</p>
            {conflictInfo && (
              <p>
                Conflicts with: {conflictInfo.module} ({conflictInfo.lecturer}),{' '}
                {new Date(conflictInfo.start_time).toLocaleTimeString()} - {new Date(conflictInfo.end_time).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </form>

      <h3>All Sessions</h3>
      <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Date</th><th>Day</th><th>Room</th><th>Module</th><th>Lecturer</th><th>Time</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.session_id}>
              <td>{new Date(s.session_date).toLocaleDateString()}</td>
              <td>{s.day_of_week}</td>
              <td>{s.room.room_code}</td>
              <td>{s.module.module_name}</td>
              <td>{s.lecturer.full_name}</td>
              <td>{new Date(s.start_time).toLocaleTimeString()} - {new Date(s.end_time).toLocaleTimeString()}</td>
              <td>{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}