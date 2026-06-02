//API Helper
import axios from 'axios';

const API_URL = "http://145.241.249.140:8000";

const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add the latest token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const login = async (username, password) => {
  const response = await axios.post(`${API_URL}/login`, { username, password });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

export const getLogs = async () => {
  const response = await axiosInstance.get('/logs');
  return response.data;
};

export const getAdminLogs = async () => {
  const response = await axiosInstance.get('/api/admin-logs');
  return response.data;
};

export const getThreatIntelligence = async () => {
  const response = await axiosInstance.get('/api/threat-intelligence');
  return response.data;
};

export const getLiveTraffic = async () => {
  const response = await axiosInstance.get('/api/live-traffic');
  return response.data;
};

export const getRules = async () => {
  const response = await axiosInstance.get('/api/rules');
  return response.data;
};

export const addRule = async (rule) => {
  const response = await axiosInstance.post('/api/rules', rule);
  return response.data;
};

export const deleteRule = async (id) => {
  const response = await axiosInstance.delete(`/api/rules/${id}`);
  return response.data;
};

export const updateRule = async (id, ruleData) => {
  const response = await axiosInstance.put(`/api/rules/${id}`, ruleData);
  return response.data;
};

export const toggleRule = async (id, enabled) => {
  const response = await axiosInstance.put(`/api/rules/${id}`, { enabled });
  return response.data;
};

export const getSettings = async () => {
  const response = await axiosInstance.get('/api/settings');
  return response.data;
};

export const updateSettings = async (settings) => {
  const response = await axiosInstance.post('/api/settings', settings);
  return response.data;
};

export const testConnection = async (targetUrl) => {
  try {
    const response = await axiosInstance.post('/api/test-connection', { target_url: targetUrl });
    return { status: 'success', message: response.data.message };
  } catch (error) {
    return { status: 'error', message: error.response?.data?.detail || 'Connection failed' };
  }
};

export const getModelInfo = async () => {
  const response = await axiosInstance.get('/api/ml/model-info');
  return response.data;
};

export const getModelMetrics = async () => {
  const response = await axiosInstance.get('/api/ml/model-metrics');
  return response.data;
};