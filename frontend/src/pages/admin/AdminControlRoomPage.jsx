import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import toast from 'react-hot-toast';

const SV = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#22c55e' };
const SS = { OPEN: { color: '#ef4444', label: 'Open' }, INVESTIGATING: { color: '#f97316', label: 'Investigating' }, RESOLVED: { color: '#22c55e', label: 'Resolved' } };

function StatPill({ label, value, color = '#6b7280' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 16px', minWidth: 90 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function OverdueBadge({ hours }) {
  const color = hours > 48 ? '#ef4444' : hours > 24 ? '#f97316' : '#f59e0b';
  return <span style={{ background: color + '20', color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{hours}h overdue</span>;
}

function HoursLeftBadge({ hours }) {
  const color = hours < 0 ? '#ef4444' : hours < 4 ? '#f97316' : '#22c55e';
  const label = hours < 0 ? `${Math.abs(hours)}h breached` : `${hours}h left`;
  return <span style={{ background: color + '20', color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{label}</span>;
}

const TABS = ['Queues', 'SLA Radar', 'Message Health', 'Escalations', 'Task Board', 'Incidents'];

export default function AdminControlRoomPage() {
  const [tab, setTab] = useState('Queues');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ title: '', severity: 'MEDIUM', description: '' });

  const load = () => {
    setLoading(true);
    adminApi.getControlRoom().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, []);

  const createIncident = async () => {
    if (!incidentForm.title) { toast.error('Incident title required'); return; }
    try {
      await adminApi.createIncident(incidentForm);
      toast.success('Incident logged');
    } catch { toast.error('Failed to log incident'); }
    setShowIncidentModal(false);
    setIncidentForm({ title: '', severity: 'MEDIUM', description: '' });
    load();
  };

  const resolveIncident = async (id, status) => {
    try {
      await adminApi.updateIncident(id, { status, resolved_by: status === 'RESOLVED' ? 'Super Admin' : undefined });
      toast.success(`Incident ${status === 'RESOLVED' ? 'resolved' : 'marked as investigating'}`);
      load();
    } catch { toast.error('Failed to update incident'); }
  };

  if (loading && !data) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading Control Room...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1d4d' }}>Live Control Room</h2>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>War Room — Real-time operational visibility</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#374151' }}>
            <i className="fas fa-sync-alt" style={{ marginRight: 6 }}></i>Refresh
          </button>
          <button onClick={() => setShowIncidentModal(true)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }}></i>Log Incident
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatPill label="Overdue Tasks" value={data?.overdue_actions?.length || 0} color="#ef4444" />
        <StatPill label="SLA Breaches" value={data?.sla_breaches?.length || 0} color="#f97316" />
        <StatPill label="Msg Failures" value={data?.recent_failed?.length || 0} color="#f59e0b" />
        <StatPill label="Open Escalations" value={data?.escalations?.filter(e => e.status === 'OPEN')?.length || 0} color="#8b5cf6" />
        <StatPill label="Open Incidents" value={data?.incidents?.filter(i => i.status === 'OPEN')?.length || 0} color="#3b82f6" />
        <StatPill label="Active Tasks" value={data?.task_board?.length || 0} color="#0ea5e9" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none', padding: '10px 18px', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t ? 700 : 500,
            color: tab === t ? '#1a1d4d' : '#6b7280',
            borderBottom: `2px solid ${tab === t ? '#1a1d4d' : 'transparent'}`,
            marginBottom: -2,
          }}>{t}</button>
        ))}
      </div>

      {/* Queues Tab */}
      {tab === 'Queues' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Overdue Tasks */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1a1d4d', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-clock" style={{ color: '#ef4444' }}></i> Overdue Actions ({data?.overdue_actions?.length || 0})
            </h3>
            {(data?.overdue_actions || []).length === 0 ? (
              <div style={{ color: '#22c55e', fontSize: 13, textAlign: 'center', padding: 20 }}>
                <i className="fas fa-check-circle" style={{ fontSize: 24, marginBottom: 8 }}></i><br/>All clear!
              </div>
            ) : (data?.overdue_actions || []).map(a => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{a.entity_type} · {a.assigned_to_name || 'Unassigned'}</div>
                </div>
                <OverdueBadge hours={a.hours_overdue || 0} />
              </div>
            ))}
          </div>

          {/* SLA Breaches */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1a1d4d', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-exclamation-circle" style={{ color: '#f97316' }}></i> SLA Risk ({data?.sla_breaches?.length || 0})
            </h3>
            {(data?.sla_breaches || []).length === 0 ? (
              <div style={{ color: '#22c55e', fontSize: 13, textAlign: 'center', padding: 20 }}>
                <i className="fas fa-check-circle" style={{ fontSize: 24, marginBottom: 8 }}></i><br/>No SLA breaches!
              </div>
            ) : (data?.sla_breaches || []).map(b => (
              <div key={b.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{b.student_name || b.id}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{b.bank_name} · {b.status}</div>
                </div>
                <HoursLeftBadge hours={b.hours_breached ? -b.hours_breached : 0} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SLA Radar Tab */}
      {tab === 'SLA Radar' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>SLA Radar — Bank Applications</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['App ID', 'Student', 'Bank', 'Status', 'SLA Due', 'Time Left'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.sla_breaches || []).map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{b.id}</td>
                  <td style={{ padding: '10px 12px' }}>{b.student_name || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>{b.bank_name}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{b.status}</span></td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280' }}>{b.sla_due_at?.slice(0,10)}</td>
                  <td style={{ padding: '10px 12px' }}><HoursLeftBadge hours={-(b.hours_breached || 0)} /></td>
                </tr>
              ))}
              {!data?.sla_breaches?.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#22c55e' }}>No SLA breaches detected</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Message Health Tab */}
      {tab === 'Message Health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {(data?.msg_health || []).map(ch => (
              <div key={ch.channel} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, minWidth: 180 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8 }}>{ch.channel}</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 700, color: '#1a1d4d' }}>{ch.total}</div><div style={{ fontSize: 10, color: '#6b7280' }}>Sent</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>{ch.delivered}</div><div style={{ fontSize: 10, color: '#6b7280' }}>Delivered</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{ch.failed}</div><div style={{ fontSize: 10, color: '#6b7280' }}>Failed</div></div>
                </div>
                <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: ch.delivery_pct > 80 ? '#22c55e' : '#f97316', width: `${ch.delivery_pct || 0}%` }} />
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{ch.delivery_pct || 0}% delivery rate</div>
              </div>
            ))}
            {!data?.msg_health?.length && <div style={{ color: '#6b7280', fontSize: 13 }}>No messages in last 24h</div>}
          </div>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>Recent Failures</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fef2f2' }}>
                  {['ID', 'Type', 'Recipient', 'Template', 'Time'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#991b1b', borderBottom: '1px solid #fee2e2' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.recent_failed || []).map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{m.id}</td>
                    <td style={{ padding: '8px 10px' }}>{m.entity_type}</td>
                    <td style={{ padding: '8px 10px' }}>{m.recipient}</td>
                    <td style={{ padding: '8px 10px', color: '#6b7280' }}>{m.template_name || '-'}</td>
                    <td style={{ padding: '8px 10px', color: '#9ca3af', fontSize: 11 }}>{m.created_at?.slice(0,16)}</td>
                  </tr>
                ))}
                {!data?.recent_failed?.length && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#22c55e' }}>No failures — all messages delivered</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Escalations Tab */}
      {tab === 'Escalations' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>Active Escalations</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['ID', 'Entity', 'Reason', 'Level', 'Status', 'Created'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.escalations || []).map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{e.id}</td>
                  <td style={{ padding: '10px 12px' }}>{e.entity_type} #{e.entity_id}</td>
                  <td style={{ padding: '10px 12px' }}>{e.reason}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>L{e.level}</span></td>
                  <td style={{ padding: '10px 12px' }}><span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{e.status}</span></td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#9ca3af' }}>{e.created_at?.slice(0,16)}</td>
                </tr>
              ))}
              {!data?.escalations?.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#22c55e' }}>No active escalations</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Board Tab */}
      {tab === 'Task Board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {['CRITICAL', 'HIGH', 'MEDIUM'].map(priority => (
            <div key={priority} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${SV[priority]}40`, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: SV[priority] }}>
                <i className="fas fa-flag" style={{ marginRight: 6 }}></i>{priority}
              </h3>
              {(data?.task_board || []).filter(t => t.priority === priority).map(t => (
                <div key={t.id} style={{ background: '#f8fafc', borderRadius: 6, padding: '10px 12px', marginBottom: 8, borderLeft: `3px solid ${SV[priority]}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1f2937' }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{t.entity_type} · {t.assigned_to_name || 'Unassigned'}</div>
                  {t.due_at && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Due: {t.due_at?.slice(0,10)}</div>}
                </div>
              ))}
              {!(data?.task_board || []).filter(t => t.priority === priority).length && (
                <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 12 }}>None</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Incidents Tab */}
      {tab === 'Incidents' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1d4d' }}>System Incidents</h3>
            <button onClick={() => setShowIncidentModal(true)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>+ Log Incident</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['ID', 'Title', 'Severity', 'Status', 'Created', 'Resolved By', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.incidents || []).map(i => (
                <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{i.id}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{i.title}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ background: SV[i.severity] + '20', color: SV[i.severity], padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{i.severity}</span></td>
                  <td style={{ padding: '10px 12px' }}><span style={{ background: (SS[i.status]?.color || '#6b7280') + '20', color: SS[i.status]?.color || '#6b7280', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{i.status}</span></td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#9ca3af' }}>{i.created_at?.slice(0,16)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{i.resolved_by || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {i.status === 'OPEN' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => resolveIncident(i.id, 'INVESTIGATING')} style={{ fontSize: 11, padding: '3px 8px', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: 4, cursor: 'pointer' }}>Investigate</button>
                        <button onClick={() => resolveIncident(i.id, 'RESOLVED')} style={{ fontSize: 11, padding: '3px 8px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 4, cursor: 'pointer' }}>Resolve</button>
                      </div>
                    )}
                    {i.status === 'INVESTIGATING' && (
                      <button onClick={() => resolveIncident(i.id, 'RESOLVED')} style={{ fontSize: 11, padding: '3px 8px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 4, cursor: 'pointer' }}>Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
              {!data?.incidents?.length && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#22c55e' }}>No incidents logged</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Incident Modal */}
      {showIncidentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1d4d' }}>Log Incident</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input value={incidentForm.title} onChange={e => setIncidentForm(f => ({...f, title: e.target.value}))} placeholder="Incident title *" style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }} />
              <select value={incidentForm.severity} onChange={e => setIncidentForm(f => ({...f, severity: e.target.value}))} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}>
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <option key={s}>{s}</option>)}
              </select>
              <textarea value={incidentForm.description} onChange={e => setIncidentForm(f => ({...f, description: e.target.value}))} placeholder="Description..." rows={3} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowIncidentModal(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={createIncident} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Log Incident</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
