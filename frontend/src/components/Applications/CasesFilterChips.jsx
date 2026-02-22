import { useEffect, useState } from 'react';
import { api } from '../../api';
import { STATUS_CONFIG } from '../../constants';

const INTAKE_OPTIONS = ['2024-09','2025-01','2025-05','2025-09','2026-01','2026-05','2026-09'];

const STAGE_CHIPS = [
  { key: 'all',        label: 'All',          icon: 'fa-layer-group',      color: '#374151' },
  { key: 'stage-1',   label: 'Pre-Login',     icon: 'fa-plug',             color: '#78909c' },
  { key: 'stage-2',   label: 'Login',         icon: 'fa-sign-in-alt',      color: '#f9a825' },
  { key: 'stage-3',   label: 'Docs',          icon: 'fa-file-alt',         color: '#e65100' },
  { key: 'stage-4',   label: 'Credit',        icon: 'fa-search-dollar',    color: '#6a1b9a' },
  { key: 'stage-5',   label: 'Decision',      icon: 'fa-gavel',            color: '#2e7d32' },
  { key: 'stage-6',   label: 'Post Sanction', icon: 'fa-handshake',        color: '#1565c0' },
  { key: 'stage-7',   label: 'Closed',        icon: 'fa-flag-checkered',   color: '#37474f' },
];

const AWAIT_CHIPS = [
  { key: 'await-Student',  label: 'Student',  icon: 'fa-user-graduate', color: '#f57f17' },
  { key: 'await-Bank',     label: 'Bank',     icon: 'fa-university',    color: '#1565c0' },
  { key: 'await-Nexthara', label: 'Nexthara', icon: 'fa-building',      color: '#78909c' },
];

const PRIORITY_CHIPS = [
  { key: 'priority-Urgent', label: 'Urgent',   icon: 'fa-exclamation-circle',   color: '#e53935' },
  { key: 'priority-High',   label: 'High',     icon: 'fa-arrow-up',             color: '#ffa726' },
];

const SLA_CHIPS = [
  { key: 'sla-breach',  label: 'SLA Breach',  icon: 'fa-clock',                color: '#e53935' },
  { key: 'sla-warning', label: 'SLA Warning', icon: 'fa-exclamation-triangle', color: '#f57f17' },
];

function Chip({ chipKey, label, icon, color, count, active, onClick }) {
  return (
    <button
      onClick={() => onClick(chipKey)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 11px', borderRadius: 20, border: `1.5px solid ${active ? color : '#e5e7eb'}`,
        background: active ? color + '18' : '#fff',
        color: active ? color : '#4b5563',
        fontSize: 12, fontWeight: active ? 700 : 500,
        cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        transition: 'all 0.12s',
      }}
    >
      <i className={`fas ${icon}`} style={{ fontSize: 10 }}></i>
      {label}
      {count !== undefined && (
        <span style={{
          background: active ? color : '#f3f4f6',
          color: active ? '#fff' : '#6b7280',
          borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700, marginLeft: 2,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: '#e5e7eb', flexShrink: 0, alignSelf: 'center' }} />;
}

export default function CasesFilterChips({ activeFilter, onFilterChange, filters, onFiltersChange, refreshKey }) {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    api.getSidebarCounts().then(setCounts).catch(() => {});
  }, [refreshKey]);

  const c = counts || {};

  const handleSearchChange = (e) => onFiltersChange({ ...filters, search: e.target.value });
  const handleStatusChange = (e) => onFiltersChange({ ...filters, status: e.target.value });
  const handleIntakeChange = (e) => onFiltersChange({ ...filters, intake: e.target.value });

  const hasFilters = filters.search || filters.status || filters.intake || (activeFilter && activeFilter !== 'all');

  const clearAll = () => {
    onFiltersChange({});
    onFilterChange('all');
  };

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: '#f0f2f5',
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: 10,
      marginBottom: 16,
    }}>
      {/* Row 1: Search + dropdowns + clear */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 12 }}></i>
          <input
            type="text"
            placeholder="Search name, case ID, bank…"
            value={filters.search || ''}
            onChange={handleSearchChange}
            style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, width: 230, background: '#fff', outline: 'none' }}
          />
        </div>

        <select value={filters.status || ''} onChange={handleStatusChange} style={{ padding: '7px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: '#fff', color: '#374151', cursor: 'pointer' }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        <select value={filters.intake || ''} onChange={handleIntakeChange} style={{ padding: '7px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: '#fff', color: '#374151', cursor: 'pointer' }}>
          <option value="">All Intakes</option>
          {INTAKE_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
        </select>

        {hasFilters && (
          <button onClick={clearAll} style={{ padding: '6px 12px', border: '1.5px solid #fca5a5', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <i className="fas fa-times" style={{ fontSize: 10 }}></i> Clear all
          </button>
        )}
      </div>

      {/* Row 2: Chip groups */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {/* Stage chips */}
        {STAGE_CHIPS.map(ch => (
          <Chip
            key={ch.key}
            chipKey={ch.key}
            label={ch.label}
            icon={ch.icon}
            color={ch.color}
            count={ch.key === 'all' ? c.all : c.stages?.[Number(ch.key.split('-')[1])]}
            active={activeFilter === ch.key}
            onClick={onFilterChange}
          />
        ))}

        <Divider />

        {/* Awaiting chips */}
        {AWAIT_CHIPS.map(ch => (
          <Chip
            key={ch.key}
            chipKey={ch.key}
            label={ch.label}
            icon={ch.icon}
            color={ch.color}
            count={ch.key === 'await-Student' ? c.awaitStudent : ch.key === 'await-Bank' ? c.awaitBank : c.awaitNexthara}
            active={activeFilter === ch.key}
            onClick={onFilterChange}
          />
        ))}

        <Divider />

        {/* Priority chips */}
        {PRIORITY_CHIPS.map(ch => (
          <Chip
            key={ch.key}
            chipKey={ch.key}
            label={ch.label}
            icon={ch.icon}
            color={ch.color}
            count={ch.key === 'priority-Urgent' ? c.urgent : c.high}
            active={activeFilter === ch.key}
            onClick={onFilterChange}
          />
        ))}

        <Divider />

        {/* SLA chips */}
        {SLA_CHIPS.map(ch => (
          <Chip
            key={ch.key}
            chipKey={ch.key}
            label={ch.label}
            icon={ch.icon}
            color={ch.color}
            count={ch.key === 'sla-breach' ? c.slaBreach : c.slaWarning}
            active={activeFilter === ch.key}
            onClick={onFilterChange}
          />
        ))}
      </div>
    </div>
  );
}
