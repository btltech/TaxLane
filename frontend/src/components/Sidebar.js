import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/add-income', label: 'Income', icon: '💰' },
  { path: '/add-expense', label: 'Expenses', icon: '💸' },
  { path: '/upload-receipt', label: 'Receipts', icon: '🧾' },
  { path: '/clients', label: 'Clients', icon: '👥' },
  { path: '/hmrc-connect', label: 'HMRC', icon: '🏛️' },
  { path: '/submissions', label: 'Submissions', icon: '📤' },
  { path: '/reminders', label: 'Reminders', icon: '🔔' },
  { path: '/audit', label: 'Audit Logs', icon: '📋' },
  { path: '/import-export', label: 'Data Tools', icon: '💾' },
];

function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-wider text-primary-500">TaxLane</h1>
        <p className="text-xs text-slate-400 mt-1">Making Tax Digital</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.reload();
          }}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <span className="mr-3">🚪</span>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
