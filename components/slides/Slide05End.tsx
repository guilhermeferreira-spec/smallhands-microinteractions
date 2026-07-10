"use client";

import { useRef } from "react";
import confetti from "canvas-confetti";
import type { SlideProps } from "./types";

/**
 * Slide05End — Close. Thank you + one celebrate button: every press fires a
 * confetti burst and counts an interaction, so the room can watch the tally
 * overlay climb while they celebrate.
 */

const CONFETTI_COLORS = ["#FFD23F", "#EE4266", "#3BCEAC", "#0EAD69", "#5C80BC", "#FF6B35"];

function fireConfetti(x: number, y: number) {
  const count = 180;
  const fire = (ratio: number, opts: confetti.Options) =>
    confetti({
      origin: { x, y },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
      particleCount: Math.floor(count * ratio),
      ...opts,
    });
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

export default function Slide05End({ interactive, onTap }: SlideProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const celebrate = () => {
    if (!interactive) return;
    onTap("tap"); // counts — the tally overlay climbs live
    const r = btnRef.current?.getBoundingClientRect();
    const x = r ? (r.left + r.width / 2) / window.innerWidth : 0.5;
    const y = r ? (r.top + r.height / 2) / window.innerHeight : 0.6;
    fireConfetti(x, y);
  };

  return (
    // pb-[42vh] lifts the block clear of the tally overlay pinned to the bottom
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-[#000] px-16 pb-[42vh]">
      <h2 className="text-center font-title text-4xl leading-[1.4] text-white md:text-6xl">
        Thank you
      </h2>
      <p className="font-body text-2xl text-white/30">小さな手 — smallhands</p>

      {interactive && (
        <button
          ref={btnRef}
          onClick={celebrate}
          className="mt-6 rounded-full border border-white/25 px-8 py-4 font-title text-xs uppercase tracking-[0.14em] text-white/85 transition-colors hover:border-white/60 active:scale-95"
        >
          Celebrate
        </button>
      )}
    </div>
  );
}
