import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const JIRA_DOMAIN = 'caretracker.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const projects = [
  { key: 'CT', name: 'CareTracker' },
  { key: 'AMP', name: 'Amplify' }
];

const excludedAssignees = ['Remya', 'Lanying', 'Aqsa', 'Benjamin', 'Shrikar', 'John Hobby'];

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

async function jiraFetch(endpoint) {
  const url = `https://${JIRA_DOMAIN}/rest/api/3${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function fetchProjectData(projectKey) {
  try {
    console.log(`Fetching data for ${projectKey}...`);

    const excludedAssignees = ['Remya', 'Lanying', 'Aqsa', 'Benjamin', 'Shrikar', 'John Hobby'];
    const jql = `project = "${projectKey}" ORDER BY updated DESC`;
    const data = await jiraFetch(`/search/jql?jql=${encodeURIComponent(jql)}&maxResults=500&fields=status,issuetype,priority,created,sprint,epic,changelog`);

    const issuesList = data.issues || [];
    console.log(`Got ${issuesList.length} issues from ${projectKey}`);

    const stats = {
      total: issuesList.length,
      issues: issuesList,
      byStatus: {},
      byType: {},
      byPriority: {},
      bySprintCommitment: {},
      bySprint: {},
      bySprintBugs: {},
      bySprintCapacity: {},
      sprints: [],
      created: 0,
      resolved: 0,
      defects: 0,
      features: 0,
      bugsCreated: 0,
      bugsResolved: 0,
      cycleTimesDevToRelease: [],
      agingByPhase: {}
    };

    issuesList.forEach(issue => {
      try {
        const status = issue.fields?.status?.name || 'Unknown';
        const type = issue.fields?.issuetype?.name || 'Unknown';
        const priority = issue.fields?.priority?.name || 'Unknown';
        const sprints = issue.fields?.sprint || [];
        const sprintName = sprints && sprints.length > 0 ? sprints[0].name : 'No Sprint';
        const createdDate = issue.fields?.created ? new Date(issue.fields.created) : null;

        // Basic counts
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

        // Sprint tracking
        if (sprintName !== 'No Sprint') {
          stats.bySprint[sprintName] = (stats.bySprint[sprintName] || 0) + 1;
          if (status === 'Done' || status === 'Closed') {
            stats.bySprintCommitment[sprintName] = (stats.bySprintCommitment[sprintName] || 0) + 1;
          }
        }

        // Type counts
        if (type === 'Bug') stats.defects++;
        if (['Story', 'Task', 'Spike'].includes(type)) stats.features++;

        // Status counts
        if (status === 'Done' || status === 'Closed') stats.resolved++;
        if (issue.fields?.created) stats.created++;

        // Bug tracking
        if (type === 'Bug') {
          stats.bugsCreated++;
          if (status === 'Done' || status === 'Closed') stats.bugsResolved++;

          // Bug tracking by sprint
          if (sprintName !== 'No Sprint') {
            if (!stats.bySprintBugs[sprintName]) {
              stats.bySprintBugs[sprintName] = { created: 0, resolved: 0 };
            }
            stats.bySprintBugs[sprintName].created++;
            if (status === 'Done' || status === 'Closed') {
              stats.bySprintBugs[sprintName].resolved++;
            }
          }
        }

        // Capacity mix by sprint
        if (sprintName !== 'No Sprint') {
          if (!stats.bySprintCapacity[sprintName]) {
            stats.bySprintCapacity[sprintName] = { features: 0, maintenance: 0, total: 0 };
          }
          stats.bySprintCapacity[sprintName].total++;
          if (['Story', 'Task', 'Spike'].includes(type)) {
            stats.bySprintCapacity[sprintName].features++;
          } else if (type === 'Bug' || type === 'Tech Debt') {
            stats.bySprintCapacity[sprintName].maintenance++;
          }
        }

        // Cycle time calculation (Dev Ready to Release Ready)
        if (status === 'Release Ready') {
          const changelog = issue.changelog?.histories || [];
          let devReadyDate = null;

          for (const history of changelog) {
            for (const item of history.items || []) {
              if (item.field === 'status' && item.toString === 'Dev Ready') {
                devReadyDate = new Date(history.created);
              }
            }
          }

          if (devReadyDate && createdDate) {
            const cycleTime = (new Date(status === 'Release Ready' ? status : createdDate) - devReadyDate) / (1000 * 60 * 60 * 24);
            if (cycleTime > 0) stats.cycleTimesDevToRelease.push(cycleTime);
          }
        }

        // Aging by phase
        const phaseMap = {
          'Development': 'Development',
          'Dev Ready': 'Dev Ready',
          'Testing': 'Testing',
          'Product Acceptance': 'Product Acceptance'
        };

        if (phaseMap[status] && !(['Done', 'Closed'].includes(status))) {
          if (!stats.agingByPhase[status]) {
            stats.agingByPhase[status] = { days: [], count: 0 };
          }
          const daysOpen = createdDate ? (Date.now() - createdDate) / (1000 * 60 * 60 * 24) : 0;
          stats.agingByPhase[status].days.push(daysOpen);
          stats.agingByPhase[status].count++;
        }

      } catch (err) {
        console.warn(`Error processing issue ${issue.key}:`, err.message);
      }
    });

    // Calculate averages for aging
    for (const phase in stats.agingByPhase) {
      const days = stats.agingByPhase[phase].days;
      stats.agingByPhase[phase].average = days.length > 0 ? Math.round(days.reduce((a, b) => a + b) / days.length) : 0;
      delete stats.agingByPhase[phase].days;
    }

    // Calculate p85 cycle time
    if (stats.cycleTimesDevToRelease.length > 0) {
      stats.cycleTimesDevToRelease.sort((a, b) => a - b);
      const p85Index = Math.ceil(stats.cycleTimesDevToRelease.length * 0.85) - 1;
      stats.cycleTimeP85 = stats.cycleTimesDevToRelease[Math.max(0, p85Index)];
    } else {
      stats.cycleTimeP85 = 0;
    }

    delete stats.cycleTimesDevToRelease;

    // Build sprint list
    stats.sprints = Object.keys(stats.bySprint).sort();

    return stats;
  } catch (err) {
    console.error(`Error fetching ${projectKey}:`, err.message);
    throw err;
  }
}

async function fetchEpicData(projectKey) {
  try {
    console.log(`Fetching epic data for ${projectKey}...`);

    const jql = `project = "${projectKey}" AND type = Epic`;
    const data = await jiraFetch(`/search/jql?jql=${encodeURIComponent(jql)}&maxResults=500&fields=customfield_10010,customfield_10011`);

    const epics = data.issues || [];
    let blankReleaseDate = 0;
    let blankActualDate = 0;

    epics.forEach(epic => {
      const proposedRelease = epic.fields?.customfield_10010; // Proposed Release Date custom field
      const actualRelease = epic.fields?.customfield_10011; // Actual Release Date custom field

      if (!proposedRelease) blankReleaseDate++;
      if (!actualRelease) blankActualDate++;
    });

    return {
      total: epics.length,
      blankProposedDate: blankReleaseDate,
      blankActualDate: blankActualDate
    };
  } catch (err) {
    console.error(`Error fetching epic data for ${projectKey}:`, err.message);
    return { total: 0, blankProposedDate: 0, blankActualDate: 0 };
  }
}

async function main() {
  try {
    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      throw new Error('JIRA_EMAIL and JIRA_API_TOKEN environment variables are required');
    }

    const data = {
      timestamp: new Date().toISOString(),
      projects: {},
      epics: {}
    };

    for (const project of projects) {
      data.projects[project.key] = await fetchProjectData(project.key);
      data.epics[project.key] = await fetchEpicData(project.key);
    }

    const dataDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(
      path.join(dataDir, 'jira-data.json'),
      JSON.stringify(data, null, 2)
    );

    console.log('✓ Data saved to public/jira-data.json');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
