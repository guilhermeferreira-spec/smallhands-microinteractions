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

// Active = Claude orange (clawd is what it summons, after all).
const ON_COLOR = "#da7756";
const OFF_COLOR = "#23272f";

// A random spawn on one of the four screen edges, oriented toward the center.
interface Spawn {
  id: number; // retriggers the squash keyframe per appearance
  x: number; // anchor point on the edge (px)
  y: number;
  angle: number; // rad — rotates the frame so local "up" points at the center
  size: number; // clawd height in px
}

function randomSpawn(id: number): Spawn {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const edge = Math.floor(Math.random() * 4); // 0 top · 1 right · 2 bottom · 3 left
  const t = 0.15 + Math.random() * 0.7; // keep away from corners
  const x = edge === 1 ? W : edge === 3 ? 0 : W * t;
  const y = edge === 0 ? 0 : edge === 2 ? H : H * t;
  // rotate local up (0,-1) onto the direction edge-point -> screen-center
  const dx = W / 2 - x;
  const dy = H / 2 - y;
  const angle = Math.atan2(dx, -dy);
  // ±15% around the 30vh baseline
  const size = H * 0.3 * (0.85 + Math.random() * 0.3);
  return { id, x, y, angle, size };
}

export default function Slide09AIAside({ interactive, onTap }: SlideProps) {
  const [on, setOn] = useState(false);
  const [spawn, setSpawn] = useState<Spawn | null>(null);
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
    // every ON picks a fresh edge/size — always surprising. Computed OUTSIDE
    // the setOn updater: scheduling state from inside an updater gets dropped.
    if (!onRef.current) setSpawn((s) => randomSpawn((s?.id ?? 0) + 1));
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
      {/* clawd — surfaces from a RANDOM edge, feet to the edge, head to the
          center. The whole frame below is rotated so "up" = toward center:
          the slide, the squash axis, and the depth gradient all inherit the
          angle for free. M3-expressive spatial spring via linear(). */}
      {spawn && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-0"
          style={{
            left: spawn.x,
            top: spawn.y,
            width: 0,
            height: 0,
            transform: `rotate(${spawn.angle}rad)`,
          }}
        >
          {/* slider: travels along the local axis, in/out of the edge */}
          <div
            className="absolute left-0 top-0"
            style={{
              width: "max-content", // 0×0 containing block would collapse shrink-to-fit
              transform: `translate(-50%, ${on ? "-100%" : "6%"})`,
              // Fade guarantees nothing lingers on screen when hidden: ON pops
              // in fast; OFF holds ~1 while retracting, then plunges to 0.
              opacity: on ? 1 : 0,
              transition: on
                ? "transform 700ms linear(0, 0.008 1.1%, 0.031 2.2%, 0.129 4.8%, 0.257 7.2%, 0.671 14.2%, 0.789 16.5%, 0.881 18.6%, 0.957 20.7%, 1.019 22.8%, 1.063 25.1%, 1.094 27.7%, 1.107 30.7%, 1.103 34%, 1.056 42.3%, 1.021 50.7%, 1.005 59.8%, 0.999 70.5%, 1), opacity 220ms cubic-bezier(0.1, 0.8, 0.3, 1)"
                : "transform 700ms linear(0, 0.008 1.1%, 0.031 2.2%, 0.129 4.8%, 0.257 7.2%, 0.671 14.2%, 0.789 16.5%, 0.881 18.6%, 0.957 20.7%, 1.019 22.8%, 1.063 25.1%, 1.094 27.7%, 1.107 30.7%, 1.103 34%, 1.056 42.3%, 1.021 50.7%, 1.005 59.8%, 0.999 70.5%, 1), opacity 600ms cubic-bezier(0.9, 0, 1, 1)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={spawn.id}
              src="/img/clawd.png"
              alt=""
              className="block w-auto object-contain"
              style={{
                height: spawn.size,
                transformOrigin: "center bottom",
                animation: on ? "clawd-squish 700ms ease-out both" : "none",
              }}
            />
          </div>

          {/* depth strip: pinned to the edge INSIDE the rotated frame, so it
              always hugs clawd's spawn edge at the same angle. Gradient fades
              toward the center, then SOLID BLACK continues 60vmax past the
              edge — the hiding zone is fully covered even when the rotated
              frame pokes into a screen corner. */}
          <div
            className="absolute z-[1]"
            style={{
              left: "-60vmax",
              bottom: "-60vmax",
              width: "120vmax",
              height: "calc(22vh + 60vmax)",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0.75) 14vh, #000 22vh)",
            }}
          />
        </div>
      )}

      {/* Gooey toggle */}
      <button
        ref={trackRef}
        role="switch"
        aria-checked={on}
        aria-label="party mode"
        onClick={flip}
        onPointerEnter={hover}
        className="relative z-10 rounded-full [&.kick]:animate-[toggle-kick_320ms_cubic-bezier(0.34,1.56,0.64,1)]"
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
