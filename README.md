# ProofPocket

ProofPocket is a memory-native payment guardian for autonomous agents. It evaluates a machine payment before signing, combines human-set budget constraints with portable Walrus outcome memory, exposes an MPP-paid resource on Sui, and uses Tatum Sui RPC as the independent settlement witness.

## Hackathon positioning

- Primary track: Consumer Finance Apps
- Special award target: Best Walrus Memory
- Special award target: Best Use of Agent Payments
- Optional award path: Best Tatum AI Builder App only if the final build genuinely qualifies

## The differentiator

Payment protocols answer whether a transfer is valid. ProofPocket answers whether the agent should make that purchase at all. Recalled memory is advisory; deterministic caps, replay protection, and recorded warnings remain authoritative.

The built-in three-act proof shows:

1. An unknown merchant requires review.
2. A successful outcome becomes a bounded approval signal.
3. A duplicate retry is blocked even when the merchant has positive history.

## Evidence modes

The UI always labels its evidence source:

- `EVIDENCE DEMO`: local scenario memory; no Mainnet claim.
- `WALRUS MAINNET`: a completed Walrus `rememberAndWait`/`recall` path.
- `TATUM MAINNET`: a transaction digest retrieved through Tatum Sui RPC.
- Live MPP: `@suimpp/mpp` issues and verifies the payment challenge before releasing the resource.

No demo state is described as a live payment or Mainnet write.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run check
npm run build
npm start
```

Required live values are documented in `.env.example`. Private keys and API keys must remain server-side.

## Routes

- `POST /api/decision` — deterministic policy evaluation with optional Walrus recall
- `GET|POST /api/memory` — recall/write through the Walrus Memory SDK
- `POST /api/mpp/resource` — MPP-protected USDC resource settled on Sui
- `POST /api/verify` — Tatum-backed Sui transaction verification
- `GET /api/status` — truthful runtime rail health
- `GET /openapi.json` — machine-readable paid endpoint

## Security boundaries

- The browser never receives the Tatum key or Walrus delegate private key.
- Payment amount validity, hard caps, daily limits, warnings, and duplicate checks are deterministic.
- The MPP library verifies digest, sender proof, settlement, and replay state before resource release.
- A production public deployment should replace the reference in-memory digest store with durable storage before accepting meaningful payment volume.
- Mainnet transactions spend assets with real value. Test with the minimum practical amount and a dedicated wallet.

## Verification

`npm test` covers the core decision invariants. `npm run check` also runs TypeScript without emitting files. The submission evidence checklist lives in `docs/SUBMISSION.md`.

