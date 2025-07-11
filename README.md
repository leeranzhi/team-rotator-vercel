# Team Rotator

A team rotation management system built with Next.js and Vercel Edge Config.

## Environment Variables

The application requires the following environment variables:

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