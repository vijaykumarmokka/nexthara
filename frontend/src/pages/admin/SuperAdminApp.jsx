import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import NexharaLogo from '../../components/NexharaLogo';
import { Toaster } from 'react-hot-toast';

// Existing views
import LeadsPage from '../leads/LeadsPage';
import LeadDetailPage from '../leads/LeadDetailPage';
import LeadAnalyticsPage from '../leads/LeadAnalyticsPage';
import EventsPage from '../events/EventsPage';
import EventDetailPage from '../events/EventDetailPage';
import UsersPage from '../UsersPage';
import KPICards from '../../components/Dashboard/KPICards';
import Pipeline from '../../components/Dashboard/Pipeline';
import CasesFilterChips from '../../components/Applications/CasesFilterChips';
import ApplicationTable from '../../components/Applications/ApplicationTable';
import ApplicationDetail from '../../components/Applications/ApplicationDetail';
import NewApplicationModal from '../../components/Applications/NewApplicationModal';
import { api } from '../../api';

// Admin views
import AdminDashboardPage from './AdminDashboardPage';
import AdminAutomationsPage from './AdminAutomationsPage';
import AdminTemplatesPage from './AdminTemplatesPage';
import AdminMastersPage from './AdminMastersPage';
import AdminReportsPage from './AdminReportsPage';
import AdminCommsPage from './AdminCommsPage';
import AdminOrgsPage from './AdminOrgsPage';
import AdminSettingsPage from './AdminSettingsPage';

// New Super Admin views
import AdminControlRoomPage from './AdminControlRoomPage';
import AdminLeadsCasesMonitorPage from './AdminLeadsCasesMonitorPage';
import AdminBanksGovPage from './AdminBanksGovPage';
import AdminEventsControlPage from './AdminEventsControlPage';
import AdminAgentsControlPage from './AdminAgentsControlPage';
import AdminAuditLogsPage from './AdminAuditLogsPage';
import AdminStagesTimelinePage from './AdminStagesTimelinePage';
import AdminFeatureFlagsPage from './AdminFeatureFlagsPage';

const NAV_SECTIONS = [
  {
    label: 'Command Center',
    items: [
      { key: 'master-dashboard', label: 'Master Dashboard',   icon: 'fa-tachometer-alt' },
      { key: 'control-room',    label: 'Live Control Room',   icon: 'fa-satellite-dish' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: 'leads',           label: 'Leads',               icon: 'fa-funnel-dollar' },
      { key: 'cases',           label: 'Cases',               icon: 'fa-briefcase' },
      { key: 'pipeline',        label: 'Pipeline',            icon: 'fa-stream' },
      { key: 'leads-monitor',   label: 'Leads & Cases Monitor', icon: 'fa-eye' },
      { key: 'events',          label: 'Events',              icon: 'fa-calendar-alt' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { key: 'reports',         label: 'Reports',             icon: 'fa-chart-bar' },
      { key: 'lead-analytics',  label: 'Lead Analytics',      icon: 'fa-chart-line' },
      { key: 'comms',           label: 'Communications',      icon: 'fa-envelope' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { key: 'stages-timelines', label: 'Stages & Timelines', icon: 'fa-layer-group' },
      { key: 'automations',     label: 'Automations & SLA',   icon: 'fa-robot' },
      { key: 'templates',       label: 'Templates',           icon: 'fa-file-alt' },
      { key: 'masters',         label: 'Master Data',         icon: 'fa-database' },
      { key: 'feature-flags',   label: 'Feature Flags',       icon: 'fa-toggle-on' },
    ],
  },
  {
    label: 'Management',
    items: [
      { key: 'banks-gov',       label: 'Banks Governance',    icon: 'fa-university' },
      { key: 'orgs',            label: 'Organizations',       icon: 'fa-building' },
      { key: 'events-control',  label: 'Events Control',      icon: 'fa-ticket-alt' },
      { key: 'agents-control',  label: 'Agents Control',      icon: 'fa-handshake' },
      { key: 'users',           label: 'Users & Roles',       icon: 'fa-users' },
    ],
  },
  {
    label: 'System',
    items: [
      { key: 'audit-logs',      label: 'Audit Logs',          icon: 'fa-shield-alt' },
      { key: 'settings',        label: 'System Settings',     icon: 'fa-cog' },
    ],
  },
];

const ALL_NAV = NAV_SECTIONS.flatMap(s => s.items);

export default function SuperAdminApp() {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState('master-dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // State for existing views
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filters, setFilters] = useState({});
  const [applications, setApplications] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const buildParams = useCallback(() => {
    const params = { page, limit: 30 };
    if (filters.search)  params.search  = filters.search;
    if (filters.status)  params.status  = filters.status;
    if (filters.intake)  params.intake  = filters.intake;
    if (activeFilter.startsWith('stage-'))    params.stage    = activeFilter.split('-')[1];
    else if (activeFilter.startsWith('await-'))    params.awaiting = activeFilter.split('-')[1];
    else if (activeFilter.startsWith('priority-')) params.priority = activeFilter.split('-')[1];
    else if (activeFilter.startsWith('sla-'))      params.sla      = activeFilter.split('-')[1];
    return params;
  }, [filters, activeFilter, page]);

  const APP_VIEWS = ['cases', 'pipeline'];
  useEffect(() => {
    if (!APP_VIEWS.includes(activeView)) return;
    const params = buildParams();
    api.getApplications(params).then(res => {
      setApplications(res.data);
      setTotal(res.total);
      setPages(res.pages);
    }).catch(() => {});
  }, [buildParams, refreshKey, activeView]);

  const handleNav = (key) => {
    setActiveView(key);
    setSelectedLeadId(null);
    if (!['events', 'events-control'].includes(key)) setSelectedEventId(null);
    if (['cases', 'pipeline'].includes(key)) { setActiveFilter('all'); setFilters({}); setPage(1); refresh(); }
  };

  const sidebarW = sidebarOpen ? 240 : 64;
  const currentLabel = ALL_NAV.find(n => n.key === activeView)?.label || 'Master Admin';

  return (
    <>
      <Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { background: '#1a1d4d', color: '#fff', fontSize: 13, borderRadius: 8 } }} />
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Roboto, sans-serif', background: '#f0f2f5' }}>

        {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
        <aside style={{
          width: sidebarW, minWidth: sidebarW, flexShrink: 0,
          background: 'linear-gradient(180deg, #1a1d4d 0%, #0d1033 100%)',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.2s', overflow: 'hidden',
          boxShadow: '2px 0 8px rgba(0,0,0,0.2)', zIndex: 10,
        }}>
          {/* Brand */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 60, flexShrink: 0 }}>
            {sidebarOpen ? (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <NexharaLogo height={26} dark={true} />
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5, marginTop: 3, textTransform: 'uppercase' }}>Global Control</div>
              </div>
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700, color: '#fff', fontSize: 14 }}>N</div>
            )}
            <button onClick={() => setSidebarOpen(s => !s)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, flexShrink: 0, padding: 4 }}>
              <i className={`fas fa-chevron-${sidebarOpen ? 'left' : 'right'}`}></i>
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>
            {NAV_SECTIONS.map(section => (
              <div key={section.label}>
                {sidebarOpen && (
                  <div style={{ padding: '8px 16px 3px', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {section.label}
                  </div>
                )}
                {section.items.map(item => {
                  const active = activeView === item.key ||
                    (item.key === 'events' && activeView === 'events-analytics') ||
                    (item.key === 'lead-analytics' && activeView === 'leads-analytics');
                  return (
                    <div
                      key={item.key}
                      onClick={() => handleNav(item.key)}
                      title={!sidebarOpen ? item.label : ''}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: sidebarOpen ? '8px 16px' : '8px 0',
                        justifyContent: sidebarOpen ? 'flex-start' : 'center',
                        cursor: 'pointer',
                        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                        borderLeft: `3px solid ${active ? '#4fc3f7' : 'transparent'}`,
                        color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                        fontSize: 12, transition: 'all 0.12s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <i className={`fas ${item.icon}`} style={{ width: 18, textAlign: 'center', fontSize: 13, flexShrink: 0, color: active ? '#4fc3f7' : 'inherit' }}></i>
                      {sidebarOpen && <span style={{ fontWeight: active ? 600 : 400 }}>{item.label}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User / Logout */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '8px 0', flexShrink: 0 }}>
            {sidebarOpen && (
              <div style={{ padding: '5px 16px 7px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Super Admin'}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>Director · Super Admin</div>
              </div>
            )}
            <div
              onClick={logout}
              title="Logout"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                padding: sidebarOpen ? '7px 16px' : '7px 0',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                color: '#ef9a9a', fontSize: 12,
              }}
            >
              <i className="fas fa-sign-out-alt" style={{ width: 18, textAlign: 'center', fontSize: 13 }}></i>
              {sidebarOpen && <span>Logout</span>}
            </div>
          </div>
        </aside>

        {/* ─── Main ────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Topbar */}
          <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1d4d' }}>{currentLabel}</div>
              {activeView === 'control-room' && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, letterSpacing: 0.5 }}>LIVE</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(activeView === 'cases' || activeView === 'pipeline') && (
                <button className="btn btn-primary" onClick={() => setShowNewModal(true)} style={{ fontSize: 12, padding: '6px 14px' }}>
                  <i className="fas fa-plus" style={{ marginRight: 6 }}></i> New Application
                </button>
              )}
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a1d4d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                {(user?.name || 'A')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{user?.name}</span>
            </div>
          </div>

          {/* Page Content */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 24, background: '#f0f2f5', minWidth: 0 }}>

            {/* ── Command Center ── */}
            {activeView === 'master-dashboard' && <AdminDashboardPage />}
            {activeView === 'control-room' && <AdminControlRoomPage />}

            {/* ── Operations ── */}
            {activeView === 'leads' && (
              <LeadsPage onOpenLead={(id) => setSelectedLeadId(id)} />
            )}
            {activeView === 'cases' && (
              <>
                <KPICards refreshKey={refreshKey} />
                <CasesFilterChips activeFilter={activeFilter} onFilterChange={(key) => { setActiveFilter(key); setPage(1); refresh(); }} filters={filters} onFiltersChange={(f) => { setFilters(f); setPage(1); }} refreshKey={refreshKey} />
                <ApplicationTable applications={applications} total={total} page={page} pages={pages} onPageChange={setPage} onSelectApp={setSelectedAppId} />
              </>
            )}
            {activeView === 'pipeline' && (
              <>
                <Pipeline refreshKey={refreshKey} />
                <CasesFilterChips activeFilter={activeFilter} onFilterChange={(key) => { setActiveFilter(key); setPage(1); refresh(); }} filters={filters} onFiltersChange={(f) => { setFilters(f); setPage(1); }} refreshKey={refreshKey} />
                <ApplicationTable applications={applications} total={total} page={page} pages={pages} onPageChange={setPage} onSelectApp={setSelectedAppId} />
              </>
            )}
            {activeView === 'leads-monitor' && <AdminLeadsCasesMonitorPage />}
            {activeView === 'events' && !selectedEventId && (
              <EventsPage onSelectEvent={(id) => setSelectedEventId(id)} />
            )}
            {activeView === 'events' && selectedEventId && (
              <EventDetailPage eventId={selectedEventId} onBack={() => setSelectedEventId(null)} />
            )}

            {/* ── Intelligence ── */}
            {activeView === 'reports' && <AdminReportsPage />}
            {activeView === 'lead-analytics' && <LeadAnalyticsPage />}
            {activeView === 'comms' && <AdminCommsPage />}

            {/* ── Configuration ── */}
            {activeView === 'stages-timelines' && <AdminStagesTimelinePage />}
            {activeView === 'automations' && <AdminAutomationsPage />}
            {activeView === 'templates' && <AdminTemplatesPage />}
            {activeView === 'masters' && <AdminMastersPage />}
            {activeView === 'feature-flags' && <AdminFeatureFlagsPage />}

            {/* ── Management ── */}
            {activeView === 'banks-gov' && <AdminBanksGovPage />}
            {activeView === 'orgs' && <AdminOrgsPage />}
            {activeView === 'events-control' && <AdminEventsControlPage />}
            {activeView === 'agents-control' && <AdminAgentsControlPage />}
            {activeView === 'users' && <UsersPage />}

            {/* ── System ── */}
            {activeView === 'audit-logs' && <AdminAuditLogsPage />}
            {activeView === 'settings' && <AdminSettingsPage />}
          </div>
        </div>

        {/* ── Modals / Drawers ── */}
        {selectedAppId && (
          <ApplicationDetail appId={selectedAppId} onClose={() => setSelectedAppId(null)} onUpdated={() => { setSelectedAppId(null); refresh(); }} />
        )}
        {selectedLeadId && (
          <LeadDetailPage leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} onOpenCase={(caseId) => { setSelectedLeadId(null); setSelectedAppId(caseId); handleNav('cases'); }} />
        )}
        {showNewModal && (
          <NewApplicationModal onClose={() => setShowNewModal(false)} onCreated={refresh} />
        )}
      </div>
    </>
  );
}
