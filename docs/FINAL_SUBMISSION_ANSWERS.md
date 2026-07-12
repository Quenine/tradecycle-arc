# Final Submission Answers

## 1. Project Name

TradeCycle: USDC Milestone Finance for SMEs on Arc

## 2. Short Description

TradeCycle is a USDC-powered SME working-capital platform on Arc. It lets operators raise capital for real-world production and trade cycles, releases funds through verifier-approved milestones, tokenizes investor positions, and automatically distributes repayment. Each completed cycle contributes to an onchain Credit Passport for the SME operator.

## 3. Track Submitted For

Best SME Trade Finance & Working Capital Workflow

## 4. Circle Developer Account Email

TODO: Circle Developer Account email

## 5. Circle Products Used On Arc

Implemented:

- USDC
- Arc

Architecture-ready / future, not implemented:

- Circle Gateway
- CCTP / Bridge Kit
- Circle Wallets
- USYC

Not used:

- StableFX
- Nanopayments

## 6. Functional MVP Summary

TradeCycle lets SME operators create production and trade cycles, investors fund those cycles with USDC, and `ProductionCycle` contracts hold capital until milestone conditions are met. Operators submit milestone evidence, verifiers approve that evidence, milestone releases unlock capital, operators repay expected revenue, and investors withdraw payout. The Credit Passport summarizes available operator history from readable onchain activity.

## 7. Technical Implementation

TradeCycle uses a Next.js frontend with Solidity smart contracts deployed on Arc Testnet. The contract system includes `ProductionCycleFactoryV2`, `ProductionCycle`, `CycleShareToken`, `CollateralVault`, `VerifierRegistry`, `ReservePool`, `ProtocolTreasury`, and a cycle marketplace. The Credit Passport UI reads available onchain cycle, verifier, collateral, and reserve signals for SME operator profiles.

## 8. Why Arc

Arc is a strong fit for programmable stablecoin workflows. TradeCycle needs predictable settlement, smart-contract-mediated escrow, verifier-gated milestone release, and automated repayment distribution across multiple parties.

## 9. Why USDC

USDC is the unit of account for funding, escrow, milestone release, repayment, and investor withdrawal. It gives SMEs and investors a clear settlement rail and creates transparent repayment history for future financing workflows.

## 10. What Makes The Project Unique

TradeCycle is not just invoice escrow. It models a full SME production-cycle finance workflow with milestone-based release, verifier-approved evidence, tokenized investor positions, an automated repayment waterfall, and a Credit Passport that turns completed cycles into reusable onchain financing reputation.

## 11. Demo URL

TODO: Deployed demo URL

## 12. GitHub URL

TODO: Public GitHub URL

## 13. Video URL

TODO: 4-5 minute video URL, unless the official submission form specifies a stricter maximum

## 14. Circle Product Feedback Location

`docs/CIRCLE_PRODUCT_FEEDBACK.md`

## 15. Testnet Disclaimer

TradeCycle is a testnet demonstration only. It is not a regulated lending platform, credit rating service, investment recommendation, or financial product.
