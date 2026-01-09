# Railway Environment Variables Setup Script (PowerShell)
# Run this script to automatically set environment variables in Railway
# Requires Railway CLI: npm install -g @railway/cli

Write-Host "Setting up Railway environment variables..." -ForegroundColor Cyan

# Check if Railway CLI is installed
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Railway CLI not found. Install it with: npm install -g @railway/cli" -ForegroundColor Red
    exit 1
}

# Prompt for values
$SUPABASE_URL = Read-Host "Enter SUPABASE_URL"
$SUPABASE_KEY = Read-Host "Enter SUPABASE_KEY"
$MAPBOX_ACCESS_TOKEN = Read-Host "Enter MAPBOX_ACCESS_TOKEN"

# Set variables in Railway
railway variables set SUPABASE_URL="$SUPABASE_URL"
railway variables set SUPABASE_KEY="$SUPABASE_KEY"
railway variables set MAPBOX_ACCESS_TOKEN="$MAPBOX_ACCESS_TOKEN"

Write-Host "Environment variables set successfully!" -ForegroundColor Green

