"use client";

/**
 * JamShelf — slide 1. Seven jam jars on a black shelf.
 * Hover (or tap on touch) lifts + wobbles the jar, nudges its neighbours apart
 * and plays a Lottie blob behind it, recoloured to that jar's jam.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import fireBg from "./jam/fire-bg.json";
import type { SlideProps } from "./types";

type Jam = {
  id: string;
  /** Shown on the tag once chosen. */
  name: string;
  /** One-liner shown under the chosen jar. */
  desc: string;
  src: string;
  /** Lottie front-layer fill (matches the jam). */
  front: string;
  /** Lottie back-layer fill (darker shade of the same jam). */
  back: string;
};

// Order matches the shelf left → right.
const JAMS: Jam[] = [
  { id: "kiwi", name: "kiwi", desc: "you like it sharp. a little sour, never boring.", src: "/jam/jam-0.png", front: "#A5C14A", back: "#1F4D2B" },
  { id: "passion", name: "passion fruit", desc: "bold, a bit loud. you bring the energy.", src: "/jam/jam-1.png", front: "#F2B83A", back: "#8A5A00" },
  { id: "beer", name: "?????", desc: "this isn't jam. you knew that and picked it anyway.", src: "/jam/jam-2.png", front: "#E8932C", back: "#7A3E0A" },
  { id: "orange", name: "orange", desc: "warm, bright, reliable. you make mornings better.", src: "/jam/jam-3.png", front: "#F07A22", back: "#9A3200" },
  { id: "strawberry", name: "strawberry", desc: "you're into the classics.", src: "/jam/jam-4.png", front: "#E23B4A", back: "#7A0F22" },
  { id: "grape", name: "gomu gomu no mi", desc: "you bend, you never break. a little ridiculous, totally unstoppable.", src: "/jam/jam-5.png", front: "#8B4DDB", back: "#3A1478" },
  { id: "berry", name: "blackberry", desc: "dark and deep. you notice what others miss.", src: "/jam/jam-6.png", front: "#8A3B7A", back: "#2E0F3A" },
];

const STORAGE_KEY = "smallhands-jam-choice"; // sessionStorage: survives reload, not a new tab

// Tag text colour: dark on light jam colours, white on dark ones.
const tagText = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1a1a1a" : "#ffffff";
};


// Motion + blob knobs. Tweak live at /jam, then paste the copied JSON into DEFAULT_TUNING.
export type JamTuning = {
  /** Jar lift on hover, px. */
  lift: number;
  /** Jar scale on hover (1 = none). */
  scale: number;
  /** Wobble amplitude, degrees. */
  tilt: number;
  /** Neighbour push-away at distance 1, px. */
  nudge: number;
  /** Drop-shadow glow radius, px. */
  glow: number;
  /** Blob width as % of jar width. */
  blobScale: number;
  /** Blob bottom edge offset from jar bottom, % of jar width (+ = up). */
  blobY: number;
  /** Blob horizontal offset, % of jar width (+ = right). */
  blobX: number;
  /** Blob rotation, degrees (pivots on its bottom centre). */
  blobRotate: number;
  /** Blob sways ±this many degrees in a loop while active. */
  blobWiggle: number;
  /** Number of outline echoes trailing the blob (0 = off). */
  trailCount: number;
  /** Extra scale per echo, % — how far the rings overshoot outward. */
  trailGap: number;
  /** Echo outline thickness, in Lottie units (comp is 360 wide). */
  trailStroke: number;
  /** Stagger between echoes, ms (also how many frames each lags behind). */
  trailDelay: number;
  /** How big the chosen jar grows once committed (1 = shelf size). */
  chosenScale: number;
  /** Shelf view: how far the title + jars sit below centre, in px. */
  shelfY: number;
  /** Extra vertical nudge of the whole chosen group (tag + jar + text), in vh. */
  chosenY: number;
  /** Tag background jitter, px. */
  tagWiggle: number;
  /** Tag background jitter, degrees. */
  tagRotate: number;
  /** Tag background redraw rate (stepped, hand-drawn feel). */
  tagFps: number;
  /** Lottie redraw rate. Loop length is unchanged; lower = choppier, stop-motion look. */
  fps: number;
};

export const DEFAULT_TUNING: JamTuning = {
  lift: 0,
  scale: 1.15,
  tilt: 5.25,
  nudge: 30,
  glow: 16,
  blobScale: 150,
  blobY: 3,
  blobX: -6.5,
  blobRotate: 0,
  blobWiggle: 1,
  trailCount: 2,
  trailGap: 3,
  trailStroke: 1.5,
  trailDelay: 60,
  fps: 12,
  chosenScale: 1.3,
  shelfY: 85,
  chosenY: 0,
  tagWiggle: 2,
  tagRotate: 0.6,
  tagFps: 6,
};

// Blend `hex` toward white by `amt` (0–1) — bright outline tints for the echoes.
const tint = (hex: string, amt: number) =>
  "#" +
  [1, 3, 5]
    .map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16);
      return Math.round(c + (255 - c) * amt)
        .toString(16)
        .padStart(2, "0");
    })
    .join("");

const hexToLottie = (hex: string) => [
  ...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255),
  1,
];

type LottieFill = { c: { k: number[] } };

// Lottie "stroke" shape item — swapped in for the fill to get an outline-only echo.
const strokeItem = (hex: string, width: number) => ({
  ty: "st",
  nm: "Stroke",
  c: { a: 0, k: hexToLottie(hex) },
  o: { a: 0, k: 100 },
  w: { a: 0, k: width },
  lc: 2,
  lj: 2,
  ml: 4,
});

const LOTTIE_FRAMES = 17; // fire-bg.json length
const LOTTIE_FPS = 30; // rate fire-bg.json was authored at → loop = 17/30 s

function JamBlob({
  front,
  back,
  stroke,
  strokeHex,
  lagMs = 0,
  fps,
}: Pick<Jam, "front" | "back"> & {
  fps: number;
  /** Outline width (Lottie units). Omit for the filled blob. */
  stroke?: number;
  /** Outline colour (defaults to `front`). */
  strokeHex?: string;
  /** Start this many ms behind the main blob so the echo trails it. */
  lagMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | undefined;

    // lottie-web touches `document` on import → load client-side only.
    import("lottie-web").then(({ default: lottie }) => {
      if (cancelled || !ref.current) return;
      const data = structuredClone(fireBg);
      // layers[0] = front shape, layers[1] = back shape (each has one fill at it[1]).
      if (stroke) {
        (data.layers[0].shapes[0].it as unknown[])[1] = strokeItem(strokeHex ?? front, stroke);
        (data.layers[1].shapes[0].it as unknown[])[1] = strokeItem(strokeHex ?? front, stroke);
      } else {
        (data.layers[0].shapes[0].it[1] as unknown as LottieFill).c.k = hexToLottie(front);
        (data.layers[1].shapes[0].it[1] as unknown as LottieFill).c.k = hexToLottie(back);
      }
      const anim = lottie.loadAnimation({
        container: ref.current,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: data,
      });
      anim.setSubframe(false);

      // Drive the playhead by hand: real-time speed (same loop length), but only
      // redraw `fps` times a second → choppy, skipped frames instead of slow-mo.
      const total = anim.totalFrames || LOTTIE_FRAMES;
      const start = performance.now() - lagMs; // echoes start behind in time
      const draw = () => {
        const t = Math.max(0, performance.now() - start) / 1000;
        anim.goToAndStop(Math.floor(t * LOTTIE_FPS) % total, true);
      };
      draw();
      const timer = setInterval(draw, 1000 / fps);
      destroy = () => {
        clearInterval(timer);
        anim.destroy();
      };
    });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [front, back, stroke, strokeHex, lagMs, fps]);

  return <div ref={ref} className="absolute inset-0" />;
}

// Blob + trailing outline echoes. Echoes spring outward past their rest size
// (overshoot) and settle back in, staggered — 70s/80s animation "smear rings".
function JamBurst({ jam, tuning }: { jam: Jam; tuning: JamTuning }) {
  const echoes = Array.from({ length: tuning.trailCount }, (_, k) => k + 1);
  const stagger = tuning.trailDelay / 1000;

  return (
    <motion.div
      className="relative w-full"
      style={{ aspectRatio: "360 / 418", transformOrigin: "50% 100%" }}
      initial={{ rotate: -tuning.blobWiggle }}
      animate={{ rotate: tuning.blobWiggle }}
      transition={{
        // One swing per Lottie loop, mirrored back and forth.
        rotate: { duration: LOTTIE_FRAMES / LOTTIE_FPS, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
      }}
    >
      {/* Outer ring first (n = count) so inner rings paint on top. */}
      {[...echoes].reverse().map((n) => (
        <motion.div
          key={n}
          className="absolute inset-0"
          style={{ transformOrigin: "50% 100%" }}
          // POP: start tucked inside the blob, punch outward past rest, snap back.
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 + (n * tuning.trailGap) / 100 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
          transition={{
            scale: { type: "spring", stiffness: 520, damping: 9, mass: 0.7, delay: n * stagger },
            opacity: { duration: 0.04, delay: n * stagger },
          }}
        >
          <JamBlob
            front={jam.front}
            back={jam.back}
            stroke={tuning.trailStroke}
            // Alternate bright white-tinted / pure jam colour so rings read apart.
            strokeHex={n % 2 === 1 ? tint(jam.front, 0.65) : jam.front}
            lagMs={n * tuning.trailDelay}
            fps={tuning.fps}
          />
        </motion.div>
      ))}

      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: "50% 100%" }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }}
        transition={{
          scale: { type: "spring", stiffness: 520, damping: 11, mass: 0.7 },
          opacity: { duration: 0.04 },
        }}
      >
        <JamBlob front={jam.front} back={jam.back} fps={tuning.fps} />
      </motion.div>
    </motion.div>
  );
}

// ── Chosen-view layout ───────────────────────────────────────────────────────
// Tag, jar(+fire) and text are stacked from the jar's real size instead of fixed
// % of the screen, so the tag never lands on the fire and there is no dead gap
// under the jar — at any screen size. All values are px from the container top.
const JAR_ASPECT = 400 / 320; // jar png h / w
const BLOB_ASPECT = 418 / 360; // lottie h / w

function chosenLayout(w: number, h: number, t: JamTuning, descLen: number) {
  const jw = Math.min(Math.max(0.09 * w, 64), 220); // shelf slot width (matches the CSS clamp)
  const tagFs = Math.min(Math.max(0.044 * w, 28), 84);
  const descFs = Math.min(Math.max(0.019 * w, 14), 38);
  const gap = 0.03 * h;
  const lines = Math.max(1, Math.ceil((descLen * 0.6 * descFs) / (0.9 * w)));

  // Positions relative to the jar slot's centre (cy = 0) for a given scale.
  const stack = (S: number) => {
    const cw = jw * S;
    const imgH = cw * JAR_ASPECT;
    // The jar img scales about 50% 90% on hover and lifts.
    const top0 = -imgH / 2;
    const bottom0 = imgH / 2;
    const origin = top0 + 0.9 * imgH;
    const jarTop = origin - (origin - top0) * t.scale - t.lift * S;
    const jarBottom = origin + (bottom0 - origin) * t.scale - t.lift * S;
    const blobBottom = bottom0 - (t.blobY / 100) * cw;
    const blobTop = blobBottom - cw * (t.blobScale / 100) * BLOB_ASPECT;
    const tagBottom = Math.min(jarTop, blobTop) - gap;
    const tagTop = tagBottom - tagFs * 1.24;
    const descTop = jarBottom + gap * 1.2;
    const descBottom = descTop + lines * descFs * 1.5;
    return { tagBottom, tagTop, descTop, descBottom };
  };

  let S = t.chosenScale;
  if (w < 640) S = Math.max(S, (0.42 * w) / jw); // phones: shelf size would be tiny
  // Wide-but-short screens: shrink until the whole group fits the height.
  for (let i = 0; i < 4; i++) {
    const g = stack(S);
    const height = g.descBottom - g.tagTop;
    if (height <= 0.82 * h) break;
    S = Math.max(0.5, S * ((0.82 * h) / height));
  }

  const g = stack(S);
  // Centre the whole group vertically, plus the manual nudge.
  const cy = h / 2 - (g.tagTop + g.descBottom) / 2 + (t.chosenY / 100) * h;
  return { S, y: cy - h / 2, tagBottom: cy + g.tagBottom, descTop: cy + g.descTop, tagFs, descFs };
}

function useBox(ref: React.RefObject<HTMLElement | null>) {
  const [box, setBox] = useState({ w: 1440, h: 800 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

// Tag backdrop that jitters in steps (position + a hair of rotation), like a
// hand-registered print. Text sits on top and stays put.
function TagBg({ color, px, deg, fps }: { color: string; px: number; deg: number; fps: number }) {
  const [pose, setPose] = useState({ x: 0, y: 0, r: 0 });

  useEffect(() => {
    const rnd = () => Math.random() * 2 - 1;
    const id = setInterval(
      () => setPose({ x: rnd() * px, y: rnd() * px, r: rnd() * deg }),
      1000 / fps,
    );
    return () => clearInterval(id);
  }, [px, deg, fps]);

  return (
    <span
      className="absolute inset-0"
      style={{
        background: color,
        transform: `translate(${pose.x}px, ${pose.y}px) rotate(${pose.r}deg)`,
      }}
    />
  );
}

export default function JamShelf({
  interactive,
  onTap,
  tuning = DEFAULT_TUNING,
  pinned = null,
  committedOverride = null,
  persist = true,
  epoch = null,
}: SlideProps & {
  tuning?: JamTuning;
  /** Force one jar active (index) — for tuning at /jam. */
  pinned?: number | null;
  /** Force the committed view for one jar (index) — for tuning at /jam. */
  committedOverride?: number | null;
  /** Remember the pick across reloads (off in the /jam sandbox so it can't lock the real deck). */
  persist?: boolean;
}) {
  const [hovered, setActive] = useState<number | null>(null);
  const [committedState, setCommitted] = useState<number | null>(null);
  const committed = committedOverride ?? committedState;
  const locked = committed !== null;
  const active = locked ? committed : (pinned ?? hovered);
  const armed = useRef<number | null>(null); // touch: first tap previews, second commits

  // Restore a previous pick (reload mid-talk must not allow a re-pick) and obey
  // presenter resets. The saved pick carries the room epoch it was made in; when
  // the server's epoch moves on (presenter hit "reset jam") the pick is void.
  useEffect(() => {
    if (!interactive || !persist || epoch === null) return;
    try {
      // Editing aid: open the deck with ?resetjam to clear the saved pick.
      if (new URLSearchParams(window.location.search).has("resetjam")) {
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
        if (saved && saved.epoch === epoch && JAMS[saved.i]) {
          setCommitted(saved.i);
          return;
        }
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
    setCommitted(null);
    setActive(null);
    armed.current = null;
  }, [interactive, persist, epoch]);

  // Warm the lottie chunk so the first hover doesn't wait on a download.
  useEffect(() => {
    void import("lottie-web");
  }, []);

  const commit = (i: number) => {
    setActive(i);
    setCommitted(i);
    if (persist) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ i, epoch }));
      } catch {}
    }
  };

  const chosen = committed !== null ? JAMS[committed] : null;
  const hoverJam = !locked && active !== null ? JAMS[active] : null;
  const rootRef = useRef<HTMLDivElement>(null);
  const box = useBox(rootRef);
  const lay = chosenLayout(box.w, box.h, tuning, chosen?.desc.length ?? 40);

  return (
    <div ref={rootRef} className="relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/svg/tdlogo-primary.svg"
        alt="TELUS Digital"
        className="absolute left-[4vw] top-[8vh] h-[clamp(18px,1.5vw,32px)] w-auto"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/jam/mascot.png"
        alt=""
        draggable={false}
        className="absolute right-[3vw] top-[5vh] w-[clamp(64px,6vw,140px)]"
      />

      {/* Chosen: name tag above the jar. */}
      <AnimatePresence>
        {chosen && (
          <motion.div
            key={`tag-${chosen.id}`}
            className="pointer-events-none absolute left-1/2 z-20 whitespace-nowrap px-[0.45em] py-[0.12em] font-black leading-none tracking-tight"
            style={{
              x: "-50%",
              y: "-100%",
              top: lay.tagBottom,
              fontSize: lay.tagFs,
              color: tagText(chosen.front),
            }}
            initial={{ opacity: 0, scale: 0.5, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: -1.2 }}
            transition={{ delay: 0.45, type: "spring", stiffness: 520, damping: 14, mass: 0.7 }}
          >
            <TagBg color={chosen.front} px={tuning.tagWiggle} deg={tuning.tagRotate} fps={tuning.tagFps} />
            <span className="relative">{chosen.name}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chosen: description below. */}
      <AnimatePresence>
        {chosen && (
          <motion.p
            key={`desc-${chosen.id}`}
            className="pointer-events-none absolute left-1/2 z-20 w-[90%] -translate-x-1/2 text-center font-mono text-white"
            style={{ top: lay.descTop, fontSize: lay.descFs }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.35 }}
          >
            {chosen.desc}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Shelf title — same tag style as the chosen name; takes the hovered jam's colour. */}
      <AnimatePresence>
        {!locked && (
          <motion.div
            key="question"
            className="pointer-events-none absolute left-1/2 z-20 whitespace-nowrap px-[0.45em] py-[0.12em] font-black leading-none tracking-tight"
            style={{
              x: "-50%",
              y: "-50%",
              top: `calc(20% + ${tuning.shelfY}px)`,
              fontSize: lay.tagFs,
              color: tagText(hoverJam?.front ?? "#ffffff"),
            }}
            initial={{ opacity: 0, scale: 0.5, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: -1.2 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 520, damping: 14, mass: 0.7 }}
          >
            <TagBg color={hoverJam?.front ?? "#ffffff"} px={tuning.tagWiggle} deg={tuning.tagRotate} fps={tuning.tagFps} />
            <span className="relative">what&apos;s your jam?</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shelf hint — goes away on commit. */}
      <AnimatePresence>
        {!locked && (
          <motion.p
            className="pointer-events-none absolute bottom-[9%] left-1/2 w-[90%] -translate-x-1/2 text-center font-mono text-white/40"
            style={{ fontSize: "clamp(11px,1.1vw,22px)" }}
            exit={{ opacity: 0 }}
          >
            pick one. no take-backs.
          </motion.p>
        )}
      </AnimatePresence>

      <div
        className="relative flex flex-wrap items-end justify-center gap-y-6 px-[3vw] gap-x-[clamp(8px,4.5vw,120px)]"
        // Centred container: margin-top m shifts the row down by m/2. Dropped once a jar is
        // chosen so the chosen layout (which assumes a centred row) stays exact.
        style={{ marginTop: locked ? 0 : 2 * tuning.shelfY }}
      >
        <AnimatePresence mode="popLayout">
          {JAMS.map((jam, i) => {
            // Once committed, every other jar leaves; the chosen one glides to centre.
            if (locked && committed !== i) return null;
            const isActive = active === i;
            const isChosen = committed === i;
            const dist = active === null ? 0 : i - active;
            // Dock-style: neighbours slide away, falling off with distance.
            const nudge = dist === 0 || locked ? 0 : Math.sign(dist) * (tuning.nudge / Math.abs(dist));
            const t = tuning.tilt;

            return (
              // Static slot = stable hit area, so lifting the jar can't flicker the hover.
              <motion.div
                key={jam.id}
                layout
                className={`relative w-[clamp(64px,9vw,220px)] ${locked ? "" : "cursor-pointer"}`}
                style={{ transformOrigin: "50% 50%" }}
                initial={{ opacity: 0, scale: 0.85, y: 24 }}
                animate={{ opacity: 1, scale: isChosen ? lay.S : 1, y: isChosen ? lay.y : 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 24, transition: { duration: 0.25 } }}
                transition={{
                  scale: { type: "spring", stiffness: 140, damping: 16, delay: isChosen ? 0.2 : 0 },
                  y: { type: "spring", stiffness: 120, damping: 18, delay: isChosen ? 0.2 : 0 },
                  layout: { type: "spring", stiffness: 140, damping: 20, delay: 0.15 },
                }}
                onPointerEnter={(e) => {
                  if (locked) return;
                  setActive(i);
                  // Every hover counts as an interaction (audience devices only).
                  if (interactive) onTap("hover");
                }}
                onPointerLeave={(e) => {
                  if (locked) return;
                  // Touch has no "leave" while held; keep it lit until another jar is touched.
                  if (e.pointerType === "mouse") setActive((a) => (a === i ? null : a));
                }}
                onClick={(e) => {
                  // Only audience devices count and pick; the presenter screen just watches.
                  if (interactive) onTap("tap"); // every click counts, even after the pick is locked
                  if (locked || !interactive) {
                    setActive(i);
                    return;
                  }
                  const touch = (e.nativeEvent as PointerEvent).pointerType !== "mouse";
                  if (touch && armed.current !== i) {
                    armed.current = i; // first tap previews, second tap locks it in
                    setActive(i);
                    return;
                  }
                  commit(i);
                }}
              >
                <AnimatePresence>
                  {isActive && (
                    // Bottom-anchored: blob sits on the jar's base line and grows upward.
                    <div
                      className="pointer-events-none absolute z-0"
                      style={{
                        width: `${tuning.blobScale}%`,
                        bottom: `${tuning.blobY}%`,
                        left: `${50 + tuning.blobX}%`,
                        transform: `translateX(-50%) rotate(${tuning.blobRotate}deg)`,
                        transformOrigin: "50% 100%",
                      }}
                    >
                      <JamBurst jam={jam} tuning={tuning} />
                    </div>
                  )}
                </AnimatePresence>

                <motion.img
                  src={jam.src}
                  alt={isChosen ? jam.name : ""}
                  draggable={false}
                  className="relative z-10 block h-auto w-full"
                  style={{ transformOrigin: "50% 90%" }}
                  initial={false}
                  animate={{
                    x: nudge,
                    y: isActive ? -tuning.lift : 0,
                    scale: isActive ? tuning.scale : 1,
                    rotate: isActive ? [0, -t, t * 0.8, -t * 0.4, t * 0.3, 0] : 0,
                    filter: `drop-shadow(0 0 ${isActive ? tuning.glow : 0}px ${jam.front}${isActive ? "aa" : "00"})`,
                  }}
                  transition={{
                    default: { type: "spring", stiffness: 260, damping: 14 },
                    rotate: { duration: 0.8, ease: "easeInOut" },
                    filter: { duration: 0.25 },
                  }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
