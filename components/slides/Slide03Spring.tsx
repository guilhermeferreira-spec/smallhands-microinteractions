"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { SlideProps } from "./types";

/**
 * Slide03Spring — the salt layer.
 *
 * "Interactive elements are like salt: too much spoils the dish, too little
 * and it's bland." The whole slide IS the metaphor — the cursor becomes a
 * salt-bae pinched hand. On click it swaps to the open/sprinkling hand and
 * drops a few salt grains from the fingertips. Tiny, not elaborate: it's a
 * cursor.
 *
 * Desktop only (custom cursor + click). The native cursor is hidden and we
 * draw our own hand that follows the mouse; CSS `cursor:` can't swap on click
 * or spawn particles, so we roll our own.
 *
 * Particles fall ONLY on click — that's the point. Salt is a deliberate act,
 * not an ambient sprinkle. Restraint, embodied in the interaction.
 */

const COPY_HEADLINE = "Interaction is like salt.";
const COPY_SUB = "Too much spoils the dish. Too little and it's bland.";

// Cursor art. Hotspot (the click point + where grains fall from) is the
// fingertips, lower-left of the image — tuned to the salt-bae references.
const HOTSPOT = { x: 22, y: 64 }; // px offset into the 72px hand image
const HAND_SIZE = 72;

type Grain = { id: number; dx: number; dist: number; delay: number };

export default function Slide03Spring({ interactive, onTap }: SlideProps) {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [sprinkling, setSprinkling] = useState(false);
  const [grains, setGrains] = useState<Grain[]>([]);
  const [inside, setInside] = useState(false);
  const grainId = useRef(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Follow the mouse.
  useEffect(() => {
    if (!interactive) return;
    const move = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    const enter = () => setInside(true);
    const leave = () => setInside(false);
    const el = rootRef.current;
    window.addEventListener("mousemove", move);
    el?.addEventListener("mouseenter", enter);
    el?.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mousemove", move);
      el?.removeEventListener("mouseenter", enter);
      el?.removeEventListener("mouseleave", leave);
    };
  }, [interactive]);

  const sprinkle = useCallback(() => {
    if (!interactive) return;

    // Swap to the open hand briefly.
    setSprinkling(true);
    window.setTimeout(() => setSprinkling(false), 180);

    // Drop a few grains from the fingertips. Small count — it's a cursor.
    const batch: Grain[] = Array.from({ length: 9 }, () => ({
      id: grainId.current++,
      dx: (Math.random() - 0.5) * 60, // explosive horizontal scatter
      dist: 80 + Math.random() * 70, // how far it flies down
      delay: Math.random() * 40, // ms, tighter burst
    }));
    setGrains((prev) => [...prev, ...batch]);
    const ids = new Set(batch.map((g) => g.id));
    window.setTimeout(() => {
      setGrains((prev) => prev.filter((g) => !ids.has(g.id)));
    }, 660);

    onTap();
  }, [interactive, onTap]);

  return (
    <div
      ref={rootRef}
      onClick={sprinkle}
      className="relative flex h-full w-full flex-col items-center justify-center bg-[#000] text-white select-none"
      style={{ cursor: interactive && inside ? "none" : "default" }}
    >
      {/* Copy */}
      <h2 className="px-8 text-center font-title text-4xl md:text-5xl">
        {COPY_HEADLINE}
      </h2>
      <p className="mt-6 px-8 text-center font-body text-lg text-white/55">
        {COPY_SUB}
      </p>

      {/* Custom salt-bae cursor — only while the mouse is over the slide. */}
      {interactive && inside && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50"
          style={{
            left: pos.x - HOTSPOT.x,
            top: pos.y - HOTSPOT.y,
            width: HAND_SIZE,
            height: HAND_SIZE,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sprinkling ? "/svg/pointer-state-1.svg" : "/svg/pointer-state-0.svg"}
            alt=""
            className="h-full w-full"
            style={{ imageRendering: "auto" }}
          />

          {/* Grains fall from the fingertips (the hotspot). */}
          {grains.map((g) => (
            <span
              key={g.id}
              className="absolute block rounded-[1px] bg-white"
              style={{
                left: HOTSPOT.x,
                top: HOTSPOT.y,
                width: 5,
                height: 5,
                ["--dx" as string]: `${g.dx}px`,
                ["--dist" as string]: `${g.dist}px`,
                animation: `saltFall 600ms ${g.delay}ms cubic-bezier(0.3,0.7,0.4,1) forwards`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes saltFall {
          0%   { transform: translate(0, 0) scale(1.3); opacity: 0; }
          10%  { opacity: 1; }
          30%  { transform: translate(calc(var(--dx) * 0.7), -10px) scale(1); }
          100% { transform: translate(var(--dx), var(--dist)) scale(0.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}