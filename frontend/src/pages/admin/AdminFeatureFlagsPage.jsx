import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import toast from 'react-hot-toast';

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: '', label: '', description: '', enabled: false });
  const [saving, setSaving] = useState(null);

  const load = () => {
    setLoading(true);
    adminApi.getFeatureFlags().then(setFlags).catch(() => setFlags([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (flag) => {
    setSaving(flag.key);
    try {
      await adminApi.toggleFeatureFlag(flag.key, !flag.enabled);
      toast.success(`${flag.label} ${!flag.enabled ? 'enabled' : 'disabled'}`);
      load();
    } catch { toast.error('Failed to toggle flag'); } finally { setSaving(null); }
  };

  const addFlag = async () => {
    if (!newFlag.key || !newFlag.label) { toast.error('Key and label required'); return; }
    try {
      await adminApi.createFeatureFlag(newFlag);
      toast.success('Feature flag created');
      setShowAddModal(false);
      setNewFlag({ key: '', label: '', description: '', enabled: false });
      load();
    } catch { toast.error('Failed to create flag'); }
  };

  const enabledCount = flags.filter(f => f.enabled).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1d4d' }}>Feature Flags</h2>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Control system features globally — {enabledCount}/{flags.length} enabled</div>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
          <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Add Flag
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading feature flags...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {flags.map(flag => (
            <div key={flag.key} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{flag.label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>{flag.key}</span>
                </div>
                {flag.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{flag.description}</div>}
                {flag.updated_at && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Last updated: {flag.updated_at?.slice(0,16)} {flag.updated_by ? `by ${flag.updated_by}` : ''}</div>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: flag.enabled ? '#22c55e' : '#9ca3af' }}>
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {/* Toggle Switch */}
                <button
                  onClick={() => toggle(flag)}
                  disabled={saving === flag.key}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: flag.enabled ? '#22c55e' : '#d1d5db',
                    position: 'relative', transition: 'background 0.2s',
                    opacity: saving === flag.key ? 0.6 : 1,
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3, transition: 'left 0.2s',
                    left: flag.enabled ? 23 : 3,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            </div>
          ))}
          {!flags.length && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>No feature flags configured</div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a1d4d' }}>Add Feature Flag</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Key * <span style={{ fontWeight: 400, color: '#9ca3af' }}>(snake_case, no spaces)</span></label>
                <input value={newFlag.key} onChange={e => setNewFlag(f => ({...f, key: e.target.value.toLowerCase().replace(/\s+/g, '_')}))} placeholder="e.g. my_feature_enabled" style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Label *</label>
                <input value={newFlag.label} onChange={e => setNewFlag(f => ({...f, label: e.target.value}))} placeholder="Human-readable name" style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea value={newFlag.description} onChange={e => setNewFlag(f => ({...f, description: e.target.value}))} placeholder="What does this flag control?" rows={2} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={newFlag.enabled} onChange={e => setNewFlag(f => ({...f, enabled: e.target.checked}))} />
                <span style={{ fontSize: 13 }}>Enable immediately</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={addFlag} style={{ background: '#1a1d4d', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Create Flag</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
