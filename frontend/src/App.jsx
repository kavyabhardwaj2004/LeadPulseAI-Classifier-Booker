import React, { createContext, useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { fetchTenants } from './api/client.js';

export const TenantContext = createContext();

export default function App() {
  const [tenants, setTenants] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const loadTenants = async () => {
    try {
      const data = await fetchTenants();
      setTenants(data.tenants || []);
      
      // Load saved tenant from localStorage if present
      const savedTenantId = localStorage.getItem('tenant_id');
      if (savedTenantId && data.tenants) {
        const found = data.tenants.find(t => t.tenant_id === savedTenantId);
        if (found) {
          setCurrentTenant(found);
        }
      }
    } catch (error) {
      console.error("Failed to load tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const selectTenant = (tenant) => {
    setCurrentTenant(tenant);
    if (tenant) {
      localStorage.setItem('tenant_id', tenant.tenant_id);
    } else {
      localStorage.removeItem('tenant_id');
    }
  };

  return (
    <TenantContext.Provider value={{ tenants, currentTenant, selectTenant, refreshTenants: loadTenants, loading }}>
      <div className="min-h-screen bg-[#0A0A0A] text-gray-100">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard/:tenantId" element={<Dashboard />} />
        </Routes>
      </div>
    </TenantContext.Provider>
  );
}
