# Marketplace Demo Runbook

This is a two-wallet Arc Testnet rehearsal. Use small testnet-only values and never record or share private keys.

## Preconditions

- Wallet A funded a live TradeCycle cycle and holds its cycle-share token.
- Wallet B holds enough Arc Testnet USDC for a partial fill and gas.
- The cycle is in FUNDING, ACTIVE, or HARVEST_SUBMITTED state.
- Record starting token, USDC, treasury, and order balances from the UI and ArcScan.

## Wallet A: list part of a position

1. Open the cycle and confirm its token address and lifecycle state.
2. Open **Trade Cycle Tokens** and select that cycle.
3. Enter a small token amount and ask price. Review gross proceeds, the marketplace fee estimate, and estimated net seller proceeds.
4. Approve only the intended token amount, then create the sell order.
5. Verify the tokens moved into `CycleTokenMarketplaceV2` escrow and the order amount is active. Do not describe the listing as a completed trade.

## Wallet B: partially fill

1. Open the same selected market and review the ask; it is a seller price, not fair value or guaranteed return.
2. Enter less than the remaining order amount.
3. Approve the required USDC and submit the partial fill.
4. Verify Wallet B received shares, Wallet A received gross USDC minus the fee, `ProtocolTreasury` received the fee, and the order's remaining amount decreased.

## Cancellation and portfolio checks

1. Wallet A cancels the remaining order.
2. Verify remaining escrowed shares returned to Wallet A and the order became inactive.
3. Confirm Portfolio distinguishes wallet-held tokens from active marketplace escrow and links to listing management.

## Settlement rehearsal

After the cycle eventually distributes, do not create new UI trades. Confirm the current holders can redeem their respective shares from Portfolio. Wallet A cannot redeem shares sold to Wallet B; Wallet B owns the settlement right attached to purchased shares. For a defaulted cycle, use the recovery action instead. Liquidity depends on listings and counterparties and is never guaranteed.