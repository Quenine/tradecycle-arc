"use client"

import { useReadContracts } from "wagmi"
import { CONTRACTS, MILESTONE_LABELS, CYCLE_STATES } from "@/constants/contracts"
import { PRODUCTION_CYCLE_ABI, CYCLE_SHARE_TOKEN_ABI, YIELD_ORACLE_ABI, VERIFIER_REGISTRY_ABI } from "@/contracts/abis"
import { stableAmountToNumber } from "@/lib/token-units"

export interface CycleData {
  address: string
  cycleName: string; cycleSymbol: string; category: string; location: string; description: string
  capitalRequired: bigint; totalRaised: bigint
  capitalRequiredUSD: number; totalRaisedUSD: number; progressPct: number
  profitPerToken: bigint; duration: bigint; durationDays: number; startTime: bigint
  reservePercent: number; protocolFeePercent: number
  collateralAmount: bigint; expectedRevenue: bigint
  // ROI derived directly from on-chain expectedRevenue (no oracle required)
  grossROI: number    // (expectedRevenue - capital) / capital * 100
  netROI:   number    // after protocol + reserve fees
  stateId: number; stateName: string
  isFunding: boolean; isActive: boolean; isHarvestSubmitted: boolean; isDistributed: boolean; isDefaulted: boolean
  tokenAddress: string; tokenTotalSupply: bigint
  milestones: { id: number; label: string; pct: number; description: string; released: boolean; quorumReached: boolean; approvalCount: number }[]
  oracle: { revenue: bigint; cost: bigint; profit: bigint; roi: number; risk: number; exists: boolean } | null
  isLoading: boolean; isError: boolean
}

export function useCycleData(cycleAddress: string): CycleData {
  const addr = cycleAddress as `0x${string}`
  const cc   = { address: addr, abi: PRODUCTION_CYCLE_ABI } as const

  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      { ...cc, functionName: "state" },             // 0
      { ...cc, functionName: "cycleName" },          // 1
      { ...cc, functionName: "cycleSymbol" },        // 2
      { ...cc, functionName: "category" },           // 3
      { ...cc, functionName: "location" },           // 4
      { ...cc, functionName: "description" },        // 5
      { ...cc, functionName: "capitalRequired" },    // 6
      { ...cc, functionName: "totalRaised" },        // 7
      { ...cc, functionName: "duration" },           // 8
      { ...cc, functionName: "startTime" },          // 9
      { ...cc, functionName: "profitPerToken" },     // 10
      { ...cc, functionName: "reservePercent" },     // 11
      { ...cc, functionName: "protocolFeePercent" }, // 12
      { ...cc, functionName: "collateralAmount" },   // 13
      { ...cc, functionName: "expectedRevenue" },    // 14  NEW
      { ...cc, functionName: "cycleToken" },         // 15
      { ...cc, functionName: "milestoneReleased", args: [0] as const }, // 16
      { ...cc, functionName: "milestoneReleased", args: [1] as const }, // 17
      { ...cc, functionName: "milestoneReleased", args: [2] as const }, // 18
      { ...cc, functionName: "milestoneReleased", args: [3] as const }, // 19
    ],
    query: { enabled: !!cycleAddress, refetchInterval: 8000 },
  })

  const tokenAddress = (data?.[15]?.result as string) ?? ""

  const { data: tokenData } = useReadContracts({
    contracts: tokenAddress
      ? [{ address: tokenAddress as `0x${string}`, abi: CYCLE_SHARE_TOKEN_ABI, functionName: "totalSupply" }]
      : [],
    query: { enabled: !!tokenAddress },
  })

  const { data: oracleData } = useReadContracts({
    contracts: [{ address: CONTRACTS.yieldOracle, abi: YIELD_ORACLE_ABI, functionName: "estimates", args: [addr] }],
    query: { enabled: !!cycleAddress, refetchInterval: 15000 },
  })

  const { data: verifierData } = useReadContracts({
    contracts: [0, 1, 2, 3].flatMap(id => [
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "approvalCount" as const, args: [addr, id] as [string, number] },
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorumReached"  as const, args: [addr, id] as [string, number] },
    ]),
    query: { enabled: !!cycleAddress, refetchInterval: 8000 },
  })

  const stateId       = Number(data?.[0]?.result ?? 0)
  const capRaw        = (data?.[6]?.result as bigint) ?? 0n
  const raisedRaw     = (data?.[7]?.result as bigint) ?? 0n
  const expectedRevRaw = (data?.[14]?.result as bigint) ?? 0n
  const reservePct    = Number(data?.[11]?.result ?? 0)
  const protocolPct   = Number(data?.[12]?.result ?? 0)
  const capUSD        = stableAmountToNumber(capRaw)
  const raisedUSD     = stableAmountToNumber(raisedRaw)
  const revUSD        = stableAmountToNumber(expectedRevRaw)
  const progress      = capUSD > 0 ? Math.min(100, Math.round((raisedUSD / capUSD) * 100)) : 0
  const durSecs       = (data?.[8]?.result as bigint) ?? 0n
  const durDays       = Math.round(Number(durSecs) / 86400)

  // Compute ROI directly from on-chain expectedRevenue — no oracle call needed
  const grossProfit   = revUSD > capUSD ? revUSD - capUSD : 0
  const grossROI      = capUSD > 0 && grossProfit > 0 ? Math.round((grossProfit / capUSD) * 100) : 0
  const profitAfterFees = grossProfit * (1 - (reservePct + protocolPct) / 100)
  const netROI        = capUSD > 0 && profitAfterFees > 0 ? Math.round((profitAfterFees / capUSD) * 100) : 0

  const oracleRaw = oracleData?.[0]?.result as any
  const oracle = oracleRaw?.exists
    ? {
        revenue: oracleRaw.expectedRevenue as bigint,
        cost:    oracleRaw.estimatedCost   as bigint,
        profit:  oracleRaw.estimatedProfit as bigint,
        roi:     Number(oracleRaw.estimatedROI),
        risk:    Number(oracleRaw.riskScore),
        exists:  true,
      }
    : null

  const milestones = MILESTONE_LABELS.map((m, i) => ({
    id:            m.id,
    label:         m.label,
    pct:           m.pct,
    description:   m.description,
    released:      (data?.[16 + i]?.result as boolean) ?? false,
    approvalCount: Number(verifierData?.[i * 2]?.result ?? 0n),
    quorumReached: (verifierData?.[i * 2 + 1]?.result as boolean) ?? false,
  }))

  return {
    address:            cycleAddress,
    cycleName:          (data?.[1]?.result  as string) ?? "",
    cycleSymbol:        (data?.[2]?.result  as string) ?? "",
    category:           (data?.[3]?.result  as string) ?? "",
    location:           (data?.[4]?.result  as string) ?? "",
    description:        (data?.[5]?.result  as string) ?? "",
    capitalRequired:    capRaw,
    totalRaised:        raisedRaw,
    capitalRequiredUSD: capUSD,
    totalRaisedUSD:     raisedUSD,
    progressPct:        progress,
    profitPerToken:     (data?.[10]?.result as bigint) ?? 0n,
    duration:           durSecs,
    durationDays:       durDays,
    startTime:          (data?.[9]?.result  as bigint) ?? 0n,
    reservePercent:     reservePct,
    protocolFeePercent: protocolPct,
    collateralAmount:   (data?.[13]?.result as bigint) ?? 0n,
    expectedRevenue:    expectedRevRaw,
    grossROI,
    netROI,
    tokenAddress,
    tokenTotalSupply:   (tokenData?.[0]?.result as bigint) ?? 0n,
    stateId,
    stateName:          CYCLE_STATES[stateId] ?? "UNKNOWN",
    isFunding:          stateId === 0,
    isActive:           stateId === 1,
    isHarvestSubmitted: stateId === 2,
    isDistributed:      stateId === 3,
    isDefaulted:        stateId === 4,
    milestones,
    oracle,
    isLoading,
    isError,
  }
}
