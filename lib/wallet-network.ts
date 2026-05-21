"use client"

import { NETWORK } from "@/constants/contracts"

type WalletProvider = {
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function toHexChainId(chainId: number) {
  return `0x${chainId.toString(16)}`
}

export const ARC_TESTNET_PARAMS = {
  chainId: toHexChainId(NETWORK.chainId),
  chainName: NETWORK.name,
  nativeCurrency: NETWORK.nativeCurrency,
  rpcUrls: [NETWORK.rpcUrl],
  blockExplorerUrls: [NETWORK.blockExplorer],
}

function getProvider(): WalletProvider | undefined {
  if (typeof window === "undefined") return undefined
  return (window as unknown as { ethereum?: WalletProvider }).ethereum
}

export async function addArcTestnetToWallet() {
  const provider = getProvider()
  if (!provider?.request) throw new Error("No EVM wallet provider found")
  await provider.request({
    method: "wallet_addEthereumChain",
    params: [ARC_TESTNET_PARAMS],
  })
}

export async function switchInjectedWalletToArc() {
  const provider = getProvider()
  if (!provider?.request) throw new Error("No EVM wallet provider found")

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET_PARAMS.chainId }],
    })
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code !== 4902) throw error
    await addArcTestnetToWallet()
  }
}
