# Team Rotator

A team rotation management system built with Next.js and Vercel Edge Config. This application helps teams manage and automate task rotations among team members.

## Features

### Member Management
- View all team members
- Add new team members with name and Slack ID
- Edit existing member information
- Delete members from the system

### Task Management
- View all tasks
- Add new tasks with name and rotation rules
- Edit existing task details
- Delete tasks from the system
- Supported rotation rules:
  - Daily
  - Weekly (Monday/Friday)
  - Biweekly (Monday/Wednesday/Thursday)

### Task Assignment
- Automatic task rotation based on rules
- Manual rotation trigger
- Slack notifications for new assignments
- View current and upcoming assignments

## Technology Stack

- **Frontend**: Next.js 13+ with App Router
- **UI Components**: Material-UI (MUI)
- **State Management**: TanStack Query (React Query)
- **Data Storage**: Vercel Edge Config
- **API**: Next.js API Routes
- **Deployment**: Vercel

## Environment Variables

### Required
- `EDGE_CONFIG`: The Edge Config connection string (e.g., `https://edge-config.vercel.com/ecfg_xxx?token=xxx`)
  - Used for reading data from Edge Config
  - The token in this URL is used for read-only operations

### Optional
- `VERCEL_ACCESS_TOKEN`: A Vercel access token with Edge Config write permissions
  - Required for write operations (e.g., updating assignments, rotation)
  - Generate from Vercel account settings
  - Must have Edge Config write permissions

## Development

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Set up environment variables:
```bash
# .env.local
EDGE_CONFIG=your_edge_config_url
VERCEL_ACCESS_TOKEN=your_vercel_access_token  # Optional for development
```
4. Run the development server:
```bash
npm run dev
```

## API Endpoints

### Members
- `GET /api/members` - Get all members
- `POST /api/members` - Create a new member
- `PUT /api/members` - Update a member
- `DELETE /api/members?id={id}` - Delete a member

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks` - Update a task
- `DELETE /api/tasks?id={id}` - Delete a task

### Assignments
- `GET /api/assignments` - Get current assignments
- `POST /api/assignments/update-rotation` - Trigger task rotation
- `POST /api/assignments/send-to-slack` - Send notifications to Slack

### System
- `GET /api/config` - Get system configuration
- `POST /api/config` - Update system configuration
- `GET /api/cron` - Trigger scheduled rotation check
- `GET /api/fix-data` - Fix data inconsistencies (e.g., null IDs)

## Data Structure

### Member
```typescript
interface Member {
  id: number;
  host: string;
  slackMemberId: string;
}
```

### Task
```typescript
interface Task {
  id: number;
  name: string;
  rotationRule: string; // 'daily' | 'weekly_friday' | 'biweekly_thursday' etc.
}
```

### Task Assignment
```typescript
interface TaskAssignment {
  id: number;
  taskId: number;
  memberId: number;
  startDate: string;
  endDate: string;
}
```

## Testing Edge Config API

Use the provided test script to verify Edge Config API access:

```bash
# Set environment variables
export EDGE_CONFIG="your_edge_config_url"
export VERCEL_ACCESS_TOKEN="your_vercel_access_token"  # Required for write operations

# Run the test script
./test-edge-config.sh
```

The script will:
1. Get all Edge Configs
2. Get items from the specific Edge Config
3. Test updating an item

## Deployment

When deploying to Vercel:

1. Add the `EDGE_CONFIG` environment variable from your Edge Config settings
2. Add the `VERCEL_ACCESS_TOKEN` environment variable for write operations
3. Deploy the application

The application will automatically use the correct tokens for read and write operations.

## Cron Job

The application includes a daily cron job that:
1. Checks for tasks that need rotation
2. Updates assignments based on rotation rules
3. Sends Slack notifications for new assignments

The cron job runs at midnight UTC daily, but can also be triggered manually via the API. 