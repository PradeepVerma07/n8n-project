import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client.js';

const AuthContext = createContext(null);

const POSTPILOT_KEYS = [
  'postpilot_access_token',
  'postpilot_refresh_token',
  'postpilot_active_org_id',
  'postpilot_session_expired',
];

/**
 * Removes only PostPilot-owned localStorage keys to preserve unrelated tenant or browser state.
 */
export function clearPostPilotStorage() {
  for (const key of POSTPILOT_KEYS) {
    localStorage.removeItem(key);
  }
  // Remove brand keys
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('postpilot_')) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeOrg, setActiveOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

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
        clearPostPilotStorage();
        setUser(null);
        setActiveOrg(null);
        setSessionExpired(true);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email, password, rememberMe = true) => {
    setSessionExpired(false);
    // Normalize input
    const normalizedEmail = (email || '').trim().toLowerCase();
    const { data } = await apiClient.post('/auth/login', { email: normalizedEmail, password });
    const { user: userData, organizations, tokens } = data.data;

    localStorage.setItem('postpilot_access_token', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('postpilot_refresh_token', tokens.refreshToken);
    }

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
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      clearPostPilotStorage();
      setUser(null);
      setActiveOrg(null);
      setSessionExpired(false);
    }
  };

  const switchOrganization = useCallback((org) => {
    setActiveOrg(org);
    localStorage.setItem('postpilot_active_org_id', org.orgId || org.id);
  }, []);

  const currentRole = activeOrg?.role || user?.memberships?.[0]?.role || 'CLIENT_VIEWER';

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrg,
        currentRole,
        loading,
        sessionExpired,
        clearSessionExpired: () => setSessionExpired(false),
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
