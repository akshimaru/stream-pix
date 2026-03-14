# Easypanel production setup

This project is ready to run on Easypanel with managed MySQL, managed Redis, and three app services from the same Git repository:

- `streampix-api`
- `streampix-web`
- `streampix-worker`

There is also a root [Dockerfile](C:/Users/Vibratho/Documents/xtreme-pix/Dockerfile) for Easypanel projects that expect a default Dockerfile in the repository root. It starts the web app by default and can be reused with command override when needed.

## Recommended service layout

### 1. MySQL service

Create a managed MySQL service in Easypanel and keep the generated connection URL for:

- `DATABASE_URL`

### 2. Redis service

Create a managed Redis service in Easypanel and keep the generated connection URL for:

- `REDIS_URL`

### 3. API app service

- Source: this Git repository
- Dockerfile path: `Dockerfile.server`
- Internal port: `4000`
- Health check path: `/v1/health`
- Start command: keep the Dockerfile default
- Public domain example: `https://api.yourdomain.com`

Environment variables:

```env
NODE_ENV=production
PORT=4000
WEB_ORIGIN=https://app.yourdomain.com
SERVER_URL=https://api.yourdomain.com
DATABASE_URL=mysql://user:password@mysql:3306/stream_pix
REDIS_URL=redis://default:password@redis:6379
REDIS_ENABLED=true
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
JWT_SOCKET_SECRET=change-me
ACCESS_COOKIE_NAME=streampix_access_token
REFRESH_COOKIE_NAME=streampix_refresh_token
COOKIE_SECURE=true
COOKIE_DOMAIN=.yourdomain.com
DEFAULT_PLATFORM_FEE_PERCENTAGE=4.99
DEFAULT_PLATFORM_FIXED_FEE=0.39
MOCK_AUTO_CONFIRM_SECONDS=0
RUN_MIGRATIONS_ON_BOOT=true
RUN_SEED_ON_BOOT=false
DATABASE_READY_RETRIES=20
DATABASE_READY_DELAY_SECONDS=5
```

## 4. Web app service

- Source: this Git repository
- Dockerfile path: `Dockerfile` or `Dockerfile.web`
- Internal port: `3000`
- Health check path: `/`
- Public domain example: `https://app.yourdomain.com`

Environment variables:

```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

Important:

- `NEXT_PUBLIC_API_URL` is baked into the Next.js build.
- Do not keep `http://localhost:4000` in Easypanel production builds.
- Use the public API domain, for example `https://api.yourdomain.com`.

## 5. Worker app service

- Source: this Git repository
- Dockerfile path: `Dockerfile.worker`
- No public domain required

Environment variables:

```env
NODE_ENV=production
DATABASE_URL=mysql://user:password@mysql:3306/stream_pix
REDIS_URL=redis://default:password@redis:6379
REDIS_ENABLED=true
```

## Deployment order

1. Provision MySQL
2. Provision Redis
3. Deploy `streampix-api`
4. Deploy `streampix-web`
5. Deploy `streampix-worker`
6. Open the web domain and create or use the seeded accounts

## Notes

- If Easypanel tries to build `/code/Dockerfile` automatically, the root Dockerfile now supports that flow.
- The root Dockerfile boots the web app by default. For API and worker, prefer the dedicated Dockerfiles.
- The Dockerfiles install dependencies with `npm ci --ignore-scripts` and only run Prisma and build steps after the full source code is copied.
- The API container now runs Prisma migrations automatically on boot.
- Leave `RUN_SEED_ON_BOOT=false` in production after the first setup.
- For the first production boot, you may turn `RUN_SEED_ON_BOOT=true`, deploy once, then set it back to `false`.
- Configure Mercado Pago webhooks to point to the API public domain.
- Keep `COOKIE_SECURE=true` in production.
- If web and API use sibling subdomains, set `COOKIE_DOMAIN=.yourdomain.com`.
