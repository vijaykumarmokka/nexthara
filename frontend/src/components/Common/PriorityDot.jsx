export default function PriorityDot({ priority }) {
  const cls = priority === 'Urgent' ? 'priority-urgent' : priority === 'High' ? 'priority-high' : 'priority-normal';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <span className={`priority-dot ${cls}`} title={priority}></span> {priority}
    </span>
  );
}
