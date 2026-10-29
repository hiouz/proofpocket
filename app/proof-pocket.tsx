"use client";

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Ban,
  Braces,
  Check,
  ChevronRight,
  CircleDollarSign,
  Fingerprint,
  Gauge,
  History,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MemoryStick,
  Play,
  Radio,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Terminal,
  TriangleAlert,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  evaluatePayment,
  type Decision,
  type MemorySignal,
  type PaymentRequest,
  type PriorRequest,
  type SpendingPolicy,
} from "@/lib/policy";

type RuntimeStatus = {
  mode: "mainnet" | "evidence-demo";
  checkedAt: string;
  walrus: { configured: boolean; healthy: boolean; detail: string };
  tatum: { configured: boolean; healthy: boolean; detail: string };
  payments: { configured: boolean; healthy: boolean; detail: string };
};

type Receipt = {
  receiptId: string;
  memoryMode: "walrus-mainnet" | "session-demo";
  persisted: boolean;
  decision: Decision;
};

const scenarios: Array<PaymentRequest & { act: string; lesson: string }> = [
  {
    act: "ACT 01 / ENCOUNTER",
    lesson: "A new merchant cannot inherit trust it has not earned.",
    merchant: "atlas-research.network",
    resource: "mobility-signal-brief-001",
    category: "Research data",
    amountUsd: 0.4,
    requestId: "req_atlas_001",
    merchantRisk: "low",
  },
  {
    act: "ACT 02 / RECALL",
    lesson: "The prior outcome becomes a bounded approval signal.",
    merchant: "atlas-research.network",
    resource: "mobility-signal-brief-002",
    category: "Research data",
    amountUsd: 0.35,
    requestId: "req_atlas_002",
    merchantRisk: "low",
  },
  {
    act: "ACT 03 / RESIST",
    lesson: "Memory never overrides a hard replay constraint.",
    merchant: "atlas-research.network",
    resource: "mobility-signal-brief-002",
    category: "Research data",
    amountUsd: 0.35,
    requestId: "req_atlas_003_retry",
    merchantRisk: "low",
  },
];

const initialPolicy: SpendingPolicy = {
  perRequestCapUsd: 3,
  dailyCapUsd: 12,
  autoApproveMaxUsd: 0.75,
  duplicateWindowMinutes: 30,
  spentTodayUsd: 1.2,
};

function StatusDot({ healthy }: { healthy: boolean }) {
  return <span className={`status-dot ${healthy ? "status-dot-live" : "status-dot-idle"}`} />;
}

function VerdictMark({ verdict }: { verdict: Decision["verdict"] }) {
  if (verdict === "approve") return <Check aria-hidden="true" />;
  if (verdict === "block") return <X aria-hidden="true" />;
  return <TriangleAlert aria-hidden="true" />;
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function ProofPocket() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [policy, setPolicy] = useState(initialPolicy);
  const [memories, setMemories] = useState<MemorySignal[]>([]);
  const [priorRequests, setPriorRequests] = useState<PriorRequest[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [challenge, setChallenge] = useState<string>("");
  const [digest, setDigest] = useState("");
  const [verification, setVerification] = useState<Record<string, unknown> | null>(null);

  const scenario = scenarios[scenarioIndex];
  const localPreview = useMemo(
    () => evaluatePayment({ request: scenario, policy, memories, priorRequests }),
    [scenario, policy, memories, priorRequests],
  );

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then(async (response) => (await response.json()) as RuntimeStatus)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  function resetDemo() {
    setScenarioIndex(0);
    setPolicy(initialPolicy);
    setMemories([]);
    setPriorRequests([]);
    setReceipt(null);
    setNotice("Proof reset. Start with the unknown merchant encounter.");
    setChallenge("");
    setDigest("");
    setVerification(null);
  }

  async function evaluate() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payment: scenario, policy, memories, priorRequests }),
      });
      if (!response.ok) throw new Error("Decision service did not respond");
      const result = (await response.json()) as Receipt;
      setReceipt(result);
    } catch {
      setReceipt({
        receiptId: `local-${scenario.requestId}`,
        memoryMode: "session-demo",
        persisted: false,
        decision: localPreview,
      });
      setNotice("Local policy engine used. No network evidence claimed.");
    } finally {
      setBusy(false);
    }
  }

  async function teach(approved: boolean) {
    const memory: MemorySignal = {
      id: `memory-${Date.now()}`,
      text: approved
        ? `${scenario.merchant} delivered the requested ${scenario.category.toLowerCase()} resource successfully.`
        : `${scenario.merchant} produced an unwanted or incorrect payment outcome.`,
      kind: approved ? "outcome" : "warning",
      merchant: scenario.merchant,
      approved,
      createdAt: new Date().toISOString(),
      source: "session-demo",
    };

    if (status?.walrus.configured) {
      try {
        const response = await fetch("/api/memory", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(memory),
        });
        const result = (await response.json()) as { stored?: boolean };
        if (response.ok && result.stored) memory.source = "walrus-mainnet";
      } catch {
        // The visible source badge remains session-demo.
      }
    }

    setMemories((current) => [memory, ...current]);
    setPriorRequests((current) => [
      {
        requestId: scenario.requestId,
        merchant: scenario.merchant,
        resource: scenario.resource,
        amountUsd: scenario.amountUsd,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    if (approved) {
      setPolicy((current) => ({
        ...current,
        spentTodayUsd: current.spentTodayUsd + scenario.amountUsd,
      }));
    }
    setNotice(
      `${approved ? "Approval" : "Rejection"} recorded as ${memory.source === "walrus-mainnet" ? "Walrus Mainnet evidence" : "session demo memory"}.`,
    );
  }

  function moveTo(index: number) {
    setScenarioIndex(index);
    setReceipt(null);
    setNotice("");
  }

  async function probeMpp() {
    setChallenge("Probing paid endpoint…");
    try {
      const response = await fetch("/api/mpp/resource", { method: "POST" });
      const auth = response.headers.get("www-authenticate");
      const body = await response.text();
      setChallenge(
        [`HTTP ${response.status}`, auth ? `WWW-Authenticate: ${auth}` : "", body]
          .filter(Boolean)
          .join("\n\n"),
      );
    } catch {
      setChallenge("Endpoint probe failed.");
    }
  }

  async function verifyDigest() {
    setVerification(null);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ digest }),
      });
      setVerification((await response.json()) as Record<string, unknown>);
    } catch {
      setVerification({ verified: false, error: "Verification service is unavailable." });
    }
  }

  const decision = receipt?.decision;
  const actProgress = scenarioIndex + 1;

  return (
    <main className="app-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ProofPocket home">
          <span className="brand-mark"><Fingerprint /></span>
          <span>PROOF<span>POCKET</span></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#decision">Decision lab</a>
          <a href="#memory">Memory ledger</a>
          <a href="#settlement">Settlement proof</a>
        </nav>
        <div className="mode-pill">
          <StatusDot healthy={status?.mode === "mainnet"} />
          {!status ? "CHECKING RAILS" : status.mode === "mainnet" ? "MAINNET EVIDENCE" : "EVIDENCE DEMO"}
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span>CONSUMER FINANCE / AGENT PAYMENTS</span></p>
          <h1>Let agents pay.<br /><em>Make memory the limit.</em></h1>
          <p className="hero-lede">
            ProofPocket is the pre-signing control plane for machine payments. It remembers outcomes,
            enforces human-set budgets, blocks retries, and proves Sui settlement through Tatum.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#decision">
              <Play fill="currentColor" /> Run the three-act proof
            </a>
            <a className="text-action" href="/openapi.json" target="_blank" rel="noreferrer">
              Inspect payment API <ArrowRight />
            </a>
          </div>
        </div>
        <div className="hero-instrument" aria-label="ProofPocket operating model">
          <div className="instrument-orbit orbit-one" />
          <div className="instrument-orbit orbit-two" />
          <div className="instrument-core">
            <span className="core-label">DECISION<br />BOUNDARY</span>
            <strong>{localPreview.riskScore}</strong>
            <small>RISK / 100</small>
          </div>
          <div className="orbit-tag tag-a"><MemoryStick /> WALRUS RECALL</div>
          <div className="orbit-tag tag-b"><ShieldCheck /> POLICY</div>
          <div className="orbit-tag tag-c"><Radio /> SUI PROOF</div>
        </div>
      </section>

      <section className="truth-strip" aria-label="Product guarantees">
        <div><span>01</span><strong>Deterministic limits</strong><small>AI cannot override hard caps</small></div>
        <div><span>02</span><strong>Portable memory</strong><small>Outcomes survive the session</small></div>
        <div><span>03</span><strong>Settle, then serve</strong><small>MPP proof before the resource</small></div>
        <div><span>04</span><strong>No invented evidence</strong><small>Demo and Mainnet stay distinct</small></div>
      </section>

      <section className="decision-section" id="decision">
        <div className="section-heading">
          <div>
            <p className="eyebrow">INTERACTIVE PROOF</p>
            <h2>Watch the boundary learn.</h2>
          </div>
          <div className="section-heading-actions">
            <p>Three requests. One policy. A memory that changes the decision—but never the hard limits.</p>
            <button className="reset-proof" onClick={resetDemo}><RotateCcw /> Reset proof</button>
          </div>
        </div>

        <div className="act-switcher" role="tablist" aria-label="Demo acts">
          {scenarios.map((item, index) => (
            <button
              key={item.requestId}
              className={index === scenarioIndex ? "active" : ""}
              onClick={() => moveTo(index)}
              role="tab"
              aria-selected={index === scenarioIndex}
            >
              <span>0{index + 1}</span>
              <strong>{item.act.split(" / ")[1]}</strong>
              <small>{index === 0 ? "Unknown merchant" : index === 1 ? "Known outcome" : "Duplicate retry"}</small>
            </button>
          ))}
        </div>

        <div className="decision-grid">
          <article className="request-panel">
            <div className="panel-kicker"><Terminal /> INCOMING MPP REQUEST <span>{status?.payments.healthy ? "LIVE RAIL" : "DEMO INPUT"}</span></div>
            <div className="request-value">
              <span className="request-currency">$</span>
              <strong>{scenario.amountUsd.toFixed(2)}</strong>
              <small>{status?.payments.healthy ? "USDC / SUI MAINNET" : "USDC / SUI · SIMULATED REQUEST"}</small>
            </div>
            <dl className="request-fields">
              <div><dt>Merchant</dt><dd>{scenario.merchant}</dd></div>
              <div><dt>Resource</dt><dd>{scenario.resource}</dd></div>
              <div><dt>Category</dt><dd>{scenario.category}</dd></div>
              <div><dt>Request ID</dt><dd>{scenario.requestId}</dd></div>
            </dl>
            <div className="request-note">
              <Sparkles /> {scenario.lesson}
            </div>
            <button className="evaluate-button" onClick={evaluate} disabled={busy}>
              {busy ? <LoaderCircle className="spin" /> : <ScanSearch />}
              {busy ? "Evaluating evidence…" : "Evaluate before signing"}
            </button>
          </article>

          <article className={`verdict-panel ${decision ? `verdict-${decision.verdict}` : ""}`}>
            {!decision ? (
              <div className="empty-verdict">
                <div className="radar" aria-hidden="true"><span /><span /><span /></div>
                <p>Run the policy engine to produce a signed-off decision trace.</p>
              </div>
            ) : (
              <>
                <div className="verdict-head">
                  <div className="verdict-icon"><VerdictMark verdict={decision.verdict} /></div>
                  <div>
                    <p>DECISION / {receipt.memoryMode.replace("-", " ")}</p>
                    <h3>{decision.verdict}</h3>
                  </div>
                  <div className="risk-number"><strong>{decision.riskScore}</strong><span>risk</span></div>
                </div>
                <div className="check-list">
                  {decision.policyChecks.map((check) => (
                    <div key={check.label}>
                      <span className={check.pass ? "check-pass" : "check-fail"}>
                        {check.pass ? <Check /> : <X />}
                      </span>
                      <p><strong>{check.label}</strong><small>{check.detail}</small></p>
                    </div>
                  ))}
                </div>
                <div className="reason-box">
                  <p>WHY THIS DECISION</p>
                  {decision.reasons.map((reason) => <span key={reason}>{reason}</span>)}
                </div>
                <div className="receipt-passport">
                  <p>DECISION RECEIPT</p>
                  <dl>
                    <div><dt>Receipt</dt><dd>{receipt.receiptId}</dd></div>
                    <div><dt>Storage</dt><dd className={receipt.persisted ? "positive" : "neutral"}>{receipt.persisted ? "D1 STORED" : "SESSION ONLY"}</dd></div>
                    <div><dt>Confidence</dt><dd>{decision.confidence}%</dd></div>
                    <div><dt>Fingerprint</dt><dd>{decision.fingerprint}</dd></div>
                  </dl>
                </div>
                <div className="decision-actions">
                  {decision.verdict !== "block" && (
                    <button onClick={() => teach(true)}><BadgeCheck /> Approve outcome + teach</button>
                  )}
                  <button className="secondary" onClick={() => teach(false)}><Ban /> Record rejection</button>
                  {scenarioIndex < 2 && memories.length > 0 && (
                    <button className="next-act" onClick={() => moveTo(scenarioIndex + 1)}>
                      Next act <ChevronRight />
                    </button>
                  )}
                </div>
              </>
            )}
          </article>

          <aside className="policy-panel">
            <div className="panel-kicker"><Gauge /> HUMAN POLICY</div>
            <label>
              <span>Hard cap <b>{money(policy.perRequestCapUsd)}</b></span>
              <input type="range" min="1" max="10" step="0.5" value={policy.perRequestCapUsd}
                onChange={(event) => setPolicy({ ...policy, perRequestCapUsd: Number(event.target.value) })} />
            </label>
            <label>
              <span>Auto-approve below <b>{money(policy.autoApproveMaxUsd)}</b></span>
              <input type="range" min="0.1" max="2" step="0.05" value={policy.autoApproveMaxUsd}
                onChange={(event) => setPolicy({ ...policy, autoApproveMaxUsd: Number(event.target.value) })} />
            </label>
            <label>
              <span>Daily budget <b>{money(policy.dailyCapUsd)}</b></span>
              <input type="range" min="5" max="50" step="1" value={policy.dailyCapUsd}
                onChange={(event) => setPolicy({ ...policy, dailyCapUsd: Number(event.target.value) })} />
            </label>
            <div className="budget-meter">
              <span style={{ width: `${Math.min(100, (policy.spentTodayUsd / policy.dailyCapUsd) * 100)}%` }} />
            </div>
            <p>{money(policy.spentTodayUsd)} used today · {policy.duplicateWindowMinutes}m replay window</p>
            <div className="policy-lock"><LockKeyhole /> These rules outrank recalled memory.</div>
          </aside>
        </div>
        {notice && <output className="notice" aria-live="polite">{notice}</output>}
        <div className="progress-line"><span style={{ width: `${(actProgress / 3) * 100}%` }} /></div>
      </section>

      <section className="memory-section" id="memory">
        <div className="memory-intro">
          <p className="eyebrow">WALRUS MEMORY / PROOFPOCKET-V1</p>
          <h2>History that earns its influence.</h2>
          <p>
            A merchant is never “trusted” by label. ProofPocket recalls concrete outcomes, applies them as bounded signals,
            and displays where every memory came from.
          </p>
          <div className="memory-count"><strong>{memories.length.toString().padStart(2, "0")}</strong><span>decision memories<br />in this run</span></div>
        </div>
        <div className="ledger">
          <div className="ledger-head"><span>TIME</span><span>MEMORY</span><span>SOURCE</span><span>INFLUENCE</span></div>
          {memories.length === 0 ? (
            <div className="ledger-empty"><MemoryStick /><p>No outcome memory yet.<br /><span>Approve or reject Act 01 to create one.</span></p></div>
          ) : memories.map((memory) => (
            <div className="ledger-row" key={memory.id}>
              <time>{new Date(memory.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              <p><strong>{memory.merchant}</strong><span>{memory.text}</span></p>
              <span className={`source-chip ${memory.source === "walrus-mainnet" ? "source-live" : ""}`}>
                {memory.source === "walrus-mainnet" ? "WALRUS MAINNET" : "SESSION DEMO"}
              </span>
              <span className={memory.approved ? "positive" : "negative"}>{memory.approved ? "+11 risk".replace("+", "−") : "+28 risk"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="settlement-section" id="settlement">
        <div className="section-heading inverse">
          <div><p className="eyebrow">SETTLEMENT WITNESS</p><h2>Challenge. Settle. Verify.</h2></div>
          <p>The product never calls a payment “real” until Tatum can find the successful Sui transaction.</p>
        </div>
        <div className="settlement-grid">
          <article className="protocol-card">
            <div className="protocol-number">01</div>
            <Braces />
            <h3>Probe the MPP endpoint</h3>
            <p>Inspect the machine-readable HTTP response. Without live configuration, it fails closed with no settlement claim.</p>
            <button onClick={probeMpp}>Probe `/api/mpp/resource` <ArrowRight /></button>
            {challenge && <pre>{challenge}</pre>}
          </article>
          <article className="protocol-card verify-card">
            <div className="protocol-number">02</div>
            <Activity />
            <h3>Verify a Sui digest</h3>
            <p>Tatum Mainnet RPC checks the transaction effects and returns a checkpoint-backed witness.</p>
            <div className="digest-input">
              <input value={digest} onChange={(event) => setDigest(event.target.value)} placeholder="Paste Sui transaction digest" aria-label="Sui transaction digest" />
              <button onClick={verifyDigest} disabled={!digest}>Verify</button>
            </div>
            {verification && <pre>{JSON.stringify(verification, null, 2)}</pre>}
          </article>
          <article className="evidence-card">
            <p>LIVE RAIL STATUS</p>
            {[
              ["Walrus Memory", status?.walrus],
              ["Tatum Sui RPC", status?.tatum],
              ["MPP recipient", status?.payments],
            ].map(([label, value]) => {
              const rail = value as RuntimeStatus["walrus"] | undefined;
              return <div key={label as string}><StatusDot healthy={Boolean(rail?.healthy)} /><span><strong>{label as string}</strong><small>{rail?.detail ?? "Checking…"}</small></span></div>;
            })}
            <hr />
            <p className="evidence-note"><KeyRound /> Runtime secrets stay server-side. Wallet keys are never requested by this interface.</p>
          </article>
        </div>
      </section>

      <section className="architecture">
        <div className="section-heading">
          <div><p className="eyebrow">PROOF, NOT PROMISES</p><h2>Four layers. One auditable decision.</h2></div>
        </div>
        <div className="architecture-flow">
          <div><span>01</span><CircleDollarSign /><strong>MPP challenge</strong><small>Price and recipient arrive from the service.</small></div>
          <ArrowRight />
          <div><span>02</span><MemoryStick /><strong>Walrus recall</strong><small>Relevant outcomes return from a portable namespace.</small></div>
          <ArrowRight />
          <div><span>03</span><ShieldCheck /><strong>Policy boundary</strong><small>Caps, replay protection and warnings decide.</small></div>
          <ArrowRight />
          <div><span>04</span><WalletCards /><strong>Tatum witness</strong><small>Sui effects confirm the final settlement.</small></div>
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark"><Fingerprint /></span><span>PROOF<span>POCKET</span></span></div>
        <p>Memory-native payment control for agents.</p>
        <div><a href="/openapi.json">OpenAPI</a><a href="#top">Back to top</a></div>
      </footer>
    </main>
  );
}
