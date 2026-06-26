# smallhands — Interactive Presentation Build Spec

A synced, interactive web deck for a 30-min talk on microinteractions.
Audience: designers, interns → directors. Venue: TELUS Digital.

**Core idea:** Make it familiar, then do something unexpected.

---

## The concept (this IS the talk)

The architecture mirrors the thesis. Two channels:

- **Synced** — slide position. Broadcast from presenter to everyone. *Familiar.*
- **Local** — component interaction. Each client runs its own React state. *Unexpected — they realize they can touch it on their own phone.*

Shared frame, private play. Lead with synced slides, then reveal: "now tap it yourself."

Optional third channel (the "whoa"): **audience → presenter**. Everyone taps, presenter screen shows the aggregate (live poll / reaction wave / cursors). Same realtime pipe.

---

## How the sync works

"Everyone sees what I see" = broadcast **one number** (current slide index).
Press → publishes `{ slide: n }`. Every client receives it and re-renders. Tiny payload.

---

## Stack

- **Front-end:** Next.js + React, deployed to Vercel (normal).
- **Realtime layer:** rented, NOT self-hosted. (See gotcha below.)
- **Recommended:** PartyKit — Cloudflare edge, "rooms" model, lowest latency, best fit for one-room-broadcast. *(Cloudflare-owned now.)*
- **Alternatives:** Supabase Realtime (if you want presence / persistence / poll aggregation), Pusher or Ably (simplest pub/sub).

### ⚠️ The one real gotcha
**Next.js on Vercel cannot hold websockets.** Serverless functions die after each request. Don't run the realtime server yourself — the realtime room lives on PartyKit (or Supabase), the front-end lives on Vercel.

---

## Route shape

```
/present   → presenter view. keypress → room.broadcast({ slide: n })
/          → audience view. subscribes → setSlide(n). components are LOCAL React state.
```

### Robustness detail that bites live
**Late joiners.** The room must store the current slide index and send it on connect, so someone opening the link mid-talk lands on the right slide. Build this first.

---

## Open design decisions

1. **Components as content vs. medium**
   - *Content:* discrete demos — "here's a toggle, feel its spring."
   - *Medium:* the whole deck behaves as one big microinteraction.
   Different builds, both viable.

2. **Add the third channel?** Audience → presenter aggregate. Needs presence/broadcast (Supabase makes this easy). Highest-impact moment for a design audience expecting passive slides.

---

## Build order (when scaffolding)

1. Next.js app, two routes (`/present`, `/`).
2. PartyKit room: broadcast slide index + store current state for late joiners.
3. Wire presenter keypress → broadcast. Wire audience → subscribe → render.
4. Build slides as React components; keep all interaction state local on the client.
5. (Optional) Add audience→presenter aggregate channel.
6. Polish the one "unexpected" reveal moment.

---

## Asset note (from Blender)
3D title (小さな手 / "small hands") exports as **.glb** (glTF Binary). Material uses **Emission** → enable `Emissive Strength` on export so it isn't clamped. Emissive needs no lights in three.js, but `MeshStandardMaterial` renders base color black unless lit — add ambient/env light or swap to `MeshBasicMaterial` for flat glow. Real bloom = `UnrealBloomPass` post-processing in three.js, not carried in the .glb.
