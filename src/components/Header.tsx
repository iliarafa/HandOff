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
    <div className="flex items-center justify-between bg-[#0d0d0d] px-8 py-5">
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
