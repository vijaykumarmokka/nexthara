import { useEffect, useState } from 'react';
import { api } from '../../api';
import { PIPELINE_STAGES } from '../../constants';

export default function Pipeline({ refreshKey }) {
  const [pipeline, setPipeline] = useState(null);

  useEffect(() => {
    api.getPipeline().then(setPipeline).catch(() => {});
  }, [refreshKey]);

  if (!pipeline) return <div className="pipeline-container">Loading pipeline...</div>;

  return (
    <div className="pipeline-container">
      <div className="pipeline-header">
        <h3><i className="fas fa-stream" style={{ marginRight: 8, color: 'var(--sbi-accent)' }}></i> Application Pipeline</h3>
      </div>
      <div className="pipeline-stages">
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage.num} style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
            <div className="pipeline-stage" style={{ flex: 1 }}>
              <div className={`pipeline-stage-head ${stage.color}`}>Stage {stage.num}</div>
              <div className="pipeline-stage-body">
                <div className="pipeline-stage-count">{pipeline[stage.num]?.count || 0}</div>
                <div className="pipeline-stage-label">{stage.label}</div>
              </div>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div className="pipeline-arrow"><i className="fas fa-chevron-right"></i></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
