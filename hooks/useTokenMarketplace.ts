"use client"

import { useReadContracts, useWriteContract, usePublicClient, useAccount } from "wagmi"
import { parseUnits, formatUnits, maxUint256 } from "viem"
import { useQueryClient } from "@tanstack/react-query"
import { CONTRACTS, NETWORK, SHARE_TOKEN_DECIMALS, STABLECOIN } from "@/constants/contracts"
import { TOKEN_MARKETPLACE_ABI, ERC20_ABI } from "@/contracts/abis"
import { useRequiredNetwork } from "@/hooks/useRequiredNetwork"

export interface MarketOrder {
  id:              number
  seller:          string
  token:           string
  amount:          bigint
  amountFormatted: number
  pricePerToken:   bigint
  priceFormatted:  number
  totalUSD:        number
  active:          boolean
}

type RawMarketOrder = {
  id?: bigint
  seller?: string
  token?: string
  amount?: bigint
  originalAmount?: bigint
  pricePerToken?: bigint
  active?: boolean
  0?: bigint
  1?: string
  2?: string
  3?: bigint
  4?: bigint
  5?: bigint
  6?: boolean
}

const SHARE_TOKEN_SCALE = 10n ** BigInt(SHARE_TOKEN_DECIMALS)

const GAS = {
  approve:         70_000n,
  createSellOrder: 280_000n,
  buyOrder:        280_000n,
  cancelOrder:     100_000n,
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))


type WriteContractFn = (params: {
  address: `0x${string}`
  abi: readonly unknown[]
  functionName: string
  args?: readonly unknown[]
  gas?: bigint
  chainId?: number
}) => Promise<`0x${string}`>

type PublicClientLike = {
  waitForTransactionReceipt: (params: { hash: `0x${string}` }) => Promise<{ status: "success" | "reverted" }>
}
async function doApprove(
  wca: WriteContractFn, pc: PublicClientLike,
  token: `0x${string}`, spender: `0x${string}`,
) {
  const hash = await wca({
    address: token, abi: ERC20_ABI,
    functionName: "approve", args: [spender, maxUint256],
    gas: GAS.approve,
    chainId: NETWORK.chainId,
  })
  const receipt = await pc.waitForTransactionReceipt({ hash })
  if (receipt.status === "reverted") throw new Error(`Token approve reverted. TX: ${hash}`)
  await sleep(600)
}

async function doWrite(wca: WriteContractFn, pc: PublicClientLike, params: {
  address: `0x${string}`
  abi: readonly unknown[]
  functionName: string
  args: readonly unknown[]
  gas: bigint
}): Promise<`0x${string}`> {
  const hash = await wca({ ...params, chainId: NETWORK.chainId })
  const receipt = await pc.waitForTransactionReceipt({ hash })
  if (receipt.status === "reverted") {
    throw new Error(`${params.functionName} reverted on-chain. TX: ${NETWORK.blockExplorer}/tx/${hash}`)
  }
  await sleep(600)
  return hash
}

export function useMarketOrders(filterToken?: string) {
  const { data: marketData, refetch: refetchMarketData } = useReadContracts({
    contracts: [
      {
        chainId: NETWORK.chainId,
        address: CONTRACTS.tokenMarketplace,
        abi: TOKEN_MARKETPLACE_ABI,
        functionName: "nextOrderId",
      },
      {
        chainId: NETWORK.chainId,
        address: CONTRACTS.tokenMarketplace,
        abi: TOKEN_MARKETPLACE_ABI,
        functionName: "tradingFeeBps",
      },
    ],
    query: { refetchInterval: 5000 },
  })

  const orderCount = Number(marketData?.[0]?.result ?? 0n)
  const tradingFeeBps = (marketData?.[1]?.result as bigint) ?? 0n
  const orderIds = Array.from({ length: Math.min(orderCount, 300) }, (_, i) => i)

  const { data: orderData, isLoading, refetch: refetchOrderData } = useReadContracts({
    contracts: orderIds.map(id => ({
      chainId: NETWORK.chainId,
      address: CONTRACTS.tokenMarketplace,
      abi: TOKEN_MARKETPLACE_ABI,
      functionName: "orders" as const,
      args: [BigInt(id)] as const,
    })),
    query: { enabled: orderIds.length > 0, refetchInterval: 5000 },
  })

  const orders: MarketOrder[] = (orderData ?? [])
    .map((d) => {
      const r = d?.result as RawMarketOrder | undefined
      if (!r) return null

      const id = r.id ?? r[0]
      const seller = r.seller ?? r[1]
      const token = r.token ?? r[2]
      const amount = r.amount ?? r[3]
      const pricePerToken = r.pricePerToken ?? r[5]
      const active = r.active ?? r[6]

      if (!active || id === undefined || !seller || !token || amount === undefined || pricePerToken === undefined) return null

      const amountFormatted = Number(formatUnits(amount, SHARE_TOKEN_DECIMALS))
      const priceFormatted = Number(formatUnits(pricePerToken, STABLECOIN.decimals))
      return {
        id: Number(id),
        seller,
        token,
        amount,
        amountFormatted,
        pricePerToken,
        priceFormatted,
        totalUSD: amountFormatted * priceFormatted,
        active: true,
      }
    })
    .filter((o): o is MarketOrder => !!o)
    .filter(o => !filterToken || o.token.toLowerCase() === filterToken.toLowerCase())

  const highestListing = orders.length > 0 ? Math.max(...orders.map(o => o.priceFormatted)) : null
  const lowestListing = orders.length > 0 ? Math.min(...orders.map(o => o.priceFormatted)) : null
  const lastPrice = lowestListing

  async function refetch() {
    await refetchMarketData()
    await refetchOrderData()
  }

  return { orders, isLoading, orderCount, highestListing, lowestListing, lastPrice, tradingFeeBps, refetch }
}

export function useCreateSellOrder() {
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: NETWORK.chainId })
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { ensureRequiredNetwork } = useRequiredNetwork()

  async function createOrder(
    tokenAddress: string,
    amount: string,
    pricePerToken: string,
  ) {
    if (!publicClient || !address) throw new Error("Wallet not connected")
    await ensureRequiredNetwork()

    const amtWei = parseUnits(amount, SHARE_TOKEN_DECIMALS)
    const priceWei = parseUnits(pricePerToken, STABLECOIN.decimals)

    if (amtWei === 0n) throw new Error("Amount must be greater than zero")
    if (priceWei === 0n) throw new Error("Price must be greater than zero")

    await doApprove(writeContractAsync, publicClient, tokenAddress as `0x${string}`, CONTRACTS.tokenMarketplace)

    const tx = await doWrite(writeContractAsync, publicClient, {
      address: CONTRACTS.tokenMarketplace,
      abi: TOKEN_MARKETPLACE_ABI,
      functionName: "createSellOrder",
      args: [tokenAddress as `0x${string}`, amtWei, priceWei],
      gas: GAS.createSellOrder,
    })

    await queryClient.invalidateQueries()
    return tx
  }

  return { createOrder }
}

export function useBuyOrder() {
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: NETWORK.chainId })
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { ensureRequiredNetwork } = useRequiredNetwork()

  async function buyOrder(orderId: number, fillAmount: bigint) {
    if (!publicClient || !address) throw new Error("Wallet not connected")
    await ensureRequiredNetwork()

    await doApprove(writeContractAsync, publicClient, CONTRACTS.stablecoin, CONTRACTS.tokenMarketplace)

    const tx = await doWrite(writeContractAsync, publicClient, {
      address: CONTRACTS.tokenMarketplace,
      abi: TOKEN_MARKETPLACE_ABI,
      functionName: "buyOrder",
      args: [BigInt(orderId), fillAmount],
      gas: GAS.buyOrder,
    })

    await queryClient.invalidateQueries()
    return tx
  }

  return { buyOrder }
}

export function useMarketBuy() {
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: NETWORK.chainId })
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { ensureRequiredNetwork } = useRequiredNetwork()

  async function marketBuy(
    tokenAddress: string,
    usdcBudget: string,
    orders: MarketOrder[],
  ): Promise<{ filled: number; spent: number; txHashes: string[] }> {
    if (!publicClient || !address) throw new Error("Wallet not connected")
    await ensureRequiredNetwork()

    const budget = parseUnits(usdcBudget, STABLECOIN.decimals)
    const cheapest = [...orders]
      .filter(o => o.token.toLowerCase() === tokenAddress.toLowerCase())
      .sort((a, b) => a.priceFormatted - b.priceFormatted)

    if (cheapest.length === 0) throw new Error("No orders available for this token")

    await doApprove(writeContractAsync, publicClient, CONTRACTS.stablecoin, CONTRACTS.tokenMarketplace)

    let remaining = budget
    let totalFilled = 0
    let totalSpent = 0n
    const txHashes: string[] = []

    for (const order of cheapest) {
      if (remaining === 0n) break

      const maxTokens = (remaining * SHARE_TOKEN_SCALE) / order.pricePerToken
      const fillAmt = maxTokens < order.amount ? maxTokens : order.amount
      if (fillAmt === 0n) continue

      const grossCost = (fillAmt * order.pricePerToken) / SHARE_TOKEN_SCALE
      const totalCost = grossCost

      const tx = await doWrite(writeContractAsync, publicClient, {
        address: CONTRACTS.tokenMarketplace,
        abi: TOKEN_MARKETPLACE_ABI,
        functionName: "buyOrder",
        args: [BigInt(order.id), fillAmt],
        gas: GAS.buyOrder,
      })

      txHashes.push(tx)
      totalFilled += Number(formatUnits(fillAmt, SHARE_TOKEN_DECIMALS))
      totalSpent += totalCost
      remaining = totalCost >= remaining ? 0n : remaining - totalCost
    }

    await queryClient.invalidateQueries()
    return {
      filled: totalFilled,
      spent: Number(formatUnits(totalSpent, STABLECOIN.decimals)),
      txHashes,
    }
  }

  return { marketBuy }
}

export function useMarketSell() {
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: NETWORK.chainId })
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { ensureRequiredNetwork } = useRequiredNetwork()

  async function marketSell(
    tokenAddress: string,
    amount: string,
    bestAskPrice: bigint,
  ) {
    if (!publicClient || !address) throw new Error("Wallet not connected")
    await ensureRequiredNetwork()
    if (!tokenAddress) throw new Error("No token selected")
    if (!amount) throw new Error("Amount required")
    if (bestAskPrice <= 0n) throw new Error("No live market price available yet")

    const amtWei = parseUnits(amount, SHARE_TOKEN_DECIMALS)
    if (amtWei === 0n) throw new Error("Amount must be greater than zero")

    const aggressivePrice = bestAskPrice > 1n ? (bestAskPrice * 999n) / 1000n : bestAskPrice

    await doApprove(writeContractAsync, publicClient, tokenAddress as `0x${string}`, CONTRACTS.tokenMarketplace)

    const tx = await doWrite(writeContractAsync, publicClient, {
      address: CONTRACTS.tokenMarketplace,
      abi: TOKEN_MARKETPLACE_ABI,
      functionName: "createSellOrder",
      args: [tokenAddress as `0x${string}`, amtWei, aggressivePrice],
      gas: GAS.createSellOrder,
    })

    await queryClient.invalidateQueries()
    return { tx, pricePerToken: aggressivePrice }
  }

  return { marketSell }
}

export function useCancelOrder() {
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: NETWORK.chainId })
  const queryClient = useQueryClient()
  const { ensureRequiredNetwork } = useRequiredNetwork()

  async function cancelOrder(orderId: number) {
    if (!publicClient) throw new Error("No client")
    await ensureRequiredNetwork()
    const tx = await doWrite(writeContractAsync, publicClient, {
      address: CONTRACTS.tokenMarketplace,
      abi: TOKEN_MARKETPLACE_ABI,
      functionName: "cancelOrder",
      args: [BigInt(orderId)],
      gas: GAS.cancelOrder,
    })
    await queryClient.invalidateQueries()
    return tx
  }

  return { cancelOrder }
}
