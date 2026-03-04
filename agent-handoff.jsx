import { useState, useRef, useEffect } from "react";

const STAGES = ["intro", "interview", "generating", "output"];

const SYSTEM_PROMPT = `You are a senior technical lead conducting a project intake interview to create a handoff document for an AI coding agent (like Claude Code).

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

const DOCUMENT_PROMPT = `You are creating a CLAUDE.md handoff document for an AI coding agent based on this interview transcript.

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

export default function AgentHandoff() {
  const [stage, setStage] = useState("intro");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState("");
  const [copied, setCopied] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (stage === "interview" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [stage, loading]);

  const callClaude = async (msgs, systemPrompt) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: msgs,
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text || "";
  };

  const startInterview = async () => {
    setStage("interview");
    setLoading(true);
    try {
      const firstQuestion = await callClaude(
        [{ role: "user", content: "Start the interview. Ask your first question." }],
        SYSTEM_PROMPT
      );
      setMessages([{ role: "assistant", content: firstQuestion }]);
      setQuestionCount(1);
    } catch (e) {
      setMessages([{ role: "assistant", content: "What are you building? Give me a one-sentence description." }]);
      setQuestionCount(1);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await callClaude(newMessages, SYSTEM_PROMPT);

      if (reply.includes("INTERVIEW_COMPLETE")) {
        setMessages([...newMessages, { role: "assistant", content: "Got everything I need. Generating your handoff document..." }]);
        setStage("generating");
        await generateDocument(newMessages);
      } else {
        setMessages([...newMessages, { role: "assistant", content: reply }]);
        setQuestionCount(q => q + 1);
      }
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", content: "Connection error. Try again." }]);
    }
    setLoading(false);
  };

  const generateDocument = async (interviewMessages) => {
    const transcript = interviewMessages
      .map(m => `${m.role === "user" ? "Developer" : "Interviewer"}: ${m.content}`)
      .join("\n\n");

    try {
      const doc = await callClaude(
        [{ role: "user", content: `Here is the interview transcript:\n\n${transcript}\n\nGenerate the CLAUDE.md document now.` }],
        DOCUMENT_PROMPT
      );
      setDocument(doc);
      setStage("output");
    } catch (e) {
      setDocument("# Error\nFailed to generate document. Please try again.");
      setStage("output");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyDoc = () => {
    navigator.clipboard.writeText(document);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadDoc = () => {
    const blob = new Blob([document], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "CLAUDE.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStage("intro");
    setMessages([]);
    setInput("");
    setDocument("");
    setQuestionCount(0);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      fontFamily: "'Georgia', serif",
      color: "#e8e0d0",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1e1e1e",
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0d0d0d",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: stage === "interview" ? "#4ade80" : stage === "generating" ? "#fbbf24" : "#666",
            boxShadow: stage === "interview" ? "0 0 8px #4ade80" : stage === "generating" ? "0 0 8px #fbbf24" : "none",
          }} />
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: "13px", color: "#888", letterSpacing: "0.08em" }}>
            AGENT BRIEFING SYSTEM
          </span>
        </div>
        {stage !== "intro" && (
          <button onClick={reset} style={{
            background: "none", border: "1px solid #333", color: "#666",
            padding: "6px 14px", cursor: "pointer", fontFamily: "'Courier New', monospace",
            fontSize: "11px", letterSpacing: "0.08em",
            transition: "all 0.2s",
          }}
            onMouseOver={e => { e.target.style.borderColor = "#888"; e.target.style.color = "#aaa"; }}
            onMouseOut={e => { e.target.style.borderColor = "#333"; e.target.style.color = "#666"; }}
          >
            NEW SESSION
          </button>
        )}
      </div>

      {/* Intro */}
      {stage === "intro" && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "60px 32px", textAlign: "center",
          animation: "fadeIn 0.6s ease",
        }}>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
            @keyframes spin { to { transform: rotate(360deg); } }
            .msg-appear { animation: fadeIn 0.4s ease; }
          `}</style>

          <div style={{
            fontSize: "11px", fontFamily: "'Courier New', monospace",
            letterSpacing: "0.2em", color: "#555", marginBottom: "32px",
          }}>
            v1.0 — HANDOFF DOCUMENT GENERATOR
          </div>

          <h1 style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: "400",
            letterSpacing: "-0.02em",
            lineHeight: "1.1",
            marginBottom: "20px",
            color: "#f0ebe0",
          }}>
            Brief your agent.<br />
            <span style={{ color: "#555" }}>Not your codebase.</span>
          </h1>

          <p style={{
            fontSize: "16px", color: "#666", maxWidth: "440px",
            lineHeight: "1.7", marginBottom: "48px", fontStyle: "italic",
          }}>
            Answer a few sharp questions about your project. Get a CLAUDE.md handoff document your coding agent can actually use.
          </p>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px",
            background: "#1a1a1a", marginBottom: "48px", maxWidth: "500px", width: "100%",
          }}>
            {[["6–10", "questions"], ["~5 min", "to complete"], ["1 doc", "to rule them all"]].map(([num, label]) => (
              <div key={label} style={{ background: "#0d0d0d", padding: "20px 16px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: "18px", color: "#e8e0d0", marginBottom: "4px" }}>{num}</div>
                <div style={{ fontSize: "11px", color: "#555", letterSpacing: "0.06em" }}>{label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <button
            onClick={startInterview}
            style={{
              background: "#e8e0d0", color: "#0a0a0a",
              border: "none", padding: "14px 40px",
              fontSize: "13px", fontFamily: "'Courier New', monospace",
              letterSpacing: "0.12em", cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={e => { e.target.style.background = "#fff"; }}
            onMouseOut={e => { e.target.style.background = "#e8e0d0"; }}
          >
            START INTERVIEW →
          </button>
        </div>
      )}

      {/* Interview */}
      {(stage === "interview" || stage === "generating") && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: "720px", width: "100%", margin: "0 auto", padding: "0 24px" }}>
          <div style={{
            flex: 1, overflowY: "auto", padding: "32px 0",
            display: "flex", flexDirection: "column", gap: "24px",
          }}>
            {messages.map((msg, i) => (
              <div key={i} className="msg-appear" style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                gap: "12px", alignItems: "flex-start",
              }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                  background: msg.role === "user" ? "#1e1e1e" : "#111",
                  border: msg.role === "user" ? "1px solid #333" : "1px solid #222",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Courier New', monospace", fontSize: "9px", color: "#555",
                  letterSpacing: "0.06em",
                }}>
                  {msg.role === "user" ? "YOU" : "AI"}
                </div>
                <div style={{
                  maxWidth: "82%",
                  background: msg.role === "user" ? "#141414" : "#0f0f0f",
                  border: msg.role === "user" ? "1px solid #222" : "1px solid #1a1a1a",
                  padding: "14px 18px",
                  fontSize: "15px", lineHeight: "1.65",
                  color: msg.role === "user" ? "#aaa" : "#ddd",
                  fontStyle: msg.role === "user" ? "normal" : "italic",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg-appear" style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  background: "#111", border: "1px solid #222",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Courier New', monospace", fontSize: "9px", color: "#555",
                }}>AI</div>
                <div style={{
                  background: "#0f0f0f", border: "1px solid #1a1a1a",
                  padding: "16px 20px", display: "flex", gap: "6px", alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: "5px", height: "5px", borderRadius: "50%", background: "#444",
                      animation: `blink 1.2s ease ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {stage === "interview" && (
            <div style={{
              borderTop: "1px solid #1a1a1a", padding: "20px 0",
              display: "flex", gap: "12px", alignItems: "flex-end",
            }}>
              <div style={{ flex: 1, position: "relative" }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  placeholder="Your answer..."
                  rows={1}
                  style={{
                    width: "100%", background: "#0d0d0d",
                    border: "1px solid #222", color: "#e8e0d0",
                    padding: "12px 16px", fontSize: "15px",
                    fontFamily: "'Georgia', serif", resize: "none",
                    outline: "none", boxSizing: "border-box",
                    lineHeight: "1.5",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#444"}
                  onBlur={e => e.target.style.borderColor = "#222"}
                  onInput={e => {
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                  }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  background: input.trim() && !loading ? "#e8e0d0" : "#111",
                  color: input.trim() && !loading ? "#0a0a0a" : "#444",
                  border: "1px solid #222", padding: "12px 20px",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  fontFamily: "'Courier New', monospace", fontSize: "12px",
                  letterSpacing: "0.08em", transition: "all 0.2s", flexShrink: 0,
                }}
              >
                SEND
              </button>
            </div>
          )}

          {stage === "generating" && (
            <div style={{
              borderTop: "1px solid #1a1a1a", padding: "24px 0",
              display: "flex", alignItems: "center", gap: "12px",
            }}>
              <div style={{
                width: "16px", height: "16px", border: "2px solid #333",
                borderTopColor: "#fbbf24", borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              <span style={{ fontFamily: "'Courier New', monospace", fontSize: "12px", color: "#666", letterSpacing: "0.08em" }}>
                COMPILING HANDOFF DOCUMENT...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Output */}
      {stage === "output" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: "800px", width: "100%", margin: "0 auto", padding: "32px 24px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "24px",
          }}>
            <div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: "11px", color: "#4ade80", letterSpacing: "0.12em", marginBottom: "6px" }}>
                ✓ DOCUMENT READY
              </div>
              <div style={{ fontSize: "11px", color: "#555", fontFamily: "'Courier New', monospace" }}>
                CLAUDE.md — drop this in your project root
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={downloadDoc}
                style={{
                  background: "#0f0f0f", border: "1px solid #333", color: "#aaa",
                  padding: "8px 18px", cursor: "pointer",
                  fontFamily: "'Courier New', monospace", fontSize: "11px",
                  letterSpacing: "0.08em", transition: "all 0.2s",
                }}
                onMouseOver={e => { e.target.style.borderColor = "#888"; e.target.style.color = "#e8e0d0"; }}
                onMouseOut={e => { e.target.style.borderColor = "#333"; e.target.style.color = "#aaa"; }}
              >
                ↓ CLAUDE.md
              </button>
              <button
                onClick={copyDoc}
                style={{
                  background: copied ? "#1a2e1a" : "#0f0f0f",
                  border: copied ? "1px solid #4ade80" : "1px solid #333",
                  color: copied ? "#4ade80" : "#aaa",
                  padding: "8px 18px", cursor: "pointer",
                  fontFamily: "'Courier New', monospace", fontSize: "11px",
                  letterSpacing: "0.08em", transition: "all 0.2s",
                }}
              >
                {copied ? "✓ COPIED" : "COPY"}
              </button>
              <button
                onClick={reset}
                style={{
                  background: "none", border: "1px solid #333", color: "#666",
                  padding: "8px 18px", cursor: "pointer",
                  fontFamily: "'Courier New', monospace", fontSize: "11px",
                  letterSpacing: "0.08em", transition: "all 0.2s",
                }}
                onMouseOver={e => { e.target.style.borderColor = "#888"; e.target.style.color = "#aaa"; }}
                onMouseOut={e => { e.target.style.borderColor = "#333"; e.target.style.color = "#666"; }}
              >
                NEW
              </button>
            </div>
          </div>

          <div style={{
            background: "#080808", border: "1px solid #1a1a1a",
            padding: "32px", flex: 1, overflowY: "auto",
            fontFamily: "'Courier New', monospace", fontSize: "13px",
            lineHeight: "1.8", color: "#bbb",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {document.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <div key={i} style={{ color: "#f0ebe0", fontSize: "16px", fontWeight: "bold", marginTop: i > 0 ? "24px" : 0, marginBottom: "8px", fontFamily: "'Georgia', serif", letterSpacing: "-0.01em" }}>{line.slice(2)}</div>;
              if (line.startsWith('## ')) return <div key={i} style={{ color: "#c8c0b0", fontSize: "13px", fontWeight: "bold", marginTop: "20px", marginBottom: "6px", letterSpacing: "0.06em" }}>{line.slice(3).toUpperCase()}</div>;
              if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ color: "#999", paddingLeft: "16px" }}>· {line.slice(2)}</div>;
              if (line.trim() === '') return <div key={i} style={{ height: "8px" }} />;
              return <div key={i} style={{ color: "#888" }}>{line}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
