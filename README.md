# CareTracker Delivery Dashboard

A real-time dashboard showing R&D delivery metrics from both CareTracker (CT) and Amplify (AMP) Jira projects.

## Features

- **Live KPI tiles**: Commitment rate, defect rate, feature capacity for both projects
- **Daily updates**: Automatic data refresh via GitHub Actions
- **Project summaries**: Issue counts and status breakdowns
- **Responsive design**: Works on desktop and mobile

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Jira API Access

1. Create a Jira API token:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Copy the token

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your Jira credentials:
   ```
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-api-token
   ```

### 3. Run Locally

Fetch data manually:
```bash
npm run fetch-data
```

Start dev server:
```bash
npm run dev
```

Open http://localhost:3000

### 4. Deploy to Vercel

1. Push to GitHub (if you haven't already):
   ```bash
   git add .
   git commit -m "Initial dashboard"
   git push -u origin main
   ```

2. Import to Vercel:
   - Go to https://vercel.com/new
   - Select your repository
   - Deploy

3. Configure GitHub Actions secrets:
   - Go to Settings → Secrets and variables → Actions
   - Add these secrets:
     - `JIRA_EMAIL`: Your Jira email
     - `JIRA_API_TOKEN`: Your API token
     - `VERCEL_TOKEN`: Get from https://vercel.com/account/tokens

4. The dashboard will now:
   - Fetch new data daily at 9 AM EST
   - Commit data to the repo
   - Deploy to Vercel automatically

## Data Sources

- **CareTracker (CT)**: `caretracker.atlassian.net` project CT
- **Amplify (AMP)**: Board 75 on `caretracker.atlassian.net`

## Metrics

### Commitment Rate
- Resolved issues as % of total issues
- Target: ≥85%

### Defect Rate
- Bug issues as % of total issues
- Target: ≤10%

### Feature Capacity
- Story/Task/Spike issues as % of total issues
- Target: ≥70%

## Architecture

```
src/
  App.jsx          - Main dashboard component
  App.css          - Styling
  index.jsx        - React entry point

public/
  index.html       - HTML template
  jira-data.json   - Data file (updated daily)

scripts/
  fetchJiraData.js - Script to fetch from Jira API

.github/workflows/
  update-data.yml  - GitHub Actions workflow for daily updates
```

## Development

Add new metrics:
1. Update `fetchJiraData.js` to calculate the metric
2. Update `App.jsx` to display the metric
3. Commit and push (GitHub Actions will run the next day)

## Support

For Jira API docs: https://developer.atlassian.com/cloud/jira/rest/v3/
