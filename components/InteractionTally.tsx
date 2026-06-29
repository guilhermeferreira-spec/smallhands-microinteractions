"use client";

interface InteractionTallyProps {
  tapTotal: number;
  hoverTotal: number;
}

// End-of-talk reveal: the total number of interactions the room produced,
// with a taps / hovers breakdown. Rendered as an overlay on the final slide.
export function InteractionTally({ tapTotal, hoverTotal }: InteractionTallyProps) {
  const total = tapTotal + hoverTotal;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[14vh] flex flex-col items-center gap-3 text-white"
      style={{ zIndex: 20 }}
    >
      <span className="text-xs uppercase tracking-[0.3em] text-white/40 font-mono">
        interactions today
      </span>
      <span className="text-7xl font-thin tabular-nums leading-none">
        {total.toLocaleString()}
      </span>
      <span className="text-sm text-white/40 font-mono tabular-nums">
        {tapTotal.toLocaleString()} taps · {hoverTotal.toLocaleString()} hovers
      </span>
    </div>
  );
}
