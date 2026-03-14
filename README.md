# StreamPix

StreamPix is a production-oriented SaaS foundation for streamers, creators, and live communities who want PIX payments, realtime overlays, TTS on stream, and a payout ledger ready for growth.

## Stack

- `apps/web`: Next.js 15, React 19, Tailwind CSS, Framer Motion, React Hook Form, Zod, Zustand
- `apps/server`: Fastify, Prisma, MySQL, Socket.IO, modular REST API
- `apps/worker`: BullMQ worker for async TTS jobs
- `packages/shared`: shared types, schemas, constants, realtime events

## Highlights

- Multi-tenant workspaces for streamers
- JWT auth with refresh token cookies
- Public PIX page per streamer
- Secure overlay widget for OBS and browser sources
- Mock PIX provider for local development
- Real Mercado Pago integration for PIX collection and streamer payouts
- Streamer payout wallet with ledger, balance tracking, and security PIN
- Superadmin dashboard with plans, transactions, payouts, providers, and audit logs
- Prisma schema, SQL migrations, and demo seed included

## Repository layout

```text
.
|-- apps
|   |-- web
|   |-- server
|   `-- worker
|-- packages
|   `-- shared
|-- docker-compose.yml
|-- Dockerfile.server
|-- Dockerfile.worker
|-- Dockerfile.web
`-- .env.example
```

## Core modules

- `auth`
- `plans`
- `public-pages`
- `pix-payments`
- `payment-providers`
- `alerts`
- `tts`
- `overlays`
- `payouts`
- `payout-providers`
- `streamer`
- `superadmin`
- `webhooks`
- `notifications`

## Requirements

- Node.js 24+
- npm 11+
- MySQL 8+
- Redis 7+ for BullMQ and worker processing

For local runs without Redis, keep `REDIS_ENABLED=false`.

## Environment setup

1. Copy `.env.example` to `.env`
2. Adjust `DATABASE_URL`, `REDIS_URL`, `SERVER_URL`, and JWT secrets
3. If you do not want queues locally, set `REDIS_ENABLED=false`

## Install

```bash
npm install
```

## Run without Docker

1. Start MySQL
2. Create the database
3. Run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Services:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## Run with Docker

```bash
docker compose up --build
```

Containers started:

- MySQL on `3306`
- Redis on `6379`
- API on `4000`
- Web on `3000`
- Worker on BullMQ

## Easypanel production

The repository is prepared to run on Easypanel with separate `api`, `web`, and `worker` app services plus managed MySQL and Redis.

Production guide:

- `deploy/easypanel/README.md`

## Database

### Prisma generate

```bash
npm run db:generate
```

### Apply migrations

```bash
npm run db:migrate
```

### Seed demo data

```bash
npm run db:seed
```

Important files:

- Schema: `apps/server/prisma/schema.prisma`
- Seed: `apps/server/prisma/seed.ts`
- Initial migration: `apps/server/prisma/migrations/202603130001_init/migration.sql`

## Demo access

### Superadmin

- Email: `admin@streampix.dev`
- Password: `Admin123!`

### Streamer demo

- Email: `demo@streampix.dev`
- Password: `Demo123!`

### Demo routes

- Public PIX page: `http://localhost:3000/s/alpha-neon`
- Secure overlay widget: `http://localhost:3000/widget/alerts/ovl_demo_alpha_neon`
- Streamer payouts page: `http://localhost:3000/dashboard/payouts`
- Superadmin dashboard: `http://localhost:3000/admin`

### Demo payout data

- PIX key: `financeiro@alpha-neon.live`
- Withdrawal security code: `246810`
- Instant payout enabled: `true`

## Scripts

```bash
npm run dev
npm run dev:web
npm run dev:server
npm run dev:worker
npm run start
npm run start:full
npm run start:web
npm run start:server
npm run start:worker
npm run build
npm run lint
npm run db:generate
npm run db:migrate
npm run db:seed
```

- `npm run start`: starts API and web from built artifacts
- `npm run start:full`: starts API, worker, and web

## Security notes

- Password hashing uses `bcryptjs`
- Cookies are `httpOnly`
- Roles are modeled through `roles` and `user_roles`
- Rate limiting is enabled in Fastify
- Overlay access uses secure tokens
- Webhook idempotency is stored in `webhook_events`
- Inputs are validated with Zod and sanitized before alert and TTS processing

## Payment providers

The mock provider remains available for local development:

- `apps/server/src/modules/payment-providers/mock-pix-provider.ts`
- `apps/server/src/modules/payment-providers/registry.ts`

The real Mercado Pago integration lives under:

- `apps/server/src/modules/payment-providers/mercado-pago-pix-provider.ts`
- `apps/server/src/modules/payment-providers/mercado-pago-shared.ts`
- `apps/server/src/modules/payout-providers/mercado-pago-payout-provider.ts`
- `apps/server/src/modules/superadmin/service.ts`
- `apps/web/src/app/admin/page.tsx`

## Mercado Pago setup

The `MERCADO_PAGO` provider is seeded in the database and can be activated by the superadmin.

### Superadmin flow

1. Login as `admin@streampix.dev`
2. Open `http://localhost:3000/admin`
3. In `Providers PIX e payout`, locate `MERCADO_PAGO`
4. Fill the credentials
5. Enable `Provider ativo para gerar cobrancas PIX`
6. Enable `Usar como provider padrao global` if you want all streamers to use Mercado Pago
7. Click `Testar conexao`
8. Click `Salvar provider`

### Mercado Pago fields

- `Access Token`: required for PIX collection
- `Public Key`: optional for future client-side flows
- `Webhook secret`: used to validate `x-signature` from Mercado Pago notifications
- `Notification URL override`: optional custom URL if you do not want to use the platform default
- `Expiracao do PIX`: QR code expiration time in minutes
- `Exigir e-mail do apoiador`: requires payer email on the public page
- `Exigir CPF/CNPJ do apoiador`: requires payer document on the public page
- `Habilitar saques reais via Mercado Pago`: enables real streamer payouts
- `Access Token de payout`: optional dedicated payout token; if empty, the main token is reused
- `Notification URL do payout`: optional callback URL for payout events
- `Exigir assinatura no payout`: optional advanced payout signature flow
- `Chave privada PEM do payout`: private key used when payout signature enforcement is enabled

### Default webhook URL

When the provider is active, StreamPix exposes:

```text
http://localhost:4000/v1/webhooks/payment/MERCADO_PAGO?source_news=webhooks
```

In production, replace `localhost` with your public API domain.

## Public PIX flow

1. The fan opens the public page, for example `http://localhost:3000/s/alpha-neon`
2. They enter:
   - amount
   - message
   - optional supporter name
   - payer email and document if the superadmin configured those as required
3. If the supporter name is empty, StreamPix stores `Desconhecido`
4. StreamPix creates the PIX charge through Mercado Pago
5. The QR Code and copy-paste PIX payload are shown on screen
6. The fan pays in the banking app
7. Mercado Pago notifies the webhook
8. StreamPix confirms the charge, calculates platform fee and gateway fee, and credits the streamer's net balance
9. The overlay is triggered and the TTS message is sent to the live

## Payout flow

Streamer payout configuration is in `Dashboard > Repasses`.

The streamer configures:

- legal name
- CPF or CNPJ
- PIX key type
- PIX key value
- 6-digit withdrawal security code
- instant payout mode

When the streamer requests a payout:

1. The request validates the 6-digit security code
2. The amount is moved from `availableBalance` to `lockedBalance`
3. If instant payout is enabled and Mercado Pago payout is active, the transfer is sent immediately
4. On success, the request moves to `PAID`
5. On failure, the value returns to the streamer's available balance

Main files:

- `apps/server/src/modules/payouts/service.ts`
- `apps/server/src/modules/payouts/routes.ts`
- `apps/server/src/modules/payout-providers/mock-payout-provider.ts`
- `apps/server/src/modules/payout-providers/mercado-pago-payout-provider.ts`
- `apps/web/src/app/dashboard/payouts/page.tsx`

## Treasury model

The current financial model assumes one master Mercado Pago account owned by the platform.

Operationally:

1. The full PIX payment lands in the platform account
2. StreamPix records `grossAmount`, `platformFee`, `gatewayFee`, and `netAmount`
3. Only the streamer's `netAmount` becomes available in `streamer_payout_accounts.availableBalance`
4. Streamer withdrawals debit the platform account and transfer the value to the streamer's PIX key
5. The platform revenue remains represented by the accumulated fees already stored in `pix_charges` and `pix_transactions`

This keeps the streamer's balance segregated in the product ledger even if the cash is centralized in one Mercado Pago account.

## TTS provider swap

The mock TTS worker path is:

- `apps/worker/src/providers/mock-tts-provider.ts`

To add a real TTS provider:

1. Create a provider implementation inside the worker
2. Use the current `tts_jobs` payload format
3. Persist `audioUrl`, status, and execution metadata
4. Update `tts_providers` seed or config to mark the new provider as default

## Future expansion points

The current structure is ready for:

- Twitch API
- YouTube Live
- TikTok Live
- chatbot and live commands
- goals, raffles, ranking, and gamification
- affiliate system
- split payments
- antifraud
- premium multi-voice marketplace
- custom domains
- i18n and multi-currency growth

## Notes

- The mock PIX and mock payout providers remain available for local development
- The architecture is modular so real providers can replace mocks without rewriting the main charge flow
- The overlay uses realtime socket events and browser speech for local playback, while the worker still records async TTS execution state
