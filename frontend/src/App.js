import React, { useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import API_URL from './config/api';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddIncome from './pages/AddIncome';
import AddExpense from './pages/AddExpense';
import UploadReceipt from './pages/UploadReceipt';
import HMRCConnect from './pages/HMRCConnect';
import Submissions from './pages/Submissions';
import AuditLogs from './pages/AuditLogs';
import Clients from './pages/Clients';
import Reminders from './pages/Reminders';
import ImportExport from './pages/ImportExport';
import Login from './pages/Login';
import './styles/index.css';

function App() {
  // Setup axios interceptor for automatic refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const origReq = error.config;
        if (error.response && error.response.status === 401 && !origReq._retry) {
          origReq._retry = true;
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            localStorage.removeItem('token');
            window.location.reload();
            return Promise.reject(error);
          }
          try {
            const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
            const newAccess = res.data.accessToken;
            if (newAccess) {
              localStorage.setItem('token', newAccess);
              origReq.headers['Authorization'] = `Bearer ${newAccess}`;
              return axios(origReq);
            }
          } catch (e) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.reload();
            return Promise.reject(e);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  if (!token) {
    return <Login />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout title="Dashboard"><Dashboard /></Layout>} />
        <Route path="/add-income" element={<Layout title="Add Income"><AddIncome /></Layout>} />
        <Route path="/add-expense" element={<Layout title="Add Expense"><AddExpense /></Layout>} />
        <Route path="/upload-receipt" element={<Layout title="Upload Receipt"><UploadReceipt /></Layout>} />
        <Route path="/hmrc-connect" element={<Layout title="HMRC Connection"><HMRCConnect /></Layout>} />
        <Route path="/submissions" element={<Layout title="Submissions"><Submissions /></Layout>} />
        <Route path="/audit" element={<Layout title="Audit Logs"><AuditLogs /></Layout>} />
        <Route path="/clients" element={<Layout title="Clients"><Clients /></Layout>} />
        <Route path="/reminders" element={<Layout title="Reminders"><Reminders /></Layout>} />
        <Route path="/import-export" element={<Layout title="Import / Export"><ImportExport /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;
