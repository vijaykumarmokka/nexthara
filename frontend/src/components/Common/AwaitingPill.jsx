const AWAITING_CONFIG = {
  Student:  { cls: 'awaiting-student',  icon: 'fa-user-graduate' },
  Bank:     { cls: 'awaiting-bank',     icon: 'fa-university' },
  Nexthara: { cls: 'awaiting-nexthara', icon: 'fa-building' },
  Closed:   { cls: 'awaiting-closed',   icon: 'fa-check-circle' },
};

export default function AwaitingPill({ awaiting }) {
  const config = AWAITING_CONFIG[awaiting] || AWAITING_CONFIG.Closed;
  return (
    <span className={`awaiting-pill ${config.cls}`}>
      <i className={`fas ${config.icon}`}></i> {awaiting}
    </span>
  );
}
