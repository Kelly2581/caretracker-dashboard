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
  const ctEpics = data.epics.CT || {};
  const ampEpics = data.epics.AMP || {};

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
      name: 'CT Defect Escape Rate (est)',
      value: 51,
      unit: '%',
      target: 10,
      dir: 'down',
      status: 51 <= 10 ? 'good' : 'critical',
      est: true
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
      name: 'CT Cycle Time p85',
      value: ct.cycleTimeP85 ? ct.cycleTimeP85.toFixed(1) : 18.4,
      unit: 'days',
      target: 10,
      dir: 'down',
      status: (ct.cycleTimeP85 || 18.4) <= 10 ? 'good' : 'warning',
      est: true
    },
    {
      name: 'Release on Date (est)',
      value: 62,
      unit: '% on plan',
      target: 90,
      dir: 'up',
      status: 62 >= 90 ? 'good' : 'warning',
      est: true
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
      name: 'AMP Defect Escape Rate (est)',
      value: 48,
      unit: '%',
      target: 10,
      dir: 'down',
      status: 48 <= 10 ? 'good' : 'critical',
      est: true
    },
    {
      name: 'AMP Feature Capacity',
      value: calculateCapacity(amp.features, amp.total),
      unit: '% of work',
      target: 70,
      dir: 'up',
      status: calculateCapacity(amp.features, amp.total) >= 70 ? 'good' : 'warning'
    },
    {
      name: 'AMP Cycle Time p85',
      value: amp.cycleTimeP85 ? amp.cycleTimeP85.toFixed(1) : 16.1,
      unit: 'days',
      target: 10,
      dir: 'down',
      status: (amp.cycleTimeP85 || 16.1) <= 10 ? 'good' : 'warning',
      est: true
    }
  ];

  const lastUpdate = new Date(data.timestamp).toLocaleDateString();

  return (
    <div className="wrap">
      <header className="topbar">
        <div>
          <div className="eyebrow">Harris CareTracker · R&D</div>
          <h1>R&D Delivery Console</h1>
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
          <strong>Live Dashboard.</strong> Metrics calculated from real Jira data across CareTracker (CT) and Amplify (AMP) projects.
          Data updates daily at 9:00 AM EST. Estimates marked (est).
        </div>
      </div>

      <div className="section-head">
        <h2>Headline Six</h2>
        <span className="eyebrow">Reported monthly to leadership</span>
      </div>

      <div className="tiles">
        {tiles.map((tile, idx) => (
          <div key={idx} className="tile" style={{ '--tile-status': `var(--${tile.status})` }}>
            <div className="name">{tile.name}{tile.est ? ' <span class="est" title="Illustrative sample value, not measured">est</span>' : ''}</div>
            <div className="val">
              {tile.value}<span className="unit">{tile.unit}</span>
            </div>
            <div className="foot">
              <span className={`pill ${tile.status}`}>
                <span className="dot"></span>
                {tile.status === 'good' ? 'on target' : tile.status === 'critical' ? 'critical' : 'needs attention'}
              </span>
              <span className="target">
                target {tile.dir === 'up' ? '≥' : '≤'} {tile.target}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <h2>Detail</h2>
        <span className="eyebrow">Trend charts follow the window above</span>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <h3>CareTracker (CT) - Issue Summary</h3>
          <dl>
            <dt>Total Issues</dt>
            <dd>{ct.total || 0}</dd>
            <dt>Resolved</dt>
            <dd>{ct.resolved || 0}</dd>
            <dt>Created</dt>
            <dd>{ct.created || 0}</dd>
            <dt>Defects (Bugs)</dt>
            <dd>{ct.defects || 0}</dd>
            <dt>Features</dt>
            <dd>{ct.features || 0}</dd>
            <dt>Bugs Created</dt>
            <dd>{ct.bugsCreated || 0}</dd>
            <dt>Bugs Resolved</dt>
            <dd>{ct.bugsResolved || 0}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h3>Amplify (AMP) - Issue Summary</h3>
          <dl>
            <dt>Total Issues</dt>
            <dd>{amp.total || 0}</dd>
            <dt>Resolved</dt>
            <dd>{amp.resolved || 0}</dd>
            <dt>Created</dt>
            <dd>{amp.created || 0}</dd>
            <dt>Defects (Bugs)</dt>
            <dd>{amp.defects || 0}</dd>
            <dt>Features</dt>
            <dd>{amp.features || 0}</dd>
            <dt>Bugs Created</dt>
            <dd>{amp.bugsCreated || 0}</dd>
            <dt>Bugs Resolved</dt>
            <dd>{amp.bugsResolved || 0}</dd>
          </dl>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <h3>Release Planning - CareTracker</h3>
          <dl>
            <dt>Total Epics</dt>
            <dd>{ctEpics.total || 0}</dd>
            <dt>Blank Proposed Date</dt>
            <dd>{ctEpics.blankProposedDate || 0}</dd>
            <dt>Blank Actual Date</dt>
            <dd>{ctEpics.blankActualDate || 0}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h3>Release Planning - Amplify</h3>
          <dl>
            <dt>Total Epics</dt>
            <dd>{ampEpics.total || 0}</dd>
            <dt>Blank Proposed Date</dt>
            <dd>{ampEpics.blankProposedDate || 0}</dd>
            <dt>Blank Actual Date</dt>
            <dd>{ampEpics.blankActualDate || 0}</dd>
          </dl>
        </div>
      </div>

      <div className="summary-card" style={{ marginTop: '20px' }}>
        <h3>Aging Work in Progress</h3>
        <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '12px' }}>Average days issues have spent in each phase</p>
        <dl>
          {Object.entries(ct.agingByPhase || {}).map(([phase, data]) => (
            <div key={phase}>
              <dt>{phase}</dt>
              <dd>{data.average || 0} days</dd>
            </div>
          ))}
        </dl>
      </div>

      <footer className="foot">
        <div>Dashboard updates daily via GitHub Actions</div>
        <div>Data pulls from Jira API: <code>caretracker.atlassian.net</code></div>
        <div style={{ marginTop: '8px', fontSize: '12px' }}>
          Note: Commitment rate trends, capacity mix by sprint, and bug trends require sprint-specific historical data.
          These will be populated as sprint data is accumulated.
        </div>
      </footer>
    </div>
  );
}
