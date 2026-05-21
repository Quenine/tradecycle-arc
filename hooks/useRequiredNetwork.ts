"use client"

import { useCallback } from "react"
import { useChainId, useSwitchChain } from "wagmi"
import { NETWORK } from "@/constants/contracts"
import { switchInjectedWalletToArc } from "@/lib/wallet-network"

export function useRequiredNetwork() {
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const ensureRequiredNetwork = useCallback(async () => {
    if (chainId === NETWORK.chainId) return

    try {
      await switchChainAsync({ chainId: NETWORK.chainId })
    } catch {
      await switchInjectedWalletToArc()
    }
  }, [chainId, switchChainAsync])

  return {
    chainId,
    isRequiredNetwork: chainId === NETWORK.chainId,
    ensureRequiredNetwork,
  }
}
