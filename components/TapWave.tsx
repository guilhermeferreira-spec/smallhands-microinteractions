"use client";

import { useEffect, useRef } from "react";

interface TapWaveProps {
  count: number;  // taps in last 3s window
  total: number;
}

// Renders a pulsing ring whose intensity scales with recent tap rate
export function TapWave({ count, total }: TapWaveProps) {
  const opacity = Math.min(count / 20, 1); // saturates at 20 taps/3s

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {/* Ripple rings */}
      {count > 0 && (
        <>
          <Ring delay={0} opacity={opacity} />
          <Ring delay={300} opacity={opacity * 0.6} />
          <Ring delay={600} opacity={opacity * 0.3} />
        </>
      )}
    </div>
  );
}

function Ring({ delay, opacity }: { delay: number; opacity: number }) {
  return (
    <div
      className="absolute rounded-full border border-white animate-ping"
      style={{
        width: "60vmin",
        height: "60vmin",
        opacity,
        animationDelay: `${delay}ms`,
        animationDuration: "1.5s",
      }}
    />
  );
}
