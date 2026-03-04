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
