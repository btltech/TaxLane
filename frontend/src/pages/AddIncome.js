import React, { useState } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import { categorizeIncomeText } from '../utils/categories';

function AddIncome() {
  const [form, setForm] = useState({ amount: '', description: '', category: '', date: '' });
  const [categoryLocked, setCategoryLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/api/income`, form, { headers: { Authorization: `Bearer ${token}` } });
      alert('Income added!');
      window.location.href = '/';
    } catch (error) {
      alert('Failed to add income');
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptionChange = (value) => {
    const suggestion = !categoryLocked && value ? categorizeIncomeText(value) : form.category;
    setForm((prev) => ({ ...prev, description: value, category: suggestion || prev.category }));
  };

  const categories = ['Sales', 'Services', 'Royalties', 'Other'];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-xl font-semibold mb-6 text-slate-800">Record New Income</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (£)</label>
            <input
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({...form, amount: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g. Web Design Project"
              value={form.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => {
                setCategoryLocked(true);
                setForm({ ...form, category: e.target.value });
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {form.category && !categoryLocked && (
              <p className="mt-1 text-xs text-primary-600 flex items-center">
                <span className="mr-1">✨</span> Suggested category based on description
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date Received</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({...form, date: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : 'Save Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddIncome;
