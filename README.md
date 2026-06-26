# smallhands 小さな手

Interactive synced presentation deck for a 30-min talk on microinteractions.  
Built for TELUS Digital. Next.js + PartyKit (Cloudflare edge websockets).

---

## How it works

Three channels over one WebSocket room:

| Channel | Direction | What |
|---|---|---|
| Slide sync | Presenter → audience | Current slide index broadcast to all clients |
| Local state | Client only | Each phone runs its own React interaction state |
| Tap aggregate | Audience → presenter | Taps collected server-side, shown as pulse rings on presenter screen |

Late joiners land on the current slide automatically — the PartyKit room stores state and sends it on connect.

---

## Routes

| URL | Who | What |
|---|---|---|
| `/` | Audience | Follows slide sync, interactive components enabled, tap button sends signal |
| `/present` | Presenter | Arrow keys advance slides, sees live tap wave from audience |

---

## Local development

Requires two terminals.

**Terminal 1 — PartyKit realtime server**
```bash
npm run dev:party
```
Runs on `http://localhost:1999`.

**Terminal 2 — Next.js**
```bash
npm run dev
```
Runs on `http://localhost:3000`.

Open `/present` in one window (keyboard navigation), open `/` in another (or on your phone via local network IP).

---

## Project structure

```
smallhands/
├── party/
│   └── index.ts              # PartyKit server — stores slide state, aggregates taps
├── partykit.json             # PartyKit project config
├── app/
│   ├── page.tsx              # Audience view (/)
│   └── present/
│       └── page.tsx          # Presenter view (/present)
├── hooks/
│   └── useRoom.ts            # Shared PartyKit WebSocket hook
├── components/
│   ├── TapWave.tsx           # Pulsing ring overlay for presenter (scales with tap rate)
│   └── slides/
│       ├── index.ts          # SLIDES registry — add slides here
│       ├── types.ts          # SlideProps: { interactive: boolean, onTap: () => void }
│       ├── Slide00Title.tsx  # 小さな手 title (3D .glb slot ready)
│       ├── Slide01WhatIs.tsx # Toggle demo
│       ├── Slide02TheReveal.tsx  # "You just sent me a signal"
│       ├── Slide03Spring.tsx # Linear vs spring easing demo
│       ├── Slide04Feedback.tsx   # Like button feedback loop
│       └── Slide05End.tsx    # Closing
└── .env.local                # NEXT_PUBLIC_PARTYKIT_HOST (local or deployed)
```

---

## Adding a slide

1. Create `components/slides/SlideNN.tsx`:

```tsx
"use client";
import { SlideProps } from "./types";

export default function SlideNN({ interactive, onTap }: SlideProps) {
  return (
    <div className="flex items-center justify-center w-full h-full text-white">
      {/* your content */}
      {interactive && <button onClick={onTap}>tap</button>}
    </div>
  );
}
```

2. Add to `components/slides/index.ts`:

```ts
import SlideNN from "./SlideNN";
export const SLIDES: SlideComponent[] = [
  // ... existing slides
  SlideNN,
];
```

Slide order = array order. Presenter arrow keys index into this array.

---

## 3D title slide (.glb)

`Slide00Title.tsx` has a placeholder. To wire in the Blender export:

```bash
# already installed, no extra step needed
```

Place the `.glb` file in `/public/smallhands.glb`, then replace the placeholder in `Slide00Title.tsx`:

```tsx
import { Canvas } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

function TitleModel() {
  const { scene } = useGLTF("/smallhands.glb");
  return <primitive object={scene} />;
}

// Inside JSX:
<Canvas>
  <Environment preset="night" />  {/* ambient light for MeshStandardMaterial */}
  <TitleModel />
  <EffectComposer>
    <Bloom intensity={1.5} luminanceThreshold={0.2} />
  </EffectComposer>
</Canvas>
```

**Blender export note:** Enable `Emissive Strength` on export so strength > 1 is not clamped.  
Bloom is applied in three.js via `UnrealBloomPass` (wrapped by `@react-three/postprocessing`) — it does not carry over from the `.glb`.  
Install postprocessing when ready: `npm install @react-three/postprocessing`.

---

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_PARTYKIT_HOST` | PartyKit server host. `localhost:1999` locally, deployed URL in production. |

Set in `.env.local` for local dev. Set in Vercel dashboard for production.

---

## Deployment

### 1. Deploy PartyKit (realtime server)

```bash
npx partykit login   # one-time, opens browser auth
npx partykit deploy
```

Note the deployed host — format: `smallhands.your-username.partykit.dev`.

### 2. Deploy Next.js to Vercel

Push to GitHub, import repo at vercel.com. Add environment variable:

```
NEXT_PUBLIC_PARTYKIT_HOST = smallhands.your-username.partykit.dev
```

Then deploy. No special Next.js config needed — WebSockets run on PartyKit, not Vercel serverless functions.

---

## Stack

- [Next.js](https://nextjs.org) — React framework
- [PartyKit](https://partykit.io) — Cloudflare-edge WebSocket rooms
- [Tailwind CSS v4](https://tailwindcss.com) — styling
- [three.js](https://threejs.org) + [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) — 3D title
- [@react-three/drei](https://github.com/pmndrs/drei) — three.js helpers
