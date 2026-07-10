# Vercel Deployment Guide

This app is a Next.js frontend for the Arc Testnet contracts. Deploy the updated contracts first, then point Vercel at the fresh addresses.

## 1. Verify Locally

From the project root:

```bash
npx hardhat compile
npx hardhat test
```

From `rwa-ui`:

```bash
npm run build -- --webpack
npm run dev -- --webpack
```

Open `http://127.0.0.1:3000` and retest the full flow:

1. Admin configures operator approval, verifier quorum, DEX/liquidity settings, and reserve/treasury addresses.
2. Operator applies, gets approved, deposits collateral, and creates a cycle.
3. Investors fund the cycle and receive cycle tokens.
4. Investors can sell and buy cycle tokens in the in-app marketplace.
5. Operator submits evidence for each milestone.
6. Verifiers view evidence and approve milestones.
7. Operator releases milestone capital.
8. Operator submits harvest evidence.
9. Verifiers approve harvest.
10. Operator pays the exact expected revenue shown by the UI.
11. Investors withdraw principal plus profit.
12. Verifiers claim rewards.
13. Admin confirms treasury fees and reserve balance, then withdraws treasury fees or sends reserve compensation if needed.

## 2. Deploy Fresh Contracts

Use the Arc Testnet deploy script for the current contract set:

```bash
npx hardhat run scripts/deployArcTestnet.ts --network arcTestnet
```

After deployment:

1. Copy the new addresses into `deployments/arcTestnet.json`.
2. Copy the same public addresses into `rwa-ui/.env.local`.
3. If the deploy script prints required owner/admin setup transactions, run them before testing.
4. If DEX auto-liquidity is enabled, configure the liquidity manager from the admin page or run the DEX config script.

## 3. Vercel Environment Variables

In Vercel, add these as Project Environment Variables for Production:

```bash
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_CHAIN_NAME=Arc Testnet
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_BLOCK_EXPLORER=https://testnet.arcscan.app
NEXT_PUBLIC_STABLECOIN_ADDRESS=<fresh USDC address>
NEXT_PUBLIC_FACTORY_ADDRESS=<fresh ProductionCycleFactoryV2 address>
NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS=<fresh VerifierRegistry address>
NEXT_PUBLIC_COLLATERAL_VAULT_ADDRESS=<fresh CollateralVault address>
NEXT_PUBLIC_RESERVE_POOL_ADDRESS=<fresh ReservePool address>
NEXT_PUBLIC_TREASURY_ADDRESS=<fresh ProtocolTreasury address>
NEXT_PUBLIC_YIELD_ORACLE_ADDRESS=<fresh YieldOracle address>
NEXT_PUBLIC_MARKETPLACE_ADDRESS=<fresh CycleTokenMarketplaceV2 address>
NEXT_PUBLIC_LIQUIDITY_VAULT_ADDRESS=<fresh LiquidityVault address>
NEXT_PUBLIC_LIQUIDITY_MANAGER_ADDRESS=<fresh LiquidityManager address>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<walletconnect project id>
NEXT_PUBLIC_LIQUIDITY_MANAGER_HAS_RETRY=true
```

Do not add private keys to Vercel. The frontend only needs public contract addresses and public RPC configuration.

## 4. Deploy to Vercel

From `rwa-ui`:

```bash
npx vercel login
npx vercel
npx vercel --prod
```

Use these project settings:

- Framework preset: `Next.js`
- Root directory: `rwa-ui`
- Build command: `npm run build -- --webpack`
- Output directory: leave default

## 5. Production Smoke Test

After Vercel deploys:

1. Connect MetaMask, Rabby, Rainbow, Trust, Coinbase Wallet, or another EVM wallet through RainbowKit.
2. Confirm the wallet is on Arc Testnet or accepts the network switch prompt.
3. Create a small test cycle.
4. Fund it with two investor wallets.
5. List a small cycle-token sell order and buy it from a second wallet.
6. Complete all evidence, verifier approval, release, harvest, exact repayment, investor withdrawal, verifier reward claim, and admin fee withdrawal steps.

The production build can show a non-fatal MetaMask SDK optional dependency warning during `next build`. The build is valid if it reaches the route summary successfully.
