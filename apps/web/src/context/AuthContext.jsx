import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeOrg, setActiveOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('postpilot_access_token');
      if (!token) {
        setUser(null);
        setActiveOrg(null);
        setLoading(false);
        return;
      }

      try {
        const { data } = await apiClient.get('/auth/me');
        setUser(data.data);

        // Restore active organization
        const savedOrgId = localStorage.getItem('postpilot_active_org_id');
        const memberships = data.data.memberships || [];
        const currentOrg = memberships.find((m) => m.orgId === savedOrgId) || memberships[0] || null;

        if (currentOrg) {
          setActiveOrg(currentOrg);
          localStorage.setItem('postpilot_active_org_id', currentOrg.orgId || currentOrg.id);
        }
      } catch (err) {
        console.warn('Session verification failed:', err.message);
        localStorage.clear();
        setUser(null);
        setActiveOrg(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    const { user: userData, organizations, tokens } = data.data;

    localStorage.setItem('postpilot_access_token', tokens.accessToken);
    localStorage.setItem('postpilot_refresh_token', tokens.refreshToken);

    setUser(userData);
    if (organizations && organizations.length > 0) {
      setActiveOrg(organizations[0]);
      localStorage.setItem('postpilot_active_org_id', organizations[0].id);
    }
    return data;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('postpilot_refresh_token');
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.clear();
      setUser(null);
      setActiveOrg(null);
    }
  };

  const switchOrganization = (org) => {
    setActiveOrg(org);
    localStorage.setItem('postpilot_active_org_id', org.orgId || org.id);
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrg,
        loading,
        login,
        logout,
        switchOrganization,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
