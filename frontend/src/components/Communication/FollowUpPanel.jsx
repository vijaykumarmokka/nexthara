import { useEffect, useState, useCallback } from 'react';
import { communicationApi } from '../../api';
import toast from 'react-hot-toast';

const OWNER_COLORS = { STUDENT: '#1565c0', BANK: '#6a1b9a', NEXTHARA: '#2e7d32' };
const PRIORITY_COLORS = { URGENT: '#d32f2f', HIGH: '#e65100', NORMAL: '#546e7a' };
const DELIVERY_ICONS = { QUEUED: 'fa-clock', SENT: 'fa-check', DELIVERED: 'fa-check-double', READ: 'fa-eye', FAILED: 'fa-times-circle' };

function formatDt(val) {
  if (!val) return '—';
  try { return new Date(val).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return val; }
}
function daysDiff(val) {
  if (!val) return null;
  const diff = Math.ceil((new Date(val) - new Date()) / 86400000);
  return diff;
}

export default function FollowUpPanel({ appId, app }) {
  const [nextActions, setNextActions]     = useState([]);
  const [reminderJobs, setReminderJobs]   = useState([]);
  const [escalations, setEscalations]     = useState([]);
  const [expectation, setExpectation]     = useState(null);
  const [loading, setLoading]             = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [escalating, setEscalating]       = useState(false);
  const [activeActionId, setActiveActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [actions, jobs, escs, exps] = await Promise.all([
        communicationApi.getNextActions(appId),
        communicationApi.getReminderJobs(appId),
        communicationApi.getEscalations(appId),
        app?.status ? communicationApi.getStageExpectations(app.status) : Promise.resolve([]),
      ]);
      setNextActions(actions);
      setReminderJobs(jobs);
      setEscalations(escs);
      setExpectation(exps?.[0] || null);
    } catch {
      // silent
    }
    setLoading(false);
  }, [appId, app?.status]);

  useEffect(() => { if (appId) load(); }, [appId, load]);

  const openAction = nextActions.find(a => a.status === 'OPEN');
  const activeEsc  = escalations.find(e => !e.resolved_at);
  const lastReminder = reminderJobs[0];

  async function handleMarkDone(actionId) {
    try {
      await communicationApi.updateNextAction(actionId, { status: 'DONE' });
      toast.success('Action marked done');
      load();
    } catch { toast.error('Failed to update'); }
  }

  async function handleSendReminder() {
    if (!app) return;
    setSendingReminder(true);
    try {
      await communicationApi.sendReminder(appId, {
        to_type: app.awaiting_from === 'Student' ? 'STUDENT' : app.awaiting_from === 'Bank' ? 'BANK' : 'STAFF',
        to_address: app.student_email,
        channel: 'IN_APP',
        template_name: 'manual_reminder',
      });
      toast.success('Reminder queued');
      load();
    } catch { toast.error('Failed to send reminder'); }
    setSendingReminder(false);
  }

  async function handleEscalate() {
    const existingLevel = activeEsc?.level || 0;
    if (existingLevel >= 3) { toast.error('Maximum escalation level (3) reached'); return; }
    setEscalating(true);
    try {
      await communicationApi.createEscalation(appId, {
        level: existingLevel + 1,
        reason: 'SLA_BREACH',
      });
      toast.success(`Escalation level ${existingLevel + 1} created`);
      load();
    } catch { toast.error('Escalation failed'); }
    setEscalating(false);
  }

  async function handleResolveEsc(escId) {
    try {
      await communicationApi.resolveEscalation(escId);
      toast.success('Escalation resolved');
      load();
    } catch { toast.error('Failed to resolve'); }
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 22 }}></i>
      <p style={{ marginTop: 10, fontSize: 13 }}>Loading follow-up data...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Expected Timeline ── */}
      {expectation && (
        <div style={{ background: '#f0f7ff', border: '1px solid #bbdefb', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1565c0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            <i className="fas fa-clock" style={{ marginRight: 6 }}></i> Expected Timeline
          </div>
          <div style={{ fontSize: 13, color: '#1a237e', marginBottom: 4 }}>
            {expectation.student_text}
          </div>
          <div style={{ fontSize: 11, color: '#546e7a', background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 4, padding: '4px 8px', marginTop: 6, display: 'inline-block' }}>
            <i className="fas fa-user-shield" style={{ marginRight: 4, color: '#e65100' }}></i>
            <strong>Staff:</strong> {expectation.staff_text}
          </div>
        </div>
      )}

      {/* ── Active Escalation Alert ── */}
      {activeEsc && (
        <div style={{ background: '#fff3e0', border: '2px solid #d32f2f', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#d32f2f', marginBottom: 4 }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }}></i>
              ESCALATION LEVEL {activeEsc.level} — {activeEsc.reason}
            </div>
            <div style={{ fontSize: 12, color: '#546e7a' }}>Raised {formatDt(activeEsc.created_at)}</div>
          </div>
          <button className="btn btn-sm btn-outline" style={{ color: '#2e7d32', borderColor: '#2e7d32', whiteSpace: 'nowrap' }} onClick={() => handleResolveEsc(activeEsc.id)}>
            <i className="fas fa-check"></i> Resolve
          </button>
        </div>
      )}

      {/* ── Next Action ── */}
      <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ background: '#f5f5f5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}><i className="fas fa-bolt" style={{ marginRight: 6, color: '#f57c00' }}></i> Next Action</span>
          {openAction && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-outline" style={{ fontSize: 11 }} onClick={() => handleMarkDone(openAction.id)}>
                <i className="fas fa-check"></i> Mark Done
              </button>
            </div>
          )}
        </div>
        <div style={{ padding: '12px 16px' }}>
          {openAction ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: OWNER_COLORS[openAction.owner_type] || '#546e7a', borderRadius: 4, padding: '2px 8px' }}>
                  {openAction.owner_type}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLORS[openAction.priority], background: '#fafafa', border: `1px solid ${PRIORITY_COLORS[openAction.priority]}`, borderRadius: 4, padding: '2px 8px' }}>
                  {openAction.priority}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#212121', marginBottom: 4 }}>{openAction.title}</div>
              {openAction.description && <div style={{ fontSize: 12, color: '#546e7a', marginBottom: 6 }}>{openAction.description}</div>}
              {openAction.due_at && (() => {
                const diff = daysDiff(openAction.due_at);
                const overdue = diff !== null && diff < 0;
                return (
                  <div style={{ fontSize: 12, color: overdue ? '#d32f2f' : '#546e7a' }}>
                    <i className="fas fa-calendar-alt" style={{ marginRight: 4 }}></i>
                    Due: {formatDt(openAction.due_at)}
                    {diff !== null && (
                      <span style={{ marginLeft: 6, fontWeight: 600 }}>
                        ({overdue ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'Today' : `${diff}d left`})
                      </span>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            <div style={{ color: '#999', fontSize: 13 }}>
              <i className="fas fa-check-circle" style={{ marginRight: 6, color: '#2e7d32' }}></i>
              No open actions — case is on track
            </div>
          )}
        </div>
      </div>

      {/* ── Reminder Controls ── */}
      <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ background: '#f5f5f5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}><i className="fas fa-bell" style={{ marginRight: 6, color: '#1565c0' }}></i> Reminders</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-primary" onClick={handleSendReminder} disabled={sendingReminder} style={{ fontSize: 11 }}>
              <i className={`fas ${sendingReminder ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
              {sendingReminder ? 'Sending...' : 'Send Reminder'}
            </button>
            <button className="btn btn-sm btn-outline" style={{ fontSize: 11, color: '#d32f2f', borderColor: '#d32f2f' }} onClick={handleEscalate} disabled={escalating}>
              <i className={`fas ${escalating ? 'fa-spinner fa-spin' : 'fa-exclamation-triangle'}`}></i>
              {escalating ? '...' : `Escalate${activeEsc ? ` (L${activeEsc.level})` : ''}`}
            </button>
          </div>
        </div>
        <div style={{ padding: '12px 16px' }}>
          {lastReminder ? (
            <div>
              <div style={{ fontSize: 12, color: '#546e7a', marginBottom: 8 }}>
                <strong>Last reminder:</strong> {formatDt(lastReminder.created_at)} via {lastReminder.channel}
                <span style={{ marginLeft: 8, color: lastReminder.status === 'SENT' ? '#2e7d32' : lastReminder.status === 'FAILED' ? '#d32f2f' : '#546e7a' }}>
                  <i className={`fas ${DELIVERY_ICONS[lastReminder.status] || 'fa-clock'}`} style={{ marginRight: 3 }}></i>
                  {lastReminder.status}
                </span>
              </div>
              {reminderJobs.length > 0 && (
                <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {reminderJobs.slice(0, 5).map(job => (
                    <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '4px 8px', background: '#fafafa', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                      <span style={{ color: OWNER_COLORS[job.to_type] || '#546e7a', fontWeight: 600, minWidth: 56 }}>{job.to_type}</span>
                      <span style={{ color: '#546e7a', flex: 1 }}>{job.channel} · {job.template_name}</span>
                      <span style={{ color: job.status === 'SENT' ? '#2e7d32' : job.status === 'FAILED' ? '#d32f2f' : '#546e7a' }}>
                        <i className={`fas ${DELIVERY_ICONS[job.status] || 'fa-clock'}`} style={{ marginRight: 3 }}></i>
                        {job.status}
                      </span>
                      <span style={{ color: '#999', fontSize: 10 }}>{formatDt(job.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#999', fontSize: 13 }}>No reminders sent yet — click "Send Reminder" to notify the responsible party.</div>
          )}
        </div>
      </div>

      {/* ── Escalation History ── */}
      {escalations.length > 0 && (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#f5f5f5', padding: '10px 16px' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}><i className="fas fa-layer-group" style={{ marginRight: 6, color: '#d32f2f' }}></i> Escalation History</span>
          </div>
          <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {escalations.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '6px 8px', background: e.resolved_at ? '#f1f8e9' : '#fff3e0', borderRadius: 4, border: `1px solid ${e.resolved_at ? '#c5e1a5' : '#ffcc02'}` }}>
                <span style={{ fontWeight: 700, color: '#d32f2f', minWidth: 20 }}>L{e.level}</span>
                <span style={{ color: '#546e7a', flex: 1 }}>{e.reason}</span>
                <span style={{ color: '#999', fontSize: 10 }}>{formatDt(e.created_at)}</span>
                {e.resolved_at ? (
                  <span style={{ color: '#2e7d32', fontWeight: 600 }}><i className="fas fa-check-circle"></i> Resolved</span>
                ) : (
                  <button className="btn btn-sm btn-outline" style={{ fontSize: 10, color: '#2e7d32', borderColor: '#2e7d32', padding: '2px 6px' }} onClick={() => handleResolveEsc(e.id)}>
                    Resolve
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
