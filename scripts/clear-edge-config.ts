const axios = require('axios').default;

// 从 Edge Config URL 中提取配置 ID
function getConfigIdFromUrl(url: string): string {
  const matches = url.match(/ecfg_[a-zA-Z0-9]+/);
  if (!matches) throw new Error('Invalid Edge Config URL');
  return matches[0];
}

async function clearData() {
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
    console.log('开始清除 Edge Config 数据...');

    // 先获取所有现有的键
    const response = await axios.get(
      `https://api.vercel.com/v1/edge-config/${configId}/items${teamQuery}`,
      { headers }
    );

    const existingKeys = response.data.map((item: any) => item.key);
    console.log(`找到 ${existingKeys.length} 个键需要删除`);

    // 删除所有键
    const deleteItems = existingKeys.map(key => ({
      operation: 'delete' as const,
      key,
    }));

    await axios.patch(
      `https://api.vercel.com/v1/edge-config/${configId}/items${teamQuery}`,
      { items: deleteItems },
      { headers }
    );

    console.log('所有数据已清除');
  } catch (error: any) {
    console.error('清除过程中发生错误：', error.response?.data || error.message);
    process.exit(1);
  }
}

clearData(); 