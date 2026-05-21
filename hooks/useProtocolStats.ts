
"use client"
// hooks/useProtocolStats.ts
import { useReadContracts } from "wagmi"
import { CONTRACTS } from "@/constants/contracts"
import { FACTORY_V2_ABI } from "@/contracts/abis-v2"
import { RESERVE_POOL_ABI, ERC20_ABI } from "@/contracts/abis"
import { stableAmountToNumber } from "@/lib/token-units"

export interface ProtocolStats {
  totalCycles: number; cycleAddresses: string[]
  reserveBalance: number; treasuryBalance: number; isLoading: boolean
}

export function useProtocolStats(): ProtocolStats {
  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: CONTRACTS.factory,     abi: FACTORY_V2_ABI,   functionName: "getAllCycles" },
      { address: CONTRACTS.reservePool, abi: RESERVE_POOL_ABI, functionName: "reserveBalance" },
      { address: CONTRACTS.stablecoin,  abi: ERC20_ABI,        functionName: "balanceOf", args: [CONTRACTS.treasury] },
    ],
    query: { refetchInterval: 15000 },
  })
  const cycles   = (data?.[0]?.result as string[]) ?? []
  const reserve  = stableAmountToNumber((data?.[1]?.result as bigint) ?? 0n)
  const treasury = stableAmountToNumber((data?.[2]?.result as bigint) ?? 0n)
  return {
    totalCycles: cycles.length, cycleAddresses: cycles,
    reserveBalance: Math.round(reserve), treasuryBalance: Math.round(treasury), isLoading,
  }
}
