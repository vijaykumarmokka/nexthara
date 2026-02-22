import { STATUS_CONFIG, BANKS } from '../../constants';

const INTAKE_OPTIONS = [
  '2024-09', '2025-01', '2025-05', '2025-09',
  '2026-01', '2026-05', '2026-09',
];

export default function FilterBar({ filters, onFilterChange }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="filter-bar">
      <div className="search-box">
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder="Search name, case ID, bank, phone…"
          value={filters.search || ''}
          onChange={e => handleChange('search', e.target.value)}
        />
      </div>
      <select className="filter-select" value={filters.status || ''} onChange={e => handleChange('status', e.target.value)}>
        <option value="">All Statuses</option>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <option key={key} value={key}>{cfg.label}</option>
        ))}
      </select>
      <select className="filter-select" value={filters.awaiting || ''} onChange={e => handleChange('awaiting', e.target.value)}>
        <option value="">All Awaiting</option>
        <option value="Student">Student</option>
        <option value="Bank">Bank</option>
        <option value="Nexthara">Nexthara</option>
      </select>
      <select className="filter-select" value={filters.priority || ''} onChange={e => handleChange('priority', e.target.value)}>
        <option value="">All Priorities</option>
        <option value="Urgent">Urgent</option>
        <option value="High">High</option>
        <option value="Normal">Normal</option>
      </select>
      <select className="filter-select" value={filters.intake || ''} onChange={e => handleChange('intake', e.target.value)}>
        <option value="">All Intakes</option>
        {INTAKE_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
      </select>
      <select className="filter-select" value={filters.sla || ''} onChange={e => handleChange('sla', e.target.value)}>
        <option value="">All SLA</option>
        <option value="breach">SLA Breach</option>
        <option value="warning">SLA Warning</option>
      </select>
    </div>
  );
}
