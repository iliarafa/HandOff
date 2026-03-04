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
