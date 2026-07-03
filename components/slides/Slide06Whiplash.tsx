"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SlideProps } from "./types";

/**
 * Slide06Whiplash — one button, one joke: tonal whiplash.
 *
 * Click -> warm confetti burst (genuinely satisfying, ~1s) -> hard cut ->
 * cold, heavy dollar-amount stamp. The confetti and the stamp deliberately
 * feel like opposite temperatures; the cut between them is abrupt, not a
 * blend. Physics pattern (per-particle velocity + gravity, rAF loop) reused
 * from Slide03Spring's salt grains.
 */

const AMOUNT = "U$7.500.000";
const CAPTION = "Robinhood — fined for gamifying options trades.";
const ATTRIBUTION = "Massachusetts Securities Division, 2024";
const SOURCES = [
  { label: "Reuters", href: "https://www.reuters.com/legal/transactional/robinhood-settles-massachusetts-regulators-trading-case-75-million-2024-01-18/" },
  { label: "Settlement (PDF)", href: "https://fingfx.thomsonreuters.com/gfx/legaldocs/akvemqyznvr/01182024robinhood.pdf" },
];

const CONFETTI_COLORS = [
  "#FFD23F", "#EE4266", "#3BCEAC", "#0EAD69", "#5C80BC", "#FF6B35",
];

const CONFETTI_DURATION = 1000; // ms confetti plays before the hard cut
const CONFETTI_FADE = 140; // ms — fast, not a cheerful cleanup
const GRAVITY = 0.0017;
const DRAG = 0.0006;
const PIECE_COUNT = 70;

interface Piece {
  id: number;
  ox: number;
  oy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  w: number;
  h: number;
  color: string;
}

type Phase = "idle" | "confetti" | "fading" | "stamp";

export default function Slide06Whiplash({ interactive, onTap }: SlideProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const piecesRef = useRef<Piece[]>([]);
  const [, force] = useState(0);
  const pieceId = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastT = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const step = useCallback((t: number) => {
    const dt = lastT.current == null ? 16 : Math.min(t - lastT.current, 32);
    lastT.current = t;
    for (const p of piecesRef.current) {
      p.vy += GRAVITY * dt;
      p.vx *= 1 - DRAG * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
    force((n) => n + 1);
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastT.current = null;
  }, []);

  const launch = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    const pieces: Piece[] = [];
    for (let i = 0; i < PIECE_COUNT; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 0.35 + Math.random() * 0.55;
      pieces.push({
        id: pieceId.current++,
        ox: originX,
        oy: originY,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * 360,
        vrot: (Math.random() - 0.5) * 0.6,
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      });
    }
    piecesRef.current = pieces;
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(step);
  }, [step]);

  const handleClick = useCallback(() => {
    if (!interactive || phase !== "idle") return;
    setPhase("confetti");
    launch();
    onTap();

    timers.current.push(
      setTimeout(() => setPhase("fading"), CONFETTI_DURATION),
      setTimeout(() => {
        stopLoop();
        piecesRef.current = [];
        setPhase("stamp");
      }, CONFETTI_DURATION + CONFETTI_FADE),
    );
  }, [interactive, phase, launch, onTap, stopLoop]);

  useEffect(() => {
    return () => {
      stopLoop();
      timers.current.forEach(clearTimeout);
    };
  }, [stopLoop]);

  const showConfetti = phase === "confetti" || phase === "fading";

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#000] select-none">
      {phase === "idle" && (
        <button
          ref={buttonRef}
          onClick={handleClick}
          disabled={!interactive}
          className="rounded-full bg-white px-10 py-5 font-title text-sm uppercase tracking-[0.15em] text-black transition-[transform,box-shadow] duration-100 ease-out will-change-transform active:translate-y-[8px] disabled:cursor-default"
          style={{
            animation: "whiplash-rise 480ms cubic-bezier(0.2, 0.9, 0.3, 1.2) both",
            boxShadow: "0 10px 0 0 rgba(255,255,255,0.25), 0 18px 24px rgba(0,0,0,0.45)",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.boxShadow = "0 2px 0 0 rgba(255,255,255,0.25), 0 4px 10px rgba(0,0,0,0.4)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = "0 10px 0 0 rgba(255,255,255,0.25), 0 18px 24px rgba(0,0,0,0.45)";
          }}
        >
          Confirm your order
        </button>
      )}

      {/* Confetti — its own layer, fades fast (not cheerfully) at the cut */}
      {showConfetti && (
        <div
          className="pointer-events-none fixed inset-0 z-40"
          style={{
            opacity: phase === "fading" ? 0 : 1,
            transition: `opacity ${CONFETTI_FADE}ms linear`,
          }}
        >
          {piecesRef.current.map((p) => (
            <span
              key={p.id}
              className="absolute block"
              style={{
                left: p.ox + p.x,
                top: p.oy + p.y,
                width: p.w,
                height: p.h,
                background: p.color,
                transform: `rotate(${p.rot}deg)`,
                borderRadius: 1,
              }}
            />
          ))}
        </div>
      )}

      {/* Hard cut: cold flash + the stamp */}
      {phase === "stamp" && (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-50 bg-white"
            style={{ animation: "whiplash-flash 220ms ease-out forwards" }}
          />
          <div
            className="relative z-50 flex flex-col items-center"
            style={{ animation: "whiplash-shake 320ms ease-out" }}
          >
            <span
              className="font-title text-5xl tracking-tight text-white md:text-7xl"
              style={{ animation: "whiplash-stamp 180ms cubic-bezier(0.2, 0, 0.1, 1) both" }}
            >
              {AMOUNT}
            </span>
            <span className="mt-6 font-body text-lg text-white/70">
              {CAPTION}
            </span>
            <span className="mt-1 font-body text-base text-white/40">
              {ATTRIBUTION}
            </span>
            <div className="mt-3 flex gap-4">
              {SOURCES.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-body text-sm text-white/30 underline decoration-white/20 underline-offset-2 hover:text-white/60"
                >
                  {s.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
