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
      <div className="flex-1 overflow-y-auto break-words border border-[#1a1a1a] bg-[#080808] p-8 font-mono text-[13px] leading-[1.8] text-[#bbb] whitespace-pre-wrap" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}>
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
