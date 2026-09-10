import { useEffect, useState, FormEvent } from 'react';
import apiClient from '../lib/apiClient';

interface Building {
  building_id: number;
  name: string;
}

export function CampusStructurePage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchBuildings() {
    try {
      const res = await apiClient.get<Building[]>('/buildings');
      setBuildings(res.data);
    } catch (err) {
      setError('Failed to load buildings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBuildings();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await apiClient.post('/buildings', { name: newName });
      setNewName('');
      fetchBuildings(); // refresh list
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create building');
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Campus Structure</h1>

      <form onSubmit={handleCreate} style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="New building name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ padding: 8, marginRight: 8 }}
        />
        <button type="submit">Add Building</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading...</p>}

      <ul>
        {buildings.map((b) => (
          <li key={b.building_id}>
            {b.name} (ID: {b.building_id})
          </li>
        ))}
      </ul>
    </div>
  );
}