import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

const statusClasses = {
  fulfilled: 'bg-green-100 text-green-800',
  open: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
};

function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [obligations, setObligations] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchData = async () => {
    try {
      const [obligationRes, submissionRes] = await Promise.all([
        axios.get(`${API_URL}/api/hmrc/obligations`, { headers: authHeaders() }),
        axios.get(`${API_URL}/api/hmrc/submissions`, { headers: authHeaders() }),
      ]);
      setObligations(obligationRes.data || []);
      setSubmissions(submissionRes.data || []);
      const firstOpen = obligationRes.data?.find((o) => o.status !== 'fulfilled');
      if (firstOpen) {
        setSelectedPeriod(firstOpen.periodKey);
      } else if (obligationRes.data?.length) {
        setSelectedPeriod(obligationRes.data[0].periodKey);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load HMRC data.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedPeriod) {
      setError('Select a period to submit.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/api/hmrc/submit`, {
        type: 'quarterly',
        period: selectedPeriod,
        payload: { income: 1000, expenses: 500 },
      }, { headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">Upcoming Obligations</h3>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {obligations.length} Records
          </span>
        </div>
        
        {obligations.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No obligations generated yet.</div>
        ) : (
          <>
            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Period to Submit</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    {obligations.map((o) => (
                      <option key={o.id} value={o.periodKey}>
                        {o.periodKey} — due {formatDate(o.dueDate)} ({o.status})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Return'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date Range</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {obligations.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{o.periodKey}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {formatDate(o.startDate)} – {formatDate(o.endDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">{formatDate(o.dueDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[o.status] || 'bg-gray-100 text-gray-800'}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Submission History</h3>
        {submissions.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No submissions recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <div>
                  <div className="font-medium text-slate-900">{s.period} <span className="text-slate-400 mx-2">|</span> {s.type}</div>
                  <div className="text-sm text-slate-500 mt-1">Submitted on {s.submitted_at ? formatDate(s.submitted_at) : 'Unknown date'}</div>
                </div>
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Submissions;
