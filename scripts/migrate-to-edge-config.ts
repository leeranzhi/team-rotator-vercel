import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

async function readJsonFile(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

async function migrateToEdgeConfig() {
  if (!process.env.EDGE_CONFIG) {
    console.error('Error: EDGE_CONFIG environment variable is not set');
    process.exit(1);
  }

  try {
    // 读取本地 JSON 文件
    const members = await readJsonFile(path.join(process.cwd(), 'data', 'members.json'));
    const tasks = await readJsonFile(path.join(process.cwd(), 'data', 'tasks.json'));
    const taskAssignments = await readJsonFile(path.join(process.cwd(), 'data', 'task_assignments.json'));
    const systemConfigs = await readJsonFile(path.join(process.cwd(), 'data', 'system_configs.json'));

    if (!members || !tasks || !taskAssignments || !systemConfigs) {
      console.error('Error: Failed to read one or more JSON files');
      process.exit(1);
    }

    // 获取 Edge Config ID
    const matches = process.env.EDGE_CONFIG.match(/\/([^\/]+)$/);
    const configId = matches ? matches[1] : '';
    if (!configId) {
      console.error('Error: Could not extract config ID from EDGE_CONFIG URL');
      process.exit(1);
    }

    // 迁移数据到 Edge Config
    await axios.patch(
      `https://api.vercel.com/v1/edge-config/${configId}/items`,
      {
        items: [
          { key: 'members', value: members },
          { key: 'tasks', value: tasks },
          { key: 'taskAssignments', value: taskAssignments },
          { key: 'systemConfigs', value: systemConfigs },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        },
      }
    );

    console.log('Successfully migrated data to Edge Config');
  } catch (error) {
    console.error('Error migrating data to Edge Config:', error);
    process.exit(1);
  }
}

migrateToEdgeConfig(); 