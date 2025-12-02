import React, { useState } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

function ImportExport() {
  const [incomeFile, setIncomeFile] = useState(null);
  const [expenseFile, setExpenseFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const downloadCsv = async (target) => {
    try {
      const res = await axios.get(`${API_URL}/api/csv/${target}/export`, {
        headers: authHeaders(),
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${target}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: `Downloaded ${target} CSV` });
    } catch (err) {
      const message = err.response?.data?.error || 'Download failed';
      setStatus({ type: 'error', message });
    }
  };

  const importCsv = async (target) => {
    const file = target === 'income' ? incomeFile : expenseFile;
    if (!file) {
      setStatus({ type: 'error', message: `Select a ${target} CSV file first.` });
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API_URL}/api/csv/${target}/import`, formData, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      setStatus({ type: 'success', message: `Imported ${res.data.imported} ${target} rows (${res.data.skipped} skipped).` });
    } catch (err) {
      const message = err.response?.data?.error || 'Import failed';
      setStatus({ type: 'error', message });
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl">CSV Import & Export</h2>
      <p className="text-sm text-gray-600">
        Use CSV files with headers. Income: date,amount,description,category,client_id. Expenses: date,amount,description,category.
      </p>
      {status.message && (
        <div className={`rounded border p-3 text-sm ${status.type === 'error' ? 'border-red-300 bg-red-50 text-red-800' : 'border-green-300 bg-green-50 text-green-800'}`}>
          {status.message}
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded border border-gray-200 bg-white p-4 shadow">
          <h3 className="mb-2 text-lg font-semibold">Income</h3>
          <button onClick={() => downloadCsv('income')} className="mb-3 rounded bg-blue-600 px-3 py-2 text-white">
            Download Income CSV
          </button>
          <div className="space-y-2">
            <input type="file" accept=".csv" onChange={(e) => setIncomeFile(e.target.files[0])} className="w-full text-sm" />
            <button onClick={() => importCsv('income')} className="rounded bg-green-600 px-3 py-2 text-white">
              Import Income CSV
            </button>
          </div>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4 shadow">
          <h3 className="mb-2 text-lg font-semibold">Expenses</h3>
          <button onClick={() => downloadCsv('expenses')} className="mb-3 rounded bg-blue-600 px-3 py-2 text-white">
            Download Expenses CSV
          </button>
          <div className="space-y-2">
            <input type="file" accept=".csv" onChange={(e) => setExpenseFile(e.target.files[0])} className="w-full text-sm" />
            <button onClick={() => importCsv('expenses')} className="rounded bg-green-600 px-3 py-2 text-white">
              Import Expenses CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportExport;
