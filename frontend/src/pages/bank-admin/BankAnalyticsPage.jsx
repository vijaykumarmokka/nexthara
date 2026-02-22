import { useState, useEffect } from 'react';
import { bankAdminApi } from '../../api';

export default function BankAnalyticsPage({ bankId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bankId) return;
    bankAdminApi.getAnalytics(bankId).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [bankId]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i><div style={{ marginTop: 12 }}>Loading analytics...</div></div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>No analytics data</div>;

  const maxCount = Math.max(...(data.country_exposure?.map(r => r.count) || [1]), 1);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0d7377', marginBottom: 4 }}>Advanced Bank Analytics</h2>
        <div style={{ fontSize: 13, color: '#6b7280' }}>Country exposure, risk heatmap, credit utilization and trends</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Country-wise exposure */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
            <i className="fas fa-globe-asia" style={{ marginRight: 8, color: '#0d7377' }}></i> Country-wise Exposure
          </div>
          {data.country_exposure?.map(row => {
            const pct = ((row.count / maxCount) * 100).toFixed(0);
            const sanctionRate = row.count > 0 ? ((row.sanctioned / row.count) * 100).toFixed(0) : 0;
            return (
              <div key={row.country} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{row.country || 'Unknown'}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{row.count} apps · {sanctionRate}% sanctioned</span>
                </div>
                <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #0d7377, #14a085)', borderRadius: 4 }}></div>
                </div>
              </div>
            );
          })}
          {!data.country_exposure?.length && <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>No exposure data</div>}
        </div>

        {/* Risk Heatmap - Rejection by Country */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
            <i className="fas fa-fire" style={{ marginRight: 8, color: '#dc2626' }}></i> Risk Heatmap — Rejection by Country
          </div>
          {data.rejection_by_country?.map((row, i) => (
            <div key={row.country} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
                background: i === 0 ? '#dc2626' : i === 1 ? '#f59e0b' : i === 2 ? '#f97316' : '#6b7280',
              }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{row.country || 'Unknown'}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{row.rejected} rejections</div>
            </div>
          ))}
          {!data.rejection_by_country?.length && <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>No rejection data</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Monthly Trend */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
            <i className="fas fa-chart-area" style={{ marginRight: 8, color: '#7c3aed' }}></i> Monthly Application Trend
          </div>
          {data.monthly_trend?.length > 0 ? (
            <div>
              {data.monthly_trend.map(row => {
                const sanctionRate = row.total > 0 ? ((row.sanctioned / row.total) * 100).toFixed(0) : 0;
                return (
                  <div key={row.month} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{row.month}</span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{row.total} total · {row.sanctioned} sanctioned ({sanctionRate}%)</span>
                    </div>
                    <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#f3f4f6' }}>
                      <div style={{ width: `${sanctionRate}%`, background: '#16a34a' }}></div>
                      <div style={{ width: `${100 - sanctionRate}%`, background: '#e5e7eb' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>No trend data (6 months)</div>
          )}
        </div>

        {/* Credit Utilization */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
            <i className="fas fa-tachometer-alt" style={{ marginRight: 8, color: '#1565c0' }}></i> Credit Utilization (Sanctioned Volume)
          </div>
          {data.credit_utilization?.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Month</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Cases</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Total Sanctioned</th>
                </tr>
              </thead>
              <tbody>
                {data.credit_utilization.map(row => (
                  <tr key={row.month} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px', fontSize: 13, fontWeight: 500 }}>{row.month}</td>
                    <td style={{ padding: '8px', fontSize: 13, textAlign: 'right' }}>{row.cases}</td>
                    <td style={{ padding: '8px', fontSize: 13, textAlign: 'right', fontWeight: 600, color: '#1565c0' }}>
                      {row.total_sanctioned ? `₹${(row.total_sanctioned / 100000).toFixed(1)}L` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>No sanctioned volume data</div>
          )}
        </div>
      </div>

      {/* Rejection by Intake */}
      {data.rejection_by_intake?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
            <i className="fas fa-calendar-alt" style={{ marginRight: 8, color: '#f59e0b' }}></i> Rejection by Intake Season
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {data.rejection_by_intake.map(row => (
              <div key={row.intake} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{row.intake}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>{row.rejected}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>rejections</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
