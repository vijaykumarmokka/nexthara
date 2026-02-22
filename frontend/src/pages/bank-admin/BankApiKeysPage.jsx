import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { bankAdminApi } from '../../api';

export default function BankApiKeysPage({ bankId }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [showNewKey, setShowNewKey] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setKeys((await bankAdminApi.getApiKeys(bankId)) || []); } catch { toast.error('Failed to load API keys'); }
    setLoading(false);
  };

  useEffect(() => { if (bankId) load(); }, [bankId]);

  const createKey = async () => {
    setCreating(true);
    try {
      const result = await bankAdminApi.createApiKey(bankId, { label: label || 'API Key' });
      setShowNewKey(result.api_key);
      setLabel('');
      await load();
    } catch (e) { toast.error(e.message); }
    setCreating(false);
  };

  const toggle = async (id) => {
    try {
      await bankAdminApi.toggleApiKey(id);
      toast.success('Toggled');
      await load();
    } catch (e) { toast.error(e.message); }
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0d7377', marginBottom: 4 }}>API Keys</h2>
        <div style={{ fontSize: 13, color: '#6b7280' }}>Manage API keys for CBS integration and auto status sync</div>
      </div>

      {/* Info box */}
      <div style={{ background: '#e0f2f1', border: '1px solid #b2dfdb', borderRadius: 8, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0d7377', marginBottom: 6 }}>Available API Endpoints</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            'GET /api/bank/applications — Fetch applications',
            'POST /api/bank/application/status — Update status',
            'POST /api/bank/application/query — Raise query',
            'POST /api/bank/application/sanction — Record sanction',
          ].map(ep => (
            <div key={ep} style={{ fontSize: 12, color: '#00695c', fontFamily: 'monospace', background: 'rgba(255,255,255,0.6)', padding: '3px 8px', borderRadius: 4 }}>{ep}</div>
          ))}
        </div>
      </div>

      {/* New key shown once */}
      {showNewKey && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#15803d', marginBottom: 6 }}>
            <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i> API Key Generated — Save it now, it won't be shown again in full
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <code style={{ flex: 1, fontSize: 13, background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #bbf7d0', wordBreak: 'break-all' }}>{showNewKey}</code>
            <button onClick={() => copy(showNewKey)} style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
              <i className="fas fa-copy" style={{ marginRight: 4 }}></i> Copy
            </button>
            <button onClick={() => setShowNewKey(null)} style={{ padding: '6px 10px', background: '#f3f4f6', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>×</button>
          </div>
        </div>
      )}

      {/* Create new key */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Generate New API Key</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'Roboto, sans-serif' }}
            placeholder="Key label (e.g. CBS Integration, WhatsApp Bot)"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <button onClick={createKey} disabled={creating} style={{ padding: '8px 18px', background: '#0d7377', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: creating ? 0.7 : 1 }}>
            {creating ? 'Generating...' : 'Generate Key'}
          </button>
        </div>
      </div>

      {/* Keys List */}
      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 20 }}></i></div>}
      {!loading && (
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {keys.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>No API keys yet</div>}
          {keys.map(key => (
            <div key={key.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: key.is_active ? '#e0f2f1' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-key" style={{ color: key.is_active ? '#0d7377' : '#9ca3af', fontSize: 16 }}></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{key.label || 'API Key'}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>
                  {key.api_key.slice(0, 12)}••••••••••••••••••••
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{key.created_at?.slice(0, 10)}</div>
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: key.is_active ? '#dcfce7' : '#f3f4f6', color: key.is_active ? '#16a34a' : '#6b7280', fontWeight: 600 }}>
                {key.is_active ? 'Active' : 'Inactive'}
              </span>
              <button onClick={() => copy(key.api_key)} style={{ padding: '5px 10px', background: '#f3f4f6', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', color: '#374151' }}>
                <i className="fas fa-copy"></i>
              </button>
              <button onClick={() => toggle(key.id)} style={{ padding: '5px 10px', background: key.is_active ? '#fef2f2' : '#f0fdf4', border: `1px solid ${key.is_active ? '#fecaca' : '#bbf7d0'}`, borderRadius: 5, fontSize: 12, cursor: 'pointer', color: key.is_active ? '#dc2626' : '#16a34a' }}>
                {key.is_active ? 'Revoke' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
