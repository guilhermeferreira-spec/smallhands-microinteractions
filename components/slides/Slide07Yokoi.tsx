import type { SlideProps } from "./types";

/**
 * Slide07Yokoi — the biggest beat, let it breathe.
 *
 * Static: no interaction, no click. Portrait slides in from below and settles
 * against the bottom edge, with a dark gradient overlay for depth.
 */

export default function Slide07Yokoi(_props: SlideProps) {
  return (
    <div className="relative flex h-full w-full items-end justify-center overflow-hidden bg-[#000]">
      <div
        className="relative"
        style={{ animation: "yokoi-rise 900ms cubic-bezier(0.16, 1, 0.3, 1) both" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/gunpei-gameboy.png"
          alt="Gunpei Yokoi with the Game Boy"
          loading="lazy"
          className="max-h-[92vh] w-auto object-contain object-bottom"
        />
      </div>

      {/* Depth gradient — overlays the bottom of the image, fading to black */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 85%, #000 100%)",
        }}
      />
    </div>
  );
}
