# Deployment Instructions

## Overview

GitHub Actions controls both deployments:

- Backend deploys to Render through a Render deploy hook.
- Frontend builds through Expo EAS using `EXPO_TOKEN`.

Render automatic deploys must stay disabled.

## Required GitHub Secrets

Add these in GitHub under `Settings > Secrets and variables > Actions`:

| Secret | Purpose |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Triggers the Render backend deploy |
| `EXPO_TOKEN` | Authenticates EAS CLI in GitHub Actions |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase URL embedded in the Expo build |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key embedded in the Expo build |
| `EXPO_PUBLIC_API_BASE_URL` | Public Render backend URL embedded in the Expo build |

## Required Render Configuration

Create or update the backend web service in Render with these settings:

| Setting | Value |
|---|---|
| Runtime | Docker |
| Dockerfile path | `./backend/Dockerfile` |
| Health check path | `/health` |
| Auto deploy | Disabled |

Set these Render environment variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Primary Supabase/Postgres connection string |
| `DATABASE_URL_FALLBACK` | Optional fallback connection string |
| `SUPABASE_URL` | Supabase project URL for token validation |
| `SUPABASE_ANON_KEY` | Supabase anon key for token validation |

## Backend Deployment Flow

1. Push backend changes to `main`.
2. GitHub Actions runs `.github/workflows/deploy-backend.yml`.
3. The workflow builds `backend/Dockerfile`.
4. The workflow validates Python modules with `compileall`.
5. The workflow calls `RENDER_DEPLOY_HOOK_URL` with the current commit SHA.
6. Render builds and runs the backend container from the same commit.
7. Render checks `/health` before routing traffic.

## Frontend Deployment Flow

1. Push frontend changes to `main`.
2. GitHub Actions runs `.github/workflows/deploy-frontend.yml`.
3. The workflow builds `Dockerfile.frontend`.
4. The workflow runs EAS inside the frontend tooling container.
5. Expo queues a production Android build by default.
6. Manual workflow runs can choose `android`, `ios`, or `all` after iOS credentials are configured.

The EAS command used by CI is:

```bash
eas build --platform android --profile production --non-interactive --no-wait
```

The workflow uses Android by default because iOS production builds require one-time interactive Apple credential validation before they can run in non-interactive GitHub Actions.

## Local Docker Commands

Build both containers:

```bash
docker compose build
```

Run the backend and frontend containers:

```bash
docker compose up
```

Backend health check:

```text
http://localhost:8080/health
```

## Important Notes

- `backend/Dockerfile` is used locally, in GitHub Actions validation, and by Render production.
- `Dockerfile.frontend` is a local and CI tooling container. Expo does not deploy this container.
- Render auto-deploy should be disabled because GitHub Actions triggers backend deployments manually.
- Do not commit `.env` files or secrets. Use GitHub secrets, Render environment variables, and EAS/Expo environment variables.
