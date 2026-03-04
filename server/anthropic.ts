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
