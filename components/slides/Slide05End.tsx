"use client";

import { SlideProps } from "./types";

export default function Slide05End({ interactive, onTap }: SlideProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-white gap-8 px-16">
      <h2 className="text-4xl font-thin tracking-widest text-white/80">
        小さな手
      </h2>
      <p className="text-sm text-white/30 font-mono">
        The details are not the details.
      </p>
      <p className="text-xs text-white/20 font-mono mt-4">
        They make the design.
      </p>
      {interactive && (
        <button
          onClick={onTap}
          className="mt-8 text-xs text-white/20 font-mono border border-white/10 px-6 py-3 rounded-full
            hover:text-white/50 hover:border-white/30 transition-all duration-500"
        >
          one last tap
        </button>
      )}
    </div>
  );
}
