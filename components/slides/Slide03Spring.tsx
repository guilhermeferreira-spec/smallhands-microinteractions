"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { SlideProps } from "./types";

/**
 * Slide03Spring — the salt layer.
 *
 * "Interaction is like salt: too much spoils the dish, too little and it's
 * bland." The cursor becomes a salt-bae pinched hand. Press and HOLD → hand
 * opens (state 1) and throws salt; release → hand closes (state 0). The grains
 * detach at launch and fall in world space, ignoring the cursor afterward.
 *
 * Particles use real physics: each grain launches with its own velocity, then
 * gravity accelerates it down every frame (v += g*dt; pos += v*dt). Per-grain
 * launch + gravity is what makes the scatter feel natural, not scripted.
 *
 * Desktop only. Salt drops only on press — a deliberate act.
 */

const COPY_HEADLINE = "Interaction is like salt.";
const COPY_SUB = "Too much spoils the dish. Too little and it's bland.";

const HOTSPOT = { x: 22, y: 64 }; // fingertips: click point + grain origin
const HAND_SIZE = 72;

// Hand tilt. Rest sits slightly clockwise; pressing jumps counter-clockwise.
const REST_ANGLE_CW = 48; // resting clockwise tilt (degrees)
const REST_ANGLE_CCW = 20; // pressed pose, jumped counter-clockwise

const GRAVITY = 0.0016; // downward accel per ms^2
const DRAG = 0.0009; // slight air drag per ms
const GRAIN_LIFE = 900; // ms before a grain is removed
const GRAIN_COUNT = 9; // grains per press

interface Grain {
  id: number;
  ox: number; // launch origin in SCREEN space (frozen at press time)
  oy: number;
  x: number; // physics offset from origin
  y: number;
  vx: number;
  vy: number;
  size: number;
  born: number;
}

export default function Slide03Spring({ interactive, onTap }: SlideProps) {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [pressing, setPressing] = useState(false); // hand state: true = open
  const [inside, setInside] = useState(false);
  const grainsRef = useRef<Grain[]>([]);
  const [, force] = useState(0);
  const grainId = useRef(0);
  const posRef = useRef(pos); // latest cursor pos for the launch origin
  posRef.current = pos;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastT = useRef<number | null>(null);

  // Follow the mouse.
  useEffect(() => {
    if (!interactive) return;
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    const enter = () => setInside(true);
    const leave = () => {
      setInside(false);
      setPressing(false); // dragging out releases the hand
    };
    const el = rootRef.current;
    window.addEventListener("mousemove", move);
    el?.addEventListener("mouseenter", enter);
    el?.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mousemove", move);
      el?.removeEventListener("mouseenter", enter);
      el?.removeEventListener("mouseleave", leave);
    };
  }, [interactive]);

  // Release on mouseup anywhere (covers releasing off-slide).
  useEffect(() => {
    if (!interactive) return;
    const up = () => setPressing(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [interactive]);

  // Physics loop — only runs while grains exist.
  const step = useCallback((t: number) => {
    const dt = lastT.current == null ? 16 : Math.min(t - lastT.current, 32);
    lastT.current = t;
    const now = performance.now();

    const alive: Grain[] = [];
    for (const g of grainsRef.current) {
      g.vy += GRAVITY * dt;
      g.vx *= 1 - DRAG * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (now - g.born < GRAIN_LIFE) alive.push(g);
    }
    grainsRef.current = alive;
    force((n) => n + 1);

    if (alive.length > 0) {
      rafRef.current = requestAnimationFrame(step);
    } else {
      rafRef.current = null;
      lastT.current = null;
    }
  }, []);

  // Throw one burst of salt from the current fingertip position.
  const launchBurst = useCallback(() => {
    const now = performance.now();
    const originX = posRef.current.x;
    const originY = posRef.current.y;
    for (let i = 0; i < GRAIN_COUNT; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 0.08 + Math.random() * 0.16;
      grainsRef.current.push({
        id: grainId.current++,
        ox: originX,
        oy: originY,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.abs(Math.sin(angle)) * speed * 0.5 - 0.06,
        size: 3 + Math.random() * 3,
        born: now,
      });
    }
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(step);
  }, [step]);

  // Press = open hand + throw salt. Hold stays open; release closes it.
  const onPress = useCallback(() => {
    if (!interactive) return;
    setPressing(true);
    launchBurst();
    onTap();
  }, [interactive, launchBurst, onTap]);

  // Cleanup the loop on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      onMouseDown={onPress}
      className="relative flex h-full w-full flex-col items-center justify-center bg-[#000] text-white select-none"
      style={{ cursor: interactive && inside ? "none" : "default" }}
    >
      <h2 className="px-8 text-center font-title text-4xl md:text-5xl">
        {COPY_HEADLINE}
      </h2>
      <p className="mt-6 px-8 text-center font-body text-lg text-white/55">
        {COPY_SUB}
      </p>

      {/* The hand cursor — state driven by press/hold. Carries NO grains. */}
      {interactive && inside && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50"
          style={{
            left: pos.x - HOTSPOT.x,
            top: pos.y - HOTSPOT.y,
            width: HAND_SIZE,
            height: HAND_SIZE,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pressing ? "/svg/pointer-state-1.svg" : "/svg/pointer-state-0.svg"}
            alt=""
            className="h-full w-full origin-bottom"
            style={{
              // Rest: slight clockwise tilt. Press: JUMP counter-clockwise,
              // instantly (no transition). Release: spring back to rest.
              transform: `rotate(${pressing ? REST_ANGLE_CCW : REST_ANGLE_CW}deg)`,
              transition: pressing
                ? "none" // hard cut into the press pose
                : "transform 520ms cubic-bezier(0.34, 1.56, 0.64, 1)", // springy return
            }}
          />
        </div>
      )}

      {/* Grains: their OWN layer, anchored to each grain's frozen launch origin
          (g.ox/g.oy), so they fall in world space and ignore the cursor. Only
          mounted while grains exist — no always-on overlay over the app. */}
      {interactive && grainsRef.current.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[60]">
          {grainsRef.current.map((g) => {
            const age = performance.now() - g.born;
            const fade = Math.max(0, 1 - age / GRAIN_LIFE);
            return (
              <span
                key={g.id}
                className="absolute block rounded-[1px] bg-white"
                style={{
                  left: g.ox + g.x,
                  top: g.oy + g.y,
                  width: g.size,
                  height: g.size,
                  opacity: fade,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}