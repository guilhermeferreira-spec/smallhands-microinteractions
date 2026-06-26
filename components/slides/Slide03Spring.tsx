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
      <h2 className="text-3xl font-light text-white/80">Easing is the message.</h2>

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
              className="text-xs text-white/40 font-mono border border-white/10 px-4 py-2 rounded"
            >
              linear
            </button>
          )}
          {!interactive && (
            <p className="text-xs text-white/30 font-mono">linear</p>
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
              className="text-xs text-white font-mono border border-white/40 px-4 py-2 rounded"
            >
              spring
            </button>
          )}
          {!interactive && (
            <p className="text-xs text-white/60 font-mono">spring</p>
          )}
        </div>
      </div>

      {interactive && (
        <p className="text-xs text-white/20 font-mono">hold each button, feel the difference</p>
      )}
    </div>
  );
}
