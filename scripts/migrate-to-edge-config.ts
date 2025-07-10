const fs = require('fs');
const path = require('path');
const axios = require('axios').default;

// 读取 JSON 文件
function readJsonFile<T>(filePath: string): T {
  const fullPath = path.join(process.cwd(), filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(fileContent);
}

// 从 Edge Config URL 中提取配置 ID
function getConfigIdFromUrl(url: string): string {
  const matches = url.match(/ecfg_[a-zA-Z0-9]+/);
  if (!matches) throw new Error('Invalid Edge Config URL');
  return matches[0];
}

interface Member {
  id: number;
  slackMemberId: string;
  host: string;
}

interface Task {
  id: number;
  name: string;
  rotationRule: string;
}

interface TaskAssignment {
  id: number;
  taskId: number;
  memberId: number;
  startDate: string;
  endDate: string;
}

interface SystemConfig {
  key: string;
  value: string;
  lastModified: string;
  modifiedBy: string | null;
}

interface AxiosError {
  response?: {
    data: any;
  };
  message: string;
}

async function migrateData() {
  const edgeConfigUrl = process.env.EDGE_CONFIG;
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!edgeConfigUrl) {
    console.error('Error: EDGE_CONFIG environment variable is not set');
    process.exit(1);
  }
  if (!vercelToken) {
    console.error('Error: VERCEL_API_TOKEN environment variable is not set');
    process.exit(1);
  }

  const configId = getConfigIdFromUrl(edgeConfigUrl);

  const headers = {
    'Authorization': `Bearer ${vercelToken}`,
    'Content-Type': 'application/json',
  };

  // 拼接 teamId 参数
  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  try {
    // 读取本地数据
    const members = readJsonFile<Member[]>('data/members.json');
    const tasks = readJsonFile<Task[]>('data/tasks.json');
    const taskAssignments = readJsonFile<TaskAssignment[]>('data/task_assignments.json');
    const systemConfigs = readJsonFile<SystemConfig[]>('data/system_configs.json');

    // 迁移数据到 Edge Config
    console.log('开始迁移数据到 Edge Config...');

    // 先清除旧数据
    console.log('清除旧数据...');
    const deleteItems = [
      { operation: 'delete' as const, key: 'members' },
      { operation: 'delete' as const, key: 'tasks' },
      { operation: 'delete' as const, key: 'taskAssignments' },
      { operation: 'delete' as const, key: 'systemConfigs' }
    ];

    try {
      await axios.patch(
        `https://api.vercel.com/v1/edge-config/${configId}/items${teamQuery}`,
        { items: deleteItems },
        { headers }
      );
      console.log('旧数据清除完成');
    } catch (error: any) {
      console.warn('清除旧数据时发生错误，继续执行迁移...', error.message);
    }

    // 迁移新数据，每个键只包含其对应的数据
    const dataMap = {
      members,
      tasks,
      taskAssignments,
      systemConfigs
    };

    // 分别迁移每个数据集
    for (const [key, value] of Object.entries(dataMap)) {
      try {
        await axios.patch(
          `https://api.vercel.com/v1/edge-config/${configId}/items${teamQuery}`,
          { 
            items: [{
              operation: 'upsert',
              key,
              value
            }]
          },
          { headers }
        );
        console.log(`已迁移 ${key} 数据`);
      } catch (error: any) {
        console.error(`迁移 ${key} 数据时发生错误：`, error.response?.data || error.message);
        throw error;
      }
    }

    console.log('数据迁移成功！');
      
    // 验证迁移
    console.log('\n开始验证迁移数据...');
    const edgeConfigToken = edgeConfigUrl.match(/token=([^&]+)/)?.[1];
    if (!edgeConfigToken) {
      console.warn('未检测到 EDGE_CONFIG 连接串中的 token，跳过验证。');
      return;
    }

    // 分别验证每个数据集
    const verifyDataSet = async (key: string, originalData: any) => {
      const response = await axios.get(
        `https://edge-config.vercel.com/${configId}/item/${key}?token=${edgeConfigToken}`
      );
      const migratedData = response.data;
      const isOk = JSON.stringify(migratedData) === JSON.stringify(originalData);
      console.log(`- ${key}: ${isOk ? '✅' : '❌'}`);
      if (!isOk) {
        console.log('期望数据：', JSON.stringify(originalData, null, 2));
        console.log('实际数据：', JSON.stringify(migratedData, null, 2));
      }
    };

    for (const [key, value] of Object.entries(dataMap)) {
      await verifyDataSet(key, value);
    }

  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('迁移过程中发生错误：', axiosError.response?.data || axiosError.message);
    process.exit(1);
  }
}

migrateData(); 