"use client";

import { useState } from "react";
import type { SlideProps } from "./types";

/**
 * Slide08Inclusive — "Turn it off. Does it still make sense?"
 *
 * Optional toggle strips motion from a tiny demo: an app icon with a
 * notification badge that subtly pulses. With motion off, the pulse stops
 * but the badge (red circle, count) still reads fine on its own — the
 * message survives either way. Audience-play: toggle only shown/clickable
 * when interactive.
 */

export default function Slide08Inclusive({ interactive, onTap }: SlideProps) {
  const [motion, setMotion] = useState(true);

  const toggle = () => {
    setMotion((m) => !m);
    onTap();
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-14 bg-[#000] px-16 text-white">
      <h2 className="max-w-2xl text-center font-title text-2xl leading-[1.7] md:text-3xl">
        Turn it off.
        <br />
        Does it still make sense?
      </h2>

      {/* Mini demo: an app icon with a notification badge. With motion on the
          badge pulses (subtle glow ring); with motion off it's just a static
          red circle with a count — still legible, still does its job. */}
      <div className="flex flex-col items-center gap-8">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white/60" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span
            className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 font-title text-[10px] text-white"
            style={{
              animation: motion ? "badge-pulse 1.6s ease-out infinite" : "none",
            }}
          >
            3
          </span>
        </div>

        {interactive && (
          <button
            onClick={toggle}
            className="rounded-full border border-white/20 px-6 py-2 font-body text-lg uppercase tracking-[0.08em] text-white/60 transition-colors hover:border-white/50 hover:text-white/90"
          >
            Motion: {motion ? "On" : "Off"}
          </button>
        )}
      </div>
    </div>
  );
}
