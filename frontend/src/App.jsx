import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './AuthContext';

// Shared layout
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';

// Super admin views
import KPICards from './components/Dashboard/KPICards';
import Pipeline from './components/Dashboard/Pipeline';
import FilterBar from './components/Applications/FilterBar';
import ApplicationTable from './components/Applications/ApplicationTable';
import ApplicationDetail from './components/Applications/ApplicationDetail';
import NewApplicationModal from './components/Applications/NewApplicationModal';
import UsersPage from './pages/UsersPage';

// Lead Panel views
import LeadsPage from './pages/leads/LeadsPage';
import LeadDetailPage from './pages/leads/LeadDetailPage';
import LeadAnalyticsPage from './pages/leads/LeadAnalyticsPage';

// Agent Portal
import AgentApp from './pages/agent/AgentApp';

// Bank Admin Portal (NBPP)
import BankAdminApp from './pages/bank-admin/BankAdminApp';

// Super Admin Master Brain
import SuperAdminApp from './pages/admin/SuperAdminApp';

// Bank user views
import BankDashboard from './pages/bank/BankDashboard';
import BankApplicationsPage from './pages/bank/BankApplicationsPage';
import BankApplicationDetail from './pages/bank/BankApplicationDetail';
import BankQueriesPage from './pages/bank/BankQueriesPage';
import BankSanctionsPage from './pages/bank/BankSanctionsPage';
import BankDisbursementsPage from './pages/bank/BankDisbursementsPage';
import BankReportsPage from './pages/bank/BankReportsPage';

// Events (public + staff)
import EventsPage from './pages/events/EventsPage';
import EventDetailPage from './pages/events/EventDetailPage';
import EventAnalyticsPage from './pages/events/EventAnalyticsPage';
import EventRegistrationPage from './pages/events/EventRegistrationPage';
import EventTicketPage from './pages/events/EventTicketPage';

// Auth
import LoginPage from './pages/LoginPage';
import { api } from './api';

export default function App() {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const [activeView, setActiveView] = useState('leads');
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Super admin state
  const [activeFilter, setActiveFilter]   = useState('all');
  const [filters, setFilters]             = useState({});
  const [applications, setApplications]   = useState(null);
  const [total, setTotal]                 = useState(0);
  const [page, setPage]                   = useState(1);
  const [pages, setPages]                 = useState(1);
  const [showNewModal, setShowNewModal]   = useState(false);
  const [refreshKey, setRefreshKey]       = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Set correct default view based on user role after login
  const BANK_USER_VIEWS = ['dashboard', 'applications', 'queries', 'sanctions', 'disbursements', 'reports'];
  const EXEC_VIEWS = ['leads', 'dashboard', 'applications', 'leads-analytics'];
  useEffect(() => {
    if (user?.role === 'bank_user' && !BANK_USER_VIEWS.includes(activeView)) {
      setActiveView('dashboard');
    }
    // LOAN_EXECUTIVE: restrict to their allowed views
    if (user?.role === 'LOAN_EXECUTIVE' && !EXEC_VIEWS.includes(activeView)) {
      setActiveView('leads');
    }
  }, [user]);

  // Listen for forced logout (401 from API)
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('nexthara_logout', handler);
    return () => window.removeEventListener('nexthara_logout', handler);
  }, [logout]); // logout is now stable (useCallback), so this registers once

  const buildParams = useCallback(() => {
    const params = { page, limit: 30 };
    if (filters.search)   params.search   = filters.search;
    if (filters.status)   params.status   = filters.status;
    if (filters.awaiting) params.awaiting = filters.awaiting;
    if (filters.priority) params.priority = filters.priority;
    if (filters.intake)   params.intake   = filters.intake;
    if (filters.sla)      params.sla      = filters.sla;
    if (activeFilter.startsWith('stage-'))    params.stage    = activeFilter.split('-')[1];
    else if (activeFilter.startsWith('await-'))   params.awaiting = activeFilter.split('-')[1];
    else if (activeFilter.startsWith('priority-')) params.priority = activeFilter.split('-')[1];
    else if (activeFilter.startsWith('sla-'))     params.sla      = activeFilter.split('-')[1];
    return params;
  }, [filters, activeFilter, page]);

  // Fetch applications (internal CRM views only)
  const APP_VIEWS = ['dashboard', 'applications', 'pipeline'];
  useEffect(() => {
    if (!isAuthenticated || user?.role === 'bank_user') return;
    // Bank portal users have their own API — skip here
    if (['BANK_SUPER_ADMIN','BANK_REGION_HEAD','BANK_BRANCH_MANAGER','BANK_OFFICER'].includes(user?.role)) return;
    if (!APP_VIEWS.includes(activeView)) return;
    const params = buildParams();
    api.getApplications(params).then(res => {
      setApplications(res.data);
      setTotal(res.total);
      setPages(res.pages);
    }).catch(() => {});
  }, [buildParams, refreshKey, isAuthenticated, activeView, user]);

  const handleFilterChange = (newFilters) => { setFilters(newFilters); setPage(1); };
  const handleSidebarFilter = (key) => { setActiveFilter(key); setFilters({}); setPage(1); };
  const handleViewChange = (view) => {
    setActiveView(view);
    setSelectedLeadId(null);
    if (view !== 'events' && view !== 'events-analytics') setSelectedEventId(null);
    if (['dashboard', 'applications'].includes(view)) {
      setActiveFilter('all'); setFilters({}); setPage(1); refresh();
    }
  };

  if (loading) return null;

  // Public routes (no auth required)
  const path = window.location.pathname;
  if (path.startsWith('/event/') || path.startsWith('/ticket/')) {
    return (
      <Routes>
        <Route path="/event/:slug" element={<EventRegistrationPage />} />
        <Route path="/ticket/:code" element={<EventTicketPage />} />
      </Routes>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  // ─────────────────────────────────────────────
  // SUPER ADMIN MASTER BRAIN (SUPER_ADMIN only)
  // ─────────────────────────────────────────────
  if (user?.role === 'SUPER_ADMIN') {
    return <SuperAdminApp />;
  }

  // LOAN_HEAD + LOAN_EXECUTIVE → fall through to regular CRM view below

  // ─────────────────────────────────────────────
  // BANK ADMIN PORTAL (NBPP)
  // ─────────────────────────────────────────────
  if (user?.portal === 'bank_admin') {
    return (
      <>
        <Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { background: '#0d7377', color: '#fff', fontSize: 13, borderRadius: 8 } }} />
        <BankAdminApp />
      </>
    );
  }

  // ─────────────────────────────────────────────
  // AGENT PORTAL (B2B)
  // ─────────────────────────────────────────────
  if (user?.portal === 'agent') {
    return (
      <>
        <Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { background: '#1e3a5f', color: '#fff', fontSize: 13, borderRadius: 8 } }} />
        <AgentApp />
      </>
    );
  }

  // ─────────────────────────────────────────────
  // BANK USER PORTAL
  // ─────────────────────────────────────────────
  if (user?.role === 'bank_user') {
    return (
      <>
        <Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { background: '#1b5e20', color: '#fff', fontSize: 13, borderRadius: 8 } }} />
        <Header activeView={activeView} onViewChange={handleViewChange} />
        <div className="main-wrapper">
          <main className="content content-full" style={{ paddingTop: 24 }}>
            {activeView === 'dashboard'     && <BankDashboard      onOpenApp={setSelectedAppId} />}
            {activeView === 'applications'  && <BankApplicationsPage onOpenApp={setSelectedAppId} />}
            {activeView === 'queries'       && <BankQueriesPage    onOpenApp={setSelectedAppId} />}
            {activeView === 'sanctions'     && <BankSanctionsPage  onOpenApp={setSelectedAppId} />}
            {activeView === 'disbursements' && <BankDisbursementsPage onOpenApp={setSelectedAppId} />}
            {activeView === 'reports'       && <BankReportsPage />}
          </main>
        </div>
        {selectedAppId && (
          <BankApplicationDetail
            appId={selectedAppId}
            onClose={() => setSelectedAppId(null)}
            onUpdated={() => setSelectedAppId(null)}
          />
        )}
      </>
    );
  }

  // ─────────────────────────────────────────────
  // SUPER ADMIN PORTAL
  // ─────────────────────────────────────────────
  const isLeadView = ['leads', 'leads-analytics'].includes(activeView);
  const isEventView = ['events', 'events-analytics'].includes(activeView);
  return (
    <>
      <Toaster position="bottom-right" toastOptions={{ duration: 3000, style: { background: '#1b5e20', color: '#fff', fontSize: 13, borderRadius: 8 } }} />
      <Header activeView={activeView} onViewChange={handleViewChange} />
      <div className="main-wrapper">
        {!isLeadView && !isEventView && activeView !== 'users' && (
          <Sidebar activeFilter={activeFilter} onFilterChange={handleSidebarFilter} refreshKey={refreshKey} />
        )}
        <main className={`content${(activeView === 'users' || isLeadView || isEventView) ? ' content-full' : ''}`}>

          {/* EVENTS */}
          {activeView === 'events' && !selectedEventId && (
            <EventsPage
              onSelectEvent={(id) => setSelectedEventId(id)}
            />
          )}
          {activeView === 'events' && selectedEventId && (
            <EventDetailPage
              eventId={selectedEventId}
              onBack={() => setSelectedEventId(null)}
            />
          )}

          {/* EVENTS ANALYTICS */}
          {activeView === 'events-analytics' && (
            <EventAnalyticsPage
              eventId={selectedEventId}
              onBack={() => handleViewChange('events')}
            />
          )}

          {/* LEAD PANEL */}
          {activeView === 'leads' && (
            <>
              <div className="breadcrumb">
                <a href="#" onClick={e => { e.preventDefault(); handleViewChange('leads'); }}>Home</a>
                <i className="fas fa-chevron-right" style={{ fontSize: 10 }}></i> Lead Management Panel
              </div>
              <LeadsPage onOpenLead={(id) => setSelectedLeadId(id)} />
            </>
          )}

          {/* LEAD ANALYTICS */}
          {activeView === 'leads-analytics' && (
            <>
              <div className="breadcrumb">
                <a href="#" onClick={e => { e.preventDefault(); handleViewChange('leads'); }}>Leads</a>
                <i className="fas fa-chevron-right" style={{ fontSize: 10 }}></i> Analytics
              </div>
              <LeadAnalyticsPage />
            </>
          )}

          {/* USERS */}
          {activeView === 'users' && (
            <>
              <div className="breadcrumb">
                <a href="#" onClick={e => { e.preventDefault(); handleViewChange('dashboard'); }}>Home</a>
                <i className="fas fa-chevron-right" style={{ fontSize: 10 }}></i> User Management
              </div>
              <UsersPage />
            </>
          )}

          {/* DASHBOARD */}
          {activeView === 'dashboard' && (
            <>
              <div className="breadcrumb">
                <a href="#" onClick={e => { e.preventDefault(); handleViewChange('dashboard'); }}>Home</a>
                <i className="fas fa-chevron-right" style={{ fontSize: 10 }}></i> Dashboard
              </div>
              <div className="page-header">
                <div><h2>Application Dashboard</h2><div className="subtitle">Overview of all bank application statuses across lenders</div></div>
                <div className="header-actions">
                  <button className="btn btn-outline" onClick={refresh}><i className="fas fa-sync-alt"></i> Refresh</button>
                  <button className="btn btn-primary" onClick={() => setShowNewModal(true)}><i className="fas fa-plus"></i> New Application</button>
                </div>
              </div>
              <KPICards refreshKey={refreshKey} />
              <Pipeline refreshKey={refreshKey} />
              <FilterBar filters={filters} onFilterChange={handleFilterChange} />
              <ApplicationTable applications={applications} total={total} page={page} pages={pages} onPageChange={setPage} onSelectApp={setSelectedAppId} />
            </>
          )}

          {/* APPLICATIONS */}
          {activeView === 'applications' && (
            <>
              <div className="breadcrumb">
                <a href="#" onClick={e => { e.preventDefault(); handleViewChange('dashboard'); }}>Home</a>
                <i className="fas fa-chevron-right" style={{ fontSize: 10 }}></i> All Applications
              </div>
              <div className="page-header">
                <div><h2>All Applications</h2><div className="subtitle">Complete list of bank applications</div></div>
                <div className="header-actions">
                  <button className="btn btn-outline" onClick={refresh}><i className="fas fa-sync-alt"></i> Refresh</button>
                  <button className="btn btn-primary" onClick={() => setShowNewModal(true)}><i className="fas fa-plus"></i> New Application</button>
                </div>
              </div>
              <FilterBar filters={filters} onFilterChange={handleFilterChange} />
              <ApplicationTable applications={applications} total={total} page={page} pages={pages} onPageChange={setPage} onSelectApp={setSelectedAppId} />
            </>
          )}

          {/* PIPELINE */}
          {activeView === 'pipeline' && (
            <>
              <div className="breadcrumb">
                <a href="#" onClick={e => { e.preventDefault(); handleViewChange('dashboard'); }}>Home</a>
                <i className="fas fa-chevron-right" style={{ fontSize: 10 }}></i> Pipeline View
              </div>
              <div className="page-header">
                <div><h2>Application Pipeline</h2><div className="subtitle">Stage-wise breakdown of all applications</div></div>
              </div>
              <Pipeline refreshKey={refreshKey} />
              <div style={{ marginBottom: 16 }}>
                <PipelineTabs activeFilter={activeFilter} onFilterChange={handleSidebarFilter} />
              </div>
              <ApplicationTable applications={applications} total={total} page={page} pages={pages} onPageChange={setPage} onSelectApp={setSelectedAppId} />
            </>
          )}
        </main>
      </div>

      {selectedAppId && (
        <ApplicationDetail appId={selectedAppId} onClose={() => setSelectedAppId(null)} onUpdated={() => { setSelectedAppId(null); refresh(); }} />
      )}
      {selectedLeadId && (
        <LeadDetailPage leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} onOpenCase={(caseId) => { setSelectedLeadId(null); setSelectedAppId(caseId); handleViewChange('applications'); }} />
      )}
      {showNewModal && (
        <NewApplicationModal onClose={() => setShowNewModal(false)} onCreated={refresh} />
      )}
    </>
  );
}

function PipelineTabs({ activeFilter, onFilterChange }) {
  const stages = [
    { key: 'all',     label: 'All' },
    { key: 'stage-1', label: 'Stage 1: Pre-Login' },
    { key: 'stage-2', label: 'Stage 2: Login' },
    { key: 'stage-3', label: 'Stage 3: Docs' },
    { key: 'stage-4', label: 'Stage 4: Credit' },
    { key: 'stage-5', label: 'Stage 5: Decision' },
    { key: 'stage-6', label: 'Stage 6: Post Sanction' },
    { key: 'stage-7', label: 'Stage 7: Closed' },
  ];
  return (
    <div className="stage-tabs">
      {stages.map(s => (
        <div key={s.key} className={`stage-tab ${activeFilter === s.key ? 'active' : ''}`} onClick={() => onFilterChange(s.key)}>
          {s.label}
        </div>
      ))}
    </div>
  );
}
