# Docker And GitHub Actions Guide

This file explains the Docker files, Docker Compose setup, Render configuration, and GitHub Actions workflows added to this project. It also explains how to reproduce the setup from scratch.

## Architecture Summary

The project has two deployable concerns:

| Area | Runtime | Deployment target | Main files |
|---|---|---|---|
| Backend | FastAPI in Docker | Render | `backend/Dockerfile`, `render.yaml`, `.github/workflows/deploy-backend.yml` |
| Frontend | Expo app built by EAS | Expo EAS Build | `Dockerfile.frontend`, `.github/workflows/deploy-frontend.yml`, `eas.json` |

Important distinction:

- The backend Docker image is production runtime. Render builds and runs it.
- The frontend Docker image is not production runtime. It is a local and CI tooling container that runs Node, npm, and `eas-cli`. Expo EAS builds the actual Android/iOS apps remotely.

## Backend Dockerfile

File: `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim
```

Uses the official Python 3.11 slim Linux image. It is smaller than the full Python image but still has enough runtime support for FastAPI and asyncpg.

```dockerfile
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
```

Sets Python and pip runtime behavior:

- `PYTHONDONTWRITEBYTECODE=1` prevents Python from writing `.pyc` files during normal runtime.
- `PYTHONUNBUFFERED=1` makes logs flush immediately, which is important for Render logs.
- `PIP_NO_CACHE_DIR=1` avoids keeping pip package caches in the image.

```dockerfile
WORKDIR /app/backend
```

Sets the working directory inside the container. This is not a local machine path. It means all following commands run inside the container at `/app/backend`.

```dockerfile
COPY backend/requirements.txt ./requirements.txt
```

Copies the backend dependency file from the repository into the container. It is copied before app code to improve Docker layer caching. Dependencies are only reinstalled when `requirements.txt` changes.

```dockerfile
RUN pip install --upgrade pip \
    && pip install -r requirements.txt \
    && useradd --create-home --shell /usr/sbin/nologin appuser
```

Installs Python dependencies and creates a non-root Linux user named `appuser`. Running as a non-root user is safer than running the app as root.

```dockerfile
COPY --chown=appuser:appuser backend/app ./app
```

Copies the FastAPI source code into `/app/backend/app` inside the container and gives ownership to `appuser`.

The `--chown` matters because the GitHub Actions validation step runs Python as `appuser`. Without this, Python could fail when trying to write `__pycache__` during validation.

```dockerfile
USER appuser
```

Switches the runtime user from root to `appuser`.

```dockerfile
EXPOSE 8080
```

Documents that the container listens on port `8080`. This does not publish the port by itself. Docker Compose and Render handle routing/publishing.

```dockerfile
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
```

Starts the FastAPI app with Uvicorn.

- `app.main:app` points to `backend/app/main.py` and its `app = FastAPI(...)` object.
- `--host 0.0.0.0` makes the server reachable outside the container.
- `${PORT:-8080}` uses Render's `PORT` env var when present, otherwise defaults to `8080`.

## Frontend Dockerfile

File: `Dockerfile.frontend`

```dockerfile
FROM node:22-bookworm-slim
```

Uses the official Node.js 22 slim image. This image is used for local Expo tooling and for GitHub Actions EAS commands.

```dockerfile
WORKDIR /workspace
```

Sets `/workspace` as the app directory inside the container.

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        git \
        openssh-client \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global eas-cli@latest
```

Installs tools required by EAS and npm workflows:

- `bash` for shell scripts.
- `ca-certificates` for HTTPS certificate validation.
- `git` because EAS uses Git to package the project archive.
- `openssh-client` for Git operations that might need SSH.
- `eas-cli` globally, so the container can run `eas build`.

The `rm -rf /var/lib/apt/lists/*` part removes apt metadata to keep the image smaller.

```dockerfile
EXPOSE 8081 19000 19001 19002
```

Documents Expo and Metro ports used during local development.

```dockerfile
CMD ["bash", "-lc", "npm ci && npm run start -- --host lan"]
```

Default local command:

- Installs dependencies using `npm ci`.
- Starts Expo.
- Uses `--host lan`, which is a valid Expo host mode.

Expo does not accept `--host 0.0.0.0`. Valid values are `lan`, `tunnel`, and `localhost`.

## Docker Compose

File: `docker-compose.yml`

Docker Compose lets you run the backend and frontend containers locally.

### Backend Service

```yaml
backend:
  build:
    context: .
    dockerfile: backend/Dockerfile
```

Builds the backend image from the repository root using `backend/Dockerfile`.

The context is the repository root because the Dockerfile copies paths like `backend/requirements.txt` and `backend/app`.

```yaml
env_file:
  - backend/.env
```

Injects backend environment variables into the container at runtime. It does not copy `.env` into the image.

Required backend values:

```env
PORT=8080
DATABASE_URL=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

Optional:

```env
DATABASE_URL_FALLBACK=...
```

```yaml
environment:
  PORT: 8080
```

Sets a default local port value.

```yaml
ports:
  - "8080:8080"
```

Maps container port `8080` to local machine port `8080`.

### Frontend Service

```yaml
frontend:
  build:
    context: .
    dockerfile: Dockerfile.frontend
```

Builds the frontend tooling container from `Dockerfile.frontend`.

```yaml
env_file:
  - .env
```

Injects Expo public environment variables from root `.env` when running locally.

Expected values:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_BASE_URL=...
```

```yaml
environment:
  CI: "0"
```

Forces local frontend runs to not behave like CI. This avoids Metro showing CI-mode behavior during local development.

```yaml
volumes:
  - .:/workspace
  - frontend_node_modules:/workspace/node_modules
```

Mounts the local repository into the container at `/workspace` so code changes are visible immediately.

The named volume `frontend_node_modules` keeps container-installed dependencies separate from host files.

```yaml
ports:
  - "8081:8081"
  - "19000:19000"
  - "19001:19001"
  - "19002:19002"
```

Publishes Metro and Expo-related ports.

```yaml
depends_on:
  - backend
```

Starts the backend before the frontend when running the full Compose stack.

## Docker Ignore Files

### Root `.dockerignore`

File: `.dockerignore`

This file excludes unnecessary or sensitive files from Docker build contexts.

Important excluded paths:

- `.git` and `.github`, because they are not needed inside production images.
- `.env` and nested env files, to prevent secrets from being baked into images.
- `node_modules`, because dependencies should be installed inside the image or container.
- Python cache files and virtual environments.
- local build outputs.

### Backend `.dockerignore`

File: `backend/.dockerignore`

This is useful if the backend is ever built with `backend/` as the context. It excludes backend `.env`, Python caches, virtualenvs, and local tool caches.

## Render Blueprint

File: `render.yaml`

```yaml
services:
  - type: web
    name: gym-mvp-backend
    runtime: docker
    autoDeploy: false
    dockerfilePath: ./backend/Dockerfile
    healthCheckPath: /health
```

Defines a Render web service that runs Docker.

- `type: web` means this is a public HTTP service.
- `runtime: docker` tells Render to build and run a Docker image.
- `autoDeploy: false` means Render should not deploy automatically on every push.
- `dockerfilePath: ./backend/Dockerfile` points Render to the backend Dockerfile.
- `healthCheckPath: /health` tells Render how to confirm the new deployment is healthy.

Environment variables are declared with `sync: false`:

```yaml
envVars:
  - key: DATABASE_URL
    sync: false
  - key: SUPABASE_URL
    sync: false
  - key: SUPABASE_ANON_KEY
    sync: false
```

`sync: false` means secrets must be set in Render's dashboard and should not be committed to Git.

## Backend GitHub Actions Workflow

File: `.github/workflows/deploy-backend.yml`

This workflow validates the backend Docker image and then triggers Render.

### Triggers

```yaml
on:
  push:
    branches:
      - main
    paths:
      - "backend/**"
      - "render.yaml"
      - ".dockerignore"
      - ".github/workflows/deploy-backend.yml"
  workflow_dispatch:
```

The workflow runs when relevant backend/deployment files are pushed to `main`.

It can also be triggered manually because of `workflow_dispatch`.

### Environment Secrets

```yaml
environment: GimApp
```

This is required because the secrets are stored as GitHub Environment secrets under the `GimApp` environment.

Without this line, `${{ secrets.RENDER_DEPLOY_HOOK_URL }}` resolves as empty.

### Build Step

```yaml
docker build --file backend/Dockerfile --tag gym-backend:${GITHUB_SHA} .
```

Builds the backend Docker image from the exact commit being deployed.

### Validation Step

```yaml
docker run --rm --entrypoint python gym-backend:${GITHUB_SHA} -m compileall app
```

Runs a lightweight Python compile check inside the built backend image. This catches syntax/import-level Python issues before triggering Render.

### Render Deploy Step

```yaml
curl --fail --silent --show-error --request POST "$deploy_url"
```

Calls the Render deploy hook URL.

The workflow appends the current commit SHA:

```bash
?ref=${GITHUB_SHA}
```

This tells Render to deploy the same commit that GitHub Actions validated.

Required GitHub Environment secret:

```text
RENDER_DEPLOY_HOOK_URL
```

## Frontend GitHub Actions Workflow

File: `.github/workflows/deploy-frontend.yml`

This workflow builds the frontend tooling image and uses it to queue an EAS production build. Push-triggered runs build Android by default. Manual runs can choose `android`, `ios`, or `all`.

### Triggers

```yaml
on:
  push:
    branches:
      - main
    paths:
      - "src/**"
      - "assets/**"
      - "app.json"
      - "babel.config.js"
      - "eas.json"
      - "global.css"
      - "metro.config.js"
      - "nativewind-env.d.ts"
      - "package.json"
      - "package-lock.json"
      - "tailwind.config.js"
      - "tsconfig.json"
      - "Dockerfile.frontend"
      - ".github/workflows/deploy-frontend.yml"
  workflow_dispatch:
    inputs:
      platform:
        description: EAS platform to build
        required: true
        default: android
        type: choice
        options:
          - android
          - ios
          - all
```

The workflow runs when frontend-related files are pushed to `main`, and it can also be run manually.

### Environment Secrets

```yaml
environment: GimApp
```

This gives the workflow access to the GitHub Environment secrets stored under `GimApp`.

Required GitHub Environment secrets:

```text
EXPO_TOKEN
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL
```

Manual runs expose a `platform` input. Automatic push runs use `android` because iOS needs remote credentials to be validated first.

### Tooling Image Build

```yaml
docker build --file Dockerfile.frontend --tag gym-frontend-ci:${GITHUB_SHA} .
```

Builds the Node/EAS tooling container.

### EAS Build Step

```yaml
docker run --rm \
  --volume "${GITHUB_WORKSPACE}:/workspace" \
  --env CI=1 \
  --env GIT_ALLOW_PROTOCOL=file:https:http:ssh:git \
  --env EXPO_TOKEN \
  --env EXPO_PUBLIC_SUPABASE_URL \
  --env EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --env EXPO_PUBLIC_API_BASE_URL \
  --env BUILD_PLATFORM \
  gym-frontend-ci:${GITHUB_SHA} \
  bash -lc '...'
```

This runs the built frontend tooling image and mounts the GitHub checkout into `/workspace`.

`CI=1` is passed only in GitHub Actions. It is not baked into `Dockerfile.frontend`, because local Metro development should not run in CI mode.

`GIT_ALLOW_PROTOCOL=file:https:http:ssh:git` and `git config --global protocol.file.allow always` are needed because EAS creates its project archive by cloning the mounted repo with a `file://` URL.

Inside the container, this command queues the build:

```bash
eas build --platform "$BUILD_PLATFORM" --profile production --non-interactive --no-wait
```

- The workflow passes `--platform "$BUILD_PLATFORM"`.
- For pushes, `BUILD_PLATFORM` defaults to `android`.
- For manual runs, choose `android`, `ios`, or `all`.
- `--profile production` uses the `production` profile from `eas.json`.
- `--non-interactive` makes the command CI-safe.
- `--no-wait` queues builds and exits instead of waiting for EAS builders to finish.

## Required Configuration Outside The Repo

### GitHub Environment Secrets

Create these under:

```text
GitHub repo > Settings > Environments > GimApp > Environment secrets
```

Required secrets:

```text
RENDER_DEPLOY_HOOK_URL
EXPO_TOKEN
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL
```

### Render Environment Variables

Set these in the Render backend service:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
```

Optional:

```text
DATABASE_URL_FALLBACK
```

`DATABASE_URL_FALLBACK` exists because the backend code attempts multiple database URLs. It is useful when the primary URL fails due to network restrictions, IPv4/IPv6 differences, or a provider-specific connection issue.

### Expo EAS Environment Variables

GitHub secrets are available to GitHub Actions, but the actual app is built on remote EAS builders. Add the public variables to the EAS `production` environment too:

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "..." --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..." --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value "..." --environment production --visibility plaintext
```

Use `plaintext` because `EXPO_PUBLIC_*` values are intended to be embedded in the client app bundle.

### iOS Credentials

EAS non-interactive CI cannot set up missing iOS credentials. Run this locally once if iOS CI builds fail with credential setup errors:

```bash
eas build --platform ios --profile production
```

Follow the interactive Apple credential prompts. After credentials are configured remotely, GitHub Actions can queue non-interactive iOS builds.

## How To Run Locally

Build both containers:

```bash
docker compose build
```

Run both containers:

```bash
docker compose up
```

Run only backend:

```bash
docker compose up backend
```

Run only frontend without starting backend:

```bash
docker compose up --build --no-deps frontend
```

Backend health check:

```text
http://localhost:8080/health
```

Expected response:

```json
{"success":true,"message":"ok"}
```

## How To Trigger Deployments

### Automatic Backend Deployment

Push a backend-related change to `main`:

```bash
git push origin main
```

The backend workflow runs only if the pushed commit changes one of its watched paths.

### Manual Backend Deployment

```bash
gh workflow run "Deploy Backend to Render" --ref main
```

### Automatic Frontend Deployment

Push a frontend-related change to `main`:

```bash
git push origin main
```

The frontend workflow runs only if the pushed commit changes one of its watched paths.

### Manual Frontend Deployment

```bash
gh workflow run "Deploy Frontend to Expo" --ref main
```

Watch the latest run:

```bash
gh run watch
```

List recent runs:

```bash
gh run list --limit 10
```

## Reproduce This Setup From Scratch

1. Add `backend/Dockerfile` to package the FastAPI app.
2. Add root `.dockerignore` to keep secrets and local artifacts out of Docker build contexts.
3. Add `backend/.dockerignore` for backend-only Docker contexts.
4. Add `Dockerfile.frontend` to create a Node/EAS CLI tooling image.
5. Add `docker-compose.yml` with `backend` and `frontend` services.
6. Add `render.yaml` with `runtime: docker`, `dockerfilePath: ./backend/Dockerfile`, `healthCheckPath: /health`, and `autoDeploy: false`.
7. Create a Render backend web service from the repo and disable auto-deploy.
8. Create a Render deploy hook and store it in GitHub as `RENDER_DEPLOY_HOOK_URL` under the `GimApp` environment.
9. Create an Expo access token and store it in GitHub as `EXPO_TOKEN` under the `GimApp` environment.
10. Store frontend public values in GitHub environment secrets and in EAS production environment variables.
11. Add `.github/workflows/deploy-backend.yml`.
12. Add `.github/workflows/deploy-frontend.yml`.
13. Run `docker compose build` locally.
14. Push to `main` and check GitHub Actions.
15. If iOS fails on credentials, run `eas build --platform ios --profile production` locally once to finish Apple credential setup.

## Common Failures And Fixes

### Backend: `PermissionError: app/__pycache__`

Cause: files copied into the Docker image are root-owned while the app runs as `appuser`.

Fix: use `COPY --chown=appuser:appuser backend/app ./app`.

### Backend: `[Errno 101] Network is unreachable`

Cause: the container cannot reach the configured database host, often due to IPv4/IPv6 routing.

Fix: use a Supabase pooler connection string for Docker/Render or configure `DATABASE_URL_FALLBACK`.

### Frontend: `--host 0.0.0.0` Error

Cause: Expo only accepts `lan`, `tunnel`, or `localhost` for `--host`.

Fix: use `--host lan` or `--host tunnel`.

### GitHub Actions: Secrets Are Empty

Cause: secrets are stored as Environment secrets, but the job does not declare `environment: GimApp`.

Fix: add `environment: GimApp` to the job.

### EAS: `git clone file:///workspace ... code 128`

Cause: EAS archives the mounted repo using a local `file://` clone, and Git policy can block file protocol.

Fix: allow file protocol in the CI container with `GIT_ALLOW_PROTOCOL` and `git config --global protocol.file.allow always`.

### EAS: iOS Credentials Not Set Up

Cause: iOS credentials require an interactive setup step.

Fix: run `eas build --platform ios --profile production` locally once and follow prompts.

### EAS: Missing Production Env Vars

Cause: GitHub secrets are not automatically available inside remote EAS builders.

Fix: create EAS production environment variables with `eas env:create`.
