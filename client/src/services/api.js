import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);

// Connections
export const searchUsers = (query) => api.get(`/connections/search?q=${encodeURIComponent(query)}`);
export const getConnections = () => api.get('/connections');
export const getPendingConnections = () => api.get('/connections/pending');
export const getSentConnections = () => api.get('/connections/sent');
export const sendConnectionRequest = (userId) => api.post('/connections', { userId });
export const acceptConnection = (id) => api.post(`/connections/${id}/accept`);
export const rejectConnection = (id) => api.post(`/connections/${id}/reject`);
export const removeConnection = (id) => api.delete(`/connections/${id}`);

// Bets
export const getBets = () => api.get('/bets');
export const getUpcomingBets = () => api.get('/bets/upcoming');
export const getPendingBets = () => api.get('/bets/pending');
export const getUncompletedBets = () => api.get('/bets/uncompleted');
export const getCompletedBets = () => api.get('/bets/completed');
export const getRejectedBets = () => api.get('/bets/rejected');
export const getDisputedBets = () => api.get('/bets/disputed');
export const getBet = (id) => api.get(`/bets/${id}`);
export const createBet = (data) => api.post('/bets', data);
export const agreeToBet = (id, opponentSide) => api.post(`/bets/${id}/agree`, { opponentSide });
export const declineBet = (id) => api.post(`/bets/${id}/decline`);
export const completeBet = (id, winnerId) => api.post(`/bets/${id}/complete`, { winnerId });

export default api;
