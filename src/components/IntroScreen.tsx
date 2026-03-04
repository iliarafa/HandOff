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
    <div className="flex flex-1 animate-fade-in flex-col items-center justify-center px-8 py-16 text-center" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 64px)" }}>
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
