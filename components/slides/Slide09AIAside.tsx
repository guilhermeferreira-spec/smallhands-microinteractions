"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { SlideProps } from "./types";

/**
 * Slide09AIAside — "1 hour vs 2 weeks", with the receipt attached: the gooey
 * toggle below WAS the 1-hour build. React port of public/gooey-toggle.html —
 * knob on a spring with velocity-driven liquid stretch, plus a lazier trailing
 * blob fused by an SVG goo filter (the peel-off-the-edge effect).
 *
 * Click = 1 tap, hover (mouse) = 1 hover.
 */

// ── Toggle tuning (mirror of public/gooey-toggle.html) ───────────────────────
const STIFFNESS = 420;
const DAMPING = 24;
const STRETCH_FACTOR = 0.0016; // stretch per px/s of velocity
const MAX_STRETCH = 0.42;
const SQUASH_RATIO = 0.6;
const TRAIL_STIFFNESS = 150;
const TRAIL_DAMPING = 16;

// Geometry (must match the styles below)
const TRACK_W = 210, KNOB_D = 66, PAD = 12;
const TRAVEL = TRACK_W - KNOB_D - PAD * 2;

// Active = the slide-5 delete red.
const ON_COLOR = "#dc2626";
const OFF_COLOR = "#23272f";

export default function Slide09AIAside({ interactive, onTap }: SlideProps) {
  const [on, setOn] = useState(false);
  const trackRef = useRef<HTMLButtonElement | null>(null);
  const knobRef = useRef<HTMLSpanElement | null>(null);
  const trailRef = useRef<HTMLSpanElement | null>(null);
  const onRef = useRef(on);
  onRef.current = on;

  // Spring loop — positions live in refs, zero React re-renders per frame.
  useEffect(() => {
    const knob = knobRef.current;
    const trail = trailRef.current;
    if (!knob || !trail) return;

    let x = 0, vx = 0;
    let tx2 = 0, vx2 = 0;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      const target = onRef.current ? TRAVEL : 0;

      vx += ((target - x) * STIFFNESS - vx * DAMPING) * dt;
      x += vx * dt;

      vx2 += ((target - tx2) * TRAIL_STIFFNESS - vx2 * TRAIL_DAMPING) * dt;
      tx2 += vx2 * dt;

      const s = Math.min(Math.abs(vx) * STRETCH_FACTOR, MAX_STRETCH);
      knob.style.transform = `translateX(${x.toFixed(2)}px) scale(${(1 + s).toFixed(3)}, ${(1 - s * SQUASH_RATIO).toFixed(3)})`;

      const s2 = Math.min(Math.abs(vx2) * STRETCH_FACTOR * 1.4, MAX_STRETCH);
      trail.style.transform = `translateX(${tx2.toFixed(2)}px) scale(${(1 + s2).toFixed(3)}, ${(1 - s2 * SQUASH_RATIO).toFixed(3)})`;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const flip = () => {
    if (!interactive) return;
    onTap("tap");
    setOn((o) => !o);
    const t = trackRef.current;
    if (t) {
      t.classList.remove("kick");
      void t.offsetWidth; // retrigger the bounce
      t.classList.add("kick");
    }
  };

  const hover = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse") onTap("hover");
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-16 overflow-hidden bg-[#000] px-16">
      <p className="text-center font-title text-3xl text-white md:text-5xl">
        1 hour <span className="text-white/30">vs</span> 2 weeks
      </p>

      {/* Gooey toggle */}
      <button
        ref={trackRef}
        role="switch"
        aria-checked={on}
        aria-label="party mode"
        onClick={flip}
        onPointerEnter={hover}
        className="relative rounded-full [&.kick]:animate-[toggle-kick_320ms_cubic-bezier(0.34,1.56,0.64,1)]"
        style={{
          width: TRACK_W,
          height: 90,
          background: on ? ON_COLOR : OFF_COLOR,
          transition: "background 260ms ease",
        }}
      >
        {/* goo layer: blur + alpha-contrast fuses knob + trail into liquid */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ filter: "url(#goo-ai)" }}
        >
          <span
            ref={trailRef}
            className="absolute rounded-full bg-white will-change-transform"
            style={{ width: 44, height: 44, left: PAD + 11, top: "50%", marginTop: -22 }}
          />
          <span
            ref={knobRef}
            className="absolute rounded-full bg-white will-change-transform"
            style={{ width: KNOB_D, height: KNOB_D, left: PAD, top: "50%", marginTop: -KNOB_D / 2 }}
          />
        </span>
      </button>

      {/* goo filter def */}
      <svg width="0" height="0" aria-hidden="true">
        <defs>
          <filter id="goo-ai">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
