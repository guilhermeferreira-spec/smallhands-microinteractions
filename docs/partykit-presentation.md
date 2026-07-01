# How the live presentation control works

A short, plain explanation of the setup that lets the presenter drive the deck
and lets the room interact in real time.

## What it does

- The presenter's device controls the deck. When they move to the next slide,
  every connected screen moves with them, at the same time.
- The audience can interact (tap, swipe, hover, rate). Those interactions are
  counted live and the running total is shown to everyone.
- No one has to refresh or press anything to stay in sync.

## The three pieces

1. **The slides (the website).**
   Built in Next.js, hosted on Vercel. There are two web addresses:
   one for the presenter, one for the audience. Same deck, different role.

2. **The live server.**
   A small always-on service called PartyKit, running on Cloudflare. It does
   one job: hold the current state of the presentation — which slide is showing,
   which word is highlighted, and the interaction totals — and pass messages
   between everyone instantly.

3. **The connection.**
   Every open screen keeps a live, two-way link to that server (called a
   websocket — a connection that stays open so messages travel both directions
   the moment they happen, without reloading the page).

## How it flows

- **Presenter changes a slide** → their screen sends a message to the server →
  the server saves the new slide and forwards it to every connected screen →
  all screens update together.
- **Audience interacts** → their screen sends a message to the server → the
  server adds it to the running total → the server sends the updated total back
  to everyone.
- **Someone joins late** → the server immediately sends them the current slide
  and the current totals, so they arrive already in sync.
- **Someone loses wifi** → their screen reconnects on its own and catches back up.

## Why it's built this way

- The true state lives in one place (the server), so no two screens can
  disagree about what slide is up or what the totals are.
- It's real-time: changes appear instantly, no refresh.
- It's built to handle a full room connected at once.

## Access and security

- Two separate URLs: one presenter, one audience.
- Both are password-protected, so the deck stays private until we share the link
  and password with the room.

## Where each part lives (for the record)

- **Slides / front-end:** Vercel. Updates automatically when we push changes.
- **Live server:** Cloudflare, deployed separately with a command-line tool
  (wrangler). Both halves are updated together when the messaging changes.
