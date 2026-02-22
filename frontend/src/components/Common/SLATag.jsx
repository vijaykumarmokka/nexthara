import { SLA_THRESHOLD_BY_STATUS } from '../../constants';

export default function SLATag({ days, awaiting, status }) {
  if (awaiting === 'Closed') {
    return <span className="sla-tag ok"><i className="fas fa-check"></i> Done</span>;
  }
  const threshold = status ? (SLA_THRESHOLD_BY_STATUS[status] ?? 7) : 7;
  const riskDay = Math.ceil(threshold * 0.7);
  if (days > threshold) {
    return <span className="sla-tag breach"><i className="fas fa-exclamation-circle"></i> {days}d</span>;
  }
  if (days >= riskDay) {
    return <span className="sla-tag warning"><i className="fas fa-clock"></i> {days}d</span>;
  }
  return <span className="sla-tag ok"><i className="fas fa-check-circle"></i> {days}d</span>;
}
