import axios from 'axios';

async function createEdgeConfig() {
  if (!process.env.VERCEL_API_TOKEN) {
    console.error('Error: VERCEL_API_TOKEN environment variable is not set');
    process.exit(1);
  }

  try {
    const response = await axios.post(
      'https://api.vercel.com/v1/edge-config',
      { 
        name: 'team-rotator',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        },
      }
    );

    console.log('Successfully created Edge Config:', response.data);
  } catch (error) {
    console.error('Error creating Edge Config:', error);
    process.exit(1);
  }
}

createEdgeConfig(); 