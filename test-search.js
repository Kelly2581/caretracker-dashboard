import fetch from 'node-fetch';

const JIRA_DOMAIN = 'caretracker.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

async function test() {
  try {
    // Try different search endpoints
    const jql = `project = "CT"`;
    const endpoint = `/search?jql=${encodeURIComponent(jql)}&maxResults=10`;
    const url = `https://${JIRA_DOMAIN}/rest/api/3${endpoint}`;

    console.log('Testing search endpoint...');
    console.log('URL:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    const data = await response.json();

    if (response.ok) {
      console.log('✓ Search successful!');
      console.log(`Found ${data.total} issues in CT project`);
      if (data.issues && data.issues.length > 0) {
        console.log('Sample issue:', data.issues[0].key, '-', data.issues[0].fields.summary);
      }
    } else {
      console.log('Error response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
