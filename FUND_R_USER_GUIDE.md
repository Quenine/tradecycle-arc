# FundR User Guide

## Real-World Production Funding, Brought On-Chain

FundR is a decentralized real-world asset protocol that connects investors with real production cycles such as agriculture, trade finance, commodities, manufacturing, and other productive businesses.

The platform is designed to solve a simple but important problem: many real businesses need short-term working capital to produce, buy, harvest, ship, or complete revenue-generating activities, while many investors want transparent access to real-world yield but do not have a safe, verifiable, and liquid way to participate.

FundR brings this process on-chain. Operators raise capital through production cycles, investors receive tokenized positions, verifiers check real-world evidence before funds are released, and settlement is distributed through smart contracts.

## Why FundR Is Built on Arc

FundR is deployed on Arc because the protocol is built around real-world capital movement, stablecoin payments, and transparent settlement. Arc is an EVM-compatible network designed for stablecoin-based finance, which makes it a strong fit for a protocol where users fund cycles, repay capital, distribute yield, pay fees, and manage reserves in USDC.

For FundR, the chain matters because the protocol is not only moving tokens for speculation. It is coordinating real economic activity. Investors, operators, verifiers, and admins all need a network that supports fast transactions, familiar wallets, stablecoin accounting, and transparent on-chain records.

Arc gives FundR a more natural environment for this type of application.

## Benefits of Using Arc for FundR

### USDC-Centered User Experience

FundR uses USDC across the protocol. Investors fund cycles in USDC, operators repay in USDC, marketplace buyers pay in USDC, verifiers stake USDC, treasury fees accrue in USDC, and reserve-pool compensation is handled in USDC.

This keeps the experience easier to understand. Users do not need to mentally convert between volatile gas assets, investment assets, and settlement assets. The protocol’s accounting is expressed in the same unit users already expect: dollars.

### EVM Wallet Compatibility

Arc is EVM-compatible, so users can connect with familiar wallets such as MetaMask, Rabby, Rainbow, Coinbase Wallet, Trust Wallet, and other EVM wallets supported through RainbowKit.

This reduces onboarding friction. Users do not need a new wallet type or unfamiliar signing flow. They can connect, switch to Arc, and interact with the protocol using a familiar DeFi experience.

### Faster and More Transparent Settlement

Production cycles depend on timely actions:

- Investors funding cycles.
- Operators submitting evidence.
- Verifiers approving milestones.
- Operators releasing capital.
- Operators repaying at settlement.
- Investors withdrawing proceeds.
- Admin sending reserve compensation when needed.

Using an on-chain network lets these actions settle transparently and creates a public record for every important protocol event.

### Better Fit for Real-World Asset Finance

Real-world asset protocols need stable, auditable fund flows. Arc’s stablecoin-oriented environment matches FundR’s design better than a chain where the main user experience revolves around a volatile native token.

FundR’s goal is to make real-world production finance more accessible and reliable. A stablecoin-focused chain supports that goal by making payments, balances, fees, and yield easier for normal users to reason about.

### Lower Friction for Global Participation

Because FundR uses USDC and EVM wallets, users from different regions can participate with a consistent on-chain experience.

Operators can raise capital from a wider investor base. Investors can access real-world production opportunities without needing local banking relationships with each operator. Verifiers can participate remotely by reviewing evidence and approving milestones on-chain.

### Stronger On-Chain Accountability

Every major action on FundR is visible on-chain:

- Cycle creation.
- Investor funding.
- Token minting.
- Evidence submission.
- Verifier approvals.
- Milestone releases.
- Marketplace trades.
- Final distribution.
- Verifier reward claims.
- Treasury fee withdrawals.
- Reserve compensation.

Arc provides the execution layer for these records, giving the protocol a transparent audit trail that users can inspect through the block explorer.

## The Problem FundR Solves

Traditional real-world financing is slow, opaque, and difficult to access.

Businesses often face:

- Limited access to working capital.
- High borrowing costs.
- Slow approval processes.
- Difficulty proving progress to global investors.
- Dependence on local lenders or middlemen.

Investors often face:

- Limited access to real-world yield opportunities.
- Little transparency on how funds are used.
- No easy way to exit before a deal matures.
- Trust-heavy reporting and manual settlement.
- Difficulty confirming whether business milestones actually happened.

FundR improves this by using smart contracts, verifier-reviewed evidence, tokenized cycle positions, and transparent on-chain accounting.

## What Can Be Achieved With FundR

FundR allows real businesses to raise capital for specific production cycles while giving investors a transparent way to participate in real-world revenue opportunities.

With the platform, users can:

- Fund real production activities using USDC.
- Tokenize investor positions as cycle tokens.
- Trade cycle tokens before settlement through the in-app marketplace.
- Release operator capital in milestones instead of all at once.
- Require independent verifier approvals before each release.
- Distribute profits automatically when a cycle is completed.
- Reward verifiers who actually helped verify a cycle.
- Accumulate protocol fees and reserve funds transparently.
- Use reserve-pool compensation for distressed cycles when needed.

The result is a more open, auditable, and efficient funding system for real-world economic activity.

## Main Participants

FundR has four main participant groups.

### Investors

Investors provide USDC to production cycles.

When an investor funds a cycle, they receive cycle tokens. These tokens represent their position in that cycle. If the cycle completes successfully, whoever holds the cycle tokens at settlement can withdraw their proportional share of principal plus profit.

Investors can also sell their cycle tokens in the marketplace before the cycle ends, giving them a possible early exit path.

### Operators

Operators are real businesses or project owners that need capital for a production cycle.

An operator applies on the platform, gets approved, creates a production cycle, deposits collateral, submits evidence at each milestone, receives capital releases after verifier approval, and finally repays the exact settlement amount required by the cycle.

### Verifiers

Verifiers stake USDC to participate in verification.

Their role is to review evidence submitted by operators and approve milestones only when they are satisfied that the required real-world progress has happened. Verifiers earn rewards from completed cycles they actually verified.

### Admin

Admin manages protocol operations.

Admin can review operator applications, configure protocol settings, monitor treasury and marketplace fees, manage reserve-pool compensation, and support liquidity operations where enabled.

## How a Production Cycle Works

### 1. Operator Applies

The operator connects a wallet and applies from the Operator page.

They provide basic business information such as:

- Business name.
- Business type.
- Location.
- Business description.

Depending on platform settings, the operator may be approved instantly or reviewed by admin.

### 2. Operator Creates a Cycle

Once approved, the operator creates a production cycle.

They enter:

- Cycle name.
- Token symbol.
- Category.
- Location.
- Description.
- Capital required.
- Expected revenue.
- Duration.
- Optional launch liquidity.

The protocol automatically applies the standard fee rules. Operators cannot edit protocol fee or reserve fee values. This keeps economics consistent across the platform.

### 3. Operator Deposits Collateral

The operator deposits collateral before launching the cycle.

Collateral helps protect investors. If the operator defaults, collateral can be redirected toward investor recovery.

### 4. Investors Fund the Cycle

Investors browse live cycles, review the details, connect a wallet, approve USDC, and invest.

When they invest:

- USDC enters the cycle contract.
- The investor receives cycle tokens.
- The cycle token balance appears in their portfolio.
- The token represents their share of that cycle.

When the funding target is reached, the cycle becomes active.

### 5. Operator Submits Evidence

The operator does not receive all capital at once.

Capital is released in milestones:

- Production start: 40%.
- Mid-cycle checkpoint: 30%.
- Harvest or completion: 20%.
- Final settlement: 10%.

For each milestone, the operator uploads evidence. Evidence can include public file links, IPFS links, images, videos, documents, invoices, delivery records, or other proof relevant to the cycle.

### 6. Verifiers Review and Approve

Verifiers review the submitted evidence.

If enough verifiers approve, quorum is reached. The operator can then release that milestone’s capital.

This creates a stronger accountability model than simply giving all funds to the operator upfront.

### 7. Final Harvest Is Verified

After all capital milestones are released, the operator submits final harvest or completion evidence.

Verifiers review it and approve the harvest step. Once approved, the cycle enters settlement.

### 8. Operator Repays the Exact Settlement Amount

The operator repays the exact expected revenue amount stored for the cycle.

This amount is fixed by the cycle. The operator cannot underpay or overpay through the repayment function.

Once repayment succeeds, the smart contract distributes funds according to protocol rules:

- Principal and net profit go to cycle-token holders.
- Protocol fee goes to treasury.
- Reserve fee goes to reserve pool.
- Verifier rewards go to eligible verifiers.

### 9. Investors Withdraw

After distribution, investors withdraw from their Portfolio.

The protocol burns the investor’s cycle tokens and sends the correct USDC payout to the wallet holding those tokens.

This means the right to withdraw follows the token holder. If a token was sold before settlement, the buyer receives the payout.

### 10. Verifiers Claim Rewards

Verifiers who participated in verifying the cycle can claim rewards.

Rewards are not paid to every staked verifier by default. They are paid to verifiers who actually approved evidence for that cycle.

## Cycle Tokens and Trading

Every funded position is represented by cycle tokens.

Cycle tokens are useful because they make investor positions transferable. An investor who does not want to wait until final settlement can list tokens for sale in the marketplace.

Buyers can purchase listed cycle tokens. If they hold those tokens when the cycle is distributed, they can withdraw the corresponding share of principal and profit.

This creates a secondary market for real-world production exposure.

Important points:

- Selling tokens transfers future settlement rights to the buyer.
- Listed tokens are escrowed until bought or cancelled.
- Sellers can cancel active orders if they want their tokens back.
- Marketplace fees are collected by the protocol treasury.

## What Happens If a Cycle Is Distressed

If a cycle fails to complete on time, it can enter default.

In a default:

- Remaining funds in the cycle become part of recovery.
- Operator collateral can be slashed into the cycle.
- Investors can withdraw their proportional recovery from Portfolio.
- Admin can send reserve-pool compensation to increase the recovery pool.

Reserve compensation does not automatically send funds directly to every wallet. Instead, the reserve pool sends USDC to the distressed cycle. The cycle updates the recovery amount per token, and token holders withdraw their proportional share.

This is safer and more scalable than trying to push funds to many wallets one by one.

## Why FundR Matters

FundR matters because productive businesses need capital, and global investors need better access to transparent real-world opportunities.

The protocol helps bridge that gap by combining:

- Real-world business activity.
- On-chain escrow.
- Tokenized investor positions.
- Evidence-based milestone releases.
- Independent verifier accountability.
- Transferable cycle tokens.
- Automated settlement.
- Transparent treasury and reserve accounting.

This creates a funding model that can be faster, more open, and more auditable than traditional private financing.

For operators, FundR can provide access to a wider capital base.

For investors, FundR can provide access to tokenized real-world yield opportunities with clearer fund-flow visibility.

For verifiers, FundR creates a role for independent accountability and evidence review.

For the protocol, FundR builds a transparent economic system where fees, reserves, rewards, and distributions are visible on-chain.

## User Walkthroughs

## Investor Walkthrough

1. Open the platform.
2. Connect an EVM wallet using the Connect Wallet button.
3. Switch to Arc Testnet if prompted.
4. Get testnet USDC if needed.
5. Browse available cycles.
6. Open a cycle and review:
   - Category.
   - Operator details.
   - Capital required.
   - Expected revenue.
   - Duration.
   - Milestone schedule.
   - Risk and return information.
7. Enter the amount to invest.
8. Approve USDC.
9. Confirm the investment transaction.
10. View your cycle tokens in Portfolio.
11. Hold until settlement or sell tokens in the marketplace.
12. After distribution, withdraw your payout from Portfolio.

## Operator Walkthrough

1. Connect a wallet.
2. Open the Operator page.
3. Apply as an operator.
4. Wait for approval if manual review is enabled.
5. Create a production cycle.
6. Deposit the required collateral.
7. Wait for investors to fund the cycle.
8. Submit evidence for each milestone.
9. Wait for verifier approval.
10. Release each milestone once quorum is reached.
11. Submit final harvest evidence.
12. Wait for harvest approval.
13. Pay the exact settlement amount shown by the platform.
14. Confirm that the cycle is distributed.
15. Withdraw collateral if it remains available in the vault.

## Verifier Walkthrough

1. Connect a wallet.
2. Open the Verifier page.
3. Stake the minimum verifier amount.
4. Review cycles requiring verification.
5. Open submitted evidence.
6. Approve only if the evidence is satisfactory.
7. Continue reviewing milestones and harvest evidence.
8. Claim rewards after verified cycles complete.
9. Unstake only when you have no unfinished cycle approvals locking your stake.

## Admin Walkthrough

1. Connect the protocol owner wallet.
2. Open Admin.
3. Review operator applications.
4. Approve or reject operators.
5. Monitor cycle count, reserve pool, treasury, marketplace fees, and liquidity settings.
6. Configure DEX/liquidity settings if enabled.
7. Withdraw treasury funds, including marketplace fees, when needed.
8. Send reserve compensation to distressed cycles when appropriate.
9. Confirm investors can recover from Portfolio after default or compensation.

## Safety Notes

FundR is currently configured for Arc Testnet unless otherwise announced.

Users should remember:

- Testnet assets are not real money.
- Mainnet deployment requires careful contract verification and operational review.
- Investors should review cycle details before participating.
- Verifiers should approve only evidence they genuinely trust.
- Operators should only create cycles they can complete and repay.
- The right to withdraw follows the cycle token holder.

## Short Summary

FundR is an on-chain funding protocol for real-world production cycles. Businesses raise USDC, investors receive tradeable cycle tokens, verifiers approve real-world evidence, and smart contracts handle milestone releases and final settlement.

Its goal is to make real-world financing more transparent, accessible, verifiable, and liquid.
