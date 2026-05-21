"use client"

import { useReadContract } from "wagmi"
import { CONTRACTS } from "@/constants/contracts"
import { factoryABI } from "@/contracts/factoryABI"

export function useCycles() {

const { data, isLoading } = useReadContract({
address: CONTRACTS.factory as `0x${string}`,
abi: factoryABI,
functionName: "getAllCycles",
})

return {
cycles: (data as string[]) ?? [],
loading: isLoading
}

}