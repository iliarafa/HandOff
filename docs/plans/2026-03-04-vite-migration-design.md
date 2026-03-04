# Agent Briefing System — Vite Migration Design

## Summary

Migrate `agent-handoff.jsx` (single-file React component running in Claude.ai) to a standalone Vite + React + TypeScript project with a Hono backend proxy for the Anthropic API.

## Architecture

```
SuperMaze/
├── src/
│   ├── main.tsx
│   ├── App.tsx               # Stage state machine (intro|interview|generating|output)
│   ├── index.css             # Tailwind directives + custom keyframes (fadeIn, blink, spin)
│   ├── components/
│   │   ├── Header.tsx        # Status dot + title + NEW SESSION button
│   │   ├── IntroScreen.tsx   # Landing page with stats grid + START INTERVIEW button
│   │   ├── InterviewChat.tsx # Chat messages, typing indicator, input/spinner
│   │   └── OutputDocument.tsx# Rendered markdown + Copy/Download/New buttons
│   └── lib/
│       └── api.ts            # callClaude(messages, mode) → POST /api/chat
├── server/
│   ├── index.ts              # Hono server on port 3001
│   ├── prompts.ts            # SYSTEM_PROMPT + DOCUMENT_PROMPT (verbatim from source)
│   └── anthropic.ts          # Anthropic SDK wrapper
├── .env.example
├── vite.config.ts            # Proxy /api → localhost:3001
├── tsconfig.json
└── package.json
```

## Tech Stack

- React 18, TypeScript, Vite
- Tailwind CSS
- Hono (backend)
- @anthropic-ai/sdk (server-side only)
- concurrently (dev runner)
- tsx (server dev runner)

## API Contract

```
POST /api/chat
Request:  { messages: {role: "user"|"assistant", content: string}[], mode: "interview" | "generate" }
Response: { text: string }
```

Server selects SYSTEM_PROMPT or DOCUMENT_PROMPT based on `mode`. Prompts never ship to client.

## Component Design

### App.tsx
- Owns `stage` state: `"intro" | "interview" | "generating" | "output"`
- Owns `messages`, `input`, `docContent`, `loading`, `questionCount`
- All stage transitions happen here — components never call setStage
- Passes callbacks (`onStart`, `onSend`, `onReset`, `onInputChange`) to children

### Header
- Props: `stage`, `onReset`
- Status dot: green (#4ade80) during interview, yellow (#fbbf24) during generating, gray otherwise
- Shows NEW SESSION button when stage !== "intro"

### IntroScreen
- Props: `onStart`
- Self-contained landing page with tagline, stats grid, start button

### InterviewChat
- Props: `messages`, `loading`, `input`, `onInputChange`, `onSend`, `stage`
- Uses `stage` ONLY for rendering fork: input area (interview) vs spinner (generating)
- No stage transition logic — purely presentational
- Textarea auto-resize preserved
- Typing indicator (3 blinking dots) preserved

### OutputDocument
- Props: `docContent`, `onReset`
- Owns copy/download/new buttons internally
- Custom markdown renderer (h1, h2, bullets, blanks) — no library
- Download uses Blob + URL.createObjectURL (client-side)

## Constraints

- Visual design preserved exactly: dark bg #0a0a0a, Georgia serif, Courier New mono, cream text #e8e0d0
- Prompts copied verbatim to server/prompts.ts
- Model: claude-sonnet-4-20250514, max_tokens: 1000 — hardcoded
- `INTERVIEW_COMPLETE` check: `reply.includes("INTERVIEW_COMPLETE")` — exact
- No database, no auth, no persistence
- State variable renamed from `document` to `docContent`

## Dev Setup

- `npm run dev` → concurrently runs Vite + tsx watch server/index.ts
- `npm run build` → vite build (static frontend) + tsc for server
- Vite proxy: /api → localhost:3001
