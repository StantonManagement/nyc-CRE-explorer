# Railway Environment Variables Setup

## Required Environment Variables

Your app needs these environment variables configured in Railway:

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL (e.g., `https://xxxxx.supabase.co`) | Yes |
| `SUPABASE_KEY` | Supabase anon/public key | Yes |
| `MAPBOX_ACCESS_TOKEN` | Mapbox API access token for maps | Yes |
| `PORT` | Server port (automatically set by Railway) | No |

## Setup Methods

### Method 1: Railway Dashboard (Recommended)
1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Add each variable with its value

### Method 2: Railway CLI (Automated)
If you have Railway CLI installed:

**Windows (PowerShell):**
```powershell
.\railway-setup.ps1
```

**Mac/Linux:**
```bash
chmod +x railway-setup.sh
./railway-setup.sh
```

**Manual CLI commands:**
```bash
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_KEY="your-supabase-anon-key"
railway variables set MAPBOX_ACCESS_TOKEN="your-mapbox-token"
```

### Method 3: Railway CLI with JSON (Bulk Import)
Create a `railway-vars.json` file and use:
```bash
railway variables --file railway-vars.json
```

## Getting Your API Keys

### Supabase
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings > API
4. Copy the "Project URL" → `SUPABASE_URL`
5. Copy the "anon public" key → `SUPABASE_KEY`

### Mapbox
1. Go to https://account.mapbox.com/access-tokens/
2. Create or copy an access token → `MAPBOX_ACCESS_TOKEN`

## After Setup

1. Update Supabase Auth redirect URLs:
   - Go to Supabase Dashboard > Authentication > URL Configuration
   - Add: `https://your-app.up.railway.app/auth/callback`

2. Redeploy your Railway service to pick up the new variables

