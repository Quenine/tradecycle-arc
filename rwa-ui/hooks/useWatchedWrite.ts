"use client"

import { useWriteContract, usePublicClient } from "wagmi"
import { useQueryClient } from "@tanstack/react-query"
import { maxUint256 } from "viem"
import { NETWORK } from "@/constants/contracts"
import { useRequiredNetwork } from "@/hooks/useRequiredNetwork"

const GAS: Record<string, bigint> = {
  approve:            100_000n,
  transfer:            65_000n,
  drip:                80_000n,
  depositCollateral:  160_000n,
  withdrawCollateral: 100_000n,
  registerVerifier:   350_000n,
  approveMilestone:   100_000n,
  applyAsOperator:    800_000n,
  approveOperator:     80_000n,
  rejectOperator:      60_000n,
  setApprovalMode:     60_000n,
  createCycle:       3_800_000n,
  invest:           1_200_000n,
  releaseMilestone:   130_000n,
  submitMilestoneEvidence: 900_000n,
  submitHarvestEvidence:  900_000n,
  submitHarvest:      110_000n,
  repayAndDistribute: 1_200_000n,
  syncReserves:        80_000n,
  compensate:         140_000n,
  distribute:         220_000n,
  withdraw:           130_000n,
  triggerDefault:     130_000n,
  createSellOrder:    160_000n,
  buyOrder:           220_000n,
  cancelOrder:         80_000n,
  updateEstimate:      90_000n,
  swapExactTokensForTokens: 320_000n,
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const EMPTY_CODE = "0x"

const APPROVE_ABI = [{
  name: "approve", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ type: "bool" }],
}] as const

export function useWatchedWrite() {
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: NETWORK.chainId })
  const queryClient  = useQueryClient()
  const { ensureRequiredNetwork } = useRequiredNetwork()

  async function send(params: {
    address:      `0x${string}`
    abi:          readonly unknown[]
    functionName: string
    args?:        readonly unknown[]
    value?:       bigint
    gas?:         bigint
  }): Promise<`0x${string}`> {
    const gas  = params.gas ?? GAS[params.functionName] ?? 350_000n
    await ensureRequiredNetwork()

    if (publicClient) {
      const code = await publicClient.getCode({ address: params.address })
      if (!code || code === EMPTY_CODE) {
        throw new Error(
          `No contract found at ${params.address}. ` +
          `Check the configured address before sending ${params.functionName}.`
        )
      }
    }

    const request = { ...params, gas, chainId: NETWORK.chainId } as Parameters<typeof writeContractAsync>[0]
    const hash = await writeContractAsync(request)

    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status === "reverted") {
        throw new Error(
          `Transaction reverted on-chain: ${params.functionName}\n` +
          `View: ${NETWORK.blockExplorer}/tx/${hash}`
        )
      }
      // Give RPC nodes time to propagate state before the next tx.
      await sleep(500)
    }

    await queryClient.invalidateQueries()
    return hash
  }

  // After receipt + 500ms, the registry/vault will see the allowance.
  async function approveAmount(tokenAddress: `0x${string}`, spender: `0x${string}`, amount: bigint): Promise<void> {
    await send({
      address: tokenAddress,
      abi: APPROVE_ABI,
      functionName: "approve",
      args: [spender, amount],
      gas: GAS.approve,
    })
  }

  async function approve(tokenAddress: `0x${string}`, spender: `0x${string}`): Promise<void> {
    await approveAmount(tokenAddress, spender, maxUint256)
  }

  return { send, approve, approveAmount }
}
