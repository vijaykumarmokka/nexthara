import { STATUS_CONFIG } from '../../constants';

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];
  if (!config) return <span>{status}</span>;
  return (
    <span className={`status-badge status-${config.color}`}>
      <span className="dot"></span>
      {config.label}
    </span>
  );
}
