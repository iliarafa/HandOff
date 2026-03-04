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
