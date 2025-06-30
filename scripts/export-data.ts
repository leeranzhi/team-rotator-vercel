const { Client } = require('pg');
const fs = require('fs/promises');
const path = require('path');

interface Member {
  Id: number;
  SlackId: string;
  Host: string;
}

interface Task {
  Id: number;
  TaskName: string;
  RotationRule: string;
}

interface TaskAssignment {
  Id: number;
  TaskId: number;
  MemberId: number;
  StartDate: string;
  EndDate: string;
}

interface SystemConfig {
  Key: string;
  Value: string;
  LastModified: string;
  ModifiedBy: string | null;
}

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'teamrotator',
  user: 'postgres',
  password: 'password'
});

async function exportData() {
  try {
    await client.connect();
    
    // Export members
    const membersResult = await client.query(`
      SELECT "Id", "SlackId", "Host"
      FROM "Members"
    `);
    const members = membersResult.rows.map((row: Member) => ({
      id: row.Id,
      slackMemberId: row.SlackId,
      host: row.Host
    }));
    
    // Export tasks
    const tasksResult = await client.query(`
      SELECT "Id", "TaskName", "RotationRule"
      FROM "Tasks"
    `);
    const tasks = tasksResult.rows.map((row: Task) => ({
      id: row.Id,
      name: row.TaskName,
      rotationRule: row.RotationRule
    }));
    
    // Export task assignments
    const assignmentsResult = await client.query(`
      SELECT "Id", "TaskId", "MemberId", "StartDate", "EndDate"
      FROM "TaskAssignments"
      WHERE "EndDate" >= CURRENT_DATE
    `);
    const assignments = assignmentsResult.rows.map((row: TaskAssignment) => ({
      id: row.Id,
      taskId: row.TaskId,
      memberId: row.MemberId,
      startDate: row.StartDate,
      endDate: row.EndDate
    }));
    
    // Export system configs
    const configsResult = await client.query(`
      SELECT "Key", "Value", "LastModified", "ModifiedBy"
      FROM "SystemConfigs"
    `);
    const configs = configsResult.rows.map((row: SystemConfig) => ({
      key: row.Key,
      value: row.Value,
      lastModified: row.LastModified,
      modifiedBy: row.ModifiedBy
    }));

    // Write to JSON files
    const dataDir = path.join(process.cwd(), 'data');
    
    await fs.writeFile(
      path.join(dataDir, 'members.json'),
      JSON.stringify(members, null, 2)
    );
    
    await fs.writeFile(
      path.join(dataDir, 'tasks.json'),
      JSON.stringify(tasks, null, 2)
    );
    
    await fs.writeFile(
      path.join(dataDir, 'task_assignments.json'),
      JSON.stringify(assignments, null, 2)
    );
    
    await fs.writeFile(
      path.join(dataDir, 'system_configs.json'),
      JSON.stringify(configs, null, 2)
    );

    console.log('Data export completed successfully!');
  } catch (error) {
    console.error('Error exporting data:', error);
  } finally {
    await client.end();
  }
}

exportData(); 