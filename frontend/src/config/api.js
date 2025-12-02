// API configuration for TaxLane frontend
// Uses environment variable in production, falls back to localhost for development

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = process.env.REACT_APP_API_URL || (isLocal ? 'http://localhost:5001' : 'https://backend-production-4595.up.railway.app');

export default API_URL;
