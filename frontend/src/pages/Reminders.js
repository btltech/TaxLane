import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

const severityClasses = {
  high: 'bg-red-100 border-red-300 text-red-900',
  medium: 'bg-yellow-100 border-yellow-300 text-yellow-900',
  info: 'bg-blue-100 border-blue-300 text-blue-900',
};

function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/reminders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReminders(res.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-600">Loading reminders…</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl mb-4">Reminders</h2>
      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {reminders.length === 0 ? (
        <p className="text-sm text-gray-600">No reminders at the moment.</p>
      ) : (
        <ul className="space-y-3">
          {reminders.map((r, idx) => (
            <li key={`${r.type}-${idx}`} className={`rounded border p-3 text-sm ${severityClasses[r.severity] || 'bg-gray-50 border-gray-200 text-gray-800'}`}>
              {r.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Reminders;
