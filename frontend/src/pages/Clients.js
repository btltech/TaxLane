import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: '', email: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const token = localStorage.getItem('token');
    const res = await axios.get(`${API_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } });
    setClients(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await axios.post(`${API_URL}/api/clients`, form, { headers: { Authorization: `Bearer ${token}` } });
    fetchClients();
    setForm({ name: '', email: '' });
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl mb-4">Clients</h2>
      <form onSubmit={handleSubmit} className="mb-4">
        <input type="text" placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full p-2 border mb-2" required />
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full p-2 border mb-2" />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">Add Client</button>
      </form>
      <ul>
        {clients.map(c => <li key={c.id} className="border p-2 mb-2">{c.name} - {c.email}</li>)}
      </ul>
    </div>
  );
}

export default Clients;