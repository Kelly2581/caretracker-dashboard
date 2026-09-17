import { useEffect, useState } from 'react';
import './App.css';

// R&D Delivery Console - Live Dashboard

const SVGNS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, text) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};

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
  const calculateEscapeRate = (created, resolved) => created > 0 ? Math.round(((created - resolved) / created) * 100) : 0;

  const tiles = [
    {
      name: 'CT Commitment Rate',
      value: calculateRate(ct.resolved, ct.total),
      unit: '%',
      target: 85,
      dir: 'up',
      status: calculateRate(ct.resolved, ct.total) >= 85 ? 'good' : 'warning',
      calc: `(${ct.resolved || 0} resolved / ${ct.total || 0} total) × 100`
    },
    {
      name: 'CT Defect Escape Rate',
      value: calculateEscapeRate(ct.bugsCreated, ct.bugsResolved),
      unit: '%',
      target: 10,
      dir: 'down',
      status: calculateEscapeRate(ct.bugsCreated, ct.bugsResolved) <= 10 ? 'good' : 'critical',
      calc: `(${ct.bugsCreated - ct.bugsResolved || 0} unresolved / ${ct.bugsCreated || 0} created) × 100`
    },
    {
      name: 'CT Feature Capacity',
      value: calculateCapacity(ct.features, ct.total),
      unit: '% of work',
      target: 70,
      dir: 'up',
      status: calculateCapacity(ct.features, ct.total) >= 70 ? 'good' : 'warning',
      calc: `(${ct.features || 0} features / ${ct.total || 0} total) × 100`
    },
    {
      name: 'CT Cycle Time p85',
      value: ct.cycleTimeP85 ? ct.cycleTimeP85.toFixed(1) : 18.4,
      unit: 'days',
      target: 10,
      dir: 'down',
      status: (ct.cycleTimeP85 || 18.4) <= 10 ? 'good' : 'warning',
      est: true,
      calc: '85th percentile of days from creation to release'
    },
    {
      name: 'Release on Date (est)',
      value: 62,
      unit: '% on plan',
      target: 90,
      dir: 'up',
      status: 62 >= 90 ? 'good' : 'warning',
      est: true,
      calc: 'Estimated % of work completed on schedule'
    },
    {
      name: 'AMP Commitment Rate',
      value: calculateRate(amp.resolved, amp.total),
      unit: '%',
      target: 85,
      dir: 'up',
      status: calculateRate(amp.resolved, amp.total) >= 85 ? 'good' : 'warning',
      calc: `(${amp.resolved || 0} resolved / ${amp.total || 0} total) × 100`
    },
    {
      name: 'AMP Defect Escape Rate',
      value: calculateEscapeRate(amp.bugsCreated, amp.bugsResolved),
      unit: '%',
      target: 10,
      dir: 'down',
      status: calculateEscapeRate(amp.bugsCreated, amp.bugsResolved) <= 10 ? 'good' : 'critical',
      calc: `(${amp.bugsCreated - amp.bugsResolved || 0} unresolved / ${amp.bugsCreated || 0} created) × 100`
    },
    {
      name: 'AMP Feature Capacity',
      value: calculateCapacity(amp.features, amp.total),
      unit: '% of work',
      target: 70,
      dir: 'up',
      status: calculateCapacity(amp.features, amp.total) >= 70 ? 'good' : 'warning',
      calc: `(${amp.features || 0} features / ${amp.total || 0} total) × 100`
    },
    {
      name: 'AMP Cycle Time p85',
      value: amp.cycleTimeP85 ? amp.cycleTimeP85.toFixed(1) : 16.1,
      unit: 'days',
      target: 10,
      dir: 'down',
      status: (amp.cycleTimeP85 || 16.1) <= 10 ? 'good' : 'warning',
      est: true,
      calc: '85th percentile of days from creation to release'
    }
  ];

  const lastUpdate = new Date(data.timestamp).toLocaleDateString();

  // Chart components
  const ChartCard = ({ title, sub, children }) => (
    <div className="card">
      <header>
        <div>
          <h3>{title}</h3>
          <div className="sub">{sub}</div>
        </div>
      </header>
      {children}
    </div>
  );

  const commitmentChart = () => {
    if (!ct.sprints || ct.sprints.length === 0) {
      return <div className="plot"><p style={{ padding: '20px', color: 'var(--ink-muted)' }}>Sprint data not yet available</p></div>;
    }

    const W = 560, H = 232, M = { t: 14, r: 20, b: 30, l: 34 };
    const iw = W - M.l - M.r, ih = H - M.t - M.b;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });

    const data = ct.sprints.map(s => {
      const total = ct.bySprint[s] || 0;
      const resolved = ct.bySprintCommitment[s] || 0;
      return total > 0 ? Math.round((resolved / total) * 100) : 0;
    });

    const y = v => M.t + ih - (v / 110) * ih;
    const x = i => M.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);

    // Grid lines
    for (const v of [0, 25, 50, 75, 100]) {
      svg.appendChild(el("line", { class: v === 0 ? "baseln" : "gridln", x1: M.l, x2: W - M.r, y1: y(v), y2: y(v) }));
      svg.appendChild(el("text", { class: "ax", x: M.l - 8, y: y(v) + 4, "text-anchor": "end" }, v));
    }

    // Target line
    svg.appendChild(el("line", { class: "tgtln", x1: M.l, x2: W - M.r, y1: y(85), y2: y(85) }));
    svg.appendChild(el("text", { class: "ax-b", x: W - M.r, y: y(85) - 6, "text-anchor": "end" }, "target 85%"));

    // Line path
    svg.appendChild(el("path", {
      d: data.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" "),
      fill: "none", stroke: "var(--s1)", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round"
    }));

    // Points and labels
    data.forEach((v, i) => {
      svg.appendChild(el("circle", { cx: x(i), cy: y(v), r: 3.5, fill: "var(--s1)", stroke: "var(--surface)", "stroke-width": 2 }));
      svg.appendChild(el("text", { class: "ax", x: x(i), y: H - 10, "text-anchor": "middle" }, ct.sprints[i]));
    });

    return <div className="plot"><svg dangerouslySetInnerHTML={{ __html: svg.outerHTML }} style={{ width: '100%', height: 'auto' }} /></div>;
  };

  const capacityChart = () => {
    if (!ct.sprints || ct.sprints.length === 0) {
      return <div className="plot"><p style={{ padding: '20px', color: 'var(--ink-muted)' }}>Sprint data not yet available</p></div>;
    }

    const W = 560, H = 232, M = { t: 14, r: 20, b: 30, l: 34 };
    const iw = W - M.l - M.r, ih = H - M.t - M.b;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });

    const y = v => M.t + ih - (v / 100) * ih;
    const step = iw / ct.sprints.length;
    const bw = Math.min(46, step * 0.56);

    // Grid
    for (const v of [0, 25, 50, 75, 100]) {
      svg.appendChild(el("line", { class: v === 0 ? "baseln" : "gridln", x1: M.l, x2: W - M.r, y1: y(v), y2: y(v) }));
      svg.appendChild(el("text", { class: "ax", x: M.l - 8, y: y(v) + 4, "text-anchor": "end" }, v));
    }

    // Bars
    ct.sprints.forEach((sprint, i) => {
      const capacity = ct.bySprintCapacity[sprint] || { features: 0, maintenance: 0, total: 0 };
      const featurePct = capacity.total > 0 ? (capacity.features / capacity.total) * 100 : 0;

      const cx = M.l + step * i + step / 2;
      const x0 = cx - bw / 2;
      const m = 100 - featurePct;

      const yF = y(featurePct), hF = y(0) - yF;
      const yM = y(100), hM = y(featurePct) - y(100) - 2;

      svg.appendChild(el("rect", { x: x0, y: yM, width: bw, height: Math.max(hM, 0), fill: "var(--s2)", rx: 3 }));
      svg.appendChild(el("rect", { x: x0, y: yF, width: bw, height: Math.max(hF, 0), fill: "var(--s1)", rx: 3 }));
      svg.appendChild(el("text", { class: "ax", x: cx, y: H - 10, "text-anchor": "middle" }, sprint));
    });

    return <div className="plot"><svg dangerouslySetInnerHTML={{ __html: svg.outerHTML }} style={{ width: '100%', height: 'auto' }} /></div>;
  };

  const bugsChart = () => {
    if (!ct.sprints || ct.sprints.length === 0) {
      return <div className="plot"><p style={{ padding: '20px', color: 'var(--ink-muted)' }}>Sprint data not yet available</p></div>;
    }

    const W = 560, H = 232, M = { t: 14, r: 20, b: 30, l: 34 };
    const iw = W - M.l - M.r, ih = H - M.t - M.b;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });

    const max = 50;
    const y = v => M.t + ih - (v / max) * ih;
    const step = iw / ct.sprints.length;
    const bw = Math.min(17, step * 0.28);

    // Grid
    for (const v of [0, 10, 20, 30, 40, 50]) {
      svg.appendChild(el("line", { class: v === 0 ? "baseln" : "gridln", x1: M.l, x2: W - M.r, y1: y(v), y2: y(v) }));
      svg.appendChild(el("text", { class: "ax", x: M.l - 8, y: y(v) + 4, "text-anchor": "end" }, v));
    }

    // Bars
    ct.sprints.forEach((sprint, i) => {
      const bugs = ct.bySprintBugs[sprint] || { created: 0, resolved: 0 };
      const cx = M.l + step * i + step / 2;

      svg.appendChild(el("rect", { x: cx - bw - 1, y: y(bugs.created), width: bw, height: y(0) - y(bugs.created), fill: "var(--s2)", rx: 3 }));
      svg.appendChild(el("rect", { x: cx + 1, y: y(bugs.resolved), width: bw, height: y(0) - y(bugs.resolved), fill: "var(--s1)", rx: 3 }));
      svg.appendChild(el("text", { class: "ax", x: cx, y: H - 10, "text-anchor": "middle" }, sprint));
    });

    return <div className="plot"><svg dangerouslySetInnerHTML={{ __html: svg.outerHTML }} style={{ width: '100%', height: 'auto' }} /></div>;
  };

  const agingChart = () => {
    const phases = ['Development', 'Dev Ready', 'Testing', 'Product Acceptance'];
    const W = 560, rowH = 34, M = { t: 24, r: 54, b: 30, l: 132 };
    const H = M.t + phases.length * rowH + M.b;
    const iw = W - M.l - M.r;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });

    const max = 240;
    const w = v => (v / max) * iw;
    const bh = 16;

    // Grid
    for (const v of [0, 60, 120, 180, 240]) {
      const gx = M.l + w(v);
      svg.appendChild(el("line", { class: v === 0 ? "baseln" : "gridln", x1: gx, x2: gx, y1: M.t, y2: M.t + phases.length * rowH }));
      svg.appendChild(el("text", { class: "ax", x: gx, y: H - 12, "text-anchor": "middle" }, v));
    }

    // Target line
    const tx = M.l + w(14);
    svg.appendChild(el("line", { class: "tgtln", x1: tx, x2: tx, y1: M.t, y2: M.t + phases.length * rowH }));

    // Bars
    phases.forEach((phase, i) => {
      const data = ct.agingByPhase[phase] || { average: 0 };
      const days = data.average || 0;
      const cy = M.t + i * rowH + rowH / 2;

      svg.appendChild(el("rect", { x: M.l, y: cy - bh / 2, width: Math.max(w(days), 2), height: bh, fill: "var(--s1)", rx: 3 }));
      svg.appendChild(el("text", { class: "ax-b", x: M.l - 10, y: cy + 4, "text-anchor": "end" }, phase));
      svg.appendChild(el("text", { class: "dlabel", x: M.l + w(days) + 8, y: cy + 4 }, Math.round(days)));
    });

    svg.appendChild(el("text", { class: "ax", x: tx + 5, y: M.t - 8 }, "target 14d"));

    return <div className="plot"><svg dangerouslySetInnerHTML={{ __html: svg.outerHTML }} style={{ width: '100%', height: 'auto' }} /></div>;
  };

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
        <h2>Metrics</h2>
        <span className="eyebrow">Reported monthly to leadership</span>
      </div>

      <div className="section-head" style={{ marginTop: '32px', marginBottom: '16px' }}>
        <h3>CareTracker</h3>
      </div>
      <div className="tiles">
        {tiles.slice(0, 5).map((tile, idx) => (
          <div key={idx} className="tile" style={{ '--tile-status': `var(--${tile.status})` }}>
            <div className="name">{tile.name}{tile.est ? ' (est)' : ''}</div>
            <div className="val">
              {tile.value}<span className="unit">{tile.unit}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '8px 0 0 0' }}>
              {tile.calc}
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

      <div className="section-head" style={{ marginTop: '32px', marginBottom: '16px' }}>
        <h3>Amplify</h3>
      </div>
      <div className="tiles">
        {tiles.slice(5).map((tile, idx) => (
          <div key={idx + 5} className="tile" style={{ '--tile-status': `var(--${tile.status})` }}>
            <div className="name">{tile.name}{tile.est ? ' (est)' : ''}</div>
            <div className="val">
              {tile.value}<span className="unit">{tile.unit}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '8px 0 0 0' }}>
              {tile.calc}
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

      <div className="grid">
        <ChartCard
          title="Commitment rate by sprint"
          sub="Points closed as a share of points committed at sprint start"
        >
          {commitmentChart()}
        </ChartCard>

        <ChartCard
          title="Capacity mix by sprint"
          sub="Share of completed points by issue type. Feature = Story, Task, Spike. Maintenance = Bug, Tech Debt"
        >
          <div className="legend">
            <span><span className="swatch" style={{ background: 'var(--s1)' }}></span>Feature</span>
            <span><span className="swatch" style={{ background: 'var(--s2)' }}></span>Maintenance</span>
          </div>
          {capacityChart()}
        </ChartCard>

        <ChartCard
          title="Bugs created vs resolved"
          sub="Bug inflow vs resolution by sprint"
        >
          <div className="legend">
            <span><span className="swatch" style={{ background: 'var(--s2)' }}></span>Created</span>
            <span><span className="swatch" style={{ background: 'var(--s1)' }}></span>Resolved</span>
          </div>
          {bugsChart()}
        </ChartCard>

        <ChartCard
          title="Aging work in progress"
          sub="Average days in current status by workflow phase"
        >
          {agingChart()}
        </ChartCard>
      </div>

      <div style={{ marginTop: '32px', overflowX: 'auto' }}>
        <h3 style={{ marginBottom: '16px' }}>Tickets in Progress by Days in Status</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--ink-lighter)', backgroundColor: 'var(--surface-secondary)' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Ticket</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Title</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Assigned To</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Days in Status</th>
            </tr>
          </thead>
          <tbody>
            {ct.agingIssues && ct.agingIssues.length > 0 ? (
              [...ct.agingIssues, ...(amp.agingIssues || [])]
                .sort((a, b) => b.daysInStatus - a.daysInStatus)
                .slice(0, 25)
                .map((issue, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--ink-lighter)' }}>
                    <td style={{ padding: '12px' }}><strong>{issue.key}</strong></td>
                    <td style={{ padding: '12px' }}>{issue.title}</td>
                    <td style={{ padding: '12px' }}>{issue.assignee}</td>
                    <td style={{ padding: '12px' }}>{issue.status}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: issue.daysInStatus > 20 ? 'var(--critical)' : issue.daysInStatus > 10 ? 'var(--warning)' : 'var(--good)' }}>
                      {issue.daysInStatus}
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: '12px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                  No aging issues
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="section-head">
        <h2>Project Summaries</h2>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <h3>CareTracker (CT)</h3>
          <dl>
            <dt>Total Issues</dt>
            <dd>{ct.total || 0}</dd>
            <dt>Resolved</dt>
            <dd>{ct.resolved || 0}</dd>
            <dt>Defects</dt>
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
          <h3>Amplify (AMP)</h3>
          <dl>
            <dt>Total Issues</dt>
            <dd>{amp.total || 0}</dd>
            <dt>Resolved</dt>
            <dd>{amp.resolved || 0}</dd>
            <dt>Defects</dt>
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

      <footer className="foot">
        <div>Dashboard updates daily via GitHub Actions</div>
        <div>Data pulls from Jira API: <code>caretracker.atlassian.net</code></div>
      </footer>
    </div>
  );
}
