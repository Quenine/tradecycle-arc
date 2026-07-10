"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import Link from "next/link"
import Navbar from "@/components/navbar"
import { usePortfolio } from "@/hooks/usePortfolio"
import { useWatchedWrite } from "@/hooks/useWatchedWrite"
import { PRODUCTION_CYCLE_ABI } from "@/contracts/abis"
import { NETWORK } from "@/constants/contracts"
import ConnectWallet from "@/components/connect-wallet"

const STATE_COLOR: Record<string,string> = {
  FUNDING:           "var(--gold)",
  ACTIVE:            "var(--emerald)",
  HARVEST_SUBMITTED: "var(--warning)",
  DISTRIBUTED:       "#6495ED",
  DEFAULTED:         "var(--danger)",
}

export default function PortfolioPage() {
  const { address } = useAccount()
  const { positions, totalInvestedUSD, activeCount, completedCount, defaultedCount, isLoading } = usePortfolio()
  const { send } = useWatchedWrite()

  const [busyAddr, setBusyAddr] = useState("")
  const [toast, setToast] = useState<{ msg: string; type: "success"|"error"; hash?: string }|null>(null)

  function showToast(msg: string, type: "success"|"error" = "success", hash?: string) {
    setToast({ msg, type, hash }); setTimeout(() => setToast(null), 7000)
  }

  async function handleWithdraw(cycleAddr: string, isDefault: boolean) {
    setBusyAddr(cycleAddr)
    try {
      const fn = isDefault ? "withdrawAfterDefault" : "withdraw"
      const hash = await send({ address: cycleAddr as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: fn })
      showToast(
        isDefault
          ? "Default recovery complete — your share of remaining capital is in your wallet."
          : "Withdrawal complete — principal + yield in your wallet!",
        "success", hash
      )
    } catch (e: any) { showToast(e?.shortMessage ?? e?.message ?? "Withdrawal failed", "error") }
    setBusyAddr("")
  }

  if (!address) return (
    <div style={{ minHeight:"100vh", background:"var(--bg-void)" }}><Navbar />
      <div style={{ maxWidth:500, margin:"120px auto", textAlign:"center", padding:"0 32px" }}>
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:400, marginBottom:12 }}>Your portfolio</h2>
        <p style={{ color:"var(--text-muted)", fontSize:14, marginBottom:28 }}>Connect your wallet to see your positions.</p>
        <ConnectWallet />
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-void)" }}>
      <Navbar />
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"48px 32px" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:32 }}>
          <div>
            <p style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--gold)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Your portfolio</p>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:36, fontWeight:400 }}>Positions</h1>
          </div>
          <p style={{ fontSize:12, fontFamily:"var(--font-mono)", color:"var(--text-dim)" }}>{address.slice(0,8)}…{address.slice(-6)}</p>
        </div>

        {/* Summary stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:32 }}>
          {[
            { label:"Total invested", value:`$${totalInvestedUSD.toLocaleString(undefined,{maximumFractionDigits:0})}`, color:"var(--text-primary)" },
            { label:"Active",         value:activeCount.toString(),     color:"var(--emerald)" },
            { label:"Completed",      value:completedCount.toString(),  color:"#6495ED" },
            { label:"Defaulted",      value:defaultedCount.toString(),  color:defaultedCount > 0 ? "var(--danger)" : "var(--text-dim)" },
            { label:"Positions",      value:positions.length.toString(),color:"var(--text-primary)" },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p className="stat-label">{s.label}</p>
              <p style={{ fontSize:28, fontFamily:"var(--font-display)", color:s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div style={{ textAlign:"center", padding:80, color:"var(--text-muted)", fontFamily:"var(--font-mono)", fontSize:13 }}>Loading positions from chain…</div>
        ) : positions.length === 0 ? (
          <div style={{ textAlign:"center", padding:80, background:"var(--bg-card)", borderRadius:12, border:"1px solid var(--border)" }}>
            <p style={{ fontSize:32, marginBottom:12, color:"var(--text-dim)" }}>◈</p>
            <p style={{ color:"var(--text-muted)", fontSize:16, marginBottom:8 }}>No positions yet</p>
            <p style={{ color:"var(--text-dim)", fontSize:13, marginBottom:24 }}>Invest in a production cycle to see it here.</p>
            <Link href="/" className="btn-primary" style={{ textDecoration:"none" }}>Browse cycles →</Link>
          </div>
        ) : (
          <div className="card" style={{ overflow:"hidden" }}>
            <table>
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Token</th>
                  <th>Your balance</th>
                  <th>Share</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const c   = STATE_COLOR[p.stateName] ?? "var(--text-muted)"
                  const busy = busyAddr === p.cycleAddress
                  return (
                    <tr key={p.cycleAddress}>
                      <td>
                        <p style={{ fontWeight:500 }}>{p.cycleName || "Unnamed"}</p>
                        <p style={{ fontSize:11, color:"var(--text-muted)" }}>📍 {p.location}</p>
                      </td>
                      <td>
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--gold)" }}>{p.cycleSymbol}</span>
                      </td>
                      <td style={{ fontFamily:"var(--font-mono)" }}>
                        {p.tokenBalanceFormatted.toLocaleString(undefined,{maximumFractionDigits:2})}
                      </td>
                      <td style={{ fontFamily:"var(--font-mono)", color:"var(--text-muted)" }}>
                        {p.sharePercent.toFixed(2)}%
                      </td>
                      <td style={{ fontFamily:"var(--font-mono)", color: p.canWithdraw || p.canRecoverDefault ? "var(--emerald)" : "var(--text-primary)" }}>
                        ${p.estimatedPayoutUSD.toLocaleString(undefined,{maximumFractionDigits:2})}
                      </td>
                      <td>
                        <span style={{ padding:"3px 10px", borderRadius:100, fontSize:11, fontFamily:"var(--font-mono)", textTransform:"uppercase", background:`${c}18`, color:c, border:`1px solid ${c}33` }}>
                          {p.stateName}
                        </span>
                      </td>
                      <td>
                        {p.canWithdraw ? (
                          <button className="btn-primary" style={{ padding:"5px 14px", fontSize:12, background:"linear-gradient(135deg,#2DD4A0,#1a9e78)", opacity: busy ? 0.6 : 1 }}
                            onClick={() => handleWithdraw(p.cycleAddress, false)} disabled={busy}>
                            {busy ? "…" : "Withdraw →"}
                          </button>
                        ) : p.canRecoverDefault ? (
                          <button className="btn-primary" style={{ padding:"5px 14px", fontSize:12, background:"linear-gradient(135deg,#E05252,#a83232)", opacity: busy ? 0.6 : 1 }}
                            onClick={() => handleWithdraw(p.cycleAddress, true)} disabled={busy}>
                            {busy ? "…" : "Recover →"}
                          </button>
                        ) : (
                          <Link href={`/cycle/${p.cycleAddress}`} style={{ fontSize:12, color:"var(--gold)", textDecoration:"none", padding:"5px 12px", border:"1px solid rgba(201,168,76,0.3)", borderRadius:6 }}>
                            View →
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Default recovery note */}
        {defaultedCount > 0 && (
          <div style={{ marginTop:16, padding:16, background:"rgba(224,82,82,0.06)", borderRadius:12, border:"1px solid rgba(224,82,82,0.2)" }}>
            <p style={{ fontWeight:500, color:"var(--danger)", marginBottom:4 }}>Default recovery</p>
            <p style={{ fontSize:13, color:"var(--text-muted)", lineHeight:1.7 }}>
              One or more cycles have defaulted. Click <strong>Recover</strong> to claim your proportional share of the remaining on-chain balance, slashed collateral, and any reserve-pool compensation added by admin.
            </p>
          </div>
        )}

        {positions.some(p => p.stateId < 3) && (
          <div style={{ marginTop:20, padding:20, background:"var(--bg-card)", borderRadius:12, border:"1px solid var(--border-gold)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontWeight:500, marginBottom:4 }}>Need liquidity before a cycle ends?</p>
              <p style={{ fontSize:13, color:"var(--text-muted)" }}>Cycle tokens are real ERC-20s — list them on the secondary market for early exit.</p>
            </div>
            <Link href="/market" className="btn-ghost" style={{ textDecoration:"none", flexShrink:0, marginLeft:24 }}>Open marketplace →</Link>
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span style={{ fontSize:16, flexShrink:0 }}>{toast.type === "success" ? "✓" : "✕"}</span>
          <div>
            <p>{toast.msg}</p>
            {toast.hash && <a href={`${NETWORK.blockExplorer}/tx/${toast.hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"var(--gold)", fontFamily:"var(--font-mono)", textDecoration:"none" }}>View on {NETWORK.blockExplorerName} ↗</a>}
          </div>
        </div>
      )}
    </div>
  )
}
