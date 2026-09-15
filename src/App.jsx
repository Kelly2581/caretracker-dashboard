import { useEffect, useState } from 'react';
import './App.css';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/jira-data.json')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div className="error">No data available</div>;

  const ct = data.projects.CT || {};
  const amp = data.projects.AMP || {};

  const calculateRate = (resolved, total) => total > 0 ? Math.round((resolved / total) * 100) : 0;
  const calculateDefectRate = (defects, total) => total > 0 ? Math.round((defects / total) * 100) : 0;
  const calculateCapacity = (features, total) => total > 0 ? Math.round((features / total) * 100) : 0;

  const tiles = [
    {
      name: 'CT Commitment Rate',
      value: calculateRate(ct.resolved, ct.total),
      unit: '%',
      target: 85,
      dir: 'up',
      status: calculateRate(ct.resolved, ct.total) >= 85 ? 'good' : 'warning'
    },
    {
      name: 'CT Defect Rate',
      value: calculateDefectRate(ct.defects, ct.total),
      unit: '%',
      target: 10,
      dir: 'down',
      status: calculateDefectRate(ct.defects, ct.total) <= 10 ? 'good' : 'warning'
    },
    {
      name: 'CT Feature Capacity',
      value: calculateCapacity(ct.features, ct.total),
      unit: '% of work',
      target: 70,
      dir: 'up',
      status: calculateCapacity(ct.features, ct.total) >= 70 ? 'good' : 'warning'
    },
    {
      name: 'AMP Commitment Rate',
      value: calculateRate(amp.resolved, amp.total),
      unit: '%',
      target: 85,
      dir: 'up',
      status: calculateRate(amp.resolved, amp.total) >= 85 ? 'good' : 'warning'
    },
    {
      name: 'AMP Defect Rate',
      value: calculateDefectRate(amp.defects, amp.total),
      unit: '%',
      target: 10,
      dir: 'down',
      status: calculateDefectRate(amp.defects, amp.total) <= 10 ? 'good' : 'warning'
    },
    {
      name: 'AMP Feature Capacity',
      value: calculateCapacity(amp.features, amp.total),
      unit: '% of work',
      target: 70,
      dir: 'up',
      status: calculateCapacity(amp.features, amp.total) >= 70 ? 'good' : 'warning'
    }
  ];

  const lastUpdate = new Date(data.timestamp).toLocaleDateString();

  return (
    <div className="wrap">
      <header className="topbar">
        <div>
          <div className="eyebrow">Harris CareTracker · R&D</div>
          <h1>Delivery Dashboard</h1>
        </div>
        <div className="stamp">
          <div>
            <span className="eyebrow">Last Updated</span>
            <span className="v">{lastUpdate}</span>
          </div>
          <div>
            <span className="eyebrow">Data Source</span>
            <span className="v">Jira Live</span>
          </div>
        </div>
      </header>

      <div className="notice">
        <div>
          <strong>Live Dashboard.</strong> Metrics are calculated from real Jira data across CareTracker (CT) and Amplify (AMP) projects.
          Data updates daily at 9:00 AM EST.
        </div>
      </div>

      <div className="section-head">
        <h2>Project Metrics</h2>
        <span className="eyebrow">Real-time KPIs from both boards</span>
      </div>

      <div className="tiles">
        {tiles.map((tile, idx) => (
          <div key={idx} className="tile" style={{ '--tile-status': `var(--${tile.status})` }}>
            <div className="name">{tile.name}</div>
            <div className="val">
              {tile.value}<span className="unit">{tile.unit}</span>
            </div>
            <div className="foot">
              <span className={`pill ${tile.status}`}>
                <span className="dot"></span>
                {tile.status === 'good' ? 'on target' : 'needs attention'}
              </span>
              <span className="target">
                target {tile.dir === 'up' ? '≥' : '≤'} {tile.target}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <h2>Project Summary</h2>
        <span className="eyebrow">Issue counts by status</span>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <h3>CareTracker (CT)</h3>
          <dl>
            <dt>Total Issues</dt>
            <dd>{ct.total || 0}</dd>
            <dt>Resolved</dt>
            <dd>{ct.resolved || 0}</dd>
            <dt>Created</dt>
            <dd>{ct.created || 0}</dd>
            <dt>Defects</dt>
            <dd>{ct.defects || 0}</dd>
            <dt>Features</dt>
            <dd>{ct.features || 0}</dd>
          </dl>
          <details>
            <summary>Status breakdown</summary>
            <dl>
              {Object.entries(ct.byStatus || {}).map(([status, count]) => (
                <div key={status}>
                  <dt>{status}</dt>
                  <dd>{count}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>

        <div className="summary-card">
          <h3>Amplify (AMP)</h3>
          <dl>
            <dt>Total Issues</dt>
            <dd>{amp.total || 0}</dd>
            <dt>Resolved</dt>
            <dd>{amp.resolved || 0}</dd>
            <dt>Created</dt>
            <dd>{amp.created || 0}</dd>
            <dt>Defects</dt>
            <dd>{amp.defects || 0}</dd>
            <dt>Features</dt>
            <dd>{amp.features || 0}</dd>
          </dl>
          <details>
            <summary>Status breakdown</summary>
            <dl>
              {Object.entries(amp.byStatus || {}).map(([status, count]) => (
                <div key={status}>
                  <dt>{status}</dt>
                  <dd>{count}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      </div>

      <footer className="foot">
        <div>Dashboard updates daily via GitHub Actions</div>
        <div>Data pulls from Jira API: <code>caretracker.atlassian.net</code></div>
      </footer>
    </div>
  );
}
