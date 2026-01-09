#!/bin/bash
# Railway Environment Variables Setup Script
# Run this script to automatically set environment variables in Railway
# Requires Railway CLI: npm install -g @railway/cli

echo "Setting up Railway environment variables..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Error: Railway CLI not found. Install it with: npm install -g @railway/cli"
    exit 1
fi

# Prompt for values
read -p "Enter SUPABASE_URL: " SUPABASE_URL
read -p "Enter SUPABASE_KEY: " SUPABASE_KEY
read -p "Enter MAPBOX_ACCESS_TOKEN: " MAPBOX_ACCESS_TOKEN

# Set variables in Railway
railway variables set SUPABASE_URL="$SUPABASE_URL"
railway variables set SUPABASE_KEY="$SUPABASE_KEY"
railway variables set MAPBOX_ACCESS_TOKEN="$MAPBOX_ACCESS_TOKEN"

echo "Environment variables set successfully!"

