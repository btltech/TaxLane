import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

function Dashboard() {
  const [calculations, setCalculations] = useState({});
  const [nextObligation, setNextObligation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchData = async () => {
      const [calcRes, obligationRes] = await Promise.all([
        axios.get(`${API_URL}/api/calculations`, { headers: authHeaders() }),
        axios.get(`${API_URL}/api/hmrc/obligations`, { headers: authHeaders() }),
      ]);xios.get('http://localhost:5001/api/hmrc/obligations', { headers: authHeaders() }),
      ]);
      setCalculations(calcRes.data);
      const obligations = obligationRes.data || [];
      const upcoming = obligations.find((o) => o.status !== 'fulfilled') || obligations[0];
      setNextObligation(upcoming || null);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reports/report`, {
        headers: authHeaders(),
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'taxlane-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to download report. Please try again.';
      alert(message);
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
      }
    }
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderMonthlyRows = () => (
    <div className="card col-span-2">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Monthly Trends</h3>
      {calculations.monthlyBreakdown?.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-3 font-medium text-slate-500 uppercase tracking-wider text-xs">Month</th>
                <th className="px-3 py-3 font-medium text-slate-500 uppercase tracking-wider text-xs">Income</th>
                <th className="px-3 py-3 font-medium text-slate-500 uppercase tracking-wider text-xs">Expenses</th>
                <th className="px-3 py-3 font-medium text-slate-500 uppercase tracking-wider text-xs">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calculations.monthlyBreakdown.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 font-medium text-slate-700">{row.month}</td>
                  <td className="px-3 py-3 text-green-600">£{row.income?.toFixed(2) || '0.00'}</td>
                  <td className="px-3 py-3 text-red-600">£{row.expenses?.toFixed(2) || '0.00'}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">£{row.profit?.toFixed(2) || '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No monthly data available yet.</p>
      )}
    </div>
  );

  const renderTopClients = () => (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Top Clients</h3>
      {calculations.topClients?.length ? (
        <ul className="text-sm space-y-3">
          {calculations.topClients.map((client, index) => (
            <li key={client.name} className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold mr-3">
                  {index + 1}
                </span>
                <span className="text-slate-700 font-medium">{client.name}</span>
              </div>
              <span className="font-semibold text-slate-900">£{client.totalIncome?.toFixed(2) || '0.00'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Add income against clients to see rankings.</p>
      )}
    </div>
  );

  const renderExpenseSplit = () => (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Expense Categories</h3>
      {calculations.expenseCategories?.length ? (
        <ul className="text-sm space-y-3">
          {calculations.expenseCategories.map((cat) => (
            <li key={cat.category} className="flex justify-between items-center">
              <span className="text-slate-700">{cat.category}</span>
              <span className="font-medium text-slate-900">£{cat.total?.toFixed(2) || '0.00'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No expenses recorded yet.</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {nextObligation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start space-x-3">
          <span className="text-2xl">🔔</span>
          <div>
            <h4 className="font-semibold text-blue-900">Next HMRC Obligation</h4>
            <p className="text-sm text-blue-800 mt-1">
              {nextObligation.periodKey} &middot; Due <span className="font-bold">{formatDate(nextObligation.dueDate)}</span> &middot; Status: <span className="uppercase tracking-wide text-xs font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded">{nextObligation.status}</span>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card border-l-4 border-l-green-500">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Income</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">£{calculations.totalIncome?.toFixed(2) || 0}</p>
        </div>
        <div className="card border-l-4 border-l-red-500">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Expenses</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">£{calculations.totalExpenses?.toFixed(2) || 0}</p>
        </div>
        <div className="card border-l-4 border-l-primary-500">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Profit</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">£{calculations.profit?.toFixed(2) || 0}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">VAT Estimate</h3>
          <p className="text-2xl font-semibold text-slate-700 mt-2">£{calculations.vat?.toFixed(2) || 0}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tax Estimate</h3>
          <p className="text-2xl font-semibold text-slate-700 mt-2">£{calculations.taxEstimate?.toFixed(2) || 0}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">NI Estimate</h3>
          <p className="text-2xl font-semibold text-slate-700 mt-2">£{calculations.niEstimate?.toFixed(2) || 0}</p>
        </div>
        
        {renderMonthlyRows()}
        {renderTopClients()}
        {renderExpenseSplit()}
      </div>

      <div className="flex justify-end">
        <button onClick={downloadReport} className="btn btn-primary flex items-center">
          <span className="mr-2">📄</span> Download PDF Report
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
