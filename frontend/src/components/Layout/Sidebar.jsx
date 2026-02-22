import { useEffect, useState } from 'react';
import { api } from '../../api';

export default function Sidebar({ activeFilter, onFilterChange, refreshKey }) {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    api.getSidebarCounts().then(setCounts).catch(() => {});
  }, [refreshKey]);

  if (!counts) return <aside className="sidebar"><div style={{ padding: 20, color: 'rgba(255,255,255,0.5)' }}>Loading...</div></aside>;

  const stageItems = [
    { key: 'stage-1', icon: 'fa-plug',          color: '#78909c', label: 'Pre-Login',        count: counts.stages[1] },
    { key: 'stage-2', icon: 'fa-sign-in-alt',   color: '#f9a825', label: 'Login Stage',      count: counts.stages[2] },
    { key: 'stage-3', icon: 'fa-file-alt',       color: '#e65100', label: 'Doc Verification', count: counts.stages[3] },
    { key: 'stage-4', icon: 'fa-search-dollar',  color: '#6a1b9a', label: 'Credit Review',    count: counts.stages[4] },
    { key: 'stage-5', icon: 'fa-gavel',          color: '#2e7d32', label: 'Decision',         count: counts.stages[5] },
    { key: 'stage-6', icon: 'fa-handshake',       color: '#1565c0', label: 'Post Sanction',    count: counts.stages[6] },
    { key: 'stage-7', icon: 'fa-flag-checkered',  color: '#37474f', label: 'Closed',           count: counts.stages[7] },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-section">Quick Filters</div>
      <div className={`sidebar-item ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => onFilterChange('all')}>
        <i className="fas fa-layer-group"></i> All Applications
        <span className="count">{counts.all}</span>
      </div>
      {stageItems.map(item => (
        <div key={item.key} className={`sidebar-item ${activeFilter === item.key ? 'active' : ''}`} onClick={() => onFilterChange(item.key)}>
          <i className={`fas ${item.icon}`} style={{ color: item.color }}></i> {item.label}
          <span className="count">{item.count}</span>
        </div>
      ))}

      <div className="sidebar-section" style={{ marginTop: 20 }}>Awaiting From</div>
      <div className={`sidebar-item ${activeFilter === 'await-Student' ? 'active' : ''}`} onClick={() => onFilterChange('await-Student')}>
        <i className="fas fa-user-graduate" style={{ color: '#f57f17' }}></i> Awaiting Student
        <span className="count">{counts.awaitStudent}</span>
      </div>
      <div className={`sidebar-item ${activeFilter === 'await-Bank' ? 'active' : ''}`} onClick={() => onFilterChange('await-Bank')}>
        <i className="fas fa-university" style={{ color: '#1565c0' }}></i> Awaiting Bank
        <span className="count">{counts.awaitBank}</span>
      </div>
      <div className={`sidebar-item ${activeFilter === 'await-Nexthara' ? 'active' : ''}`} onClick={() => onFilterChange('await-Nexthara')}>
        <i className="fas fa-building" style={{ color: '#78909c' }}></i> Awaiting Nexthara
        <span className="count">{counts.awaitNexthara}</span>
      </div>

      <div className="sidebar-section" style={{ marginTop: 20 }}>Priority</div>
      <div className={`sidebar-item ${activeFilter === 'priority-Urgent' ? 'active' : ''}`} onClick={() => onFilterChange('priority-Urgent')}>
        <i className="fas fa-exclamation-circle" style={{ color: '#e53935' }}></i> Urgent
        <span className="count">{counts.urgent}</span>
      </div>
      <div className={`sidebar-item ${activeFilter === 'priority-High' ? 'active' : ''}`} onClick={() => onFilterChange('priority-High')}>
        <i className="fas fa-arrow-up" style={{ color: '#ffa726' }}></i> High Priority
        <span className="count">{counts.high}</span>
      </div>

      <div className="sidebar-section" style={{ marginTop: 20 }}>SLA Alerts</div>
      <div className={`sidebar-item ${activeFilter === 'sla-breach' ? 'active' : ''}`} onClick={() => onFilterChange('sla-breach')}>
        <i className="fas fa-clock" style={{ color: '#e53935' }}></i> SLA Breach
        <span className="count" style={{ background: '#e53935', color: 'white' }}>{counts.slaBreach}</span>
      </div>
      <div className={`sidebar-item ${activeFilter === 'sla-warning' ? 'active' : ''}`} onClick={() => onFilterChange('sla-warning')}>
        <i className="fas fa-exclamation-triangle" style={{ color: '#f57f17' }}></i> SLA Warning
        <span className="count" style={{ background: '#f57f17', color: 'white' }}>{counts.slaWarning}</span>
      </div>

    </aside>
  );
}
