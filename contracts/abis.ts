// ============================================================
//  RWYP — Contract ABIs  (must match deployed contracts exactly)
//
//  THE "Not registered / $0 staked" BUG:
//  The VerifierRegistry.verifiers() mapping returns a 5-field struct:
//  (active, stake, pendingReward, totalEarned, approvalsGiven).
//  If the ABI declares fewer fields, wagmi's ABI decoder reads garbage
//  and isVerifier is always false, stake always 0.
//  This ABI declares all 5 fields exactly.
// ============================================================

export const PRODUCTION_CYCLE_ABI = [
  { name: "state",                  type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint8" }] },
  { name: "operator",               type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "address" }] },
  { name: "cycleName",              type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "string" }] },
  { name: "cycleSymbol",            type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "string" }] },
  { name: "category",               type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "string" }] },
  { name: "location",               type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "string" }] },
  { name: "description",            type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "string" }] },
  { name: "capitalRequired",        type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint256" }] },
  { name: "totalRaised",            type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint256" }] },
  { name: "duration",               type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint256" }] },
  { name: "startTime",              type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint256" }] },
  { name: "profitPerToken",         type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint256" }] },
  { name: "reservePercent",         type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint8" }] },
  { name: "protocolFeePercent",     type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint8" }] },
  { name: "collateralAmount",       type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint256" }] },
  { name: "expectedRevenue",        type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint256" }] },
  { name: "grossROIBps",            type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint256" }] },
  { name: "cycleToken",             type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "address" }] },
  { name: "milestoneReleased",      type: "function", stateMutability: "view",       inputs: [{ name: "id", type: "uint8" }],                            outputs: [{ type: "bool" }] },
  { name: "milestoneEvidenceHash",  type: "function", stateMutability: "view",       inputs: [{ name: "id", type: "uint8" }],                            outputs: [{ type: "bytes32" }] },
  { name: "evidenceCID",            type: "function", stateMutability: "view",       inputs: [{ name: "id", type: "uint8" }],                            outputs: [{ type: "string" }] },
  { name: "evidenceTimestamp",      type: "function", stateMutability: "view",       inputs: [{ name: "id", type: "uint8" }],                            outputs: [{ type: "uint256" }] },
  { name: "evidenceSubmitted",      type: "function", stateMutability: "view",       inputs: [{ name: "id", type: "uint8" }],                            outputs: [{ type: "bool" }] },
  { name: "secondsUntilDefault",    type: "function", stateMutability: "view",       inputs: [],                                                         outputs: [{ type: "uint256" }] },
  { name: "invest",                 type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }],                      outputs: [] },
  { name: "submitMilestoneEvidence",type: "function", stateMutability: "nonpayable", inputs: [{ name: "milestoneId", type: "uint8" }, { name: "cid", type: "string" }], outputs: [] },
  { name: "submitHarvestEvidence",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "cid", type: "string" }],                          outputs: [] },
  { name: "releaseMilestone",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "milestoneId", type: "uint8" }],                   outputs: [] },
  { name: "submitHarvest",          type: "function", stateMutability: "nonpayable", inputs: [],                                                         outputs: [] },
  { name: "repayAndDistribute",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }],                      outputs: [] },
  { name: "distribute",             type: "function", stateMutability: "nonpayable", inputs: [],                                                         outputs: [] },
  { name: "withdraw",               type: "function", stateMutability: "nonpayable", inputs: [],                                                         outputs: [] },
  { name: "withdrawAfterDefault",   type: "function", stateMutability: "nonpayable", inputs: [],                                                         outputs: [] },
  { name: "triggerDefault",         type: "function", stateMutability: "nonpayable", inputs: [],                                                         outputs: [] },
  { name: "onReserveCompensation",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }],                      outputs: [] },
  // Events for evidence CID indexing (UI reads CID from EvidenceSubmitted event)
  { name: "EvidenceSubmitted", type: "event", inputs: [
    { name: "milestoneId", type: "uint8", indexed: true },
    { name: "cid",         type: "string", indexed: false },
    { name: "hash",        type: "bytes32", indexed: false },
  ]},
] as const

export const FACTORY_ABI = [
  { name: "getAllCycles",       type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
  { name: "approvedOperators", type: "function", stateMutability: "view", inputs: [{ name: "op", type: "address" }], outputs: [{ type: "bool" }] },
] as const

export const CYCLE_SHARE_TOKEN_ABI = [
  { name: "name",         type: "function", stateMutability: "view",       inputs: [],                                                                                                           outputs: [{ type: "string" }] },
  { name: "symbol",       type: "function", stateMutability: "view",       inputs: [],                                                                                                           outputs: [{ type: "string" }] },
  { name: "decimals",     type: "function", stateMutability: "view",       inputs: [],                                                                                                           outputs: [{ type: "uint8" }] },
  { name: "totalSupply",  type: "function", stateMutability: "view",       inputs: [],                                                                                                           outputs: [{ type: "uint256" }] },
  { name: "balanceOf",    type: "function", stateMutability: "view",       inputs: [{ name: "owner", type: "address" }],                                                                        outputs: [{ type: "uint256" }] },
  { name: "allowance",    type: "function", stateMutability: "view",       inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],                                 outputs: [{ type: "uint256" }] },
  { name: "approve",      type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],                                outputs: [{ type: "bool" }] },
  { name: "transfer",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],                                     outputs: [{ type: "bool" }] },
  { name: "transferFrom", type: "function", stateMutability: "nonpayable", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const

export const TOKEN_MARKETPLACE_ABI = [
  { name: "nextOrderId",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "tradingFeeBps",      type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalFeesCollected", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "orders", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ name: "id", type: "uint256" }, { name: "seller", type: "address" }, { name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "originalAmount", type: "uint256" }, { name: "pricePerToken", type: "uint256" }, { name: "active", type: "bool" }] },
  { name: "createSellOrder", type: "function", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "pricePerToken", type: "uint256" }], outputs: [] },
  { name: "buyOrder",        type: "function", stateMutability: "nonpayable", inputs: [{ name: "orderId", type: "uint256" }, { name: "fillAmount", type: "uint256" }], outputs: [] },
  { name: "buyOrderFull",    type: "function", stateMutability: "nonpayable", inputs: [{ name: "orderId", type: "uint256" }], outputs: [] },
  { name: "cancelOrder",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "orderId", type: "uint256" }], outputs: [] },
  { name: "orderCost",       type: "function", stateMutability: "view", inputs: [{ name: "orderId", type: "uint256" }, { name: "fillAmount", type: "uint256" }], outputs: [{ name: "gross", type: "uint256" }, { name: "fee", type: "uint256" }, { name: "total", type: "uint256" }] },
] as const

// ── VERIFIER_REGISTRY_ABI — 5-field struct REQUIRED ─────────────────────────
// DO NOT reduce to 2 fields. The deployed contract returns all 5 fields.
// wagmi reads them positionally — if ABI says 2 but contract returns 5,
// "active" maps to wrong bytes and isVerifier is always false.
export const VERIFIER_REGISTRY_ABI = [
  { name: "factory",             type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "quorum",              type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "minimumStake",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "activeVerifierCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "verifierActive",      type: "function", stateMutability: "view", inputs: [{ name: "v", type: "address" }], outputs: [{ type: "bool" }] },
  { name: "canUnstake",          type: "function", stateMutability: "view", inputs: [{ name: "verifier", type: "address" }], outputs: [{ type: "bool" }] },
  { name: "activeCycleApprovalsCount", type: "function", stateMutability: "view", inputs: [{ name: "verifier", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "getVerifierList",     type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
  {
    // CRITICAL: all 5 fields must be declared — matches Verifier struct in contract
    name: "verifiers", type: "function", stateMutability: "view",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [
      { name: "active",         type: "bool" },
      { name: "stake",          type: "uint256" },
      { name: "pendingReward",  type: "uint256" },
      { name: "totalEarned",    type: "uint256" },
      { name: "approvalsGiven", type: "uint256" },
    ],
  },
  { name: "approvalCount",          type: "function", stateMutability: "view",       inputs: [{ name: "cycle", type: "address" }, { name: "milestone", type: "uint8" }],                                         outputs: [{ type: "uint256" }] },
  { name: "approvals",              type: "function", stateMutability: "view",       inputs: [{ name: "cycle", type: "address" }, { name: "milestone", type: "uint8" }, { name: "verifier", type: "address" }], outputs: [{ type: "bool" }] },
  { name: "quorumReached",          type: "function", stateMutability: "view",       inputs: [{ name: "cycle", type: "address" }, { name: "milestoneId", type: "uint8" }],                                       outputs: [{ type: "bool" }] },
  { name: "registerVerifier",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }],                                                                               outputs: [] },
  { name: "unstake",                type: "function", stateMutability: "nonpayable", inputs: [],                                                                                                                  outputs: [] },
  { name: "claimRewards",           type: "function", stateMutability: "nonpayable", inputs: [],                                                                                                                  outputs: [] },
  { name: "approveMilestone",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "cycle", type: "address" }, { name: "milestoneId", type: "uint8" }],                                       outputs: [] },
  { name: "receiveVerifierReward",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "cycle", type: "address" }, { name: "totalAmount", type: "uint256" }],                                        outputs: [] },
  { name: "setFactory",             type: "function", stateMutability: "nonpayable", inputs: [{ name: "_factory", type: "address" }],                                                                              outputs: [] },
] as const

export const YIELD_ORACLE_ABI = [
  { name: "estimates",      type: "function", stateMutability: "view",       inputs: [{ name: "cycle", type: "address" }], outputs: [{ name: "expectedRevenue", type: "uint256" }, { name: "estimatedCost", type: "uint256" }, { name: "estimatedProfit", type: "uint256" }, { name: "estimatedROI", type: "uint256" }, { name: "riskScore", type: "uint8" }, { name: "exists", type: "bool" }] },
  { name: "updateEstimate", type: "function", stateMutability: "nonpayable", inputs: [{ name: "cycle", type: "address" }, { name: "expectedRevenue", type: "uint256" }, { name: "estimatedCost", type: "uint256" }, { name: "riskScore", type: "uint8" }], outputs: [] },
] as const

export const COLLATERAL_VAULT_ABI = [
  { name: "collateralBalance",  type: "function", stateMutability: "view",       inputs: [{ name: "operator", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "depositCollateral",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }],   outputs: [] },
  { name: "withdrawCollateral", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }],   outputs: [] },
  { name: "releaseCollateral",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "setFactory",         type: "function", stateMutability: "nonpayable", inputs: [{ name: "_factory", type: "address" }], outputs: [] },
  { name: "registerTrustedCycle", type: "function", stateMutability: "nonpayable", inputs: [{ name: "cycle", type: "address" }, { name: "allowed", type: "bool" }], outputs: [] },
] as const

export const RESERVE_POOL_ABI = [
  { name: "reserveBalance", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalReserves",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "syncReserves",   type: "function", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "compensate", type: "function", stateMutability: "nonpayable", inputs: [{ name: "cycle", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
] as const

export const TREASURY_ABI = [
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
] as const

export const LIQUIDITY_MANAGER_ABI = [
  { name: "factory", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "vault", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "dexFactory", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "dexRouter", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "tokenSeedBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint16" }] },
  { name: "stableSeedBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint16" }] },
  { name: "fund", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "setFactory", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_factory", type: "address" }], outputs: [] },
  { name: "setVault", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_vault", type: "address" }], outputs: [] },
  { name: "setDex", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_dexFactory", type: "address" }, { name: "_dexRouter", type: "address" }], outputs: [] },
  { name: "setSeedConfig", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_tokenSeedBps", type: "uint16" }, { name: "_stableSeedBps", type: "uint16" }], outputs: [] },
  { name: "launches", type: "function", stateMutability: "view", inputs: [{ name: "cycle", type: "address" }], outputs: [{ name: "tokenInvestmentAmount", type: "uint256" }, { name: "stableLiquidityAmount", type: "uint256" }, { name: "invested", type: "bool" }, { name: "launched", type: "bool" }, { name: "enabled", type: "bool" }] },
  { name: "retryLiquidityLaunch", type: "function", stateMutability: "nonpayable", inputs: [{ name: "cycle", type: "address" }], outputs: [] },
] as const

export const LIQUIDITY_VAULT_ABI = [
  { name: "liquidityManager", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "balance", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "deposit", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "setLiquidityManager", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_liquidityManager", type: "address" }], outputs: [] },
] as const

export const DEX_FACTORY_V2_ABI = [
  { name: "getPair", type: "function", stateMutability: "view", inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }], outputs: [{ type: "address" }] },
] as const

export const DEX_ROUTER_V2_ABI = [
  { name: "getAmountsOut", type: "function", stateMutability: "view", inputs: [{ name: "amountIn", type: "uint256" }, { name: "path", type: "address[]" }], outputs: [{ type: "uint256[]" }] },
  {
    name: "swapExactTokensForTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ type: "uint256[]" }],
  },
] as const

export const ERC20_ABI = [
  { name: "name",      type: "function", stateMutability: "view",       inputs: [],                                                                                     outputs: [{ type: "string" }] },
  { name: "symbol",    type: "function", stateMutability: "view",       inputs: [],                                                                                     outputs: [{ type: "string" }] },
  { name: "decimals",  type: "function", stateMutability: "view",       inputs: [],                                                                                     outputs: [{ type: "uint8" }] },
  { name: "balanceOf", type: "function", stateMutability: "view",       inputs: [{ name: "account", type: "address" }],                                                outputs: [{ type: "uint256" }] },
  { name: "allowance", type: "function", stateMutability: "view",       inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],            outputs: [{ type: "uint256" }] },
  { name: "approve",   type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],           outputs: [{ type: "bool" }] },
  { name: "transfer",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],                outputs: [{ type: "bool" }] },
] as const
