import { useEffect, useState } from 'react';
import { api } from '../../api';

export default function KPICards({ refreshKey }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, [refreshKey]);

  if (!stats) return <div className="kpi-grid"><div className="kpi-card blue">Loading...</div></div>;

  const cards = [
    { label: 'Total Applications', value: stats.total, cls: 'blue', footer: `${stats.awaitingBank} awaiting bank`, icon: 'fa-arrow-up', footerCls: 'up' },
    { label: 'Sanctioned', value: stats.sanctioned, cls: 'green', footer: `${stats.total ? ((stats.sanctioned / stats.total) * 100).toFixed(1) : 0}% conversion`, icon: 'fa-arrow-up', footerCls: 'up' },
    { label: 'Pending Action', value: stats.pending, cls: 'amber', footer: `${stats.awaitingStudent} awaiting student`, icon: 'fa-clock', footerCls: 'neutral' },
    { label: 'Rejected / Dropped', value: stats.rejected, cls: 'red', footer: `${stats.total ? ((stats.rejected / stats.total) * 100).toFixed(1) : 0}% rejection rate`, icon: 'fa-arrow-down', footerCls: 'down' },
    { label: 'SLA Breach', value: stats.slaBreach, cls: 'purple', footer: 'Needs escalation', icon: 'fa-exclamation-triangle', footerCls: 'down' },
  ];

  return (
    <div className="kpi-grid">
      {cards.map(card => (
        <div key={card.label} className={`kpi-card ${card.cls}`}>
          <div className="kpi-label">{card.label}</div>
          <div className="kpi-value">{card.value}</div>
          <div className={`kpi-footer ${card.footerCls}`}>
            <i className={`fas ${card.icon}`}></i> {card.footer}
          </div>
        </div>
      ))}
    </div>
  );
}
