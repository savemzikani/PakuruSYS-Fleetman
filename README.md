# Logistics management app

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/savemzikanis-projects/v0-logistics-management-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/31jTY9o9ifi)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/savemzikanis-projects/v0-logistics-management-app](https://vercel.com/savemzikanis-projects/v0-logistics-management-app)**

## Local development setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file (copy from `.env.example` if available) and add:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-public-token
   ```

   - Generate a Mapbox token at [https://account.mapbox.com/](https://account.mapbox.com/).
   - Only expose public/PK tokens in `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.

3. Start the dev server:

   ```bash
   npm run dev
   ```

## Continuing in v0.app

You can keep iterating on the UI and re-sync with v0.app at:

**[https://v0.app/chat/projects/31jTY9o9ifi](https://v0.app/chat/projects/31jTY9o9ifi)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
