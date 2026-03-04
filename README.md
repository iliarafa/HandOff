# HandOff

HandOff interviews you about your project through a conversational UI, then generates a structured CLAUDE.md handoff document — ready to drop into any repo for AI-assisted development.

## How It Works

1. **Interview** — An AI technical lead asks 6–10 targeted questions about your project: architecture, current state, the task at hand, constraints, and success criteria.
2. **Generate** — The transcript is fed to a document generator that produces a clean, comprehensive CLAUDE.md.
3. **Export** — Copy to clipboard or download the file directly.

## Setup

```bash
git clone git@github.com:iliarafa/HandOff.git
cd HandOff
npm install
cp .env.example .env
```

Add your Anthropic API key to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Development

```bash
npm run dev
```

This starts both the Vite dev server (http://localhost:5173) and the Hono API server (port 3001) concurrently.

## Build

```bash
npm run build
npm run preview
```

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Hono (Node.js), Anthropic SDK
- **Model:** Claude Sonnet
