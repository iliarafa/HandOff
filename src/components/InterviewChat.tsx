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
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col overflow-hidden px-6">
      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto py-8">
        <div className="flex flex-col gap-6">
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
      </div>

      {/* Input area */}
      {stage === "interview" && (
        <div className="flex shrink-0 items-center gap-2 pb-8 pr-4 pt-4">
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
            className={`shrink-0 p-2 transition-all ${
              input.trim() && !loading
                ? "cursor-pointer text-[#e8e0d0]"
                : "cursor-default text-[#444]"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Generating spinner */}
      {stage === "generating" && (
        <div className="flex shrink-0 items-center gap-3 border-t border-[#1a1a1a] py-6">
          <div className="h-4 w-4 animate-spin-fast rounded-full border-2 border-[#333] border-t-[#fbbf24]" />
          <span className="font-mono text-xs tracking-[0.08em] text-[#666]">
            COMPILING HANDOFF DOCUMENT...
          </span>
        </div>
      )}
    </div>
  );
}
