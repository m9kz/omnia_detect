# Deployment

The production deployment uses a blue-green release strategy.

Images are published to:

- `ghcr.io/m9kz/omnia_detect-backend:<tag>`
- `ghcr.io/m9kz/omnia_detect-frontend:<tag>`

## Required Server Layout

Create the deploy root on the server:

```bash
sudo mkdir -p /opt/omnia-detect
sudo chown "$USER":"$USER" /opt/omnia-detect
```

Place production secrets in:

```bash
/opt/omnia-detect/.env
```

The compose file mounts persistent data from:

- `/opt/omnia-detect/data`
- `/opt/omnia-detect/ml_models`
- `/opt/omnia-detect/runs`

## Required GitHub Secrets

- `SSH_HOST`
- `SSH_USER`
- `SSH_KEY`
- `SERVER_NAME`
- `PUBLIC_BASE_URL`

Optional:

- `DEPLOY_PATH`, defaults to `/opt/omnia-detect`
- `GHCR_USERNAME`
- `GHCR_TOKEN`

`GHCR_USERNAME` and `GHCR_TOKEN` are only needed if the GHCR packages are private.

## Release Flow

1. Merge to `main`; CI validates backend, frontend, and compose config.
2. The image workflow publishes backend and frontend images to GHCR.
3. Run the `Deploy` workflow manually and pass the image tag, for example `sha-abc1234` or `v1.2.3`.
4. The deploy script starts the inactive slot, checks `/api/health`, reloads Nginx to the new slot, and stops the old slot.

Blue-green fits this app because the current deployment model is Docker-based and can switch traffic atomically at the host proxy. Canary releases would need traffic splitting and production telemetry that are not present yet.
