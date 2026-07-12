# TradeCycle Demo Script

Target length: 4-5 minutes, unless the official submission form specifies a stricter maximum.

Pacing: use the first 60-90 seconds for the problem, solution, Arc + USDC, and Credit Passport differentiator. Use the remaining time for the working operator, investor, verifier, repayment, and Credit Passport flow. Link an optional longer technical walkthrough separately if needed.

Scenario: An agricultural exporter needs USDC working capital to fulfill a produce supply order. Investors fund the cycle, verifiers approve production milestones, and repayment updates the SME operator's Credit Passport.

## Opening hook

"TradeCycle is USDC milestone finance for SMEs on Arc. The demo shows how an agricultural exporter can raise working capital for a real production cycle, receive funds by verifier-approved milestones, repay expected revenue, and build an onchain Credit Passport."

Show: `/`

- Point out the TradeCycle positioning.
- Show live cycles and the Arc Testnet / USDC context.
- Click `View Demo` or navigate to `/demo`.

## Problem

"SMEs often need short-term capital to fulfill trade or production orders, but financing is slow and credit history is hard to prove. Investors need transparency into how capital is used and whether repayment happens."

Show: `/demo`

- Use the agricultural exporter scenario card.
- Explain the workflow steps at a high level.

## Product walkthrough

### 1. Get test USDC

Show: `/faucet`

- Explain that the demo uses Arc Testnet USDC.
- Do not claim funds have been received unless the wallet actually has them.

### 2. Operator creates a cycle

Show: `/operator`

- Explain operator application/registration.
- Explain collateral and cycle creation fields.
- Mention expected revenue is stored for settlement and ROI display.

### 3. Investor funds the cycle

Show: `/` then `/cycle/[address]`

- Open a real cycle if one is available.
- Explain USDC approval and investment.
- Explain cycle-share tokens as the investor position.

### 4. Optional secondary market

Show: `/market`

- Explain that investor positions can be listed or traded where liquidity exists.
- Do not claim a trade happened unless a transaction is shown.

### 5. Operator submits evidence

Show: `/operator/dashboard`

- Explain milestone evidence submission.
- Mention evidence CID/hash flow where readable.

### 6. Verifier approves milestone

Show: `/verifier`

- Explain verifier staking, evidence review, and quorum.
- Explain that milestone capital cannot be released until verifier conditions are met.

### 7. Operator releases milestone funds

Show: `/operator/dashboard`

- Explain tranche release after quorum.
- Do not simulate a release as completed unless the transaction actually confirms.

### 8. Operator repays and investors withdraw

Show: `/operator/dashboard` then `/portfolio`

- Explain exact expected revenue repayment.
- Explain automatic distribution and investor withdrawal.

## Circle and Arc explanation

Show: `/funding`

- Arc is the implemented smart-contract settlement layer.
- USDC is the implemented funding, escrow, repayment, and withdrawal asset.
- Gateway, CCTP / Bridge Kit, Circle Wallets, and USYC are expansion paths, not implemented claims.

## Credit Passport differentiator

Show: `/credit-passport/[operator]`

- Explain that the Credit Passport reads available onchain operator history.
- Point to cycles created, states, capital raised, completed/defaulted cycles, milestone progress, and repayment reliability.
- State clearly that this is a testnet demo score, not a regulated credit score.

## Submission fit

Show: `/submission`

- Point out the selected track: Best SME Trade Finance & Working Capital Workflow.
- Show requirement coverage and the Circle / Arc product map.

## Closing pitch

"TradeCycle is more than invoice escrow. It is a full USDC working-capital workflow for real production and trade cycles: investors fund, verifiers approve milestones, operators repay, investors withdraw, and SMEs build reusable onchain finance reputation through the Credit Passport."

## Marketplace and Admin demo segment

TradeCycle connects five layers: policy-gated SME onboarding, milestone-controlled USDC working capital, independent verifier quorum, transferable cycle-share positions through an onchain USDC order book, and a reusable SME Credit Passport. The Admin dashboard supports this as the protocol operations and risk-control layer; it is not a replacement for cycle escrow or verifier quorum.

Demo order: problem and solution; operator application and owner-gated review; cycle creation; primary USDC funding; cycle-token receipt; seller lists part of a position; a second wallet partially fills the listing; explain that settlement rights moved with the tokens; evidence submission; verifier quorum; tranche release; operator repayment; current-holder redemption; Credit Passport update; Arc + USDC close. Keep Admin to 20-30 seconds and do not execute sensitive owner operations solely for the recording.