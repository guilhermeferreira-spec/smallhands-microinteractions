"use client";

import { useState } from "react";
import { SlideProps } from "./types";

// Spring button demo — shows the difference between linear and spring easing
export default function Slide03Spring({ interactive, onTap }: SlideProps) {
  const [pressed, setPressed] = useState<"linear" | "spring" | null>(null);

  const tap = (type: "linear" | "spring") => {
    setPressed(type);
    onTap();
    setTimeout(() => setPressed(null), 600);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white gap-10 px-16">
      <h2 className="font-title text-xl leading-[1.6] text-white/80 text-center">Easing is the message.</h2>

      <div className="flex gap-16 items-end">
        {/* Linear */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 bg-white/20 rounded-lg"
            style={{
              transform: pressed === "linear" ? "scale(0.85)" : "scale(1)",
              transition: pressed === "linear"
                ? "transform 150ms linear"
                : "transform 400ms linear",
            }}
          />
          {interactive && (
            <button
              onPointerDown={() => tap("linear")}
              className="font-title text-[0.625rem] uppercase tracking-[0.08em] text-white/40 border border-white/10 px-4 py-2 rounded"
            >
              linear
            </button>
          )}
          {!interactive && (
            <p className="font-title text-[0.625rem] uppercase tracking-[0.08em] text-white/30">linear</p>
          )}
        </div>

        {/* Spring */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 bg-white rounded-lg"
            style={{
              transform: pressed === "spring" ? "scale(0.85)" : "scale(1)",
              transition: pressed === "spring"
                ? "transform 80ms cubic-bezier(0.34, 1.56, 0.64, 1)"
                : "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
          {interactive && (
            <button
              onPointerDown={() => tap("spring")}
              className="font-title text-[0.625rem] uppercase tracking-[0.08em] text-white border border-white/40 px-4 py-2 rounded"
            >
              spring
            </button>
          )}
          {!interactive && (
            <p className="font-title text-[0.625rem] uppercase tracking-[0.08em] text-white/60">spring</p>
          )}
        </div>
      </div>

      {interactive && (
        <p className="font-body text-lg text-white/30">hold each button, feel the difference</p>
      )}
    </div>
  );
}
