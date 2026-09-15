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
    throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchProjectData(projectKey) {
  console.log(`Fetching data for ${projectKey}...`);

  const jql = `project = "${projectKey}" AND updated >= -30d`;
  const issues = await jiraFetch(`/search?jql=${encodeURIComponent(jql)}&maxResults=500&expand=changelog`);

  // Calculate metrics
  const stats = {
    total: issues.total,
    issues: issues.issues || [],
    byStatus: {},
    byType: {},
    byPriority: {},
    created: 0,
    resolved: 0,
    defects: 0,
    features: 0
  };

  (issues.issues || []).forEach(issue => {
    const status = issue.fields.status?.name || 'Unknown';
    const type = issue.fields.issuetype?.name || 'Unknown';
    const priority = issue.fields.priority?.name || 'Unknown';

    // Count by status
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

    // Count defects and features
    if (type === 'Bug') stats.defects++;
    if (['Story', 'Task', 'Spike'].includes(type)) stats.features++;

    // Count created and resolved
    if (status === 'Done' || status === 'Closed') stats.resolved++;
    if (issue.fields.created) stats.created++;
  });

  return stats;
}

async function fetchBoardData(boardId, projectKey) {
  console.log(`Fetching board ${boardId} data for ${projectKey}...`);

  try {
    const board = await jiraFetch(`/board/${boardId}`);
    const sprints = await jiraFetch(`/board/${boardId}/sprint?maxResults=50`);

    // Get current sprint
    const activeSprints = (sprints.values || []).filter(s => s.state === 'active');
    let sprintData = null;

    if (activeSprints.length > 0) {
      const sprintId = activeSprints[0].id;
      const sprintIssues = await jiraFetch(`/sprint/${sprintId}/issue?maxResults=500`);

      sprintData = {
        name: activeSprints[0].name,
        state: activeSprints[0].state,
        issueCount: sprintIssues.total || 0,
        issues: sprintIssues.issues || []
      };
    }

    return {
      boardId,
      boardName: board.name,
      projectKey,
      sprintData
    };
  } catch (err) {
    console.error(`Error fetching board ${boardId}:`, err.message);
    return { boardId, error: err.message };
  }
}

async function main() {
  try {
    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      throw new Error('JIRA_EMAIL and JIRA_API_TOKEN environment variables are required');
    }

    const data = {
      timestamp: new Date().toISOString(),
      projects: {}
    };

    for (const project of projects) {
      data.projects[project.key] = await fetchProjectData(project.key);
    }

    // Fetch board data for AMP
    data.ampBoard = await fetchBoardData(75, 'AMP');

    // Save to JSON
    const dataDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(
      path.join(dataDir, 'jira-data.json'),
      JSON.stringify(data, null, 2)
    );

    console.log('Data saved to public/jira-data.json');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
