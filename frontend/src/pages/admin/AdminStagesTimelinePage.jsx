import { useState, useEffect } from 'react';
import { adminApi, communicationApi } from '../../api';
import toast from 'react-hot-toast';

const SCOPE_LABELS = { LEAD: 'Lead Pipeline', CASE: 'Case / Application', BANK_APP: 'Bank Application' };
const SCOPE_COLORS = { LEAD: '#3b82f6', CASE: '#1a1d4d', BANK_APP: '#22c55e' };

function StageCard({ stage, scope, onEdit }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${SCOPE_COLORS[scope]}30`, borderLeft: `3px solid ${SCOPE_COLORS[scope]}`, borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af' }}>#{stage.sort_order}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{stage.label}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '1px 6px', borderRadius: 3 }}>{stage.stage_key}</span>
          {!stage.is_active && <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: 10, padding: '1px 6px', borderRadius: 3 }}>Inactive</span>}
        </div>
        {stage.allowed_transitions && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            → {JSON.parse(stage.allowed_transitions || '[]').join(', ') || 'Any'}
          </div>
        )}
      </div>
      <button onClick={() => onEdit(stage)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11, color: '#374151' }}>Edit</button>
    </div>
  );
}

const SCOPES = ['LEAD', 'CASE', 'BANK_APP'];

export default function AdminStagesTimelinePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('LEAD');
  const [editStage, setEditStage] = useState(null);
  const [expectations, setExpectations] = useState([]);
  const [editExp, setEditExp] = useState(null); // null | 'new' | existing expectation object

  const load = () => {
    setLoading(true);
    adminApi.getStagesConfig().then(d => {
      setData(d);
      setExpectations(d.stage_expectations || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const getStages = () => {
    if (!data) return [];
    if (scope === 'LEAD') return data.lead_stages || [];
    if (scope === 'CASE') return data.case_stages || [];
    if (scope === 'BANK_APP') return data.bank_app_stages || [];
    return [];
  };

  const saveEdit = async () => {
    if (!editStage) return;
    try {
      await adminApi.updateStageMaster(editStage.id, { label: editStage.label, sort_order: editStage.sort_order, is_active: editStage.is_active });
      toast.success('Stage updated');
      setEditStage(null);
      load();
    } catch { toast.error('Failed to update stage'); }
  };

  const saveEditExp = async () => {
    if (!editExp) return;
    try {
      if (editExp.id) {
        await communicationApi.updateStageExpectation(editExp.id, {
          expected_min_days: editExp.expected_min_days,
          expected_max_days: editExp.expected_max_days,
          student_text: editExp.student_text,
          staff_text: editExp.staff_text,
        });
        toast.success('Expectation updated');
      } else {
        await communicationApi.createStageExpectation({
          main_status: editExp.main_status,
          expected_min_days: editExp.expected_min_days,
          expected_max_days: editExp.expected_max_days,
          student_text: editExp.student_text,
          staff_text: editExp.staff_text,
        });
        toast.success('Expectation created');
      }
      setEditExp(null);
      load();
    } catch { toast.error('Failed to save expectation'); }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1d4d' }}>Stages & Timelines</h2>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Configure pipeline stages and SLA expectations</div>
      </div>

      {/* Scope Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {SCOPES.map(s => (
          <button key={s} onClick={() => setScope(s)} style={{
            padding: '8px 20px', borderRadius: 8, border: '2px solid',
            borderColor: scope === s ? SCOPE_COLORS[s] : '#e5e7eb',
            background: scope === s ? SCOPE_COLORS[s] : '#fff',
            color: scope === s ? '#fff' : '#374151',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
          }}>{SCOPE_LABELS[s]}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Stage List */}
        <div>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#374151' }}>
            {SCOPE_LABELS[scope]} Stages ({getStages().length})
          </h3>
          {loading ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {getStages().map(s => (
                <StageCard key={s.id} stage={s} scope={scope} onEdit={setEditStage} />
              ))}
              {!getStages().length && <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 30 }}>No stages configured</div>}
            </div>
          )}
        </div>

        {/* Stage Expectations */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>Stage Expectations / SLA Text</h3>
            <button
              onClick={() => setEditExp({ main_status: '', expected_min_days: 1, expected_max_days: 7, student_text: '', staff_text: '' })}
              style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fas fa-plus" style={{ marginRight: 4 }}></i> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {expectations.map(e => (
              <div key={e.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '1px 6px', borderRadius: 3 }}>{e.main_status || e.status}</span>
                      {(e.expected_min_days || e.expected_max_days) && (
                        <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>{e.expected_min_days}–{e.expected_max_days}d SLA</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}><b>Student:</b> {e.student_text || e.message_template}</div>
                    {e.staff_text && <div style={{ fontSize: 11, color: '#6b7280' }}><b>Staff:</b> {e.staff_text}</div>}
                  </div>
                  <button
                    onClick={() => setEditExp({ ...e })}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: '#374151', flexShrink: 0, marginLeft: 8 }}
                  >Edit</button>
                </div>
              </div>
            ))}
            {!expectations.length && <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 30 }}>No SLA expectations configured</div>}
          </div>
        </div>
      </div>

      {/* Edit Stage Modal */}
      {editStage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1d4d' }}>Edit Stage</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Stage Key</label>
                <input value={editStage.stage_key} disabled style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', background: '#f9fafb', color: '#6b7280', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Label *</label>
                <input value={editStage.label} onChange={e => setEditStage(s => ({...s, label: e.target.value}))} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Sort Order</label>
                <input type="number" value={editStage.sort_order} onChange={e => setEditStage(s => ({...s, sort_order: Number(e.target.value)}))} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!editStage.is_active} onChange={e => setEditStage(s => ({...s, is_active: e.target.checked}))} />
                <span style={{ fontSize: 13 }}>Active</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditStage(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={saveEdit} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Expectation Modal */}
      {editExp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1d4d' }}>{editExp.id ? 'Edit' : 'Add'} Stage Expectation</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!editExp.id && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Status / Stage Key *</label>
                  <input
                    value={editExp.main_status}
                    onChange={e => setEditExp(x => ({ ...x, main_status: e.target.value }))}
                    placeholder="e.g. UNDER_REVIEW"
                    style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              )}
              {editExp.id && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Status</label>
                  <input value={editExp.main_status || editExp.status} disabled style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', background: '#f9fafb', color: '#6b7280', boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Min Days</label>
                  <input type="number" value={editExp.expected_min_days} onChange={e => setEditExp(x => ({ ...x, expected_min_days: Number(e.target.value) }))} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Max Days</label>
                  <input type="number" value={editExp.expected_max_days} onChange={e => setEditExp(x => ({ ...x, expected_max_days: Number(e.target.value) }))} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Student-facing Text *</label>
                <textarea
                  value={editExp.student_text}
                  onChange={e => setEditExp(x => ({ ...x, student_text: e.target.value }))}
                  placeholder="Message shown to students about this stage..."
                  style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box', minHeight: 70, resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Staff Notes</label>
                <textarea
                  value={editExp.staff_text}
                  onChange={e => setEditExp(x => ({ ...x, staff_text: e.target.value }))}
                  placeholder="Internal guidance for staff at this stage..."
                  style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box', minHeight: 60, resize: 'vertical' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditExp(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={saveEditExp} disabled={!editExp.student_text || (!editExp.id && !editExp.main_status)} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
