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
    const text = await response.text();
    throw new Error(`Jira API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function fetchProjectData(projectKey) {
  try {
    console.log(`Fetching data for ${projectKey}...`);

    const excludedAssignees = ['Remya', 'Lanying', 'Aqsa', 'Benjamin', 'Shrikar', 'John Hobby'];
    const assigneeFilter = excludedAssignees.map(name => `assignee != "${name}"`).join(' AND ');
    const jql = `project = "${projectKey}" AND updated >= -30d AND ${assigneeFilter}`;
    const data = await jiraFetch(`/search/jql?jql=${encodeURIComponent(jql)}&maxResults=500&fields=status,issuetype,priority,created`);

    const issuesList = data.issues || [];
    console.log(`Got ${issuesList.length} issues from ${projectKey}`);

    const stats = {
      total: issuesList.length,
      issues: issuesList,
      byStatus: {},
      byType: {},
      byPriority: {},
      created: 0,
      resolved: 0,
      defects: 0,
      features: 0
    };

    issuesList.forEach(issue => {
      try {
        const status = issue.fields?.status?.name || 'Unknown';
        const type = issue.fields?.issuetype?.name || 'Unknown';
        const priority = issue.fields?.priority?.name || 'Unknown';

        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

        if (type === 'Bug') stats.defects++;
        if (['Story', 'Task', 'Spike'].includes(type)) stats.features++;

        if (status === 'Done' || status === 'Closed') stats.resolved++;
        if (issue.fields?.created) stats.created++;
      } catch (err) {
        console.warn(`Error processing issue ${issue.key}:`, err.message);
      }
    });

    return stats;
  } catch (err) {
    console.error(`Error fetching ${projectKey}:`, err.message);
    throw err;
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

    const dataDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(
      path.join(dataDir, 'jira-data.json'),
      JSON.stringify(data, null, 2)
    );

    console.log('✓ Data saved to public/jira-data.json');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
