// Dissolve-into-sand engine — flag-free port of mi-lab's Layer 7 effect.
//
// The original rasterized arbitrary DOM via the experimental HTML-in-Canvas
// API (drawElementImage). This deck can't require a Chrome flag, so instead we
// rasterize the (simple) block ourselves with the plain 2D canvas API:
// `rasterizeElement` walks the block's children and redraws text + borders at
// their computed styles/positions. Everything downstream — the wind-blown
// grain physics and the overlay render loop — is the reference engine intact.

export type DissolveOpts = {
  sampleStep?: number; // bitmap px between grains (quality vs. perf)
  duration?: number; // seconds for the full erosion
  windX?: number; // px drift strength
  turbulence?: number; // shimmer amplitude
  onDone?: () => void;
};

type Grain = {
  homeX: number;
  homeY: number;
  r: number;
  g: number;
  b: number;
  size: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  delay: number;
  turbPhase: number;
  turbFreq: number;
  fadeStart: number;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

let rafId = 0; // single in-flight dissolve

/**
 * Manually rasterize a simple styled element (text lines + bordered pills)
 * into an offscreen canvas that visually matches it 1:1 on screen.
 * Handles: text content (font/size/color/uppercase), rounded borders.
 */
export function rasterizeElement(root: HTMLElement): {
  canvas: HTMLCanvasElement;
  rect: DOMRect;
} | null {
  const rect = root.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(rect.width * dpr);
  canvas.height = Math.ceil(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS px, relative to rect

  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of nodes) {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const x = r.left - rect.left;
    const y = r.top - rect.top;

    // borders (assume uniform, e.g. the severity pill)
    const bw = parseFloat(s.borderTopWidth) || 0;
    if (bw > 0 && s.borderTopColor !== "transparent") {
      const radius = Math.min(parseFloat(s.borderTopLeftRadius) || 0, r.height / 2);
      ctx.strokeStyle = s.borderTopColor;
      ctx.lineWidth = bw;
      ctx.beginPath();
      ctx.roundRect(x + bw / 2, y + bw / 2, r.width - bw, r.height - bw, radius);
      ctx.stroke();
    }

    // direct text content only (children draw their own)
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? "")
      .join("")
      .trim();
    if (!text) continue;

    const drawn = s.textTransform === "uppercase" ? text.toUpperCase() : text;
    ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    ctx.fillStyle = s.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (s.letterSpacing !== "normal") ctx.letterSpacing = s.letterSpacing;
    ctx.fillText(drawn, x + r.width / 2, y + r.height / 2, r.width);
    ctx.letterSpacing = "0px";
  }

  return { canvas, rect };
}

/**
 * Wind-erosion dissolve from a pre-rasterized source canvas.
 * @param source  offscreen canvas holding the block's pixels (from rasterizeElement)
 * @param rect    the block's screen rect (grains fly in viewport space)
 * @param overlay full-screen fixed canvas used as the particle stage
 */
export function startDissolve(
  source: HTMLCanvasElement,
  rect: DOMRect,
  overlay: HTMLCanvasElement,
  opts: DissolveOpts = {},
): void {
  const { sampleStep = 2, duration = 1.4, windX = 320, turbulence = 18, onDone } = opts;

  const sctx = source.getContext("2d");
  if (!sctx) {
    onDone?.();
    return;
  }
  const bw = source.width;
  const bh = source.height;
  const data = sctx.getImageData(0, 0, bw, bh).data;

  // map bitmap px -> screen (CSS) px
  const sx = rect.width / bw;
  const sy = rect.height / bh;

  const grains: Grain[] = [];
  for (let y = 0; y < bh; y += sampleStep) {
    for (let x = 0; x < bw; x += sampleStep) {
      const i = (y * bw + x) * 4;
      if (data[i + 3] < 16) continue;

      const homeX = rect.left + x * sx;
      const homeY = rect.top + y * sy;
      const nx = x / bw; // 0 (windward) .. 1

      const burstAngle = (Math.random() - 0.35) * Math.PI; // biased rightward
      const burstSpeed = 40 + Math.random() * 160;
      const windCatch = windX * (0.5 + Math.random() * 1.1);
      const vertBias = (Math.random() - 0.45) * 120;

      grains.push({
        homeX,
        homeY,
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        size: sampleStep * sx * (0.5 + Math.random() * 0.8),
        vx: Math.cos(burstAngle) * burstSpeed * 0.4 + windCatch,
        vy: Math.sin(burstAngle) * burstSpeed * 0.4 + vertBias,
        gravity: (Math.random() - 0.25) * 90,
        drag: 0.92 + Math.random() * 0.05,
        delay: nx * 0.22 + Math.random() * 0.07,
        turbPhase: Math.random() * Math.PI * 2,
        turbFreq: 3 + Math.random() * 6,
        fadeStart: 0.3 + Math.random() * 0.4,
      });
    }
  }

  const octx = overlay.getContext("2d");
  if (!octx) {
    onDone?.();
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  overlay.width = window.innerWidth * dpr;
  overlay.height = window.innerHeight * dpr;
  overlay.style.width = `${window.innerWidth}px`;
  overlay.style.height = `${window.innerHeight}px`;
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (rafId) cancelAnimationFrame(rafId);
  let progress = 0;
  let last = 0;

  const frame = (ts: number) => {
    if (last === 0) last = ts;
    const dt = (ts - last) / 1000;
    last = ts;
    progress += dt / duration;

    octx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const p of grains) {
      if (progress < p.delay) {
        // paint frozen at home so the block looks intact while early grains drift
        octx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        octx.fillRect(p.homeX, p.homeY, p.size, p.size);
        continue;
      }
      const t = clamp01((progress - p.delay) / 0.45);
      if (t >= 1) continue;

      const turb =
        Math.sin(progress * p.turbFreq + p.turbPhase) * turbulence +
        Math.sin(progress * p.turbFreq * 2.3 + p.turbPhase * 1.7) * turbulence * 0.45;

      const rawAlpha = t < p.fadeStart ? 1 : 1 - (t - p.fadeStart) / (1 - p.fadeStart);
      const dragF = Math.pow(p.drag, t * 80);
      const px = p.homeX + p.vx * t * dragF + turb;
      const py = p.homeY + p.vy * t * dragF + p.gravity * t * t;
      const size = p.size * rawAlpha;

      const alpha = Math.pow(rawAlpha, 1.6);
      if (alpha < 0.01 || size < 0.3) continue;
      octx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
      octx.fillRect(px, py, size, size);
    }

    if (progress < 1) {
      rafId = requestAnimationFrame(frame);
    } else {
      octx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      rafId = 0;
      onDone?.();
    }
  };
  rafId = requestAnimationFrame(frame);
}
