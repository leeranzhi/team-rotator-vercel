const axios = require('axios').default;

async function createEdgeConfig() {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken) {
    console.error('Error: VERCEL_API_TOKEN environment variable is not set');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${vercelToken}`,
    'Content-Type': 'application/json',
  };

  // 拼接 teamId 参数
  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  try {
    console.log('开始创建 Edge Config...');

    const response = await axios.post(
      `https://api.vercel.com/v1/edge-config${teamQuery}`,
      { 
        slug: 'team-rotator-config' 
      },
      { headers }
    );

    console.log('Edge Config 创建成功：', response.data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error?.code === 'edge_config_exists') {
      console.log('Edge Config 已存在，正在获取详情...');
      
      // 获取所有 Edge Config
      const listResponse = await axios.get(
        `https://api.vercel.com/v1/edge-config${teamQuery}`,
        { headers }
      );

      const existingConfig = listResponse.data.find((config: any) => 
        config.slug === 'team-rotator-config'
      );

      if (existingConfig) {
        console.log('找到现有的 Edge Config：', existingConfig);
        return existingConfig;
      }
    }
    
    console.error('创建过程中发生错误：', error.response?.data || error.message);
    process.exit(1);
  }
}

createEdgeConfig(); 