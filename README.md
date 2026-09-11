# CareerOS

A conversation-first career workspace with a Next.js interface, a service API, background workers and an evidence-backed data model. Candidates review what an agent proposes before confirming profile details.

### Product walkthrough · 4:03

https://github.com/user-attachments/assets/f825aedc-6b07-4698-95aa-3e5136396f75

[Download video](docs/demo/walkthrough.mp4) · [Architecture](docs/ARCHITECTURE.md) · [Data handling](docs/DATA.md)

## Problem

A CV describes past work but often misses what someone wants next. Turning a conversation into a career profile can introduce assumptions the candidate never agreed to. Preparing applications also requires evidence, review and reliable background work.

## Why it matters

A useful career tool must keep candidate intent, supporting evidence and explicit confirmation separate. Work should survive page reloads and worker restarts without turning an AI suggestion into a verified claim.

## Solution

Start with a voice conversation, review proposed details beside supporting quotes, correct the wording and confirm individual facts. Confirmed conversation facts are stored in PostgreSQL and inform subsequent discovery scans. The latest interface is the home screen; its **Open evidence, matching and preparation workspace** link opens the retained service-backed workflows.

The opportunity archive and CV editor in the latest interface still use fictional examples and templates. The backend workspace supports persisted roles, evidence review, matching criteria, preparation tasks and history. These are distinct paths; the new editor does not yet replace every backend screen.

## Architecture

```text
apps/
  web/       Next.js: latest conversation UI, existing workflows, same-origin proxy
  api/       NestJS: profile, jobs, evidence, matching, discovery and preparation
  worker/    Queue-backed artifact generation and outbox delivery
packages/
  domain/    Shared models and rules
  agents/    Agent contracts and routing policies
  data/      PostgreSQL access and migrations
```

Docker Compose runs PostgreSQL, Redis, migrations, API, artifact worker, discovery worker and web. The web server obtains short-lived ElevenLabs tokens; provider credentials remain server-side. See [architecture and source review guide](docs/ARCHITECTURE.md).

## AI / agent design

The voice agent asks one question at a time and invokes `propose_profile_facts`. The client checks allowed fields and literal candidate quotes. Proposals remain pending until the candidate explicitly confirms them; only then does the API persist the reviewed facts. Discovery consumes these facts with their conversation provenance.

The shared agent package contains routing and budget policies. The default artifact worker uses deterministic templates; it does not execute those policies as a live multi-agent pipeline. The general chat assistant remains disconnected. No employer submission is automated.

## Key tradeoffs

- Evidence quotes establish provenance, not correctness. The candidate reviews the interpretation.
- PostgreSQL holds confirmed facts; pending proposals and conversation history remain in browser storage.
- Existing backend screens remain available during the latest interface migration.
- Fictional opportunity and CV examples make the product walkthrough reproducible without live job sources.

## Production considerations

This is a local, single-user application. Ports bind to loopback. API proxy routes are allowlisted and mutations check origin. A public deployment needs authentication, authorization, rate limits, deletion controls and operational monitoring.

ElevenLabs processes voice and transcripts when enabled. Confirm retention in the provider console. Source fixtures are fictional; never commit runtime databases, `.env` or personal application material.

## How to run

### Docker

Install Docker with Compose, then:

```sh
cp .env.example .env
docker compose --profile full up --build -d
```

Open **http://localhost:3002**. Compose uses its own `careeros-review` project and named database volumes. Migrations run before the API and workers. Override published ports in `.env` if they are already occupied; keep `WEB_ORIGIN` consistent when running outside Compose.

```sh
docker compose --profile full ps
docker compose --profile full logs --tail=100 api worker web
docker compose --profile full down
```

Stopping containers preserves database volumes. Do not remove volumes containing data you want to keep.

### Local development

Use Node 22.22 or later:

```sh
npm ci
cp .env.example .env
docker compose up -d postgres redis
npm run db:migrate
npm run dev
```

Open http://localhost:3002. The API and workers load the local `.env` configuration.

```sh
npm test
npm run typecheck
npm run build
```

### Optional voice

Create a private ElevenLabs agent from `voice-agent-config.json`, replace its stock-voice placeholder, and configure `propose_profile_facts` as a blocking client tool. Set `ELEVENLABS_API_KEY` and `ELEVENLABS_DEMO_AGENT_ID` in `.env`, then recreate the web container (`docker compose --profile full up -d web`) or restart local development. Calls use that provider account. No credentials are needed for the other local workflows.

## Demo

The embedded recording shows the approved conversation UI using a fictional candidate. It predates the monorepo integration: confirmed facts now persist in PostgreSQL rather than only on the recording device, and discovery uses the real API. The opportunity and CV scenes remain fictional demonstrations. See [demo notes](docs/DEMO.md).
