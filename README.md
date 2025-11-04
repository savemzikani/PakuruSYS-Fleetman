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

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/31jTY9o9ifi](https://v0.app/chat/projects/31jTY9o9ifi)**

## Supabase database workflow

This project now manages the database schema and seed data with the Supabase CLI:

1. Install the Supabase CLI and authenticate with your Supabase project (`supabase login`).
2. Ensure the required environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.) are configured for local development.
3. Run a fresh database with migrations and seed data:

   ```bash
   supabase db reset
   ```

   This command applies the SQL migration files in `supabase/migrations/` and then executes `supabase/seed.sql`, which seeds companies, core users, vehicles, and invitations.

4. After making schema changes locally, generate a new migration:

   ```bash
   supabase migration new descriptive_name
   ```

5. Push pending migrations to your Supabase project once verified:

   ```bash
   supabase db push
   ```

For ad-hoc development seeding without resetting the database you can re-run only the seed script:

```bash
supabase db seed run --file supabase/seed.sql
```

Refer to the Supabase CLI documentation for additional commands and options.
