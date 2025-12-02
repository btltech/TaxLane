import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const token = localStorage.getItem('token');
    const res = await axios.get(`${API_URL}/api/audit`, { headers: { Authorization: `Bearer ${token}` } });
    setLogs(res.data);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl mb-4">Audit Logs</h2>
      <ul>
        {logs.map(log => (
          <li key={log.id} className="border p-2 mb-2">
            {log.timestamp} - {log.action}: {JSON.stringify(log.details)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AuditLogs;