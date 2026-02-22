import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('nexthara_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Decode payload from token (no verify needed — server verifies on each request)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser({
            id: payload.id, name: payload.name, email: payload.email,
            role: payload.bank_role || payload.role, bank: payload.bank,
            portal: payload.portal || 'internal',
            organization_id: payload.organization_id,
            org_name: payload.org_name,
            branch_id: payload.branch_id,
            // Bank Admin Portal fields
            bank_id: payload.bank_id,
            bank_role: payload.bank_role,
            bank_name: payload.bank_name,
          });
        } else {
          // Token expired
          localStorage.removeItem('nexthara_token');
          setToken(null);
        }
      } catch {
        localStorage.removeItem('nexthara_token');
        setToken(null);
      }
    }
    setLoading(false);
  }, [token]);

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('nexthara_token', data.token);
    setToken(data.token);
    setUser({ ...data.user, portal: 'internal' });
    return data.user;
  }

  async function agentLogin(email, password) {
    const res = await fetch('/api/agent/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('nexthara_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function bankAdminLogin(email, password) {
    const res = await fetch('/api/bank-admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('nexthara_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  const logout = useCallback(() => {
    localStorage.removeItem('nexthara_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, agentLogin, bankAdminLogin, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
