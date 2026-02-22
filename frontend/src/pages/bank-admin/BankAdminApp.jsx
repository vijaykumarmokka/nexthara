import { useState } from 'react';
import { useAuth } from '../../AuthContext';
import NexharaLogo from '../../components/NexharaLogo';
import BankSetupPage from './BankSetupPage';
import BankBranchesPage from './BankBranchesPage';
import BankUsersPage from './BankUsersPage';
import BankAnnouncementsPage from './BankAnnouncementsPage';
import BankPerformancePage from './BankPerformancePage';
import BankAnalyticsPage from './BankAnalyticsPage';
import BankApplicationsPage from './BankApplicationsPage';
import BankApplicationDetailPage from './BankApplicationDetailPage';
import BankApiKeysPage from './BankApiKeysPage';

const ROLE_LABELS = {
  SUPER_ADMIN: 'National Head',
  REGION_HEAD: 'Region Head',
  BRANCH_MANAGER: 'Branch Manager',
  OFFICER: 'Officer',
};

const NAV_BY_ROLE = {
  SUPER_ADMIN: [
    { key: 'performance', icon: 'fa-chart-bar', label: 'Dashboard' },
    { key: 'applications', icon: 'fa-file-alt', label: 'Applications' },
    { key: 'analytics', icon: 'fa-chart-line', label: 'Analytics' },
    { key: 'setup', icon: 'fa-cog', label: 'Bank Setup' },
    { key: 'branches', icon: 'fa-sitemap', label: 'Branches' },
    { key: 'users', icon: 'fa-users', label: 'Users' },
    { key: 'announcements', icon: 'fa-bullhorn', label: 'Announcements' },
    { key: 'api-keys', icon: 'fa-key', label: 'API Keys' },
  ],
  REGION_HEAD: [
    { key: 'performance', icon: 'fa-chart-bar', label: 'Dashboard' },
    { key: 'applications', icon: 'fa-file-alt', label: 'Applications' },
    { key: 'analytics', icon: 'fa-chart-line', label: 'Analytics' },
    { key: 'branches', icon: 'fa-sitemap', label: 'Branches' },
    { key: 'announcements', icon: 'fa-bullhorn', label: 'Announcements' },
  ],
  BRANCH_MANAGER: [
    { key: 'performance', icon: 'fa-chart-bar', label: 'Dashboard' },
    { key: 'applications', icon: 'fa-file-alt', label: 'Applications' },
    { key: 'users', icon: 'fa-users', label: 'Officers' },
    { key: 'announcements', icon: 'fa-bullhorn', label: 'Announcements' },
  ],
  OFFICER: [
    { key: 'performance', icon: 'fa-chart-bar', label: 'Dashboard' },
    { key: 'applications', icon: 'fa-file-alt', label: 'Applications' },
    { key: 'announcements', icon: 'fa-bullhorn', label: 'Announcements' },
  ],
};

export default function BankAdminApp() {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState('performance');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(null);

  const bankRole = user?.role || 'OFFICER';
  const bankId = user?.bank_id;
  const navItems = NAV_BY_ROLE[bankRole] || NAV_BY_ROLE.OFFICER;

  const sidebarW = sidebarCollapsed ? 60 : 220;

  return (
    <>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Roboto, sans-serif', background: '#f0f2f5' }}>

        {/* Sidebar */}
        <aside style={{
          width: sidebarW, minWidth: sidebarW, background: 'linear-gradient(180deg, #0d7377 0%, #14a085 100%)',
          display: 'flex', flexDirection: 'column', transition: 'width 0.2s', overflow: 'hidden',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)', zIndex: 10,
        }}>
          {/* Brand */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 64 }}>
            {sidebarCollapsed ? (
              <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fas fa-building" style={{ color: '#fff', fontSize: 14 }}></i>
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <NexharaLogo height={28} dark={true} />
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.5, marginTop: 3 }}>{user?.bank_name || 'Bank Partner Portal'}</div>
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(c => !c)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
              <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
            {navItems.map(item => (
              <div key={item.key}
                onClick={() => { setActiveView(item.key); if (item.key !== 'applications') setSelectedAppId(null); }}
                title={sidebarCollapsed ? item.label : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: sidebarCollapsed ? '12px 0' : '11px 16px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  cursor: 'pointer', borderLeft: '3px solid transparent',
                  background: activeView === item.key ? 'rgba(255,255,255,0.15)' : 'transparent',
                  borderLeftColor: activeView === item.key ? '#fff' : 'transparent',
                  color: activeView === item.key ? '#fff' : 'rgba(255,255,255,0.75)',
                  fontSize: 13, transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                <i className={`fas ${item.icon}`} style={{ width: 18, textAlign: 'center', fontSize: 15 }}></i>
                {!sidebarCollapsed && item.label}
              </div>
            ))}
          </nav>

          {/* User info */}
          {!sidebarCollapsed && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 10 }}>{ROLE_LABELS[bankRole] || bankRole}</div>
              <button onClick={logout} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', width: '100%' }}>
                <i className="fas fa-sign-out-alt" style={{ marginRight: 6 }}></i> Logout
              </button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0d7377' }}>
                {navItems.find(n => n.key === activeView)?.label || 'Dashboard'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Nexthara Bank Partner Portal · {user?.bank_name}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, background: '#e0f2f1', color: '#0d7377', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                {ROLE_LABELS[bankRole] || bankRole}
              </div>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#0d7377', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {(user?.name || 'U')[0].toUpperCase()}
              </div>
            </div>
          </div>

          {/* Page content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {activeView === 'performance' && <BankPerformancePage bankId={bankId} bankRole={bankRole} onOpenApp={id => { setSelectedAppId(id); setActiveView('applications'); }} />}
            {activeView === 'analytics' && <BankAnalyticsPage bankId={bankId} />}
            {activeView === 'applications' && !selectedAppId && (
              <BankApplicationsPage bankId={bankId} bankRole={bankRole} onOpenApp={id => setSelectedAppId(id)} />
            )}
            {activeView === 'applications' && selectedAppId && (
              <BankApplicationDetailPage appId={selectedAppId} bankId={bankId} bankRole={bankRole} onBack={() => setSelectedAppId(null)} />
            )}
            {activeView === 'setup' && <BankSetupPage bankId={bankId} />}
            {activeView === 'branches' && <BankBranchesPage bankId={bankId} bankRole={bankRole} />}
            {activeView === 'users' && <BankUsersPage bankId={bankId} bankRole={bankRole} />}
            {activeView === 'announcements' && <BankAnnouncementsPage bankId={bankId} bankRole={bankRole} />}
            {activeView === 'api-keys' && <BankApiKeysPage bankId={bankId} />}
          </div>
        </div>
      </div>
    </>
  );
}
