# TradeCycle Architecture

TradeCycle is a USDC milestone-finance protocol for SME production and trade cycles on Arc Testnet. It combines policy-gated operator onboarding, cycle-specific USDC escrow, verifier-controlled milestone releases, transferable investor positions, secondary-market trading, current-holder settlement, reserve-backed recovery paths, and an onchain SME Credit Passport.

The current release implements Arc and USDC directly. Circle Gateway, CCTP / Bridge Kit, Circle Wallets, and USYC are documented as future expansion paths and are not claimed as implemented.

## Architecture overview

![TradeCycle simplified architecture](assets/tradecycle-simplified-architecture.png)

### What the diagram shows

- **SME operators** apply, create cycles, submit milestone evidence, receive approved capital tranches, and repay.
- **Investors** fund cycles with USDC and receive cycle-share tokens.
- **Secondary buyers and sellers** trade cycle-share positions through an onchain USDC order book where counterparties exist.
- **Verifiers** stake USDC, review evidence, and approve milestones until quorum is reached.
- **Protocol administration** controls operator-entry policy, treasury operations, reserve compensation, transparent risk inputs, and separately gated advanced liquidity infrastructure.
- **Arc Testnet** provides smart-contract execution and settlement.
- **USDC** is the unit of account for funding, escrow, staking, releases, trading, fees, repayment, recovery, and redemption.
- **Credit Passport** derives operator history from readable onchain cycle activity.

## End-to-end protocol lifecycle

1. **Apply and approve**  
   An SME operator submits business information. Depending on the configured policy, entry can be manual, open, or collateral-gated. In manual mode, the protocol owner approves or rejects the application.

2. **Create a cycle**  
   An approved operator deploys a dedicated `ProductionCycle` through `ProductionCycleFactoryV2`. The cycle records its capital requirement, expected revenue, duration, collateral, reserve percentage, protocol fee, category, location, and description.

3. **Fund with USDC**  
   Investors approve and transfer USDC into the cycle contract. Capital remains under the cycle’s programmed rules rather than being transferred to the operator immediately.

4. **Receive cycle-share tokens**  
   Primary funding mints ERC-20 `CycleShareToken` positions to investors. The token amount represents the funded position in that specific cycle.

5. **Hold or trade the position**  
   A holder can retain the position until settlement or list part or all of it through `CycleTokenMarketplaceV2`. Marketplace listings escrow cycle tokens, support partial or full fills, and settle purchases in USDC.

6. **Verify and release milestones**  
   The operator submits milestone evidence. Staked verifiers review the evidence and approve the milestone. The operator can release the corresponding tranche only after the required quorum is reached.

7. **Repay and distribute**  
   After all required milestones and final evidence are complete, the operator repays the expected revenue in USDC. The cycle allocates verifier rewards, reserve contribution, protocol fees, and investor settlement according to its rules.

8. **Redeem by current ownership**  
   Settlement rights follow current cycle-token ownership. The wallet holding tokens after distribution burns them to redeem the corresponding payout. A seller cannot redeem shares that were transferred to another buyer.

9. **Update the Credit Passport**  
   The operator’s readable history—cycles created, funding, milestone progress, completed cycles, defaults, collateral, repayment, and verifier signals—contributes to the onchain Credit Passport UI.

## Contract responsibilities

| Component | Responsibility |
|---|---|
| `ProductionCycleFactoryV2` | Operator applications, approval policy, operator authorization, and cycle deployment |
| `ProductionCycle` | USDC funding escrow, milestone evidence, verifier-gated releases, repayment, distribution, withdrawal, default, and recovery |
| `CycleShareToken` | Transferable ERC-20 representation of an investor’s cycle position |
| `CycleTokenMarketplaceV2` | Escrowed sell orders, partial/full fills, cancellation, USDC settlement, and marketplace fees |
| `VerifierRegistry` | Verifier registration, minimum stake, milestone approvals, quorum, slashing-related controls, and verifier rewards |
| `CollateralVault` | Operator collateral custody, release, and recovery support |
| `ReservePool` | Protocol reserve accounting and compensation for distressed cycles |
| `ProtocolTreasury` | Destination for protocol and marketplace fee revenue |
| `YieldOracle` | Optional owner-controlled revenue, cost, and risk estimate inputs used by the UI |
| `LiquidityManager` | Separately gated advanced liquidity-routing and launch infrastructure |
| `LiquidityVault` | Separately gated capital inventory for optional protocol-owned liquidity |
| Credit Passport UI | Read-only aggregation of available operator and cycle signals into a demonstrative profile |

## Primary funding and tokenization

A primary investment follows this path:

```text
Investor USDC
    -> ProductionCycle escrow
    -> CycleShareToken minted to investor
```

The investor’s token balance is not merely a frontend record. It is the onchain position used for later transfer and redemption.

## Secondary marketplace and settlement rights

A marketplace trade follows this path:

```text
Seller approves cycle tokens
    -> Marketplace escrows listed tokens
Buyer pays USDC
    -> Seller receives USDC minus trading fee
    -> ProtocolTreasury receives the fee
    -> Buyer receives cycle tokens
```

The deployed marketplace supports:

- escrowed sell orders;
- partial fills;
- full fills;
- cancellation and return of unfilled tokens;
- a configurable trading fee;
- fee routing to `ProtocolTreasury`.

Liquidity depends on active listings and willing counterparties. TradeCycle does not guarantee an exit, fair value, net asset value, an AMM, or protocol market making.

### Lifecycle policy

The current frontend allows normal marketplace activity while a cycle is in Funding, Active, or Harvest Submitted state. After Distribution or Default:

- new buy and list actions are disabled in the UI;
- cancellation remains available;
- holders are directed to Portfolio for settlement or recovery.

This lifecycle restriction is a frontend safety policy. The deployed marketplace contract itself does not inspect the underlying cycle state.

## Milestone evidence and verifier quorum

Capital release is controlled by the cycle contract and verifier quorum:

```text
Operator submits evidence CID/hash
    -> Verifiers review evidence
    -> Required approvals are recorded
    -> Operator releases the programmed tranche
```

Evidence references are stored as CIDs and hashes where available. Critical state transitions and approvals remain verifiable onchain.

The protocol administrator does not replace verifier quorum and cannot use the Admin UI to bypass milestone state requirements.

## Repayment waterfall

After final verification, the operator repays the exact expected revenue into the cycle. The contract then:

1. preserves investor principal;
2. calculates cycle profit;
3. allocates the configured reserve share;
4. allocates the protocol fee;
5. allocates verifier rewards;
6. calculates profit per outstanding cycle token;
7. enables current holders to redeem.

## Default and recovery

If a cycle expires without successful completion, the contracts expose a default path. Available cycle balance, collateral recovery, and reserve compensation may contribute to token-holder recovery.

Reserve compensation is an exceptional risk-management action. It is not guaranteed yield and does not eliminate business or liquidity risk.

## Protocol administration and trust assumptions

TradeCycle’s owner-gated Admin dashboard is the protocol operations and risk-control layer.

Current administrative responsibilities include:

- reviewing operator applications;
- selecting operator-entry policy;
- monitoring deployed cycles;
- monitoring treasury, reserve, and marketplace metrics;
- withdrawing authorized treasury revenue;
- compensating eligible distressed cycles from the reserve;
- synchronizing reserve accounting;
- supplying optional YieldOracle estimates;
- monitoring marketplace configuration;
- configuring separately gated advanced liquidity infrastructure where supported.

Important boundaries:

- investor funding remains governed by `ProductionCycle`;
- milestone release still requires the correct cycle state, submitted evidence, and verifier quorum;
- Admin does not provide regulated underwriting or guarantee repayment;
- reserve capital, treasury revenue, liquidity capital, and cycle escrow are distinct balances;
- this testnet release does not claim decentralized governance;
- multisig, timelock, and community governance are future hardening paths.

## Core marketplace versus advanced liquidity infrastructure

TradeCycle has two distinct liquidity concepts:

### Implemented core path

`CycleTokenMarketplaceV2` is the implemented order-book marketplace. Investors create and fill cycle-token sell orders directly in USDC.

### Optional, separately gated path

`LiquidityManager` and `LiquidityVault` support optional protocol-owned liquidity, DEX routing, seed configuration, and launch operations. These controls are not required for order-book trading and do not guarantee that a liquid DEX market exists.

## External infrastructure

| Infrastructure | Use |
|---|---|
| Arc Testnet | Smart-contract execution and settlement |
| USDC | Funding, escrow, staking, releases, trading, fees, repayment, reserve flows, and redemption |
| ArcScan | Public verification of contracts and transactions |
| Wallet providers | User transaction signing through compatible browser wallets |
| Evidence storage | External CID/content storage with onchain hashes or references |

## Circle product status

### Implemented

- Arc
- USDC

### Architecture-ready or future

- Circle Gateway
- CCTP / Bridge Kit
- Circle Wallets
- USYC

### Not claimed as implemented

- StableFX
- Nanopayments

## Current Arc Testnet deployment

| Contract | Address |
|---|---|
| USDC | `0x3600000000000000000000000000000000000000` |
| `ProductionCycleFactoryV2` | `0xB60522F3A62a1a092019E615722788F1C4af6319` |
| `VerifierRegistry` | `0x22Fbd143994612b24B4FEC5f2282736d12CC74AF` |
| `CollateralVault` | `0xcF13420d6677aAF055E4D7B346F9c16747e41DA5` |
| `ReservePool` | `0xb0f77421a574ec2509632EAa6a87804a2Ed44476` |
| `ProtocolTreasury` | `0xAE901377C440be567BcbDB6C0C8e910a18Fd6803` |
| `YieldOracle` | `0xB47ad3B29b420fD32C77e39AFeAC55b045B5e441` |
| `CycleTokenMarketplaceV2` | `0x7063938d47A0bB7f9f1CC305c82450715266b1D5` |
| `LiquidityManager` | `0x2BDF6D2D3bcc1DA32D02c3771030AE176C3bAFF6` |
| `LiquidityVault` | `0xFC2CE1a6206d3e8Fd4F2C8bC3649f303AC2459B9` |

## Security boundaries and known limitations

- TradeCycle is a testnet demonstration.
- Liquidity depends on counterparties and is not guaranteed.
- Marketplace lifecycle restrictions are currently enforced by the frontend, not by the deployed marketplace contract.
- The Credit Passport score is demonstrative and is not a regulated credit rating.
- Admin permissions introduce explicit trust assumptions.
- Current protocol-owner and verifier wallets used during development must not be used with real funds.
- The protocol has not been represented as audited or production-ready for mainnet capital.
- Future production deployment should include independent security review, multisig ownership, timelocks, monitored indexing, and stronger governance controls.
