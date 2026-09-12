import axios from 'axios';

export const API_ORIGIN = 'http://localhost:4000';

const apiClient = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
