import fetch from 'node-fetch';

const JIRA_DOMAIN = 'caretracker.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

console.log('Testing Jira API connection...');
console.log('Email:', JIRA_EMAIL);
console.log('Token:', JIRA_API_TOKEN ? '***' : 'NOT SET');

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

async function test() {
  try {
    // Test 1: Get current user
    const url1 = `https://${JIRA_DOMAIN}/rest/api/3/myself`;
    console.log('\nTest 1: Fetching current user...');
    console.log('URL:', url1);

    const response1 = await fetch(url1, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response1.status);
    const data1 = await response1.json();
    console.log('Response:', JSON.stringify(data1, null, 2));

    if (response1.ok) {
      console.log('\n✓ Authentication successful!');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
