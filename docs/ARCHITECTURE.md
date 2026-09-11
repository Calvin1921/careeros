# Architecture and source review guide

The repository is an npm workspace monorepo. `apps/web` retains Next.js and serves the latest conversation interface at `/`. Its `/workspace`, `/profile`, `/jobs`, `/discover`, `/criteria` and `/intelligence` routes preserve the existing backend workflows.

## Request flow

- `apps/web/ui`: latest interface, conversation state and candidate confirmation.
- `apps/web/app/api/voice/token`: server-only ElevenLabs token adapter.
- `apps/web/app/api/[...path]`: allowlisted same-origin proxy to NestJS; `/career-api` reuses this proxy.
- `apps/api/src`: domain services for profile, evidence, matching, preparation and discovery.
- `apps/worker`: queued artifact generation and outbox processing.
- `packages/data`: PostgreSQL schema and ordered migrations.
- `packages/domain` and `packages/agents`: shared contracts and policies.

Confirmed conversation facts are saved through `/profile/conversation-facts` after explicit review. Pending proposals are never automatically submitted. The backend includes confirmed conversation values in discovery profile signals without representing them as imported CV material. General chat and the new CV editor are not wired to a live reasoning provider.

## Deployment

Compose includes PostgreSQL and Redis health checks, a one-shot migration service, API readiness, web, artifact worker and discovery worker. It uses a separate project name and durable named volumes. Runtime voice credentials are passed only to the web service and excluded from the image build context.

## Current boundaries

The latest opportunity archive and CV editor contain fictional examples. Persisted evidence, matching, preparation and application workflows remain accessible through the backend workspace. Agent routing policies are separately tested; template generation is the default worker path. Browser conversation history is not provider cross-call memory. There is no account or public multi-user security layer.
