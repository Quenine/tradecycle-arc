"use client"

import { useReadContracts } from "wagmi"
import { CONTRACTS } from "@/constants/contracts"
import { YIELD_ORACLE_ABI } from "@/contracts/abis"
import { computeOracleEstimate, formatOracleEstimate, type OracleEstimate } from "@/lib/oracle-engine"
import { stableAmountToNumber } from "@/lib/token-units"

interface AutoOracleResult {
  estimate: ReturnType<typeof formatOracleEstimate> | null
  raw: OracleEstimate | null
  source: "on-chain" | "computed" | "none"
  isLoading: boolean
}

export function useAutoOracle(params: {
  cycleAddress:        string
  capitalRequired:     bigint
  collateralAmount:    bigint
  durationDays:        number
  category:            string
  protocolFeePercent:  number
  reservePercent:      number
  skip?:               boolean
}): AutoOracleResult {
  const { cycleAddress, capitalRequired, collateralAmount, durationDays,
          category, protocolFeePercent, reservePercent, skip } = params

  const { data, isLoading } = useReadContracts({
    contracts: [{
      address:      CONTRACTS.yieldOracle,
      abi:          YIELD_ORACLE_ABI,
      functionName: "estimates",
      args:         [cycleAddress as `0x${string}`],
    }],
    query: { enabled: !skip && !!cycleAddress, refetchInterval: 15000 },
  })

  const onChain = data?.[0]?.result as any

  // On-chain oracle data takes full priority
  if (onChain?.exists) {
    const grossROI    = Number(onChain.estimatedROI)     // contract stores (profit*100)/cost
    const totalFees   = protocolFeePercent + reservePercent
    const capNum      = stableAmountToNumber(capitalRequired)
    const profitNum   = stableAmountToNumber(onChain.estimatedProfit)
    const profitAfter = profitNum * (1 - totalFees / 100)
    const netROI      = capNum > 0 ? Math.round((profitAfter / capNum) * 100) : 0

    const raw: OracleEstimate = {
      expectedRevenue:  onChain.expectedRevenue,
      estimatedCost:    onChain.estimatedCost,
      estimatedProfit:  onChain.estimatedProfit,
      estimatedROI:     grossROI,
      netROI,
      riskScore:        Number(onChain.riskScore),
      confidence:       "high",
      reasoning:        `On-chain oracle — gross ROI ${grossROI}%, net to investors after ${totalFees}% fees: ${netROI}%.`,
    }
    return { estimate: formatOracleEstimate(raw), raw, source: "on-chain", isLoading: false }
  }

  // Fallback: client-side estimate from cycle parameters
  if (!skip && capitalRequired > 0n && durationDays > 0) {
    const raw = computeOracleEstimate({
      capitalRequired, collateralAmount, durationDays,
      category, protocolFeePercent, reservePercent,
    })
    return { estimate: formatOracleEstimate(raw), raw, source: "computed", isLoading }
  }

  return { estimate: null, raw: null, source: "none", isLoading }
}
