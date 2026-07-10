"use client";

interface InteractionTallyProps {
  tapTotal: number;
  hoverTotal: number;
}

// End-of-talk payoff: the room's total interactions as an arcade high score.
// Pixel-font number front and center, taps/hovers as small score pills.
export function InteractionTally({ tapTotal, hoverTotal }: InteractionTallyProps) {
  const total = tapTotal + hoverTotal;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[10vh] flex flex-col items-center gap-5"
      style={{ zIndex: 20 }}
    >
      <span className="font-body text-xl uppercase tracking-[0.3em] text-white/40">
        interactions in this room
      </span>

      <span className="font-title text-6xl leading-none text-[#F1D345] tabular-nums md:text-8xl">
        {total.toLocaleString()}
      </span>

      <div className="flex items-center gap-3">
        <span className="rounded-full border border-white/15 px-4 py-1.5 font-body text-lg text-white/55 tabular-nums">
          {tapTotal.toLocaleString()} taps
        </span>
        <span className="rounded-full border border-white/15 px-4 py-1.5 font-body text-lg text-white/55 tabular-nums">
          {hoverTotal.toLocaleString()} hovers
        </span>
      </div>
    </div>
  );
}
