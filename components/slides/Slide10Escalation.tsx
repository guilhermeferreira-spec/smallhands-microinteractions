"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, AnimatePresence, MotionConfig, useAnimationControls } from "motion/react";
import confetti from "canvas-confetti";
import { rasterizeElement, startDissolve } from "./dissolve";
import type { SlideProps } from "./types";

/**
 * Slide10Escalation — the ceremony dial, from HIDDEN to too-much.
 * Merges the old slide 5 (hidden swipe-to-delete) in as the opening state,
 * then escalates through mi-lab's destructive-modal layers.
 *
 * Layers (number keys 0–6 or the segmented control; arrows stay free for
 * slide navigation):
 *  0 hidden — swipe a row left to delete; NO affordance (the old slide 5)
 *  1 visible delete button + confirm modal (Cancel / Delete)
 *  2 modal primary becomes press-and-HOLD (mechanic only)
 *  3 + visual fill while holding
 *  4 + shake on early release (cancel feedback)
 *  5 + confetti on completion
 *  6 + the record preview in the modal DISSOLVES into wind-blown sand
 *      (flag-free port of the reference's HTML-in-Canvas layer — see dissolve.ts)
 */

type Severity = "high" | "med" | "low";
interface Item {
  id: number;
  ticket: string;
  issue: string;
  severity: Severity;
}

const SEED: Item[] = [
  { id: 1, ticket: "DS-2041", issue: "Duplicate CTAs on checkout", severity: "high" },
  { id: 2, ticket: "DS-2044", issue: "Legacy cookie banner", severity: "med" },
  { id: 3, ticket: "DS-2050", issue: "Autoplay hero carousel", severity: "high" },
  { id: 4, ticket: "DS-2058", issue: "Redundant confirm dialog", severity: "low" },
  { id: 5, ticket: "DS-2063", issue: "Newsletter interstitial", severity: "med" },
  { id: 6, ticket: "DS-2071", issue: "Tooltip on every icon", severity: "low" },
];

// Layer 0 (hidden swipe) has no action column; layers 1+ add it.
const GRID_HIDDEN = "104px 1fr 92px"; // ticket · issue · severity
const GRID_VISIBLE = "104px 1fr 92px 72px"; // + action
const SEV_CLASS: Record<Severity, string> = {
  high: "text-white/80 border-white/30",
  med: "text-white/50 border-white/20",
  low: "text-white/30 border-white/12",
};

const LAYERS = [0, 1, 2, 3, 4, 5, 6];
const MAX_LAYER = 6;
const HOLD_MS = 900;
const COLLAPSE_MS = 320;
const COLLAPSE_DELAY = 700; // ms before the gap starts closing (≈mid-erosion)
const DELETE_THRESHOLD = 130; // px of left-drag past which release deletes (layer 0)

// Layer 6 dissolve — tune the wind/erosion here.
const DISSOLVE_DURATION = 1.4; // s, full erosion
const SAMPLE_STEP = 2; // bitmap px between grains
const WIND_X = 320; // px drift strength
const WIND_TURBULENCE = 18; // shimmer amplitude

const CONFETTI_COLORS = ["#FFD23F", "#EE4266", "#3BCEAC", "#0EAD69", "#5C80BC", "#FF6B35"];

// Firework burst from a normalized origin (canvas-confetti realistic preset)
function fireConfetti(x: number, y: number) {
  const count = 220;
  const fire = (ratio: number, opts: confetti.Options) =>
    confetti({
      origin: { x, y },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
      particleCount: Math.floor(count * ratio),
      ...opts,
    });
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

function TrashIcon() {
  return (
    <svg width="15" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// ── Layer 0 row: the old slide 5 — swipe left to delete, zero affordance ────
function SwipeRow({ item, onDelete }: { item: Item; onDelete: () => void }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const startX = useRef(0);

  const armed = -dx >= DELETE_THRESHOLD;

  const onPointerDown = (e: ReactPointerEvent) => {
    if (removing) return;
    startX.current = e.clientX;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging) return;
    setDx(Math.min(0, e.clientX - startX.current)); // left-only
  };
  const finish = () => {
    if (!dragging) return;
    setDragging(false);
    if (armed) setRemoving(true);
    else setDx(0);
  };

  return (
    <div
      className="relative overflow-hidden border-b border-white/[0.06] last:border-b-0"
      style={{
        maxHeight: removing ? 0 : 60,
        opacity: removing ? 0 : 1,
        transition: removing ? "max-height 300ms ease, opacity 200ms ease" : "none",
      }}
      onTransitionEnd={() => {
        if (removing) onDelete();
      }}
    >
      {/* Delete panel revealed behind the row */}
      <div
        className="absolute inset-0 flex items-center justify-end gap-2 pr-6 text-white"
        style={{ background: armed ? "#dc2626" : "#761717", transition: "background 120ms" }}
      >
        <TrashIcon />
        <span className="font-body text-lg uppercase tracking-[0.1em]">Delete</span>
      </div>

      {/* Foreground row (opaque, slides left to reveal the panel) */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        className="grid h-[60px] items-center px-5"
        style={{
          gridTemplateColumns: GRID_HIDDEN,
          background: "#0b0b0b",
          transform: `translateX(${removing ? -560 : dx}px)`,
          transition: dragging ? "none" : "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          cursor: "default",
          touchAction: "pan-y",
        }}
      >
        <span className="font-body text-lg tabular-nums tracking-wide text-white/40">
          {item.ticket}
        </span>
        <span className="truncate pr-4 font-body text-xl text-white/85">{item.issue}</span>
        <span
          className={`justify-self-start rounded border px-2 py-0.5 font-body text-sm uppercase tracking-[0.08em] ${SEV_CLASS[item.severity]}`}
        >
          {item.severity}
        </span>
      </div>
    </div>
  );
}

export default function Slide10Escalation({ onTap }: SlideProps) {
  const [items, setItems] = useState(SEED);
  const [pending, setPending] = useState<Item | null>(null);
  const [layer, setLayer] = useState(0);
  const [holding, setHolding] = useState(false);
  const [phase, setPhase] = useState<"idle" | "collapse">("idle");
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeControls = useAnimationControls();
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileBlockRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // dissolve particle stage
  const [dissolving, setDissolving] = useState(false); // hides the live block while grains take over

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPending(null);
      else if (/^[0-9]$/.test(e.key)) {
        const n = Number(e.key);
        if (n <= MAX_LAYER) setLayer(n);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Every button counts: hover (mouse only — touch taps won't double-count)
  // spread onto each button, and a tap wherever a click isn't already counted.
  const hoverProps = {
    onPointerEnter: (e: ReactPointerEvent) => {
      if (e.pointerType === "mouse") onTap("hover");
    },
  };

  function cancel() {
    setHolding(false);
    setPending(null);
    setDissolving(false);
  }

  function removeItem() {
    if (!pending) return;
    setItems((prev) => prev.filter((n) => n.id !== pending.id));
    setHolding(false);
    setPhase("idle");
    setPending(null);
    setDissolving(false);
  }

  function confirmDelete() {
    onTap();
    removeItem();
  }

  function completeHold() {
    onTap();
    const block = layer >= 6 ? fileBlockRef.current : null;
    if (block && overlayCanvasRef.current) {
      // Layer 6: the record dissolves into sand on the wind.
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const raster = reduced ? null : rasterizeElement(block);
      if (!raster) {
        setPhase("collapse");
        setTimeout(removeItem, COLLAPSE_MS);
        return;
      }
      setDissolving(true); // hide the live block; frozen grains take over seamlessly
      startDissolve(raster.canvas, raster.rect, overlayCanvasRef.current, {
        sampleStep: SAMPLE_STEP,
        duration: DISSOLVE_DURATION,
        windX: WIND_X,
        turbulence: WIND_TURBULENCE,
      });
      setTimeout(() => setPhase("collapse"), COLLAPSE_DELAY); // gap closes mid-erosion
      setTimeout(removeItem, COLLAPSE_DELAY + COLLAPSE_MS);
    } else if (layer >= 5 && dialogRef.current) {
      const r = dialogRef.current.getBoundingClientRect();
      fireConfetti((r.left + r.width / 2) / window.innerWidth, (r.top + r.height / 2) / window.innerHeight);
      removeItem();
    } else {
      removeItem();
    }
  }

  function startHold() {
    endHold();
    onTap(); // pressing the hold button is itself an interaction
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      completeHold();
    }, HOLD_MS);
  }

  function endHold() {
    if (holdTimer.current) {
      setHolding(false);
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
      if (layer >= 4) {
        onTap();
        shakeControls.start({
          x: [0, -8, 8, -6, 6, -3, 3, 0],
          transition: { duration: 0.4, ease: "easeInOut" },
        });
      }
    }
  }

  const isEmpty = items.length === 0;
  const hidden = layer === 0; // the old slide 5: swipe, no affordance
  const grid = hidden ? GRID_HIDDEN : GRID_VISIBLE;
  const canReset = items.length < SEED.length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-8 overflow-hidden bg-[#000] px-16 text-white">
        {/* Dissolve particle stage — grains drift across the whole viewport */}
        <canvas ref={overlayCanvasRef} className="pointer-events-none fixed inset-0 z-50" />

        <h2 className="text-center font-title text-lg leading-[1.7] text-white/80 md:text-xl">
          Same delete. Different ceremony.
        </h2>

        {/* The specimen — the design_debt table. Layer 0 = hidden swipe delete;
            layers 1+ grow a visible delete and escalate its ceremony.
            Reflow animation only from layer 3 up — at 1/2 the delete is still
            "cheap", so the list just snaps smaller. */}
        <motion.div
          layout={layer >= 3}
          className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/12 bg-white/[0.03] shadow-2xl"
        >
          {!isEmpty && (
            <>
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-5 py-3">
                <span className="font-body text-lg tracking-wide text-white/55">
                  <span className="text-white/30">SELECT * FROM</span> design_debt
                </span>
                <span className="font-body text-base uppercase tracking-[0.1em] text-white/35 tabular-nums">
                  {items.length} {items.length === 1 ? "row" : "rows"}
                </span>
              </div>
              <div
                className="grid items-center border-b border-white/10 bg-white/[0.02] px-5 py-2.5 font-body text-sm uppercase tracking-[0.12em] text-white/35"
                style={{ gridTemplateColumns: grid }}
              >
                <span>ticket</span>
                <span>issue</span>
                <span>severity</span>
                {!hidden && <span />}
              </div>
            </>
          )}

          {isEmpty ? (
            <div className="flex flex-col items-center gap-3 py-10 font-body text-xl text-white/30">
              <span>0 rows returned</span>
              <button
                {...hoverProps}
                onClick={() => {
                  onTap();
                  setItems(SEED);
                }}
                className="font-title text-[0.625rem] uppercase tracking-[0.1em] text-white/40 hover:text-white/80"
              >
                Reset
              </button>
            </div>
          ) : hidden ? (
            items.map((item) => (
              <SwipeRow
                key={item.id}
                item={item}
                onDelete={() => {
                  onTap();
                  setItems((prev) => prev.filter((n) => n.id !== item.id));
                }}
              />
            ))
          ) : (
            <ul>
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  layout={layer >= 3}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="grid items-center border-b border-white/[0.06] px-5 py-3.5 last:border-b-0"
                  style={{ gridTemplateColumns: grid }}
                >
                  <span className="font-body text-lg tabular-nums tracking-wide text-white/40">
                    {item.ticket}
                  </span>
                  <span className="truncate pr-4 font-body text-xl text-white/85">
                    {item.issue}
                  </span>
                  <span
                    className={`justify-self-start rounded border px-2 py-0.5 font-body text-sm uppercase tracking-[0.08em] ${SEV_CLASS[item.severity]}`}
                  >
                    {item.severity}
                  </span>
                  <button
                    {...hoverProps}
                    onClick={() => {
                      onTap();
                      setPending(item);
                    }}
                    className="justify-self-end p-2 text-white/35 transition-colors hover:text-red-400"
                    aria-label={`Delete ${item.ticket}`}
                  >
                    <TrashIcon />
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Confirm modal — layers 1+ */}
        <AnimatePresence>
          {pending && !hidden && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={cancel}
              className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-[2px]"
            >
              <motion.div animate={shakeControls} className="w-full max-w-sm">
                <motion.div
                  ref={dialogRef}
                  layout
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  role="dialog"
                  aria-modal="true"
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-[#0b0b0b] text-center shadow-2xl"
                >
                  <motion.div layout className="px-8 pb-6 pt-8">
                    <h3 className="font-title text-base text-white">Delete this?</h3>
                    {layer >= 6 && pending ? (
                      <div className="mt-3 flex flex-col items-center">
                        <p className="font-body text-lg text-white/40">
                          You&apos;re about to delete this record:
                        </p>
                        <AnimatePresence>
                          {phase !== "collapse" && (
                            <motion.div
                              key="fileblock"
                              layout
                              initial={{ opacity: 0, y: 8, scale: 0.85 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{
                                opacity: 0,
                                height: 0,
                                marginTop: 0,
                                marginBottom: 0,
                                transition: {
                                  opacity: { duration: 0 },
                                  height: { duration: COLLAPSE_MS / 1000, ease: "easeInOut" },
                                  marginTop: { duration: COLLAPSE_MS / 1000, ease: "easeInOut" },
                                  marginBottom: { duration: COLLAPSE_MS / 1000, ease: "easeInOut" },
                                },
                              }}
                              transition={{ type: "spring", stiffness: 500, damping: 24, delay: 0.12 }}
                              className="my-5 flex flex-col items-center"
                            >
                              <div
                                ref={fileBlockRef}
                                className="flex flex-col items-center"
                                style={{ visibility: dissolving ? "hidden" : "visible" }}
                              >
                                <span className="rounded border border-white/20 px-3 py-1 font-body text-base uppercase tracking-[0.08em] text-white/60">
                                  {pending.severity}
                                </span>
                                <p className="mt-4 max-w-[16rem] truncate font-body text-2xl text-white" title={pending.issue}>
                                  {pending.issue}
                                </p>
                                <p className="mt-1 font-body text-base text-white/40 tabular-nums">
                                  {pending.ticket} · design_debt
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <p className="font-body text-lg text-white/40">This can&apos;t be undone.</p>
                      </div>
                    ) : (
                      <p className="mt-2 font-body text-lg text-white/40">This can&apos;t be undone.</p>
                    )}
                  </motion.div>
                  <div className="border-t border-white/10" />
                  {layer >= 2 ? (
                    <motion.button
                      layoutId="primary-action"
                      layout
                      onPointerEnter={hoverProps.onPointerEnter}
                      onPointerDown={startHold}
                      onPointerUp={endHold}
                      onPointerLeave={endHold}
                      className={`relative block w-full select-none overflow-hidden px-8 py-4 font-title text-xs uppercase tracking-[0.12em] transition-colors ${
                        holding && layer === 2
                          ? "bg-red-500/20 text-red-300"
                          : "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      }`}
                    >
                      <span className="relative z-0">Hold to delete</span>
                      {layer >= 3 && (
                        <motion.span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-red-600 text-white"
                          initial={{ clipPath: "inset(0 100% 0 0)" }}
                          animate={{ clipPath: holding ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }}
                          transition={{ duration: holding ? HOLD_MS / 1000 : 0.2, ease: "linear" }}
                        >
                          Hold to delete
                        </motion.span>
                      )}
                    </motion.button>
                  ) : (
                    <div className="flex justify-center gap-16 px-8 py-4">
                      <motion.button
                        layoutId="cancel-action"
                        layout
                        onPointerEnter={hoverProps.onPointerEnter}
                        onClick={() => {
                          onTap();
                          cancel();
                        }}
                        className="font-title text-xs uppercase tracking-[0.12em] text-white/70 transition-colors hover:text-white"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        layoutId="primary-action"
                        layout
                        onPointerEnter={hoverProps.onPointerEnter}
                        onClick={confirmDelete}
                        className="font-title text-xs uppercase tracking-[0.12em] text-red-400 transition-colors hover:text-red-300"
                      >
                        Delete
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              </motion.div>

              {/* Cancel morphs out below the card (action-sheet) — layer 2+ */}
              {layer >= 2 && (
                <motion.button
                  layoutId="cancel-action"
                  layout
                  onPointerEnter={hoverProps.onPointerEnter}
                  onClick={() => {
                    onTap();
                    cancel();
                  }}
                  className="font-title text-xs uppercase tracking-[0.12em] text-white/60 transition-colors hover:text-white"
                >
                  Cancel
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layer dial + reset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 font-body text-base">
            {LAYERS.map((n) => (
              <button
                key={n}
                {...hoverProps}
                onClick={() => {
                  onTap();
                  setLayer(n);
                }}
                className={
                  layer === n
                    ? "rounded-full bg-white px-3.5 py-1 text-black"
                    : "rounded-full px-3.5 py-1 text-white/40 transition-colors hover:text-white/80"
                }
              >
                {n}
              </button>
            ))}
          </div>
          <button
            {...hoverProps}
            onClick={() => {
              onTap();
              setItems(SEED);
            }}
            disabled={!canReset}
            className={`rounded-full border px-4 py-1.5 font-body text-base transition-colors ${
              canReset
                ? "border-white/20 bg-white/10 text-white/80 hover:bg-white/20"
                : "cursor-not-allowed border-white/5 text-white/25"
            }`}
          >
            Reset
          </button>
        </div>
      </div>
    </MotionConfig>
  );
}
