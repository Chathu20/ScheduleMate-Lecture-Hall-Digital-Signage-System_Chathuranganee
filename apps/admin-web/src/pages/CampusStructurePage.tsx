import { useEffect, useState, FormEvent } from 'react';
import apiClient from '../lib/apiClient';

interface Building { building_id: number; name: string; }
interface Floor { floor_id: number; building_id: number; floor_number: number; is_full_lab_floor: boolean; }
interface Side { side_id: number; floor_id: number; side_code: string; }
interface Room { room_id: number; side_id: number; room_code: string; capacity: number; room_type: string; }

export function CampusStructurePage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [sides, setSides] = useState<Side[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedSide, setSelectedSide] = useState<number | null>(null);

  const [newBuildingName, setNewBuildingName] = useState('');
  const [newFloorNumber, setNewFloorNumber] = useState('');
  const [newSideCode, setNewSideCode] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');
  const [newRoomType, setNewRoomType] = useState('Lecture');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchBuildings(); fetchFloors(); fetchSides(); fetchRooms(); }, []);

  async function fetchBuildings() {
    const res = await apiClient.get<Building[]>('/buildings');
    setBuildings(res.data);
  }
  async function fetchFloors() {
    const res = await apiClient.get<Floor[]>('/floors');
    setFloors(res.data);
  }
  async function fetchSides() {
    const res = await apiClient.get<Side[]>('/sides');
    setSides(res.data);
  }
  async function fetchRooms() {
    const res = await apiClient.get<Room[]>('/rooms');
    setRooms(res.data);
  }

  const floorsForBuilding = floors.filter((f) => f.building_id === selectedBuilding);
  const sidesForFloor = sides.filter((s) => s.floor_id === selectedFloor);
  const roomsForSide = rooms.filter((r) => r.side_id === selectedSide);

  async function handleAddBuilding(e: FormEvent) {
    e.preventDefault();
    if (!newBuildingName.trim()) return;
    try {
      await apiClient.post('/buildings', { name: newBuildingName });
      setNewBuildingName('');
      fetchBuildings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add building');
    }
  }

  async function handleAddFloor(e: FormEvent) {
    e.preventDefault();
    if (!selectedBuilding || !newFloorNumber) return;
    try {
      await apiClient.post('/floors', {
        building_id: selectedBuilding,
        floor_number: Number(newFloorNumber),
        is_full_lab_floor: false,
      });
      setNewFloorNumber('');
      fetchFloors();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add floor');
    }
  }

  async function handleAddSide(e: FormEvent) {
    e.preventDefault();
    if (!selectedFloor || !newSideCode.trim()) return;
    try {
      await apiClient.post('/sides', { floor_id: selectedFloor, side_code: newSideCode });
      setNewSideCode('');
      fetchSides();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add side');
    }
  }

  async function handleAddRoom(e: FormEvent) {
    e.preventDefault();
    if (!selectedSide || !newRoomCode.trim() || !newRoomCapacity) return;
    try {
      await apiClient.post('/rooms', {
        side_id: selectedSide,
        room_code: newRoomCode,
        capacity: Number(newRoomCapacity),
        room_type: newRoomType,
      });
      setNewRoomCode('');
      setNewRoomCapacity('');
      fetchRooms();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add room');
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Campus Structure</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Buildings */}
      <section style={{ marginBottom: 24 }}>
        <h2>Buildings</h2>
        <form onSubmit={handleAddBuilding} style={{ marginBottom: 8 }}>
          <input value={newBuildingName} onChange={(e) => setNewBuildingName(e.target.value)} placeholder="New building name" />
          <button type="submit">Add Building</button>
        </form>
        <select value={selectedBuilding ?? ''} onChange={(e) => { setSelectedBuilding(Number(e.target.value) || null); setSelectedFloor(null); setSelectedSide(null); }}>
          <option value="">-- Select a building --</option>
          {buildings.map((b) => (
            <option key={b.building_id} value={b.building_id}>{b.name} (ID: {b.building_id})</option>
          ))}
        </select>
      </section>

      {/* Floors */}
      {selectedBuilding && (
        <section style={{ marginBottom: 24 }}>
          <h2>Floors</h2>
          <form onSubmit={handleAddFloor} style={{ marginBottom: 8 }}>
            <input type="number" value={newFloorNumber} onChange={(e) => setNewFloorNumber(e.target.value)} placeholder="Floor number" />
            <button type="submit">Add Floor</button>
          </form>
          <select value={selectedFloor ?? ''} onChange={(e) => { setSelectedFloor(Number(e.target.value) || null); setSelectedSide(null); }}>
            <option value="">-- Select a floor --</option>
            {floorsForBuilding.map((f) => (
              <option key={f.floor_id} value={f.floor_id}>Floor {f.floor_number} (ID: {f.floor_id})</option>
            ))}
          </select>
        </section>
      )}

      {/* Sides */}
      {selectedFloor && (
        <section style={{ marginBottom: 24 }}>
          <h2>Sides</h2>
          <form onSubmit={handleAddSide} style={{ marginBottom: 8 }}>
            <input value={newSideCode} onChange={(e) => setNewSideCode(e.target.value)} placeholder="Side code (e.g. A)" />
            <button type="submit">Add Side</button>
          </form>
          <select value={selectedSide ?? ''} onChange={(e) => setSelectedSide(Number(e.target.value) || null)}>
            <option value="">-- Select a side --</option>
            {sidesForFloor.map((s) => (
              <option key={s.side_id} value={s.side_id}>Side {s.side_code} (ID: {s.side_id})</option>
            ))}
          </select>
        </section>
      )}

      {/* Rooms */}
      {selectedSide && (
        <section>
          <h2>Rooms</h2>
          <form onSubmit={handleAddRoom} style={{ marginBottom: 8 }}>
            <input value={newRoomCode} onChange={(e) => setNewRoomCode(e.target.value)} placeholder="Room code (e.g. 12A01)" />
            <input type="number" value={newRoomCapacity} onChange={(e) => setNewRoomCapacity(e.target.value)} placeholder="Capacity" />
            <select value={newRoomType} onChange={(e) => setNewRoomType(e.target.value)}>
              <option value="Lecture">Lecture</option>
              <option value="Lab">Lab</option>
              <option value="Large Hall">Large Hall</option>
            </select>
            <button type="submit">Add Room</button>
          </form>
          <ul>
            {roomsForSide.map((r) => (
              <li key={r.room_id}>{r.room_code} — capacity {r.capacity} ({r.room_type})</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}