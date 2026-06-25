import axios from "axios";
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const fetchLeads = async (tenantId, filters = {}) => {
  const params = { tenant_id: tenantId, ...filters };
  const response = await api.get('/leads', { params });
  return response.data;
};

export const fetchLead = async (leadId, tenantId) => {
  const response = await api.get(`/leads/${leadId}`, { params: { tenant_id: tenantId } });
  return response.data;
};

export const fetchMapLeads = async (tenantId) => {
  const response = await api.get(`/leads/map/${tenantId}`);
  return response.data;
};

export const fetchMetrics = async (tenantId) => {
  const response = await api.get(`/metrics/${tenantId}`);
  return response.data;
};

export const fetchTenants = async () => {
  const response = await api.get('/tenants');
  return response.data;
};

export const createTenant = async (data) => {
  const response = await api.post('/tenants', data);
  return response.data;
};

export const submitLead = async (data) => {
  const response = await api.post('/webhook/new-lead', data);
  return response.data;
};

export const submitLinkedIn = async (data) => {
  const response = await api.post('/webhook/linkedin', data);
  return response.data;
};

export const approveEmail = async (leadId, tenantId) => {
  const response = await api.put(`/leads/${leadId}/approve-email`, null, { params: { tenant_id: tenantId } });
  return response.data;
};

export const checkOAuthStatus = async () => {
  const response = await api.get('/oauth/status');
  return response.data;
};

export const startOAuth = async () => {
  const response = await api.get('/oauth/start');
  return response.data;
};

export default api;
