import type { SlideProps } from "./types";

/**
 * Slide07Yokoi — the biggest beat, let it breathe.
 *
 * Static: no interaction, no click. Portrait slides in from below and settles
 * against the bottom edge, with a dark gradient overlay for depth. A small
 * red dot over the Game Boy's battery LED flickers irregularly for life.
 *
 * LED_TOP / LED_LEFT are % offsets within the image — tune by eye against
 * the actual photo (I can't see the crop, so these are a starting guess).
 */

const LED_TOP = "63%";
const LED_LEFT = "33%";
const LED_SIZE = 7; // px

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

        {/* Battery LED flicker — nudge LED_TOP/LED_LEFT to match the photo */}
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            top: LED_TOP,
            left: LED_LEFT,
            width: LED_SIZE,
            height: LED_SIZE,
            background: "#ff3b30",
            boxShadow: "0 0 6px 2px rgba(255,59,48,0.8)",
            animation: "led-flicker 3.2s ease-in-out infinite",
          }}
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
