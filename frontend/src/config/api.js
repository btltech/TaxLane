// API configuration for TaxLane frontend
// Uses environment variable in production, falls back to localhost for development

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export default API_URL;
