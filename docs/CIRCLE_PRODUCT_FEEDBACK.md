# Circle Product Feedback

## 1. Why we chose these products for this use case

TradeCycle uses USDC and Arc because the product is fundamentally a programmable stablecoin commerce workflow. SME operators need working capital in a stable unit of account, investors need transparent funding and repayment flows, and verifiers need an onchain way to approve milestone evidence before capital moves.

USDC fits the settlement, escrow, milestone-release, repayment, fee, reserve, and investor-withdrawal paths. Arc fits the smart-contract workflow because cycle state, verifier approvals, collateral controls, and repayment distribution need predictable programmable execution.

## 2. What worked well during development

- USDC worked well as a single settlement rail across funding, escrow, milestone release, repayment, and withdrawal flows.
- Arc's EVM compatibility made it practical to build a multi-contract workflow with factory, cycle, registry, vault, reserve, treasury, and marketplace contracts.
- The stablecoin-first design kept the user experience easy to explain: investors fund in USDC, operators repay in USDC, and investors withdraw in USDC.
- ArcScan links are useful for judge and user verification of addresses and transactions.

## 3. What could be improved

- Clearer sample apps for multi-party escrow, milestone release, and repayment waterfalls would help teams building commerce workflows beyond simple payments.
- Gateway and CCTP / Bridge Kit examples focused on marketplace or SME finance flows would make cross-chain funding paths easier to design.
- Wallet onboarding examples for non-crypto-native SMEs would help teams reduce friction for operators who are not already comfortable with browser wallets.
- More end-to-end references showing USDC approval, escrow, settlement, and withdrawal patterns together would reduce integration guesswork.

## 4. Recommendations to make the product/developer experience more seamless or scalable

- Provide a reference architecture for USDC escrow with multiple roles: payer, recipient, verifier, treasury, and reserve account.
- Add sample flows for Gateway-based liquidity routing into an application-specific contract on a target chain.
- Add CCTP / Bridge Kit examples where an investor starts from one chain and the application settles into a contract on another chain.
- Provide embedded wallet onboarding examples for SMEs and verifiers who need to complete business workflows without learning wallet mechanics first.
- Publish commerce-specific guidance for audit trails, receipts, and reconciliation when USDC moves through escrow, milestone release, and repayment distribution.

## Current implementation status

Implemented in TradeCycle:

- Arc Testnet smart-contract settlement
- USDC funding, escrow, milestone release, repayment, fee, reserve, and withdrawal flows

Not implemented in the current demo:

- Circle Gateway
- CCTP / Bridge Kit
- Circle Wallets
- USYC
- StableFX
- Nanopayments
