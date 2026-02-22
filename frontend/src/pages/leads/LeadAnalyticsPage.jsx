import { useState, useEffect } from 'react';
import { leadsApi } from '../../api';

const FUNNEL_COLORS = ['#1565c0', '#7b1fa2', '#f57f17', '#00695c', '#2e7d32'];

export default function LeadAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leadsApi.getAnalytics().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading analytics…</div>;
  if (!data) return <div style={{ padding: 40, color: '#c62828' }}>Failed to load analytics.</div>;

  const maxCount = Math.max(...data.funnel.map(f => f.count), 1);

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Lead Analytics</h2>
          <div className="subtitle">Funnel view, conversion rates, and staff performance</div>
        </div>
      </div>

      {/* Funnel View */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#1a237e' }}>Conversion Funnel</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          {data.funnel.map((stage, i) => (
            <div key={stage.label} style={{ width: '100%', maxWidth: 600 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{stage.label}</span>
                <span style={{ color: FUNNEL_COLORS[i], fontWeight: 700 }}>{stage.count} ({stage.pct}%)</span>
              </div>
              <div style={{ background: '#f0f2f5', borderRadius: 8, height: 28, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${(stage.count / maxCount) * 100}%`,
                  minWidth: stage.count > 0 ? 4 : 0,
                  height: '100%',
                  background: FUNNEL_COLORS[i],
                  borderRadius: 8,
                  transition: 'width 0.5s ease',
                  display: 'flex', alignItems: 'center', paddingLeft: 10,
                }}>
                  {stage.pct > 8 && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{stage.pct}%</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Conversion rates */}
        <div style={{ display: 'flex', gap: 16, marginTop: 28, flexWrap: 'wrap' }}>
          {data.funnel.slice(1).map((stage, i) => {
            const prev = data.funnel[i];
            const rate = prev.count > 0 ? Math.round((stage.count / prev.count) * 100) : 0;
            return (
              <div key={stage.label} style={{ flex: 1, minWidth: 120, background: '#f5f6fa', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: FUNNEL_COLORS[i + 1] }}>{rate}%</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{prev.label.split(' ')[0]} → {stage.label.split(' ')[0]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Staff Performance */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#1a237e' }}>Staff Performance</h3>
        {data.staff.length === 0 ? (
          <p style={{ color: '#999', fontSize: 13 }}>No staff data available.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f6fa', borderBottom: '2px solid #e0e0e0' }}>
                <th style={thS}>Staff</th>
                <th style={thS}>Leads</th>
                <th style={thS}>Connected %</th>
                <th style={thS}>Qualified %</th>
                <th style={thS}>Case %</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={tdS}><strong>{s.name}</strong></td>
                  <td style={tdS}>{s.leads}</td>
                  <td style={tdS}><PctBar value={s.connected_pct} color="#7b1fa2" /></td>
                  <td style={tdS}><PctBar value={s.qualified_pct} color="#f57f17" /></td>
                  <td style={tdS}><PctBar value={s.case_pct} color="#2e7d32" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PctBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, background: '#f0f2f5', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32 }}>{value}%</span>
    </div>
  );
}

const thS = { padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555' };
const tdS = { padding: '12px 16px', verticalAlign: 'middle' };
