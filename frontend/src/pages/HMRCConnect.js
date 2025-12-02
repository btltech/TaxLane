import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import API_URL from '../config/api';

function HMRCConnect() {
  const [status, setStatus] = useState({ loading: true, configured: false });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'success', 'error', 'info'
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for OAuth callback result
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success === 'true') {
      setMessage('Successfully connected to HMRC! You can now submit tax returns.');
      setMessageType('success');
    } else if (error) {
      setMessage(`HMRC connection failed: ${decodeURIComponent(error)}`);
      setMessageType('error');
    }
    
    checkStatus();
  }, [searchParams]);

  const checkStatus = async () => {
    setStatus((prev) => ({ ...prev, loading: true }));
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_URL}/api/hmrc/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus({ loading: false, configured: Boolean(res.data.configured) });
    } catch (error) {
      setStatus({ loading: false, configured: false });
      setMessage(error.response?.data?.error || 'Unable to determine HMRC connection status.');
      setMessageType('error');
    }
  };

  const handleConnect = () => {
    const token = localStorage.getItem('token');
    // Pass the token as a query parameter since this is a redirect
    window.location.href = `${API_URL}/api/hmrc/auth?token=${encodeURIComponent(token)}`;
  };

  const handleMockConnect = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/api/hmrc/mock-connect`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage('HMRC connected in mock mode. You can now submit test returns.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to complete mock connection.');
      setMessageType('error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card">
        <h2 className="text-xl font-semibold mb-6 text-slate-800">HMRC Integration</h2>
        
        {status.loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-slate-600">Checking connection status...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-3xl">🏛️</div>
              <div>
                <h3 className="font-medium text-slate-900">Making Tax Digital</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Connect your TaxLane account directly to HMRC to enable digital tax submissions. 
                  This allows you to submit VAT returns and view your tax obligations directly from this dashboard.
                </p>
              </div>
            </div>

            {status.configured ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900">Ready to Connect</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                  Your environment is configured for HMRC production access. Click below to authorize TaxLane to interact with your tax account.
                </p>
                <button onClick={handleConnect} className="btn btn-primary bg-green-600 hover:bg-green-700">
                  Connect HMRC Account
                </button>
              </div>
            ) : (
              <div className="border-t border-slate-100 pt-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Sandbox Mode</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          HMRC OAuth credentials are not fully configured in your environment variables. 
                          You can use the <strong>Mock Connection</strong> mode to simulate the HMRC integration for testing and development purposes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <button onClick={handleMockConnect} className="btn btn-primary">
                    Enable Mock Connection
                  </button>
                </div>
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-md ${
                messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                messageType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                <div className="flex items-center">
                  {messageType === 'success' && (
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {messageType === 'error' && (
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  {message}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HMRCConnect;
