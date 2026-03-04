# Agent Briefing System — Vite Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate agent-handoff.jsx to a standalone Vite + React + TypeScript app with a Hono backend proxy.

**Architecture:** Vite frontend with Tailwind CSS, Hono server on port 3001 proxied via Vite dev config. Server owns prompts and Anthropic SDK calls. Client communicates via POST /api/chat with `{messages, mode}`.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Hono, @anthropic-ai/sdk, concurrently, tsx

---

### Task 1: Scaffold Vite project and install dependencies

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `index.html`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Scaffold the Vite project**

Run in the project root (SuperMaze/). Since files already exist, use `--force`:
```bash
npm create vite@latest . -- --template react-ts
```

**Step 2: Install all dependencies**

```bash
npm install hono @hono/node-server @anthropic-ai/sdk dotenv
npm install -D tailwindcss @tailwindcss/vite concurrently tsx @types/node
```

**Step 3: Configure Vite with Tailwind and API proxy**

Replace `vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

**Step 4: Set up Tailwind in index.css**

Replace `src/index.css`:
```css
@import "tailwindcss";

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-fade-in {
  animation: fadeIn 0.6s ease;
}

.animate-fade-in-fast {
  animation: fadeIn 0.4s ease;
}

.animate-blink {
  animation: blink 1.2s ease infinite;
}

.animate-spin-fast {
  animation: spin 0.8s linear infinite;
}
```

**Step 5: Set up index.html**

Ensure `index.html` has:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Briefing System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 6: Set up main.tsx**

Replace `src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**Step 7: Create .env.example**

```
ANTHROPIC_API_KEY=
PORT=3001
```

**Step 8: Update .gitignore**

Append to `.gitignore`:
```
.env
```

**Step 9: Add dev/build scripts to package.json**

Update the `"scripts"` section:
```json
{
  "dev": "concurrently \"vite\" \"tsx watch server/index.ts\"",
  "build": "vite build",
  "preview": "vite preview"
}
```

**Step 10: Create placeholder App.tsx so the project compiles**

Create `src/App.tsx`:
```tsx
export default function App() {
  return <div>App placeholder</div>;
}
```

**Step 11: Verify the frontend compiles**

Run: `npx vite build`
Expected: Build succeeds with no errors.

**Step 12: Commit**

```bash
git add -A
git commit -m "scaffold: Vite + React + TypeScript project with Tailwind and deps"
```

---

### Task 2: Build the Hono server with Anthropic proxy

**Files:**
- Create: `server/prompts.ts`
- Create: `server/anthropic.ts`
- Create: `server/index.ts`
- Create: `tsconfig.server.json`

**Step 1: Create server/prompts.ts**

Copy the two prompt constants verbatim from agent-handoff.jsx (lines 5-57):

```ts
export const SYSTEM_PROMPT = `You are a senior technical lead conducting a project intake interview to create a handoff document for an AI coding agent (like Claude Code).

Your job: ask sharp, specific questions that extract everything a coding agent needs to work autonomously. You ask ONE question at a time. Each question should build on previous answers.

Cover these areas (not necessarily in order, adapt to the conversation):
1. Project overview & purpose
2. Tech stack & architecture
3. Current state (what exists, what's been built)
4. Specific task/feature to implement
5. File structure & entry points
6. Constraints, gotchas, things NOT to do
7. Success criteria
8. External dependencies, APIs, auth

Rules:
- Ask ONE question per response
- Keep questions sharp and specific, not open-ended vague
- When you have enough (after 6-10 exchanges), respond with exactly: "INTERVIEW_COMPLETE"
- Never explain yourself or add preamble
- Respond ONLY with the question or "INTERVIEW_COMPLETE"`;

export const DOCUMENT_PROMPT = `You are creating a CLAUDE.md handoff document for an AI coding agent based on this interview transcript.

Format the document as a clean, comprehensive markdown file that a coding agent can read at session start. Include:

# Project Overview
[2-3 sentences]

## Tech Stack
[bullet list]

## Current State
[what exists, what's working, what's not]

## Your Task
[clear, specific description of what to build]

## Architecture & Key Files
[entry points, important files, structure]

## Constraints & Rules
[things NOT to do, gotchas, decisions already made]

## Success Criteria
[how to know it's done]

## Dependencies & Setup
[external APIs, auth, environment]

## Notes for the Agent
[anything else critical]

Be specific, technical, and direct. No fluff. Write as if briefing a new senior engineer who will work autonomously.`;
```

**Step 2: Create server/anthropic.ts**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, DOCUMENT_PROMPT } from "./prompts.js";

const client = new Anthropic();

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function callAnthropic(
  messages: Message[],
  mode: "interview" | "generate"
): Promise<string> {
  const systemPrompt = mode === "interview" ? SYSTEM_PROMPT : DOCUMENT_PROMPT;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,
    messages,
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}
```

**Step 3: Create server/index.ts**

```ts
import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { callAnthropic } from "./anthropic.js";

const app = new Hono();

app.post("/api/chat", async (c) => {
  const { messages, mode } = await c.req.json();

  if (!messages || !mode) {
    return c.json({ error: "messages and mode are required" }, 400);
  }

  if (mode !== "interview" && mode !== "generate") {
    return c.json({ error: "mode must be 'interview' or 'generate'" }, 400);
  }

  try {
    const text = await callAnthropic(messages, mode);
    return c.json({ text });
  } catch (e: any) {
    console.error("Anthropic API error:", e.message);
    return c.json({ error: "Failed to call Anthropic API" }, 500);
  }
});

const port = parseInt(process.env.PORT || "3001", 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

**Step 4: Create tsconfig.server.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist/server",
    "rootDir": "server"
  },
  "include": ["server"]
}
```

**Step 5: Test the server starts**

Create a `.env` file with a real key (or placeholder) and run:
```bash
npx tsx server/index.ts
```
Expected: `Server running on http://localhost:3001`

Kill the process after confirming.

**Step 6: Commit**

```bash
git add server/ tsconfig.server.json
git commit -m "feat: add Hono server with Anthropic proxy endpoint"
```

---

### Task 3: Create the client API layer

**Files:**
- Create: `src/lib/api.ts`

**Step 1: Create src/lib/api.ts**

```ts
interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function callClaude(
  messages: Message[],
  mode: "interview" | "generate"
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, mode }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.text || "";
}
```

**Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add client API layer for /api/chat"
```

---

### Task 4: Build the Header component

**Files:**
- Create: `src/components/Header.tsx`

**Step 1: Create src/components/Header.tsx**

Reference: agent-handoff.jsx lines 197-228. Port inline styles to Tailwind.

```tsx
type Stage = "intro" | "interview" | "generating" | "output";

interface HeaderProps {
  stage: Stage;
  onReset: () => void;
}

export default function Header({ stage, onReset }: HeaderProps) {
  const dotColor =
    stage === "interview"
      ? "bg-green-400 shadow-[0_0_8px_#4ade80]"
      : stage === "generating"
        ? "bg-yellow-400 shadow-[0_0_8px_#fbbf24]"
        : "bg-neutral-500";

  return (
    <div className="flex items-center justify-between border-b border-[#1e1e1e] bg-[#0d0d0d] px-8 py-5">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span className="font-mono text-[13px] tracking-[0.08em] text-[#888]">
          AGENT BRIEFING SYSTEM
        </span>
      </div>
      {stage !== "intro" && (
        <button
          onClick={onReset}
          className="border border-[#333] bg-transparent px-3.5 py-1.5 font-mono text-[11px] tracking-[0.08em] text-[#666] transition-all hover:border-[#888] hover:text-[#aaa]"
        >
          NEW SESSION
        </button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: add Header component with status indicator"
```

---

### Task 5: Build the IntroScreen component

**Files:**
- Create: `src/components/IntroScreen.tsx`

**Step 1: Create src/components/IntroScreen.tsx**

Reference: agent-handoff.jsx lines 231-298. Port inline styles to Tailwind.

```tsx
interface IntroScreenProps {
  onStart: () => void;
}

const STATS = [
  ["6–10", "questions"],
  ["~5 min", "to complete"],
  ["1 doc", "to rule them all"],
] as const;

export default function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="flex flex-1 animate-fade-in flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-8 font-mono text-[11px] tracking-[0.2em] text-[#555]">
        v1.0 — HANDOFF DOCUMENT GENERATOR
      </div>

      <h1 className="mb-5 font-serif text-[clamp(32px,5vw,52px)] font-normal leading-[1.1] tracking-[-0.02em] text-[#f0ebe0]">
        Brief your agent.
        <br />
        <span className="text-[#555]">Not your codebase.</span>
      </h1>

      <p className="mb-12 max-w-[440px] font-serif text-base italic leading-[1.7] text-[#666]">
        Answer a few sharp questions about your project. Get a CLAUDE.md handoff
        document your coding agent can actually use.
      </p>

      <div className="mb-12 grid w-full max-w-[500px] grid-cols-3 gap-px bg-[#1a1a1a]">
        {STATS.map(([num, label]) => (
          <div
            key={label}
            className="bg-[#0d0d0d] px-4 py-5 text-center"
          >
            <div className="mb-1 font-mono text-lg text-[#e8e0d0]">{num}</div>
            <div className="text-[11px] tracking-[0.06em] text-[#555]">
              {label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="bg-[#e8e0d0] px-10 py-3.5 font-mono text-[13px] tracking-[0.12em] text-[#0a0a0a] transition-all hover:bg-white"
      >
        START INTERVIEW →
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/IntroScreen.tsx
git commit -m "feat: add IntroScreen landing page component"
```

---

### Task 6: Build the InterviewChat component

**Files:**
- Create: `src/components/InterviewChat.tsx`

**Step 1: Create src/components/InterviewChat.tsx**

Reference: agent-handoff.jsx lines 300-424. This is the largest component — chat messages, typing indicator, textarea with auto-resize, and generating spinner.

```tsx
import { useEffect, useRef } from "react";

type Stage = "interview" | "generating";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InterviewChatProps {
  messages: Message[];
  loading: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  stage: Stage;
}

export default function InterviewChat({
  messages,
  loading,
  input,
  onInputChange,
  onSend,
  stage,
}: InterviewChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (stage === "interview" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [stage, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-6">
      {/* Messages */}
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto py-8">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`animate-fade-in-fast flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[9px] tracking-[0.06em] text-[#555] ${
                msg.role === "user"
                  ? "border border-[#333] bg-[#1e1e1e]"
                  : "border border-[#222] bg-[#111]"
              }`}
            >
              {msg.role === "user" ? "YOU" : "AI"}
            </div>
            <div
              className={`max-w-[82%] px-[18px] py-3.5 text-[15px] leading-[1.65] ${
                msg.role === "user"
                  ? "border border-[#222] bg-[#141414] text-[#aaa]"
                  : "border border-[#1a1a1a] bg-[#0f0f0f] italic text-[#ddd]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="animate-fade-in-fast flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#222] bg-[#111] font-mono text-[9px] text-[#555]">
              AI
            </div>
            <div className="flex items-center gap-1.5 border border-[#1a1a1a] bg-[#0f0f0f] px-5 py-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[5px] w-[5px] rounded-full bg-[#444] animate-blink"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {stage === "interview" && (
        <div className="flex items-end gap-3 border-t border-[#1a1a1a] py-5">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Your answer..."
              rows={1}
              className="w-full resize-none border border-[#222] bg-[#0d0d0d] px-4 py-3 font-serif text-[15px] leading-[1.5] text-[#e8e0d0] outline-none transition-colors focus:border-[#444]"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 160) + "px";
              }}
            />
          </div>
          <button
            onClick={onSend}
            disabled={loading || !input.trim()}
            className={`shrink-0 border border-[#222] px-5 py-3 font-mono text-xs tracking-[0.08em] transition-all ${
              input.trim() && !loading
                ? "cursor-pointer bg-[#e8e0d0] text-[#0a0a0a]"
                : "cursor-default bg-[#111] text-[#444]"
            }`}
          >
            SEND
          </button>
        </div>
      )}

      {/* Generating spinner */}
      {stage === "generating" && (
        <div className="flex items-center gap-3 border-t border-[#1a1a1a] py-6">
          <div className="h-4 w-4 animate-spin-fast rounded-full border-2 border-[#333] border-t-[#fbbf24]" />
          <span className="font-mono text-xs tracking-[0.08em] text-[#666]">
            COMPILING HANDOFF DOCUMENT...
          </span>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/InterviewChat.tsx
git commit -m "feat: add InterviewChat component with chat UI and typing indicator"
```

---

### Task 7: Build the OutputDocument component

**Files:**
- Create: `src/components/OutputDocument.tsx`

**Step 1: Create src/components/OutputDocument.tsx**

Reference: agent-handoff.jsx lines 428-501. Custom markdown renderer, copy/download/new buttons.

```tsx
import { useState } from "react";

interface OutputDocumentProps {
  docContent: string;
  onReset: () => void;
}

export default function OutputDocument({ docContent, onReset }: OutputDocumentProps) {
  const [copied, setCopied] = useState(false);

  const copyDoc = () => {
    navigator.clipboard.writeText(docContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadDoc = () => {
    const blob = new Blob([docContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "CLAUDE.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-1 flex-col px-6 py-8">
      {/* Header bar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1.5 font-mono text-[11px] tracking-[0.12em] text-green-400">
            ✓ DOCUMENT READY
          </div>
          <div className="font-mono text-[11px] text-[#555]">
            CLAUDE.md — drop this in your project root
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadDoc}
            className="border border-[#333] bg-[#0f0f0f] px-[18px] py-2 font-mono text-[11px] tracking-[0.08em] text-[#aaa] transition-all hover:border-[#888] hover:text-[#e8e0d0]"
          >
            ↓ CLAUDE.md
          </button>
          <button
            onClick={copyDoc}
            className={`border px-[18px] py-2 font-mono text-[11px] tracking-[0.08em] transition-all ${
              copied
                ? "border-green-400 bg-[#1a2e1a] text-green-400"
                : "border-[#333] bg-[#0f0f0f] text-[#aaa]"
            }`}
          >
            {copied ? "✓ COPIED" : "COPY"}
          </button>
          <button
            onClick={onReset}
            className="border border-[#333] bg-transparent px-[18px] py-2 font-mono text-[11px] tracking-[0.08em] text-[#666] transition-all hover:border-[#888] hover:text-[#aaa]"
          >
            NEW
          </button>
        </div>
      </div>

      {/* Document renderer */}
      <div className="flex-1 overflow-y-auto break-words border border-[#1a1a1a] bg-[#080808] p-8 font-mono text-[13px] leading-[1.8] text-[#bbb] whitespace-pre-wrap">
        {docContent.split("\n").map((line, i) => {
          if (line.startsWith("# "))
            return (
              <div
                key={i}
                className="font-serif text-base font-bold tracking-[-0.01em] text-[#f0ebe0]"
                style={{ marginTop: i > 0 ? "24px" : 0, marginBottom: "8px" }}
              >
                {line.slice(2)}
              </div>
            );
          if (line.startsWith("## "))
            return (
              <div
                key={i}
                className="mt-5 mb-1.5 text-[13px] font-bold tracking-[0.06em] text-[#c8c0b0]"
              >
                {line.slice(3).toUpperCase()}
              </div>
            );
          if (line.startsWith("- ") || line.startsWith("* "))
            return (
              <div key={i} className="pl-4 text-[#999]">
                · {line.slice(2)}
              </div>
            );
          if (line.trim() === "") return <div key={i} className="h-2" />;
          return (
            <div key={i} className="text-[#888]">
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/OutputDocument.tsx
git commit -m "feat: add OutputDocument component with markdown renderer and download"
```

---

### Task 8: Wire up App.tsx with state machine and all components

**Files:**
- Modify: `src/App.tsx`

**Step 1: Replace src/App.tsx with the full state machine**

Reference: agent-handoff.jsx lines 59-186 for all state logic. All stage transitions happen here.

```tsx
import { useState } from "react";
import Header from "./components/Header";
import IntroScreen from "./components/IntroScreen";
import InterviewChat from "./components/InterviewChat";
import OutputDocument from "./components/OutputDocument";
import { callClaude } from "./lib/api";

type Stage = "intro" | "interview" | "generating" | "output";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [stage, setStage] = useState<Stage>("intro");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docContent, setDocContent] = useState("");

  const startInterview = async () => {
    setStage("interview");
    setLoading(true);
    try {
      const firstQuestion = await callClaude(
        [{ role: "user", content: "Start the interview. Ask your first question." }],
        "interview"
      );
      setMessages([{ role: "assistant", content: firstQuestion }]);
    } catch {
      setMessages([
        { role: "assistant", content: "What are you building? Give me a one-sentence description." },
      ]);
    }
    setLoading(false);
  };

  const generateDocument = async (interviewMessages: Message[]) => {
    const transcript = interviewMessages
      .map((m) => `${m.role === "user" ? "Developer" : "Interviewer"}: ${m.content}`)
      .join("\n\n");

    try {
      const doc = await callClaude(
        [
          {
            role: "user",
            content: `Here is the interview transcript:\n\n${transcript}\n\nGenerate the CLAUDE.md document now.`,
          },
        ],
        "generate"
      );
      setDocContent(doc);
      setStage("output");
    } catch {
      setDocContent("# Error\nFailed to generate document. Please try again.");
      setStage("output");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await callClaude(newMessages, "interview");

      if (reply.includes("INTERVIEW_COMPLETE")) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "Got everything I need. Generating your handoff document..." },
        ]);
        setStage("generating");
        await generateDocument(newMessages);
      } else {
        setMessages([...newMessages, { role: "assistant", content: reply }]);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Connection error. Try again." },
      ]);
    }
    setLoading(false);
  };

  const reset = () => {
    setStage("intro");
    setMessages([]);
    setInput("");
    setDocContent("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] font-serif text-[#e8e0d0]">
      <Header stage={stage} onReset={reset} />
      {stage === "intro" && <IntroScreen onStart={startInterview} />}
      {(stage === "interview" || stage === "generating") && (
        <InterviewChat
          messages={messages}
          loading={loading}
          input={input}
          onInputChange={setInput}
          onSend={sendMessage}
          stage={stage}
        />
      )}
      {stage === "output" && <OutputDocument docContent={docContent} onReset={reset} />}
    </div>
  );
}
```

**Step 2: Verify the frontend builds**

Run: `npx vite build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up App.tsx state machine with all components"
```

---

### Task 9: End-to-end smoke test

**Step 1: Create .env file**

```bash
cp .env.example .env
```

Then add a real ANTHROPIC_API_KEY to `.env`.

**Step 2: Start the full dev environment**

Run: `npm run dev`
Expected: Both Vite and Hono server start. Vite on localhost:5173, Hono on localhost:3001.

**Step 3: Manual smoke test checklist**

Open `http://localhost:5173` in a browser and verify:

1. Intro screen renders with dark theme, Georgia serif, stats grid
2. Click START INTERVIEW → loading indicator appears → first question renders
3. Type an answer, press Enter → message appears, AI responds
4. After 6-10 exchanges, INTERVIEW_COMPLETE triggers → generating spinner appears
5. Document renders in output screen
6. Copy button copies to clipboard
7. ↓ CLAUDE.md downloads a .md file
8. NEW button resets to intro
9. Network tab shows `/api/chat` calls — no Anthropic API key visible

**Step 4: Verify production build**

```bash
npm run build
```
Expected: `dist/` folder created with static assets.

**Step 5: Commit any final adjustments**

```bash
git add -A
git commit -m "chore: finalize project setup and verify e2e flow"
```
