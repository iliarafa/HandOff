# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is HandOff?

HandOff is a web app that interviews developers about their projects via a conversational UI, then generates structured CLAUDE.md handoff documents. It uses Claude as both the interviewer and document generator.

## Commands

```bash
npm run dev       # Start both Vite dev server (5173) and Hono API server (3001) concurrently
npm run build     # Build the React client with Vite
npm run preview   # Preview the production build
```

There are no test or lint scripts configured.

## Environment

Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. The server defaults to port 3001 (`PORT` env var).

## Architecture

**Dual-process dev setup:** Vite dev server (port 5173) proxies `/api/*` to the Hono server (port 3001). The proxy is configured in `vite.config.ts`.

**State machine in App.tsx:** The app progresses through 4 stages: `intro` → `interview` → `generating` → `output`. All stage transitions and data flow are managed in App.tsx, with components receiving props.

**Client → Server flow:**
- `src/lib/api.ts` exports `callClaude(messages, mode)` which POSTs to `/api/chat`
- `server/index.ts` handles the route, calls `callAnthropic()` from `server/anthropic.ts`
- Mode is either `"interview"` or `"generate"`, each using a different system prompt from `server/prompts.ts`

**Interview termination signal:** The interview ends when the AI response contains `"INTERVIEW_COMPLETE"`. This is checked in App.tsx to trigger document generation.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Vite 6
- **Backend:** Hono on Node.js, Anthropic SDK
- **Model:** `claude-sonnet-4-20250514`
- **Dev tooling:** tsx (server watch), concurrently (parallel processes)

## Key Files

- `src/App.tsx` — State machine, all business logic
- `server/prompts.ts` — System prompts for interview and document generation modes
- `server/anthropic.ts` — Anthropic API wrapper
- `src/lib/api.ts` — Client fetch layer
