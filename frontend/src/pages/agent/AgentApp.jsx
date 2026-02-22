import { useState, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import NexharaLogo from '../../components/NexharaLogo';
import AgentDashboard from './AgentDashboard';
import AgentLeadsPage from './AgentLeadsPage';
import AgentCasesPage from './AgentCasesPage';
import AgentBankAppsPage from './AgentBankAppsPage';
import AgentStudentsPage from './AgentStudentsPage';
import AgentCommissionsPage from './AgentCommissionsPage';
import AgentReportsPage from './AgentReportsPage';
import AgentSettingsPage from './AgentSettingsPage';

const NAV_ITEMS = [
  { key: 'dashboard',   label: 'Dashboard',        icon: 'fa-chart-line' },
  { key: 'leads',       label: 'Leads',             icon: 'fa-user-plus' },
  { key: 'cases',       label: 'Cases',             icon: 'fa-briefcase' },
  { key: 'bank-apps',   label: 'Bank Applications', icon: 'fa-university' },
  { key: 'students',    label: 'Students',          icon: 'fa-graduation-cap' },
  { key: 'commissions', label: 'Commissions',       icon: 'fa-rupee-sign' },
  { key: 'reports',     label: 'Reports',           icon: 'fa-chart-bar' },
  { key: 'settings',    label: 'Settings',          icon: 'fa-cog' },
];

export default function AgentApp() {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleNav = useCallback((key) => setActiveView(key), []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--body-bg)', fontFamily: 'Roboto, sans-serif' }}>
      {/* ─── Sidebar ──────────────────────────────────────────────────── */}
      <aside style={{
        width: sidebarOpen ? 240 : 64, flexShrink: 0,
        background: 'var(--sidebar-bg)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s', overflow: 'hidden',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {sidebarOpen ? (
            <div style={{ flex: 1 }}>
              <NexharaLogo height={26} dark={true} />
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>Agent Portal</div>
            </div>
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, color: '#fff', fontSize: 14 }}>N</div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const active = activeView === item.key;
            return (
              <div
                key={item.key}
                className={`sidebar-item${active ? ' active' : ''}`}
                onClick={() => handleNav(item.key)}
                title={!sidebarOpen ? item.label : ''}
                style={{ padding: sidebarOpen ? '11px 20px' : '11px 0', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
              >
                <i className={`fas ${item.icon}`}></i>
                {sidebarOpen && <span>{item.label}</span>}
              </div>
            );
          })}
        </nav>

        {/* Org info + logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '8px 0', flexShrink: 0 }}>
          {sidebarOpen && (
            <div style={{ padding: '8px 20px', marginBottom: 2 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.org_name || 'My Organization'}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{user?.role?.replace('_', ' ')}</div>
            </div>
          )}
          <div
            className="sidebar-item"
            onClick={logout}
            title="Logout"
            style={{ color: '#ef9a9a', padding: sidebarOpen ? '11px 20px' : '11px 0', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
          >
            <i className="fas fa-sign-out-alt"></i>
            {sidebarOpen && <span>Logout</span>}
          </div>
        </div>
      </aside>

      {/* ─── Main area ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          background: 'var(--header-gradient)', color: '#fff',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16,
          height: 56, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <button
            onClick={() => setSidebarOpen(s => !s)}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}
          >
            <i className="fas fa-bars"></i>
          </button>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 600, letterSpacing: 0.3 }}>
            {NAV_ITEMS.find(n => n.key === activeView)?.label || ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{user?.name}</span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'var(--body-bg)' }}>
          {activeView === 'dashboard'   && <AgentDashboard />}
          {activeView === 'leads'       && <AgentLeadsPage />}
          {activeView === 'cases'       && <AgentCasesPage />}
          {activeView === 'bank-apps'   && <AgentBankAppsPage />}
          {activeView === 'students'    && <AgentStudentsPage />}
          {activeView === 'commissions' && <AgentCommissionsPage />}
          {activeView === 'reports'     && <AgentReportsPage />}
          {activeView === 'settings'    && <AgentSettingsPage />}
        </main>
      </div>
    </div>
  );
}
