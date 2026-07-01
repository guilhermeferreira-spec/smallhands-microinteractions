"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRoom } from "@/hooks/useRoom";
import { SLIDES } from "@/components/slides";
import { TapWave } from "@/components/TapWave";
import { InteractionTally } from "@/components/InteractionTally";
import { HeroCanvas } from "@/components/HeroCanvas";
import Slide02WhatIs from "@/components/slides/Slide02WhatIs";

const TOTAL = SLIDES.length;
// Index of the anatomy slide in the SLIDES array. If you reorder slides,
// update this one number.
const SLIDE02_INDEX = 2;

export default function PresenterPage() {
  const [slide, setSlide] = useState(0);
  // Mirror of `slide` for the nav callbacks (avoids stale closures) and so we
  // can adopt the server's persisted slide without re-broadcasting it.
  const slideRef = useRef(0);
  const { state, broadcastSlide, broadcastActiveIndex, broadcastTap, broadcastReset } =
    useRoom({
      // On (re)connect the server sends the persisted slide via `init`. Adopt
      // it WITHOUT broadcasting, so a presenter reload lands on the saved slide
      // instead of clobbering the room back to the hero.
      onSlide: (s) => {
        slideRef.current = s;
        setSlide(s);
      },
    });

  const resetInteractions = useCallback(() => {
    if (window.confirm("Reset the interaction counter to zero?")) {
      broadcastReset();
    }
  }, [broadcastReset]);

  // Navigation broadcasts only on real user intent (never on mount/adopt).
  const go = useCallback(
    (n: number) => {
      const c = Math.min(Math.max(n, 0), TOTAL - 1);
      slideRef.current = c;
      setSlide(c);
      broadcastSlide(c);
    },
    [broadcastSlide],
  );
  const next = useCallback(() => go(slideRef.current + 1), [go]);
  const prev = useCallback(() => go(slideRef.current - 1), [go]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ")
        next();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const isTitle = slide === 0;
  const isSlide02 = slide === SLIDE02_INDEX;
  const SlideComponent = SLIDES[slide];

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Persistent Canvas — mounts ONCE, never unmounts. Memoized so
          interaction-count re-renders never touch the 3D scene. */}
      <HeroCanvas active={isTitle} onInteraction={broadcastTap} />

      {/* Slide overlay — plain DOM, above canvas */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
        {isTitle ? null : isSlide02 ? (
          // Presenter controls the highlight; clicking a word broadcasts it.
          <Slide02WhatIs
            interactive={false}
            onTap={() => {}}
            isPresenter
            activeIndex={state.activeIndex}
            onSelect={broadcastActiveIndex}
          />
        ) : (
          <SlideComponent interactive={false} onTap={() => {}} />
        )}
      </div>

      {/* Tap aggregate overlay */}
      <TapWave count={state.tapCount} total={state.tapTotal} />

      {/* Final slide: reveal the room's total interactions */}
      {slide === TOTAL - 1 && (
        <InteractionTally tapTotal={state.tapTotal} hoverTotal={state.hoverTotal} />
      )}

      {/* Presenter HUD */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 text-white/40 text-xs font-mono select-none" style={{ zIndex: 10 }}>
        <button onClick={prev} className="px-3 py-1 border border-white/20 rounded hover:text-white/80">
          ←
        </button>
        <span>
          {slide + 1} / {TOTAL}
        </span>
        <button onClick={next} className="px-3 py-1 border border-white/20 rounded hover:text-white/80">
          →
        </button>
      </div>

      {/* Interaction counter badge + reset */}
      <div className="absolute top-4 right-4 flex items-center gap-3 text-white/50 text-xs font-mono" style={{ zIndex: 10 }}>
        <span>
          {state.tapTotal + state.hoverTotal} interactions · {state.tapTotal} taps · {state.hoverTotal} hovers · {state.tapCount} recent
        </span>
        <button
          onClick={resetInteractions}
          title="Reset interaction counter"
          aria-label="Reset interaction counter"
          className="flex items-center justify-center w-7 h-7 rounded border border-white/20 text-white/50 hover:text-white/90 hover:border-white/50 transition-colors"
        >
          {/* circular reset arrow */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
        </button>
      </div>
    </div>
  );
}