import axios from 'axios';

// 从 Edge Config URL 中提取配置 ID
function getConfigIdFromUrl(url: string): string {
  const matches = url.match(/\/([^\/]+)$/);
  return matches ? matches[1] : '';
}

async function clearEdgeConfig() {
  if (!process.env.EDGE_CONFIG) {
    console.error('Error: EDGE_CONFIG environment variable is not set');
    process.exit(1);
  }

  const configId = getConfigIdFromUrl(process.env.EDGE_CONFIG);
  if (!configId) {
    console.error('Error: Could not extract config ID from EDGE_CONFIG URL');
    process.exit(1);
  }

  try {
    const response = await axios.delete(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
      },
      data: {
        items: ['members', 'tasks', 'taskAssignments', 'systemConfigs'],
      },
    });

    console.log('Successfully cleared Edge Config data:', response.data);
  } catch (error) {
    console.error('Error clearing Edge Config data:', error);
    process.exit(1);
  }
}

clearEdgeConfig(); 