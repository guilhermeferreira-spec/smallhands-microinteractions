"use client";

import { useState } from "react";
import type { SlideProps } from "./types";

export default function Slide01WhatIs({ interactive, onTap }: SlideProps) {
  const [tapped, setTapped] = useState(false);

  const handleTap = () => {
    setTapped(true);
    onTap();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white gap-10 px-16">
      <h2 className="text-5xl font-light tracking-wide text-white/90 text-center">
        What is a microinteraction?
      </h2>
      <p className="text-xl text-white/50 max-w-2xl text-center leading-relaxed font-light">
        A contained product moment with one main task.
        <br />
        The detail between a product you tolerate
        <br />
        and one you{" "}
        <span className="text-white/90 italic">love</span>.
      </p>

      {interactive && (
        <button
          onClick={handleTap}
          className={`mt-8 px-8 py-4 rounded-full border text-sm font-mono transition-all duration-500 active:scale-95
            ${tapped
              ? "border-white/60 text-white/80"
              : "border-white/20 text-white/30 hover:border-white/40 hover:text-white/50"
            }`}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {tapped ? "signal sent" : "tap"}
        </button>
      )}
    </div>
  );
}
