// ============================================================
//  TradeCycle -- Contract addresses + protocol constants
//  Arc Testnet launch config.
//  After deployment, set the matching NEXT_PUBLIC_* addresses in Vercel.
// ============================================================

const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`

export const PROTOCOL_OWNER: `0x${string}` =
  (process.env.NEXT_PUBLIC_PROTOCOL_OWNER as `0x${string}`) ||
  zeroAddress


export const CONTRACTS = {
  factory:          (process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`) || zeroAddress,
  stablecoin:       (process.env.NEXT_PUBLIC_STABLECOIN_ADDRESS as `0x${string}`) || "0x3600000000000000000000000000000000000000",
  treasury:         (process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`) || zeroAddress,
  reservePool:      (process.env.NEXT_PUBLIC_RESERVE_POOL_ADDRESS as `0x${string}`) || zeroAddress,
  verifierRegistry: (process.env.NEXT_PUBLIC_VERIFIER_REGISTRY_ADDRESS as `0x${string}`) || zeroAddress,
  collateralVault:  (process.env.NEXT_PUBLIC_COLLATERAL_VAULT_ADDRESS as `0x${string}`) || zeroAddress,
  yieldOracle:      (process.env.NEXT_PUBLIC_YIELD_ORACLE_ADDRESS as `0x${string}`) || zeroAddress,
  liquidityVault:   (process.env.NEXT_PUBLIC_LIQUIDITY_VAULT_ADDRESS as `0x${string}`) || zeroAddress,
  liquidityManager: (process.env.NEXT_PUBLIC_LIQUIDITY_MANAGER_ADDRESS as `0x${string}`) || zeroAddress,
  tokenMarketplace: (process.env.NEXT_PUBLIC_TOKEN_MARKETPLACE_ADDRESS as `0x${string}`) || zeroAddress,
} as const

export const ARC_TESTNET_DEX = {
  name: "Apexiswap",
  factory: "0x2B865487A1008D2694C1D367c761f00a564aCECb" as `0x${string}`,
  router: "0x437b1aBf6e5a69548849b15EC35f83A73Fa1E28F" as `0x${string}`,
} as const

export const NETWORK = {
  name:          "Arc Testnet",
  chainId:       5042002,
  blockExplorer: "https://testnet.arcscan.app",
  blockExplorerName: "ArcScan",
  rpcUrl:        "https://rpc.testnet.arc.network",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  isTestnet:     true,
} as const

export const STABLECOIN = {
  symbol: "USDC",
  decimals: 6,
} as const

export const MIN_VERIFIER_STAKE_USDC = 10
export const SHARE_TOKEN_DECIMALS = STABLECOIN.decimals
export const PROFIT_PER_TOKEN_DECIMALS = 18

export const MILESTONE_LABELS = [
  { id: 0, label: "Production start",     pct: 40, description: "Initial capital released â€” production begins" },
  { id: 1, label: "Mid-cycle checkpoint", pct: 30, description: "Second tranche â€” confirmed mid-cycle progress" },
  { id: 2, label: "Harvest / completion", pct: 20, description: "Third tranche â€” product ready or delivered" },
  { id: 3, label: "Final settlement",     pct: 10, description: "Final tranche â€” buyer payment received" },
] as const

export const CYCLE_STATES: Record<number, string> = {
  0: "FUNDING",
  1: "ACTIVE",
  2: "HARVEST_SUBMITTED",
  3: "DISTRIBUTED",
  4: "DEFAULTED",
}

// Default fees shown in operator form
// Both are 1% â€” total 2% deducted from gross profit
// Collateral (10% of capital) serves as investor protection, not the reserve fee
export const PROTOCOL_FEES = {
  defaultProtocolFee:    1,    // 1% of gross profit â†’ treasury
  defaultReserveFee:     1,    // 1% of gross profit â†’ reserve pool (investor protection)
  marketplaceTradingFee: 0.5,  // 0.5% per token trade â†’ treasury
} as const
