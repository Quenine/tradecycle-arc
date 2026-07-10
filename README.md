# TradeCycle

**USDC milestone finance for SMEs on Arc**

Track: **Best SME Trade Finance & Working Capital Workflow**

TradeCycle is a USDC-powered SME working-capital platform on Arc. It lets operators raise capital for real-world production and trade cycles, releases funds through verifier-approved milestones, tokenizes investor positions, and automatically distributes repayment. Each completed cycle contributes to an onchain Credit Passport for the SME operator.

## Core workflow

1. SME operator applies or creates a production/trade cycle.
2. Investors fund the cycle with USDC.
3. The cycle contract holds capital in escrow.
4. Operators submit milestone evidence.
5. Verifiers approve evidence before milestone releases.
6. Operators repay expected revenue.
7. Investors withdraw payout.
8. Operator history is reflected in the Credit Passport.

## Why Arc and USDC

Arc provides an EVM environment for programmable stablecoin commerce. TradeCycle uses Arc Testnet for cycle creation, USDC escrow, verifier approvals, milestone releases, repayment distribution, and investor withdrawals.

USDC is the unit of account and settlement asset for investor funding, operator collateral, verifier staking, milestone releases, repayment, protocol fees, reserve flows, and withdrawals.

## Key contracts

- `ProductionCycleFactoryV2`: operator approval and cycle creation.
- `ProductionCycle`: USDC funding, milestone escrow, release, repayment, withdrawal, and default paths.
- `CycleShareToken`: tokenized investor position for a cycle.
- `VerifierRegistry`: verifier staking, quorum, approvals, and rewards.
- `CollateralVault`: operator collateral support.
- `ReservePool`: investor-protection reserve support.
- `ProtocolTreasury`: protocol fee destination.
- `CycleTokenMarketplaceV2`: secondary market for cycle-share tokens.
- `YieldOracle`: optional revenue and risk estimate storage.

## Frontend routes

- `/`: landing page and cycle browser.
- `/demo`: guided product walkthrough.
- `/funding`: Circle and Arc funding-route map.
- `/submission`: submission readiness page.
- `/operator`: operator application and cycle creation.
- `/operator/dashboard`: operator evidence, release, settlement, and collateral actions.
- `/cycle/[address]`: cycle detail and investor funding page.
- `/verifier`: verifier staking and approval workflow.
- `/portfolio`: investor positions and withdrawals.
- `/market`: cycle-token secondary market.
- `/credit-passport`: connected-wallet Credit Passport entry point.
- `/credit-passport/[operator]`: operator-specific Credit Passport.
- `/stats`: protocol stats.
- `/faucet`: Arc Testnet USDC guidance.

## Circle / Arc products used

Implemented:

- Arc: smart-contract settlement layer.
- USDC: funding, escrow, milestone releases, repayment, fees, reserves, and withdrawals.

Architecture-ready or future paths, not implemented in this demo:

- Circle Gateway
- CCTP / Bridge Kit
- Circle Wallets
- USYC

Not claimed as implemented: Gateway, CCTP / Bridge Kit, Circle Wallets, USYC, StableFX, and Nanopayments.

## Repository structure

```text
contracts/      Solidity contracts
scripts/        Hardhat scripts
deployments/    Deployment address files
docs/           Submission and architecture docs
rwa-ui/         Next.js frontend
```

## Setup

Install root dependencies:

```shell
npm install
```

Compile contracts from the repo root:

```shell
npm run compile
```

Install frontend dependencies and run the app:

```shell
cd rwa-ui
npm install
npm run dev
```

Build and lint the frontend from `/rwa-ui`:

```shell
npm run lint
npm run build
```

On Windows, run the UI build from inside `/rwa-ui`; chained root npm scripts can trigger Next.js worker `spawn EPERM` errors.

## Environment variables

The frontend reads public Arc Testnet addresses from `rwa-ui/.env.local` or the hosting provider environment. Do not commit `.env`, `.env.local`, private keys, seed phrases, or API secrets.

Common frontend variables:

```shell
NEXT_PUBLIC_PROTOCOL_OWNER=
NEXT_PUBLIC_FACTORY_ADDRESS=
NEXT_PUBLIC_STABLECOIN_ADDRESS=
NEXT_PUBLIC_TREASURY_ADDRESS=
NEXT_PUBLIC_RESERVE_POOL_ADDRESS=
NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS=
NEXT_PUBLIC_COLLATERAL_VAULT_ADDRESS=
NEXT_PUBLIC_YIELD_ORACLE_ADDRESS=
NEXT_PUBLIC_TOKEN_MARKETPLACE_ADDRESS=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_CHAIN_NAME=Arc Testnet
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_BLOCK_EXPLORER=https://testnet.arcscan.app
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Circle Product Feedback](docs/CIRCLE_PRODUCT_FEEDBACK.md)
- [Submission checklist](docs/SUBMISSION.md)
- [Final submission answers](docs/FINAL_SUBMISSION_ANSWERS.md)
- [Deployment checklist](docs/DEPLOYMENT_CHECKLIST.md)
- [Video recording checklist](docs/VIDEO_RECORDING_CHECKLIST.md)
- [Security notes](docs/SECURITY_NOTES.md)

## Testnet disclaimer

TradeCycle is a testnet demonstration only. It is not a regulated lending platform, credit rating service, investment recommendation, or financial product.
