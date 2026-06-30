import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "smallhands — styleguide",
  robots: { index: false, follow: false },
};

// Row helper: token tag + sample
function Row({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="font-body text-base uppercase tracking-wide text-black/35 w-16 shrink-0 text-right">
        {tag}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="font-body text-lg uppercase tracking-wide text-white/40">
        {title}
      </span>
      <div className="rounded-xl bg-[#ededed] p-10 flex flex-col gap-6">
        {children}
      </div>
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <main className="min-h-screen bg-[#111] text-black p-10 flex flex-col gap-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Headings — Press Start 2P */}
        <Panel title="Typescale — Titles (Press Start 2P)">
          <h1 className="font-title text-[2rem] leading-[1.5] tracking-tight">Heading one</h1>
          <h2 className="font-title text-2xl leading-[1.5]">Heading two</h2>
          <h3 className="font-title text-lg leading-[1.5]">Heading three</h3>
          <h4 className="font-title text-sm leading-[1.6]">Heading four</h4>
          <h5 className="font-title text-xs leading-[1.6]">Heading five</h5>
          <h6 className="font-title text-[0.625rem] leading-[1.6]">Heading sixth</h6>
        </Panel>

        {/* Body + labels — VT323 */}
        <Panel title="Typescale — Text & Labels (VT323)">
          <Row tag="XXL"><p className="font-body text-[1.75rem] leading-snug">This is a paragraph</p></Row>
          <Row tag="XL"><p className="font-body text-2xl leading-snug">This is a paragraph</p></Row>
          <Row tag="LG"><p className="font-body text-xl leading-snug">This is a paragraph</p></Row>
          <Row tag="MD"><p className="font-body text-lg leading-relaxed">This is a paragraph</p></Row>
          <Row tag="Label"><span className="font-title text-xs uppercase tracking-[0.1em]">This is a label</span></Row>
          <Row tag="Label"><span className="font-body text-lg uppercase tracking-[0.08em]">This is a label</span></Row>
          <Row tag="Button">
            <button className="font-body text-xl tracking-wide bg-black text-[#ededed] px-5 py-1.5 rounded">
              This is a button
            </button>
          </Row>
        </Panel>
      </div>

      {/* Pairing demo */}
      <Panel title="In context">
        <h2 className="font-title text-2xl leading-[1.5]">Insert Coin</h2>
        <p className="font-body text-xl leading-snug max-w-2xl">
          Press start to begin. The pixel title carries the brand; the terminal
          body keeps long text legible at speed. High score: 999999.
        </p>
        <div className="flex gap-3">
          <button className="font-title text-xs uppercase tracking-[0.1em] bg-black text-[#ededed] px-4 py-3 rounded">Start</button>
          <button className="font-title text-xs uppercase tracking-[0.1em] border-2 border-black px-4 py-3 rounded">Options</button>
        </div>
      </Panel>
    </main>
  );
}
