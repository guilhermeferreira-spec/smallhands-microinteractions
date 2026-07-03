"use client";

// Fixed TELUS Digital wordmark. Shown on every slide EXCEPT the hero (the
// hero is its own moment; the logo would compete with the CRT title card).
export function TelusLogo({ hidden }: { hidden: boolean }) {
  if (hidden) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/svg/tdlogo-primary.svg"
      alt="TELUS Digital"
      className="fixed bottom-6 right-6 h-6 w-auto opacity-70"
      style={{ zIndex: 30 }}
    />
  );
}
