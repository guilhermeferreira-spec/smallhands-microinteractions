"use client";

import { useState, useRef, useCallback } from "react";
import { Howl } from "howler";
import type { SlideProps } from "./types";

/**
 * Slide01Hook — the opening hook.
 *
 * Black field, the pixel "?" block (gif), the two-tone question below it.
 * Tap the block → it punches up and settles back (Mario hit), a coin shoots
 * STRAIGHT UP spinning, peaks, dips slightly, and fades. Coin sound fires
 * on each hit. onTap() fires once per hit for the deck's interaction count.
 *
 * Assets:
 *   /public/gifs/questionmark-96.gif  — pre-cropped 398x398 -> 96x96 (see notes)
 *   /public/smallhands/coin.wav       — SMB coin sound
 */

type Coin = { id: number; spin: 1 | -1 };

export default function Slide01Hook({ interactive, onTap }: SlideProps) {
  const [bouncing, setBouncing] = useState(false);
  const [coins, setCoins] = useState<Coin[]>([]);
  const coinId = useRef(0);

  // Lazily build the Howl once, browser-only. Howler handles the autoplay
  // unlock for us, and since we only play on click we're already past that gate.
  const coinSound = useRef<Howl | null>(null);
  if (interactive && coinSound.current === null && typeof window !== "undefined") {
    coinSound.current = new Howl({
      src: ["/smallhands/coin.wav"],
      volume: 0.03,
    });
  }

  const hit = useCallback(() => {
    if (!interactive) return;

    // 1. Punch the block - clear first so rapid taps re-fire the animation.
    setBouncing(false);
    requestAnimationFrame(() => setBouncing(true));

    // 2. Eject a coin straight up. Alternate spin direction per coin.
    const id = coinId.current++;
    const spin: 1 | -1 = id % 2 === 0 ? 1 : -1;
    setCoins((prev) => [...prev, { id, spin }]);
    window.setTimeout(() => {
      setCoins((prev) => prev.filter((c) => c.id !== id));
    }, 680);

    // 3. Sound - tiny pitch wobble so coins don't feel robotically identical.
    const s = coinSound.current;
if (s) {
  s.play();
}

    // 4. Tell the deck a real interaction happened.
    onTap();
  }, [interactive, onTap]);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-[#000] select-none">
      {/* Block + coin stage */}
      <div className="relative mb-8 flex items-center justify-center">
        {coins.map((coin) => (
          <span
            key={coin.id}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 block h-12 w-12"
            style={{
              ["--spin" as string]: `${coin.spin * 720}deg`,
              animation: "coinUp 650ms cubic-bezier(0.18,0.7,0.3,1) forwards",
            }}
          >
            <CoinPixel />
          </span>
        ))}

        <button
          type="button"
          onClick={hit}
          disabled={!interactive}
          aria-label="Hit the block"
          className="relative block h-24 w-24 cursor-pointer border-0 bg-transparent p-0 outline-none disabled:cursor-default"
          style={{
            WebkitTapHighlightColor: "transparent",
            animation: bouncing
              ? "blockBounce 300ms cubic-bezier(0.3,1.4,0.5,1)"
              : "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gifs/questionmark-96.gif"
            alt=""
            aria-hidden
            className="block h-24 w-24"
            style={{ imageRendering: "pixelated" }}
          />
        </button>
      </div>

      {/* The hook line */}
      <h2 className="px-8 text-center font-title text-2xl leading-[1.5] tracking-tight max-w-[930px]">
        <span className="text-white/70">What&apos;s the last thing you <span className="text-white">tapped</span> just
        to watch it happen  <span className="text-white">again?</span></span>
      </h2>

      {/* Keyframes */}
      <style>{`
        @keyframes blockBounce {
          0%   { transform: translateY(0); }
          35%  { transform: translateY(-14px); }
          100% { transform: translateY(0); }
        }
        @keyframes coinUp {
          0% {
            transform: translateX(-50%) translateY(0) rotateY(0deg);
            opacity: 0;
          }
          10%  { opacity: 1; }
          70%  {
            transform: translateX(-50%) translateY(-104px) rotateY(var(--spin));
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) translateY(-88px) rotateY(var(--spin));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function CoinPixel() {
  return (
    <svg viewBox="0 0 16 16" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="6" y="1" width="4" height="14" fill="#E8A33D" />
      <rect x="4" y="3" width="8" height="10" fill="#F2C94C" />
      <rect x="5" y="2" width="6" height="12" fill="#FFD95E" />
      <rect x="7" y="4" width="2" height="8" fill="#E8A33D" />
    </svg>
  );
}