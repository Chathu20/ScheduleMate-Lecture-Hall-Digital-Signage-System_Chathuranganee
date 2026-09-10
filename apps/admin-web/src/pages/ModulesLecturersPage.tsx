import { useEffect, useState, FormEvent } from 'react';
import apiClient from '../lib/apiClient';

interface Module { module_id: number; module_code: string; module_name: string; }
interface Lecturer { lecturer_id: number; full_name: string; email: string; }

export function ModulesLecturersPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);

  const [newModuleCode, setNewModuleCode] = useState('');
  const [newModuleName, setNewModuleName] = useState('');
  const [newLecturerName, setNewLecturerName] = useState('');
  const [newLecturerEmail, setNewLecturerEmail] = useState('');

  const [moduleError, setModuleError] = useState<string | null>(null);
  const [lecturerError, setLecturerError] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
    fetchLecturers();
  }, []);

  async function fetchModules() {
    const res = await apiClient.get<Module[]>('/modules');
    setModules(res.data);
  }
  async function fetchLecturers() {
    const res = await apiClient.get<Lecturer[]>('/lecturers');
    setLecturers(res.data);
  }

  async function handleAddModule(e: FormEvent) {
    e.preventDefault();
    setModuleError(null);
    if (!newModuleCode.trim() || !newModuleName.trim()) return;
    try {
      await apiClient.post('/modules', { module_code: newModuleCode, module_name: newModuleName });
      setNewModuleCode('');
      setNewModuleName('');
      fetchModules();
    } catch (err: any) {
      setModuleError(err.response?.data?.message || 'Failed to add module');
    }
  }

  async function handleAddLecturer(e: FormEvent) {
    e.preventDefault();
    setLecturerError(null);
    if (!newLecturerName.trim() || !newLecturerEmail.trim()) return;
    try {
      await apiClient.post('/lecturers', { full_name: newLecturerName, email: newLecturerEmail });
      setNewLecturerName('');
      setNewLecturerEmail('');
      fetchLecturers();
    } catch (err: any) {
      setLecturerError(err.response?.data?.message || 'Failed to add lecturer');
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', display: 'flex', gap: 48 }}>
      {/* Modules */}
      <section style={{ flex: 1 }}>
        <h1>Modules</h1>
        <form onSubmit={handleAddModule} style={{ marginBottom: 12 }}>
          <input
            value={newModuleCode}
            onChange={(e) => setNewModuleCode(e.target.value)}
            placeholder="Module code (e.g. IT2210)"
            style={{ marginRight: 8 }}
          />
          <input
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
            placeholder="Module name"
            style={{ marginRight: 8 }}
          />
          <button type="submit">Add Module</button>
        </form>
        {moduleError && <p style={{ color: 'red' }}>{moduleError}</p>}
        <ul>
          {modules.map((m) => (
            <li key={m.module_id}>{m.module_code} — {m.module_name}</li>
          ))}
        </ul>
      </section>

      {/* Lecturers */}
      <section style={{ flex: 1 }}>
        <h1>Lecturers</h1>
        <form onSubmit={handleAddLecturer} style={{ marginBottom: 12 }}>
          <input
            value={newLecturerName}
            onChange={(e) => setNewLecturerName(e.target.value)}
            placeholder="Full name"
            style={{ marginRight: 8 }}
          />
          <input
            value={newLecturerEmail}
            onChange={(e) => setNewLecturerEmail(e.target.value)}
            placeholder="Email"
            style={{ marginRight: 8 }}
          />
          <button type="submit">Add Lecturer</button>
        </form>
        {lecturerError && <p style={{ color: 'red' }}>{lecturerError}</p>}
        <ul>
          {lecturers.map((l) => (
            <li key={l.lecturer_id}>{l.full_name} — {l.email}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}