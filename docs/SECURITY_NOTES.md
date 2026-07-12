# Security Notes

## Audit Status

Root package production audit:

- `npm audit --omit=dev` found 0 vulnerabilities.

UI package audit:

- `npm audit fix` was run inside `/rwa-ui` without `--force`.
- The lockfile received safe dependency resolution updates without changing direct dependency ranges in `package.json`.
- Remaining UI advisories are upstream dependency-chain issues around wallet/build packages.

## Remaining UI Advisories

`npm audit fix --force` was intentionally not run because it would force breaking upgrades or downgrades, including Wagmi/RainbowKit wallet-stack changes and unsafe Next.js resolution changes.

This is a testnet demo. A production release would include a planned wallet-stack dependency upgrade, audit review of upstream wallet packages, and wallet regression testing across the supported connectors.

## Transferable investor positions and secondary liquidity

Primary USDC funding mints ERC-20 `CycleShareToken` positions to investors. Tokens are transferable and may be listed in `CycleTokenMarketplaceV2`, whose order book escrows the seller's shares until they are filled or cancelled. Buyers can fill all or part of an active sell order. USDC moves directly from buyer to seller, less the configured trading fee sent to `ProtocolTreasury`; the purchased shares move from marketplace escrow to the buyer.

Settlement and recovery rights follow current token ownership. After a successful distribution, the current holder burns shares through `ProductionCycle.withdraw`; after default, the current holder uses `withdrawAfterDefault`. An original investor who sold shares cannot redeem those sold shares. Active listings and willing counterparties determine liquidity: TradeCycle does not promise an exit, fair value, NAV, an AMM, or protocol market making.

Lifecycle policy in the current frontend treats funding, active, and harvest-submitted shares as tradeable financing positions. After distribution or default, new buy/list actions are disabled in the UI, cancellation remains available, and holders are directed to Portfolio for settlement or recovery. The deployed marketplace contract itself does not inspect cycle state, so this lifecycle restriction is a frontend safety policy rather than onchain enforcement.

## Protocol administration and trust assumptions

TradeCycle's owner-gated Admin dashboard is the protocol operations and risk-control layer. Deployed permissions include operator-entry policy and reviews, treasury operations, reserve compensation, YieldOracle inputs, marketplace configuration, and separately gated advanced liquidity infrastructure. Investor funding and settlement remain enforced by cycle contracts, while verifier quorum controls milestone approval; the owner does not replace that quorum through the Admin UI. This testnet release does not claim decentralized governance. Multisig, timelock, and community governance are future hardening paths.