import { useState } from 'react';
import { useAuth } from '../AuthContext';
import NexharaLogo from '../components/NexharaLogo';

export default function LoginPage() {
  const { login, agentLogin, bankAdminLogin, logout } = useAuth();
  const [tab, setTab] = useState('staff');
  const [bankUserType, setBankUserType] = useState('admin'); // 'admin' | 'staff'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'agent') {
        await agentLogin(email, password);
      } else if (tab === 'bank') {
        if (bankUserType === 'admin') {
          await bankAdminLogin(email, password);
        } else {
          // Bank Staff — uses the main staff login, must have role bank_user
          const user = await login(email, password);
          if (user.role !== 'bank_user') {
            logout();
            throw new Error('This account is not a Bank Staff account.');
          }
        }
      } else {
        const user = await login(email, password);
        if (user.role === 'bank_user') {
          logout();
          throw new Error('Bank users should log in via the Bank Login tab.');
        }
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  const tabConfig = {
    staff: { accent: '#1a237e', label: 'Staff Login', heading: 'Sign in', sub: 'Secure access for lender updates & document review' },
    bank:  { accent: '#0d7377', label: 'Bank Login', heading: 'Bank Portal', sub: bankUserType === 'admin' ? 'Login as National Head, Region Head, Branch Manager or Officer' : 'Login as Bank Staff member' },
    agent: { accent: '#2563EB', label: 'Agent Login', heading: 'Agent Portal', sub: "Access your organization's loan pipeline & commissions" },
  };
  const cfg = tabConfig[tab];

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand" style={{ justifyContent: 'center', marginBottom: 24 }}>
          <NexharaLogo height={44} dark={false} />
        </div>

        {/* Portal Toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 4, marginBottom: 20, gap: 2 }}>
          {['staff', 'bank', 'agent'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(''); setEmail(''); setPassword(''); }}
              style={{
                flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
                fontWeight: 600, fontSize: 12,
                background: tab === t ? tabConfig[t].accent : 'transparent',
                color: tab === t ? '#fff' : '#64748b',
                transition: 'all 0.15s',
              }}
            >
              {tabConfig[t].label}
            </button>
          ))}
        </div>

        <h2 className="login-heading" style={{ marginTop: 0 }}>
          {cfg.heading}
        </h2>
        <p className="login-subheading">{cfg.sub}</p>

        {/* Bank user type radio — only shown on bank tab */}
        {tab === 'bank' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            {[
              { value: 'admin', label: 'Admin', desc: 'SUPER_ADMIN / Region Head / Branch Manager / Officer', icon: 'fa-user-shield' },
              { value: 'staff', label: 'Bank Staff', desc: 'Bank staff member account', icon: 'fa-user-tie' },
            ].map(opt => (
              <label key={opt.value} onClick={() => { setBankUserType(opt.value); setError(''); }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                  border: `2px solid ${bankUserType === opt.value ? '#0d7377' : '#e2e8f0'}`,
                  borderRadius: 8, cursor: 'pointer',
                  background: bankUserType === opt.value ? '#f0fdfa' : '#fff',
                  transition: 'all 0.15s',
                }}>
                <input type="radio" name="bankUserType" value={opt.value}
                  checked={bankUserType === opt.value}
                  onChange={() => { setBankUserType(opt.value); setError(''); }}
                  style={{ marginTop: 2, accentColor: '#0d7377' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: bankUserType === opt.value ? '#0d7377' : '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className={`fas ${opt.icon}`} style={{ fontSize: 12 }}></i> {opt.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <input
              type="email"
              className="login-input"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="login-form-group login-password-group">
            <input
              type={showPassword ? 'text' : 'password'}
              className="login-input"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword(s => !s)}
              tabIndex={-1}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
            style={{ background: cfg.accent }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="login-footer">
          &copy; 2026 Nexthara &middot; All rights reserved
        </div>
      </div>
    </div>
  );
}
