"use client"

import { useAccount, useReadContracts } from "wagmi"
import { CONTRACTS } from "@/constants/contracts"
import { FACTORY_V2_ABI } from "@/contracts/abis-v2"
import { PRODUCTION_CYCLE_ABI, CYCLE_SHARE_TOKEN_ABI } from "@/contracts/abis"
import { formatShareAmount, PROFIT_PER_TOKEN_SCALE } from "@/lib/token-units"

export interface Position {
  cycleAddress:          string
  cycleName:             string
  cycleSymbol:           string
  category:              string
  location:              string
  tokenAddress:          string
  tokenBalance:          bigint
  tokenBalanceFormatted: number
  tokenTotalSupply:      bigint
  sharePercent:          number
  capitalRequired:       bigint
  totalRaised:           bigint
  stateId:               number
  stateName:             string
  profitPerToken:        bigint
  // Principal at par = current token balance valued at 1:1 with stablecoin.
  // Estimated payout = principal + profit where distribution/default recovery is already determined.
  estimatedPayoutUSD:    number
  principalAtParUSD:     number
  canWithdraw:           boolean   // DISTRIBUTED state
  canRecoverDefault:     boolean   // DEFAULTED state with non-zero profitPerToken
}

export interface PortfolioSummary {
  positions:       Position[]
  totalInvestedUSD: number
  activeCount:     number
  completedCount:  number
  defaultedCount:  number
  isLoading:       boolean
}

const STATE_NAMES = ["FUNDING","ACTIVE","HARVEST_SUBMITTED","DISTRIBUTED","DEFAULTED"]

export function usePortfolio(): PortfolioSummary {
  const { address } = useAccount()

  const { data: factoryData, isLoading: loadingFactory } = useReadContracts({
    contracts: [{ address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "getAllCycles" }],
    query: { refetchInterval: 10000 },
  })

  const cycleAddresses = (factoryData?.[0]?.result as string[]) ?? []

  const { data: cycleMetaData, isLoading: loadingMeta } = useReadContracts({
    contracts: cycleAddresses.flatMap(addr => [
      { address: addr as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "cycleToken"       as const },  // i*9+0
      { address: addr as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "cycleName"        as const },  // i*9+1
      { address: addr as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "cycleSymbol"      as const },  // i*9+2
      { address: addr as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "category"         as const },  // i*9+3
      { address: addr as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "location"         as const },  // i*9+4
      { address: addr as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "state"            as const },  // i*9+5
      { address: addr as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "capitalRequired"  as const },  // i*9+6
      { address: addr as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "totalRaised"      as const },  // i*9+7
      { address: addr as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "profitPerToken"   as const },  // i*9+8
    ]),
    query: { enabled: cycleAddresses.length > 0, refetchInterval: 10000 },
  })

  const tokenAddresses = cycleAddresses
    .map((_, i) => (cycleMetaData?.[i * 9]?.result as string) ?? "")
    .filter(Boolean)

  const { data: tokenData, isLoading: loadingTokens } = useReadContracts({
    contracts: tokenAddresses.flatMap(token => [
      { address: token as `0x${string}`, abi: CYCLE_SHARE_TOKEN_ABI, functionName: "balanceOf"   as const, args: [address!] as const },
      { address: token as `0x${string}`, abi: CYCLE_SHARE_TOKEN_ABI, functionName: "totalSupply" as const },
    ]),
    query: { enabled: !!address && tokenAddresses.length > 0, refetchInterval: 10000 },
  })

  const positions: Position[] = cycleAddresses.map((cycleAddr, i) => {
    const tokenAddress = (cycleMetaData?.[i * 9]?.result as string) ?? ""
    const j       = tokenAddresses.indexOf(tokenAddress)
    const balance = j >= 0 ? ((tokenData?.[j * 2]?.result     as bigint) ?? 0n) : 0n
    const supply  = j >= 0 ? ((tokenData?.[j * 2 + 1]?.result as bigint) ?? 0n) : 0n
    const stateId = Number(cycleMetaData?.[i * 9 + 5]?.result ?? 0)
    const capRaw  = (cycleMetaData?.[i * 9 + 6]?.result as bigint) ?? 0n
    const raised  = (cycleMetaData?.[i * 9 + 7]?.result as bigint) ?? 0n
    const ppt     = (cycleMetaData?.[i * 9 + 8]?.result as bigint) ?? 0n
    const balFmt  = Number(formatShareAmount(balance))
    const sharePct = supply > 0n ? Math.round((Number(balance) / Number(supply)) * 10000) / 100 : 0

    // CRITICAL FIX: profitPerToken is stored ×1e18
    // payout = balance + balance * ppt / 1e18
    // Old (WRONG):  balance + balance * ppt  ← 36 decimals before formatUnits(18) → vastly inflated
    // New (CORRECT): balance + balance * ppt / 1e18n
    const canWithdraw       = stateId === 3
    const canRecoverDefault = stateId === 4 && ppt > 0n
    const principalAtParUSD = balFmt
    const estimatedPayoutUSD = (canWithdraw || canRecoverDefault)
      ? Number(formatShareAmount(balance + (balance * ppt) / PROFIT_PER_TOKEN_SCALE))
      : balFmt

    return {
      cycleAddress: cycleAddr,
      cycleName:    (cycleMetaData?.[i * 9 + 1]?.result as string) ?? "",
      cycleSymbol:  (cycleMetaData?.[i * 9 + 2]?.result as string) ?? "",
      category:     (cycleMetaData?.[i * 9 + 3]?.result as string) ?? "",
      location:     (cycleMetaData?.[i * 9 + 4]?.result as string) ?? "",
      tokenAddress,
      tokenBalance: balance,  tokenBalanceFormatted: balFmt,
      tokenTotalSupply: supply, sharePercent: sharePct,
      capitalRequired: capRaw, totalRaised: raised,
      stateId, stateName: STATE_NAMES[stateId] ?? "UNKNOWN",
      profitPerToken: ppt, estimatedPayoutUSD, principalAtParUSD,
      canWithdraw, canRecoverDefault,
    }
  }).filter(p => p.tokenBalance > 0n)

  return {
    positions,
    totalInvestedUSD: positions.reduce((s, p) => s + p.tokenBalanceFormatted, 0),
    activeCount:      positions.filter(p => p.stateId === 1).length,
    completedCount:   positions.filter(p => p.stateId === 3).length,
    defaultedCount:   positions.filter(p => p.stateId === 4).length,
    isLoading: loadingFactory || loadingMeta || loadingTokens,
  }
}
