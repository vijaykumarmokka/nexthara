import { useState, useEffect } from 'react';
import { adminApi } from '../../api';

const CHANNEL_COLOR = { WHATSAPP: '#25d366', EMAIL: '#1e88e5', SMS: '#fb8c00' };
const STATUS_COLOR = { DELIVERED: '#16a34a', FAILED: '#dc2626', PENDING: '#d97706', SENT: '#2563eb', READ: '#7c3aed' };

export default function AdminCommsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getComms()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i></div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>Failed to load comms data.</div>;

  const totalSent = (data.summary || []).reduce((a, x) => a + x.count, 0);
  const delivered = (data.summary || []).find(s => s.status === 'DELIVERED')?.count || 0;
  const failed = (data.summary || []).find(s => s.status === 'FAILED')?.count || 0;
  const deliveryRate = totalSent > 0 ? Math.round(delivered * 100 / totalSent) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1d4d' }}>Communications Dashboard</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Message delivery rates, failures, and template performance</div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Messages', value: totalSent, color: '#1e88e5' },
          { label: 'Delivered', value: delivered, color: '#16a34a' },
          { label: 'Failed', value: failed, color: '#dc2626' },
          { label: 'Delivery Rate', value: `${deliveryRate}%`, color: '#7b1fa2' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* By Channel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1d4d', marginBottom: 16 }}>By Channel</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(data.by_channel || []).map(c => {
              const rate = c.total > 0 ? Math.round(c.delivered * 100 / c.total) : 0;
              const color = CHANNEL_COLOR[c.channel] || '#6b7280';
              return (
                <div key={c.channel}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ fontWeight: 700, color }}>{c.channel}</span>
                    <span style={{ color: '#6b7280' }}>{c.delivered}/{c.total} ({rate}%) · <span style={{ color: '#dc2626' }}>{c.failed} failed</span></span>
                  </div>
                  <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                    <div style={{ height: 8, background: color, borderRadius: 4, width: `${rate}%`, transition: 'width 0.6s' }}></div>
                  </div>
                </div>
              );
            })}
            {(!data.by_channel || data.by_channel.length === 0) && (
              <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 12 }}>No channel data</div>
            )}
          </div>
        </div>

        {/* Template Stats */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1d4d', marginBottom: 14 }}>Template Performance</div>
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Template', 'Sent', 'Delivered', 'Rate'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.template_stats || []).map((t, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '7px 8px', fontWeight: 600, color: '#1a1d4d' }}>{t.template_name}</td>
                  <td style={{ padding: '7px 8px' }}>{t.sent}</td>
                  <td style={{ padding: '7px 8px', color: '#16a34a' }}>{t.delivered}</td>
                  <td style={{ padding: '7px 8px', fontWeight: 700, color: '#7b1fa2' }}>
                    {t.sent > 0 ? Math.round(t.delivered * 100 / t.sent) : 0}%
                  </td>
                </tr>
              ))}
              {(!data.template_stats || data.template_stats.length === 0) && (
                <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No template data</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      </div>

      {/* Recent Failures */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1d4d', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-times-circle" style={{ color: '#dc2626' }}></i> Recent Failures
          <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>
            {(data.recent_failed || []).length}
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Recipient', 'Entity Type', 'Template', 'Channel', 'Time'].map(h => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.recent_failed || []).map((m, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '7px 10px', fontWeight: 600, color: '#1a1d4d' }}>{m.recipient}</td>
                <td style={{ padding: '7px 10px', color: '#374151' }}>{m.entity_type}</td>
                <td style={{ padding: '7px 10px', color: '#374151' }}>{m.template_name || '—'}</td>
                <td style={{ padding: '7px 10px' }}>
                  <span style={{ color: CHANNEL_COLOR[m.channel] || '#6b7280', fontWeight: 600, fontSize: 11 }}>{m.channel || '—'}</span>
                </td>
                <td style={{ padding: '7px 10px', color: '#6b7280' }}>{m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
            {(!data.recent_failed || data.recent_failed.length === 0) && (
              <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: '#9ca3af' }}>No recent failures</td></tr>
            )}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
