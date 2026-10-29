import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How ProofPocket Learns Without Losing Control",
  description:
    "The architecture and evidence model behind ProofPocket's memory-native payment guardian.",
};

const layers = [
  ["01", "MPP challenge", "The service presents a price, asset and Sui recipient before protected data can be released."],
  ["02", "Walrus recall", "Outcome memories return portable merchant evidence from the proofpocket-v1 namespace."],
  ["03", "Policy boundary", "Hard caps, daily limits, warnings and replay protection decide whether signing is allowed."],
  ["04", "Tatum witness", "A Sui transaction is only accepted after Tatum returns successful checkpoint-backed effects."],
];

export default function StoryPage() {
  return (
    <main className="story-shell">
      <header className="story-nav">
        <a href="/" className="story-brand">PROOF<span>POCKET</span></a>
        <a href="/">Open interactive demo →</a>
      </header>

      <article className="story-article">
        <p className="eyebrow">TOTAL RECALL / BUILD STORY</p>
        <h1>How an agent can remember a merchant—and still be told no.</h1>
        <p className="story-deck">
          ProofPocket is a pre-signing control plane for autonomous payments. Walrus Memory supplies
          historical context; deterministic policy decides what the agent is actually allowed to do;
          MPP and Tatum provide the settlement boundary and witness.
        </p>

        <section className="story-section">
          <p className="story-index">01 / THE PROBLEM</p>
          <h2>Payment validity is not purchase permission.</h2>
          <p>
            An agent may be able to form a valid transaction and still make the wrong purchase. It can
            retry a completed payment, exceed a human budget, trust a merchant too early or repeat an
            outcome the user previously rejected. Payment protocols settle value; ProofPocket governs
            whether the agent should initiate that settlement at all.
          </p>
        </section>

        <section className="story-section">
          <p className="story-index">02 / THE LEARNING LOOP</p>
          <h2>Memory earns influence one outcome at a time.</h2>
          <p>
            The first request from an unknown merchant requires review. A successful delivery becomes a
            bounded positive signal stored as an outcome memory. On the next request, that signal can
            enable a small auto-approval—but only below the configured autonomy limit. A warning memory
            raises risk instead. Every memory remains visible with its source.
          </p>
          <blockquote>
            Recalled preference is advisory. Caps, warnings and replay protection are authoritative.
          </blockquote>
        </section>

        <section className="story-section">
          <p className="story-index">03 / THE STACK</p>
          <h2>Four layers produce one auditable receipt.</h2>
          <div className="story-layers">
            {layers.map(([index, title, copy]) => (
              <div key={index}>
                <span>{index}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="story-section">
          <p className="story-index">04 / THE THREE-ACT PROOF</p>
          <h2>The demo is designed as a falsifiable sequence.</h2>
          <ol className="story-sequence">
            <li><strong>Encounter.</strong> The unknown merchant receives a review verdict.</li>
            <li><strong>Recall.</strong> A recorded successful outcome enables bounded approval.</li>
            <li><strong>Resist.</strong> Replaying the same resource is blocked despite positive history.</li>
          </ol>
          <p>
            The last act matters most: it demonstrates that memory improves judgment without becoming an
            override channel. The same positive history that helps Act 02 cannot bypass the replay rule in Act 03.
          </p>
        </section>

        <section className="story-section story-evidence">
          <p className="story-index">05 / EVIDENCE STATUS</p>
          <h2>What is proven now—and what still requires credentials.</h2>
          <div className="story-evidence-grid">
            <div><span>VERIFIED</span><strong>Public production demo</strong><p>Interactive app and APIs are deployed.</p></div>
            <div><span>VERIFIED</span><strong>Deterministic safety tests</strong><p>Review, approval, replay and hard-cap invariants pass.</p></div>
            <div><span>VERIFIED</span><strong>D1 decision receipts</strong><p>Production decisions return durable receipt IDs.</p></div>
            <div className="pending"><span>PENDING</span><strong>Mainnet sponsor evidence</strong><p>Walrus, Tatum and MPP remain visibly unconfigured until owner credentials and transactions are supplied.</p></div>
          </div>
        </section>

        <footer className="story-footer">
          <div><strong>ProofPocket</strong><span>Memory-native payment control for agents.</span></div>
          <div><a href="/">Interactive demo</a><a href="https://github.com/hiouz/proofpocket">Source code</a></div>
        </footer>
      </article>
    </main>
  );
}
