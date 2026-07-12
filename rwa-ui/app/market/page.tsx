"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { parseUnits } from "viem"
import { useAccount, useReadContracts } from "wagmi"
import Navbar from "@/components/navbar"
import ConnectWallet from "@/components/connect-wallet"
import { CONTRACTS, NETWORK, SHARE_TOKEN_DECIMALS } from "@/constants/contracts"
import { FACTORY_V2_ABI } from "@/contracts/abis-v2"
import { CYCLE_SHARE_TOKEN_ABI, PRODUCTION_CYCLE_ABI } from "@/contracts/abis"
import { useBuyOrder, useCancelOrder, useCreateSellOrder, useMarketOrders, type MarketOrder } from "@/hooks/useTokenMarketplace"
import { parseShareAmount, shareAmountToNumber } from "@/lib/token-units"

const STATE_LABELS = ["FUNDING", "ACTIVE", "HARVEST_SUBMITTED", "DISTRIBUTED", "DEFAULTED"]

type CycleOption = {
  cycle: string
  token: string
  symbol: string
  name: string
  state: number
  balance: bigint
  totalSupply: bigint
  profitPerToken: bigint
}

function CycleSelector({ selected, wallet, onSelect }: {
  selected: string
  wallet?: `0x${string}`
  onSelect: (cycle: CycleOption) => void
}) {
  const { data: factoryData } = useReadContracts({
    contracts: [{ address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "getAllCycles" }],
    query: { refetchInterval: 10000 },
  })

  const cycles = (factoryData?.[0]?.result as string[]) ?? []

  const { data } = useReadContracts({
    contracts: cycles.flatMap((cycle) => [
      { address: cycle as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "cycleToken" as const },
      { address: cycle as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "cycleSymbol" as const },
      { address: cycle as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "cycleName" as const },
      { address: cycle as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "state" as const },
      { address: cycle as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "profitPerToken" as const },
    ]),
    query: { enabled: cycles.length > 0, refetchInterval: 10000 },
  })

  const tokenAddresses = cycles
    .map((_, index) => (data?.[index * 5]?.result as string) ?? "")
    .filter(Boolean)

  const { data: tokenData } = useReadContracts({
    contracts: tokenAddresses.flatMap((token) => [
      { address: token as `0x${string}`, abi: CYCLE_SHARE_TOKEN_ABI, functionName: "balanceOf" as const, args: [wallet ?? "0x0000000000000000000000000000000000000000"] },
      { address: token as `0x${string}`, abi: CYCLE_SHARE_TOKEN_ABI, functionName: "totalSupply" as const },
    ]),
    query: { enabled: tokenAddresses.length > 0, refetchInterval: 10000 },
  })

  const options: CycleOption[] = cycles.map((cycle, index) => {
    const token = (data?.[index * 5]?.result as string) ?? ""
    const tokenIndex = tokenAddresses.indexOf(token)
    return {
      cycle,
      token,
      symbol: (data?.[index * 5 + 1]?.result as string) ?? "TOKEN",
      name: (data?.[index * 5 + 2]?.result as string) ?? cycle.slice(0, 10),
      state: Number(data?.[index * 5 + 3]?.result ?? 0),
      profitPerToken: (data?.[index * 5 + 4]?.result as bigint) ?? 0n,
      balance: tokenIndex >= 0 ? ((tokenData?.[tokenIndex * 2]?.result as bigint) ?? 0n) : 0n,
      totalSupply: tokenIndex >= 0 ? ((tokenData?.[tokenIndex * 2 + 1]?.result as bigint) ?? 0n) : 0n,
    }
  }).filter((cycle) => !!cycle.token)

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((cycle) => {
        const isRedeemOnly = cycle.state >= 3
        const active = selected.toLowerCase() === cycle.token.toLowerCase()
        return (
          <button
            key={cycle.cycle}
            onClick={() => onSelect(cycle)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: `1px solid ${active ? "rgba(201,168,76,0.55)" : "var(--border)"}`,
              background: active ? "rgba(201,168,76,0.1)" : "var(--bg-surface)",
              color: isRedeemOnly ? "var(--text-dim)" : active ? "var(--gold)" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
          >
            {cycle.symbol} · {cycle.name.slice(0, 18)} · {STATE_LABELS[cycle.state] ?? "UNKNOWN"}
          </button>
        )
      })}
      {options.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No cycle tokens are available yet.</p>}
    </div>
  )
}

function OrderRow({ order, wallet, onBuy, onCancel, buying, showToken = false, allowBuy = false }: {
  order: MarketOrder
  wallet?: `0x${string}`
  onBuy: (order: MarketOrder, amount: string) => Promise<void>
  onCancel: (order: MarketOrder) => Promise<void>
  buying: boolean
  showToken?: boolean
  allowBuy?: boolean
}) {
  const [fillAmount, setFillAmount] = useState(order.amountFormatted.toString())
  const isMine = !!wallet && order.seller.toLowerCase() === wallet.toLowerCase()
  const fill = useMemo(() => {
    try {
      const parsed = parseShareAmount(fillAmount || "0")
      return parsed > order.amount ? order.amount : parsed
    } catch {
      return 0n
    }
  }, [fillAmount, order.amount])
  const fillFormatted = shareAmountToNumber(fill)
  const grossCost = fillFormatted * order.priceFormatted

  return (
    <tr>
      {showToken && (
        <td style={{ fontFamily: "var(--font-mono)", color: "var(--gold)", fontSize: 12 }}>
          {order.token.slice(0, 8)}...{order.token.slice(-4)}
        </td>
      )}
      <td style={{ fontFamily: "var(--font-mono)" }}>{order.amountFormatted.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
      <td style={{ fontFamily: "var(--font-mono)", color: "var(--emerald)" }}>${order.priceFormatted.toFixed(4)}</td>
      <td>
        <input
          type="number"
          value={fillAmount}
          onChange={(event) => setFillAmount(event.target.value)}
          max={order.amountFormatted}
          min="0"
          style={{ width: 110, margin: 0, padding: "7px 9px", fontSize: 12 }}
        />
      </td>
      <td style={{ fontFamily: "var(--font-mono)" }}>${grossCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
      <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: 12 }}>{order.seller.slice(0, 8)}...{order.seller.slice(-4)}</td>
      <td>
        {isMine ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Your order</span>
            <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12, color: "var(--danger)", borderColor: "rgba(224,82,82,0.3)" }} onClick={() => onCancel(order)} disabled={buying}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => onBuy(order, fillAmount)} disabled={buying || fill === 0n || !allowBuy}>
            {!allowBuy ? "Select active cycle" : buying ? "Working..." : "Buy"}
          </button>
        )}
      </td>
    </tr>
  )
}

export default function MarketPage() {
  const { address } = useAccount()
  const [selectedCycle, setSelectedCycle] = useState<CycleOption | null>(null)
  const [sellAmount, setSellAmount] = useState("")
  const [sellPrice, setSellPrice] = useState("1")
  const [busy, setBusy] = useState("")
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error"; hash?: string } | null>(null)

  const { orders: allOrders, orderCount, refetch: refetchAllOrders } = useMarketOrders()
  const { orders, tradingFeeBps, lowestListing, highestListing, refetch: refetchSelectedOrders } = useMarketOrders(selectedCycle?.token)
  const { createOrder } = useCreateSellOrder()
  const { buyOrder } = useBuyOrder()
  const { cancelOrder } = useCancelOrder()

  function showToast(msg: string, type: "success" | "error" = "success", hash?: string) {
    setToast({ msg, type, hash })
    setTimeout(() => setToast(null), 7000)
  }

  async function refreshOrders() {
    await refetchAllOrders()
    await refetchSelectedOrders()
    showToast("Marketplace orders refreshed")
  }

  const tradeEnabled = !!selectedCycle && selectedCycle.state < 3
  const myBalance = selectedCycle ? shareAmountToNumber(selectedCycle.balance) : 0
  const sellAmountParsed = useMemo(() => {
    try { return parseUnits(sellAmount || "0", SHARE_TOKEN_DECIMALS) } catch { return 0n }
  }, [sellAmount])
  const canSell = !!address && tradeEnabled && sellAmountParsed > 0n && selectedCycle !== null && sellAmountParsed <= selectedCycle.balance && Number(sellPrice) > 0
  const feePct = Number(tradingFeeBps) / 100
  const sellGross = (Number(sellAmount) || 0) * (Number(sellPrice) || 0)
  const sellFee = sellGross * feePct / 100
  const sellNet = Math.max(0, sellGross - sellFee)
  const myListings = allOrders.filter(order => address && order.seller.toLowerCase() === address.toLowerCase())

  async function handleCreateOrder() {
    if (!selectedCycle || !canSell) return
    setBusy("sell")
    try {
      const hash = await createOrder(selectedCycle.token, sellAmount, sellPrice)
      showToast(`Listed ${sellAmount} ${selectedCycle.symbol} at $${sellPrice} each.`, "success", hash)
      setSellAmount("")
      setTimeout(refreshOrders, 1200)
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Listing failed", "error")
    } finally {
      setBusy("")
    }
  }

  async function handleBuy(order: MarketOrder, amount: string) {
    setBusy(`buy-${order.id}`)
    try {
      const fill = parseShareAmount(amount || "0")
      if (fill === 0n) throw new Error("Enter a fill amount")
      if (fill > order.amount) throw new Error("Fill amount is greater than the order size")
      const hash = await buyOrder(order.id, fill)
      showToast(`Bought ${shareAmountToNumber(fill).toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens.`, "success", hash)
      setTimeout(refreshOrders, 1200)
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Buy failed", "error")
    } finally {
      setBusy("")
    }
  }

  async function handleCancel(order: MarketOrder) {
    setBusy(`cancel-${order.id}`)
    try {
      const hash = await cancelOrder(order.id)
      showToast("Order cancelled and remaining tokens returned.", "success", hash)
      setTimeout(refreshOrders, 1200)
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Cancel failed", "error")
    } finally {
      setBusy("")
    }
  }

  if (!address) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 32px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, marginBottom: 12 }}>Cycle token market</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 28 }}>Cycle tokens are transferable settlement positions minted when investors fund a cycle. The order book escrows listed tokens, supports partial fills, and transfers settlement rights to buyers. Current holders redeem after distribution or default. Liquidity depends on active listings and willing counterparties. Connect to trade or manage listings.</p>
        <ConnectWallet />
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Secondary market</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 400, marginBottom: 8 }}>Trade cycle tokens</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 720, lineHeight: 1.7 }}>
            Cycle-share tokens represent transferable settlement positions. Sellers escrow tokens in the order book; buyers may partially or fully fill listings with USDC. Current holders redeem after distribution or default. Liquidity and exit timing depend on active listings and counterparties.
          </p>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Select cycle token</p>
          <CycleSelector selected={selectedCycle?.token ?? ""} wallet={address} onSelect={setSelectedCycle} />
        </div>

        <div className="card" style={{ padding: 22, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>All active sell orders</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Buyers purchase from active sell orders. Your own listings show as cancellable escrow positions; another wallet sees Buy.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--gold)" }}>{allOrders.length} live · {orderCount} total</span>
              <button className="btn-ghost" onClick={refreshOrders} style={{ padding: "6px 12px", fontSize: 12 }}>Refresh</button>
            </div>
          </div>
          {allOrders.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", background: "var(--bg-surface)", borderRadius: 8 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No active sell orders on the marketplace yet.</p>
              {orderCount > 0 && (
                <p style={{ color: "var(--warning)", fontSize: 12, marginTop: 8 }}>
                  Historical orders exist, but none are currently active for buying.
                </p>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Available</th>
                  <th>Price</th>
                  <th>Fill amount</th>
                  <th>You pay</th>
                  <th>Seller</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((order) => (
                  <OrderRow
                    key={`all-${order.id}`}
                    order={order}
                    wallet={address}
                    onBuy={handleBuy}
                    onCancel={handleCancel}
                    buying={busy === `buy-${order.id}` || busy === `cancel-${order.id}`}
                    showToken
                    allowBuy={false}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedCycle && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
                <div>
                  <p style={{ fontSize: 11, color: "var(--gold)", fontFamily: "var(--font-mono)", marginBottom: 5 }}>{selectedCycle.symbol}</p>
                  <h2 style={{ fontSize: 22, fontFamily: "var(--font-display)", fontWeight: 400 }}>{selectedCycle.name}</h2>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 5 }}>{STATE_LABELS[selectedCycle.state] ?? "UNKNOWN"} · Token {selectedCycle.token.slice(0, 10)}...{selectedCycle.token.slice(-6)}</p>
                </div>
                <Link href={`/cycle/${selectedCycle.cycle}`} className="btn-ghost" style={{ textDecoration: "none", height: 38, padding: "9px 14px", fontSize: 12 }}>View cycle</Link>
              </div>

              {!tradeEnabled && (
                <div style={{ padding: 14, borderRadius: 8, background: "rgba(100,149,237,0.08)", border: "1px solid rgba(100,149,237,0.25)", marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: "#8fb3ff", lineHeight: 1.6 }}>This cycle is no longer an active trading market. Holders should redeem from Portfolio instead of listing new orders.</p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 18 }}>
                {[
                  ["Your balance", `${myBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${selectedCycle.symbol}`],
                  ["Open orders", orders.length.toString()],
                  ["My open listings", myListings.filter(order => order.token.toLowerCase() === selectedCycle.token.toLowerCase()).length.toString()],
                  ["Lowest ask", lowestListing === null ? "-" : `$${lowestListing.toFixed(4)}`],
                  ["Highest ask", highestListing === null ? "-" : `$${highestListing.toFixed(4)}`],
                ].map(([label, value]) => (
                  <div key={label} className="stat-card">
                    <p className="stat-label">{label}</p>
                    <p style={{ fontSize: 18, fontFamily: "var(--font-display)" }}>{value}</p>
                  </div>
                ))}
              </div>

              {orders.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", background: "var(--bg-surface)", borderRadius: 8 }}>
                  <p style={{ color: "var(--text-muted)" }}>No sell orders for this token yet.</p>
                  {allOrders.length > 0 && (
                    <p style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 8 }}>
                      There are live orders for other cycle tokens above. Select the token that matches the order you want to trade.
                    </p>
                  )}
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Available</th>
                      <th>Price</th>
                      <th>Fill amount</th>
                      <th>You pay</th>
                      <th>Seller</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        wallet={address}
                        onBuy={handleBuy}
                        onCancel={handleCancel}
                        buying={busy === `buy-${order.id}` || busy === `cancel-${order.id}`}
                        allowBuy={tradeEnabled}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="card" style={{ padding: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Create sell order</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 14 }}>
                  Tokens are escrowed until the order fills or you cancel it. If the cycle distributes while listed, cancel first, then redeem from Portfolio.
                </p>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Amount ({selectedCycle.symbol})</label>
                <input type="number" value={sellAmount} min="0" max={myBalance} onChange={(event) => setSellAmount(event.target.value)} placeholder="0.0" />
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", margin: "12px 0 5px" }}>Price per token (USDC)</label>
                <input type="number" value={sellPrice} min="0" onChange={(event) => setSellPrice(event.target.value)} placeholder="1.00" />
                <div style={{ marginTop:12, padding:12, background:"var(--bg-surface)", borderRadius:8, fontSize:12 }}><p>Expected gross: ${sellGross.toFixed(2)} USDC</p><p style={{ color:"var(--text-muted)" }}>Fee estimate ({feePct}%): ${sellFee.toFixed(2)}</p><p style={{ color:"var(--emerald)" }}>Estimated seller proceeds: ${sellNet.toFixed(2)} USDC</p></div>
                <button className="btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={handleCreateOrder} disabled={!canSell || busy === "sell"}>
                  {busy === "sell" ? "Listing..." : "List tokens"}
                </button>
                {myBalance > 0 && (
                  <button className="btn-ghost" style={{ width: "100%", marginTop: 10, fontSize: 12 }} onClick={() => setSellAmount(String(myBalance))}>
                    Use max balance
                  </button>
                )}
                {sellAmountParsed > selectedCycle.balance && (
                  <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 8 }}>Amount exceeds your wallet balance.</p>
                )}
                {!canSell && sellAmount && sellAmountParsed <= selectedCycle.balance && Number(sellPrice) > 0 && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                    Listing requires an active cycle, a connected wallet, and a positive token amount.
                  </p>
                )}
              </div>

              <div className="card" style={{ padding: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Settlement rights</p>
                {[
                  ["Before distribution", "Cycle tokens can move between wallets through this order book."],
                  ["At distribution", "The cycle stores profit per token, not a fixed investor snapshot."],
                  ["Redemption", "Whoever holds tokens after distribution withdraws that wallet's share."],
                  ["Fee", `${feePct}% trading fee is deducted from seller proceeds and sent to treasury.`],
                ].map(([label, text]) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 12, lineHeight: 1.5 }}>{text}</p>
                  </div>
                ))}
                <Link href="/portfolio" className="btn-ghost" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}>Open Portfolio</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{toast.type === "success" ? "✓" : "✕"}</span>
          <div>
            <p>{toast.msg}</p>
            {toast.hash && <a href={`${NETWORK.blockExplorer}/tx/${toast.hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--gold)", fontFamily: "var(--font-mono)", textDecoration: "none" }}>View on {NETWORK.blockExplorerName} ↗</a>}
          </div>
        </div>
      )}
    </div>
  )
}
