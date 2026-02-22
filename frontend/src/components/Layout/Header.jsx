import { useAuth } from '../../AuthContext';
import NexharaLogo from '../NexharaLogo';

const SUPER_ADMIN_NAV = [
  { key: 'leads',           icon: 'fa-funnel-dollar',  label: 'Leads' },
  { key: 'events',          icon: 'fa-calendar-alt',   label: 'Events' },
  { key: 'dashboard',       icon: 'fa-th-large',       label: 'Cases' },
  { key: 'applications',    icon: 'fa-file-alt',       label: 'Applications' },
  { key: 'pipeline',        icon: 'fa-stream',         label: 'Pipeline' },
  { key: 'leads-analytics', icon: 'fa-chart-line',     label: 'Reports' },
  { key: 'users',           icon: 'fa-users',          label: 'Users' },
];

const BANK_USER_NAV = [
  { key: 'dashboard',      icon: 'fa-th-large',        label: 'Dashboard' },
  { key: 'applications',   icon: 'fa-file-alt',        label: 'Applications' },
  { key: 'queries',        icon: 'fa-question-circle', label: 'Queries' },
  { key: 'sanctions',      icon: 'fa-check-double',    label: 'Sanctions' },
  { key: 'disbursements',  icon: 'fa-money-bill-wave', label: 'Disbursements' },
  { key: 'reports',        icon: 'fa-chart-bar',       label: 'Reports' },
];

export default function Header({ activeView, onViewChange }) {
  const { user, logout } = useAuth();

  const navItems = user?.role === 'bank_user' ? BANK_USER_NAV : SUPER_ADMIN_NAV;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const roleLabel = user?.role === 'super_admin'
    ? 'Super Admin'
    : user?.bank ? `${user.bank} User` : 'Bank User';

  return (
    <header className="top-bar">
      <div className="top-bar-upper">
        <div className="brand">
          <NexharaLogo height={32} dark={true} />
          <div className="brand-text">
            <span>{user?.role === 'bank_user' ? 'Bank Partner Portal' : 'Bank Application Status Portal'}</span>
          </div>
        </div>
        <div className="header-right">
          <button className="notif-btn" title="Notifications">
            <i className="fas fa-bell"></i>
            <span className="badge-count">5</span>
          </button>
          <div className="user-profile">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="name">{user?.name || 'User'}</div>
              <div className="role">{roleLabel}</div>
            </div>
            <i className="fas fa-chevron-down" style={{ fontSize: 10, opacity: 0.7, color: 'white' }}></i>
          </div>
          <button className="notif-btn" title="Sign out" onClick={logout} style={{ marginLeft: -8 }}>
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
      <nav className="top-bar-nav">
        {navItems.map(item => (
          <div
            key={item.key}
            className={`nav-item ${activeView === item.key || (item.key === 'events' && activeView === 'events-analytics') ? 'active' : ''}`}
            onClick={() => onViewChange(item.key)}
          >
            <i className={`fas ${item.icon}`}></i> {item.label}
          </div>
        ))}
      </nav>
    </header>
  );
}
