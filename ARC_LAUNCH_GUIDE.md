# Arc Testnet Launch Guide

This project is configured for Arc Testnet using Arc's real USDC ERC-20 interface.

## 1. Prepare Wallet

1. Add Arc Testnet to your wallet.
   - Network: Arc Testnet
   - Chain ID: `5042002`
   - RPC: `https://rpc.testnet.arc.network`
   - Explorer: `https://testnet.arcscan.app`
   - Native currency: `USDC`
2. Fund the deployer wallet from the Circle faucet: `https://faucet.circle.com`
3. Keep the deployer private key local. Do not add it to Vercel.

## 2. Deploy Contracts

From the repository root:

```powershell
$env:PRIVATE_KEY="0xYOUR_DEPLOYER_PRIVATE_KEY"
$env:ARC_RPC="https://rpc.testnet.arc.network"
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network arcTestnet
```

The deploy script uses Arc's real USDC ERC-20 address by default:

```text
0x3600000000000000000000000000000000000000
```

Deployment output is saved to:

```text
deployments/arcTestnet.json
```

## 3. Configure Frontend Env Vars

Use the values from `deployments/arcTestnet.json`.

```text
NEXT_PUBLIC_PROTOCOL_OWNER=<deployer>
NEXT_PUBLIC_FACTORY_ADDRESS=<ProductionCycleFactoryV2>
NEXT_PUBLIC_STABLECOIN_ADDRESS=<stablecoin>
NEXT_PUBLIC_TREASURY_ADDRESS=<ProtocolTreasury>
NEXT_PUBLIC_RESERVE_POOL_ADDRESS=<ReservePool>
NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS=<VerifierRegistry>
NEXT_PUBLIC_COLLATERAL_VAULT_ADDRESS=<CollateralVault>
NEXT_PUBLIC_YIELD_ORACLE_ADDRESS=<YieldOracle>
NEXT_PUBLIC_LIQUIDITY_VAULT_ADDRESS=<LiquidityVault>
NEXT_PUBLIC_LIQUIDITY_MANAGER_ADDRESS=<LiquidityManager>
NEXT_PUBLIC_TOKEN_MARKETPLACE_ADDRESS=<CycleTokenMarketplaceV2>
```

## 4. Run Locally

From `rwa-ui`:

```powershell
npm install
npm run dev
```

Open the local URL, connect your funded Arc wallet, and check:

1. `/faucet` shows your Arc USDC balance and links to Circle faucet.
2. `/operator` lets you apply as operator.
3. `/admin` with the deployer wallet can approve operators if approval mode is not open.
4. `/operator` can launch a cycle using USDC amounts with 6 decimals.
5. `/` and `/cycle/<address>` show the created cycle.
6. Another wallet can invest after approving USDC.
7. `/verifier` lets a funded wallet stake and approve milestones.

## 5. Deploy Free on Vercel

In Vercel:

1. Import the GitHub repository.
2. Set **Root Directory** to `rwa-ui`.
3. Framework preset: Next.js.
4. Build command: `npm run build`.
5. Install command: `npm install`.
6. Add every `NEXT_PUBLIC_*` variable from step 3 to Production, Preview, and Development.
7. Deploy.

The frontend build script already runs:

```text
next build --webpack
```

This is required for the current Next 16 config.

## 6. Post-Deploy Smoke Test

After Vercel finishes:

1. Open the Vercel URL.
2. Connect the deployer wallet on Arc Testnet.
3. Visit `/stats` and confirm deployed contract links open on ArcScan.
4. Visit `/operator`, create a small test cycle, and confirm it appears on `/`.
5. Fund a second wallet with faucet USDC, invest a small amount, and confirm the share token appears in the cycle page and portfolio.

## Notes

- Arc's native gas accounting uses 18 decimals, but the Arc USDC ERC-20 interface uses 6 decimals. The app uses the ERC-20 interface for balances, approvals, transfers, and protocol accounting.
- Mainnet Arc contract addresses are not public yet. This guide is for Arc Testnet. When Arc mainnet is available, update the network metadata and official USDC address before deploying production capital.
