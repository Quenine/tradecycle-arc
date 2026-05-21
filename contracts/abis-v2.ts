// ============================================================
//  abis-v2.ts — Factory V2, Faucet, Marketplace V2
// ============================================================

export const FACTORY_V2_ABI = [
  { name: "getAllCycles",           type: "function", stateMutability: "view",       inputs: [],                                                                                                              outputs: [{ type: "address[]" }] },
  { name: "totalApplicants",        type: "function", stateMutability: "view",       inputs: [],                                                                                                              outputs: [{ type: "uint256" }] },
  { name: "applicants",             type: "function", stateMutability: "view",       inputs: [{ name: "index", type: "uint256" }],                                                                           outputs: [{ type: "address" }] },
  { name: "approvedOperators",      type: "function", stateMutability: "view",       inputs: [{ name: "op", type: "address" }],                                                                              outputs: [{ type: "bool" }] },
  { name: "approvalMode",           type: "function", stateMutability: "view",       inputs: [],                                                                                                              outputs: [{ type: "uint8" }] },
  { name: "DEFAULT_RESERVE_PERCENT", type: "function", stateMutability: "view",      inputs: [],                                                                                                              outputs: [{ type: "uint8" }] },
  { name: "DEFAULT_PROTOCOL_FEE_PERCENT", type: "function", stateMutability: "view", inputs: [],                                                                                                              outputs: [{ type: "uint8" }] },
  { name: "applications",           type: "function", stateMutability: "view",       inputs: [{ name: "op", type: "address" }],                                                                              outputs: [{ name: "applicant", type: "address" }, { name: "name", type: "string" }, { name: "businessType", type: "string" }, { name: "location", type: "string" }, { name: "description", type: "string" }, { name: "appliedAt", type: "uint256" }, { name: "status", type: "uint8" }] },
  { name: "applyAsOperator",        type: "function", stateMutability: "nonpayable", inputs: [{ name: "name", type: "string" }, { name: "businessType", type: "string" }, { name: "location", type: "string" }, { name: "description", type: "string" }], outputs: [] },
  { name: "approveOperator",        type: "function", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }],                                                                        outputs: [] },
  { name: "rejectOperator",         type: "function", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }],                                                                        outputs: [] },
  { name: "setApprovalMode",        type: "function", stateMutability: "nonpayable", inputs: [{ name: "mode", type: "uint8" }, { name: "minCollateral", type: "uint256" }],                                 outputs: [] },
  {
    name: "createCycle", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "capitalRequired",    type: "uint256" },
      { name: "collateralAmount",   type: "uint256" },
      { name: "expectedRevenue",    type: "uint256" },   // operator-stated, stored on-chain for ROI display
      { name: "duration",           type: "uint256" },
      { name: "reservePercent",     type: "uint8"   },
      { name: "protocolFeePercent", type: "uint8"   },
      { name: "operatorLiquidityContribution", type: "uint256" },
      { name: "cycleName",          type: "string"  },
      { name: "cycleSymbol",        type: "string"  },
      { name: "category",           type: "string"  },
      { name: "location",           type: "string"  },
      { name: "description",        type: "string"  },
    ],
    outputs: [{ type: "address" }],
  },
  { name: "CycleCreated", type: "event", inputs: [{ name: "operator", type: "address", indexed: true }, { name: "cycle", type: "address", indexed: true }, { name: "name", type: "string" }] },
] as const

export const FAUCET_ABI = [
  { name: "faucetAmount",      type: "function", stateMutability: "view",       inputs: [],                                                outputs: [{ type: "uint256" }] },
  { name: "cooldown",          type: "function", stateMutability: "view",       inputs: [],                                                outputs: [{ type: "uint256" }] },
  { name: "lastDrip",          type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],               outputs: [{ type: "uint256" }] },
  { name: "timeUntilNextDrip", type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }],               outputs: [{ type: "uint256" }] },
  { name: "drip",              type: "function", stateMutability: "nonpayable", inputs: [],                                                outputs: [] },
  { name: "balanceOf",         type: "function", stateMutability: "view",       inputs: [{ name: "account", type: "address" }],            outputs: [{ type: "uint256" }] },
  { name: "decimals",          type: "function", stateMutability: "view",       inputs: [],                                                outputs: [{ type: "uint8" }] },
] as const

export const YIELD_ORACLE_WRITE_ABI = [
  { name: "updateEstimate", type: "function", stateMutability: "nonpayable", inputs: [{ name: "cycle", type: "address" }, { name: "expectedRevenue", type: "uint256" }, { name: "estimatedCost", type: "uint256" }, { name: "riskScore", type: "uint8" }], outputs: [] },
] as const
