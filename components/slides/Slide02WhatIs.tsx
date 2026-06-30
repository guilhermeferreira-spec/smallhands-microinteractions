"use client";

import type { SlideProps } from "./types";

/**
 * Slide02WhatIs — "what a micro interaction is" (the breathing beat).
 *
 *   trigger -> rules -> feedback -> loop & modes
 *
 * Matches the smallhands two-route model:
 *   /present (presenter) broadcasts { activeIndex: n } to the PartyKit room,
 *            exactly like it already broadcasts { slide: n }.
 *   /        (audience) subscribes and renders the same highlight.
 *
 * This component does NOT own the socket. It receives `activeIndex` as a plain
 * prop and, only when `onSelect` is provided, lets the holder turn a word into
 * a broadcast. The audience route passes NO onSelect, so audience screens have
 * no click handler at all — there is no button, just the slide. The presenter
 * route passes onSelect that calls room.broadcast({ activeIndex }).
 */

const PARTS = ["trigger", "rules", "feedback", "loop & modes"] as const;

// Presenter-only spoken gloss (shown small under the row ONLY when isPresenter).
const GLOSS: Record<number, string> = {
  0: "What starts it — a user action (tap, swipe, gesture) or the system (a condition is met).",
  1: "The logic. What happens once it fires, so the outcome matches expectations.",
  2: "How it tells you it heard you — visual, sound, haptic. The part people mistake for the whole thing.",
  3: "How long it lasts, whether it repeats, and the special cases that change how it behaves.",
};

interface Slide02Props extends SlideProps {
  /** Current highlighted part, fed from PartyKit room state. -1 = neutral. */
  activeIndex?: number;
  /** Presenter route passes this; it should broadcast to the room. Audience omits it. */
  onSelect?: (index: number) => void;
  /** Presenter route sets true to show the gloss + pointer cursor. */
  isPresenter?: boolean;
}

export default function Slide02WhatIs({
  activeIndex = -1,
  onSelect,
  isPresenter = false,
}: Slide02Props) {
  // A word is only clickable on the presenter screen (onSelect present).
  const clickable = isPresenter && typeof onSelect === "function";

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#000] select-none">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 px-8 font-title text-2xl">
        {PARTS.map((part, i) => {
          const isActive = i === activeIndex;
          const dimmed = activeIndex !== -1 && !isActive;
          const classes = [
            "font-title transition-[color,opacity] duration-300",
            isActive ? "text-white" : "text-white/45",
            dimmed ? "opacity-50" : "opacity-100",
          ];

          // Audience: render a plain <span>. No button, no handler, no cursor.
          // Presenter: render a real button that broadcasts on click.
          const word = clickable ? (
            <button
              type="button"
              onClick={() =>
                onSelect!(i === activeIndex ? -1 : i) // click active again -> neutral
              }
              aria-label={`Highlight ${part}`}
              className={[
                ...classes,
                "cursor-pointer border-0 bg-transparent p-0 outline-none",
              ].join(" ")}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {part}
            </button>
          ) : (
            <span className={classes.join(" ")}>{part}</span>
          );

          return (
            <span key={part} className="flex items-center gap-x-6">
              {word}
              {i < PARTS.length - 1 && (
                <span aria-hidden className="text-white/25">
                  &rarr;
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Gloss only on the presenter screen — audience never gets a wall of text. */}
      {isPresenter && activeIndex !== -1 && (
        <p className="mt-16 max-w-2xl px-8 text-center font-body text-lg leading-relaxed text-white/70">
          {GLOSS[activeIndex]}
        </p>
      )}
    </div>
  );
}