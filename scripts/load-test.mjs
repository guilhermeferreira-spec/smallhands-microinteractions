// Load test: N fake audience members spamming interactions at the PartyKit
// room, plus one MONITOR connection measuring what a real device would
// receive. Prints JSON-lines progress and a final summary for debugging.
//
//   node scripts/load-test.mjs [--host smallhands.x.workers.dev] [--clients 50]
//                              [--duration 30] [--local]
//
// Key metric: aggPerSec seen by the monitor. Unthrottled server ≈ clients/sec
// (every batch echoes to everyone). Throttled server ≈ 1/sec.
// Integrity: server total delta must equal the sum of everything we sent.

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) =>
    a.startsWith("--") ? [a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "1" : all[i + 1]] : [],
  ).filter((p) => p.length),
);

const HOST = args.local ? "localhost:8787" : (args.host ?? "smallhands.guilherme-ferreira-13c.workers.dev");
const SCHEME = args.local ? "ws" : "wss";
const CLIENTS = Number(args.clients ?? 50);
const DURATION_S = Number(args.duration ?? 30);
const URL = `${SCHEME}://${HOST}/parties/small-hands-party/main`;

const log = (obj) => console.log(JSON.stringify(obj));

const state = {
  connected: 0,
  connectErrors: 0,
  batchesSent: 0,
  tapsSent: 0,
  hoversSent: 0,
  aggReceived: 0,
  aggTimestamps: [],
  initialTotal: null,
  lastTotal: null,
  lastHoverTotal: null,
};

function connect(onMessage) {
  return new Promise((resolve) => {
    const ws = new WebSocket(URL);
    ws.addEventListener("open", () => {
      state.connected++;
      resolve(ws);
    });
    ws.addEventListener("error", () => {
      state.connectErrors++;
      resolve(null);
    });
    if (onMessage) ws.addEventListener("message", onMessage);
  });
}

// ── Monitor: what a real audience phone would receive ────────────────────────
const monitor = await connect((ev) => {
  try {
    const m = JSON.parse(ev.data);
    if (m.type === "init" && state.initialTotal === null) {
      state.initialTotal = m.tapTotal + m.hoverTotal;
      log({ event: "init", total: state.initialTotal, slide: m.slide });
    }
    if (m.type === "tap_aggregate") {
      state.aggReceived++;
      state.aggTimestamps.push(Date.now());
      state.lastTotal = m.total;
      state.lastHoverTotal = m.hoverTotal;
    }
  } catch {}
});
if (!monitor) {
  log({ fatal: "monitor failed to connect", url: URL });
  process.exit(1);
}

// ── Spam fleet ────────────────────────────────────────────────────────────────
log({ event: "start", url: URL, clients: CLIENTS, durationS: DURATION_S });
const fleet = (await Promise.all(Array.from({ length: CLIENTS }, () => connect()))).filter(Boolean);
log({ event: "fleet-ready", connected: fleet.length, errors: state.connectErrors });

// each client flushes a batch every 1s (mirrors the real client's cadence)
const timers = fleet.map((ws) =>
  setInterval(() => {
    if (ws.readyState !== 1) return;
    const taps = 5 + Math.floor(Math.random() * 25);
    const hovers = Math.floor(Math.random() * 10);
    ws.send(JSON.stringify({ type: "tap_batch", taps, hovers }));
    state.batchesSent++;
    state.tapsSent += taps;
    state.hoversSent += hovers;
  }, 1000),
);

// progress every 5s: aggregate arrival rate over the window
const started = Date.now();
const progress = setInterval(() => {
  const cutoff = Date.now() - 5000;
  const inWindow = state.aggTimestamps.filter((t) => t >= cutoff).length;
  log({
    event: "progress",
    tS: Math.round((Date.now() - started) / 1000),
    fleet: fleet.filter((w) => w.readyState === 1).length,
    batchesSent: state.batchesSent,
    aggReceived: state.aggReceived,
    aggPerSecLast5: +(inWindow / 5).toFixed(2),
    serverTotal: state.lastTotal,
  });
}, 5000);

// ── Wrap up ───────────────────────────────────────────────────────────────────
setTimeout(() => {
  timers.forEach(clearInterval);
  clearInterval(progress);

  // let the last aggregates land
  setTimeout(() => {
    const ts = state.aggTimestamps;
    const gaps = ts.slice(1).map((t, i) => t - ts[i]);
    const totalDelta =
      state.lastTotal !== null && state.initialTotal !== null
        ? state.lastTotal + state.lastHoverTotal - state.initialTotal
        : null;
    const sent = state.tapsSent + state.hoversSent;
    const runS = (ts.length ? (ts[ts.length - 1] - ts[0]) : 1) / 1000 || 1;

    log({
      event: "summary",
      clients: fleet.length,
      connectErrors: state.connectErrors,
      batchesSent: state.batchesSent,
      interactionsSent: sent,
      aggregatesReceivedByMonitor: state.aggReceived,
      aggPerSecAvg: +(state.aggReceived / runS).toFixed(2),
      maxGapMs: gaps.length ? Math.max(...gaps) : null,
      serverTotalDelta: totalDelta,
      integrity: totalDelta === sent ? "OK — every interaction counted" : `MISMATCH — sent ${sent}, server registered ${totalDelta}`,
      verdictHint: "unthrottled ≈ clients aggregates/sec; throttled ≈ 1/sec",
    });

    fleet.forEach((w) => w.close());
    monitor.close();
    process.exit(0);
  }, 2500);
}, DURATION_S * 1000);
