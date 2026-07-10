# TradeCycle

**USDC milestone finance for SMEs on Arc**

Track: **Best SME Trade Finance & Working Capital Workflow**

TradeCycle is a USDC-powered SME working-capital platform on Arc. It lets operators raise capital for real-world production and trade cycles, releases funds through verifier-approved milestones, tokenizes investor positions, and automatically distributes repayment. Each completed cycle contributes to an onchain credit passport for the SME operator.

## Problem

SMEs often need short-cycle working capital to fulfill orders, buy inventory, produce goods, or complete trade commitments. Traditional financing is slow, opaque, and hard to access for operators without an established credit file. Investors also lack a clean way to track real-world execution, milestone risk, and repayment behavior.

## Solution

TradeCycle turns a production or trade cycle into an onchain USDC workflow:

1. SME operator applies or creates a cycle.
2. Investor funds the cycle with USDC.
3. Operator submits milestone evidence.
4. Verifiers approve evidence.
5. Capital releases by milestone.
6. Operator repays expected revenue.
7. Investors withdraw payout.
8. Operator Credit Passport updates from onchain activity.

## Why Arc

Arc provides an EVM environment for programmable stablecoin commerce. TradeCycle uses Arc Testnet as the settlement layer for cycle creation, USDC escrow, verifier approvals, milestone releases, repayment distribution, and investor withdrawals.

## Why USDC

USDC is the unit of account and settlement asset for TradeCycle. It is used for investor funding, operator collateral, verifier staking, milestone capital releases, repayment, protocol fees, reserve flows, and investor withdrawals.

## Unique differentiator: SME Credit Passport

The Credit Passport summarizes an operator's onchain finance history from available deployment data: cycles created, states, capital requested, capital raised, completed cycles, defaulted cycles, milestone evidence progress, and repayment reliability. It is a testnet demonstration and not a regulated credit rating.

## Tech stack

- Solidity smart contracts deployed on Arc Testnet
- Hardhat for contracts and deployment scripts
- Next.js app router frontend in wa-ui/`
- Wagmi, Viem, RainbowKit, and ethers for wallet and contract interaction
- USDC on Arc Testnet

## Smart contracts overview

- `ProductionCycleFactoryV2`: operator approval/application flow and cycle creation.
- `ProductionCycle`: USDC funding, milestone escrow, evidence submission, tranche release, repayment, distribution, withdrawal, and default path.
- `CycleShareToken`: tokenized investor position for a cycle.
- `VerifierRegistry`: verifier staking, quorum, milestone approvals, and rewards.
- `CollateralVault`: operator collateral deposit, release, and recovery support.
- `ReservePool`: protocol reserve support.
- `ProtocolTreasury`: protocol fee destination.
- `TokenMarketplace`: secondary market for cycle-share tokens.
- `YieldOracle`: stores operator/oracle yield and risk estimates where configured.

## Frontend routes

- `/`: landing page and cycle browser.
- `/demo`: guided product walkthrough.
- `/funding`: Circle and Arc funding-route map.
- `/submission`: hackathon submission readiness page.
- `/operator`: operator application and cycle creation.
- `/operator/dashboard`: operator evidence, release, settlement, and collateral actions.
- `/cycle/[address]`: cycle detail and investor funding page.
- `/verifier`: verifier staking and approval workflow.
- `/portfolio`: investor positions and withdrawals.
- `/market`: cycle-token secondary market.
- `/credit-passport/[operator]`: SME Credit Passport.
- `/stats`: protocol stats.
- `/faucet`: Arc Testnet USDC guidance.

## Circle / Arc products used

Implemented:

- Arc: smart-contract settlement layer.
- USDC: funding, escrow, milestone releases, repayment, fees, reserves, and withdrawals.

Architecture-ready or future paths:

- Circle Gateway: unified USDC liquidity, treasury routing, reserve pool funding, operator payouts, and multi-party settlement movement.
- CCTP / Bridge Kit: cross-chain USDC funding and settlement extension.
- Circle Wallets: embedded wallet onboarding for non-crypto-native SMEs, investors, and verifiers.
- USYC: gated/enterprise concept for idle treasury, reserve, or inventory float. Not implemented in the current demo.

Not claimed as implemented: Gateway, CCTP / Bridge Kit, Circle Wallets, USYC, StableFX, and Nanopayments.

## Setup instructions

Install root dependencies:

```shell
npm install
```

Install frontend dependencies:

```shell
cd rwa-ui
npm install
```

Run the frontend locally:

```shell
cd rwa-ui
npm run dev
```

## Verification

Run these checks separately:

1. From repo root:

```shell
npm run compile
```

2. From `/rwa-ui`:

```shell
npm run lint
npm run build
```

On Windows, the UI build should be run from inside `/rwa-ui` rather than through a chained root npm script, because Next build workers can fail with `spawn EPERM` when launched through nested npm scripts.

## Environment variables

The frontend reads deployed Arc Testnet addresses from wa-ui/.env.local`:

```shell
NEXT_PUBLIC_PROTOCOL_OWNER=
NEXT_PUBLIC_FACTORY_ADDRESS=
NEXT_PUBLIC_STABLECOIN_ADDRESS=
NEXT_PUBLIC_TREASURY_ADDRESS=
NEXT_PUBLIC_RESERVE_POOL_ADDRESS=
NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS=
NEXT_PUBLIC_COLLATERAL_VAULT_ADDRESS=
NEXT_PUBLIC_YIELD_ORACLE_ADDRESS=
NEXT_PUBLIC_LIQUIDITY_VAULT_ADDRESS=
NEXT_PUBLIC_LIQUIDITY_MANAGER_ADDRESS=
NEXT_PUBLIC_TOKEN_MARKETPLACE_ADDRESS=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_CHAIN_NAME=Arc Testnet
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_BLOCK_EXPLORER=https://testnet.arcscan.app
```

Do not commit private keys. The current demo uses public frontend contract addresses only.

## Deployment notes

Deploy the Next.js app from wa-ui/` and provide the same `NEXT_PUBLIC_*` variables in the hosting environment. The smart contracts are not modified by frontend deployment.

## Testnet disclaimer

TradeCycle is a testnet demonstration only. It is not a regulated lending platform, credit rating service, investment recommendation, or lending decision.

## More documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Circle Product Feedback](docs/CIRCLE_PRODUCT_FEEDBACK.md)
- [Submission checklist](docs/SUBMISSION.md)
- [Final submission answers](docs/FINAL_SUBMISSION_ANSWERS.md)
- [Deployment checklist](docs/DEPLOYMENT_CHECKLIST.md)
- [Video recording checklist](docs/VIDEO_RECORDING_CHECKLIST.md)
- [Security notes](docs/SECURITY_NOTES.md)
