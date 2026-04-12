# MaveriX Oracle Terminal — Dashboard

Real-time DeFi dashboard for the MaveriX Oracle protocol. Displays live Chainlink price feeds, oracle health metrics, and a full lending UI — all in a dark terminal-style interface.

## Features

- Live ETH/USD, BTC/USD, LINK/USD prices from Chainlink (Mainnet + Sepolia)
- Oracle vs market price deviation tracking with health score
- Interactive price chart and deviation history
- Lending panel: deposit WETH, borrow MXT, repay, track health factor
- Price alert system and on-chain event log
- Chainlink round explorer
- Works without a wallet — falls back to a public RPC for read-only mode

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

No `.env` file is required. The dashboard auto-detects MetaMask and falls back to a public Sepolia RPC if no wallet is found.

To add a custom RPC, update `FALLBACK_RPCS` in `src/app/Constants/oracle.ts`.

## Tech Stack

- Next.js 15 (App Router)
- ethers.js v6
- Tailwind CSS v4
- Framer Motion
- Recharts
