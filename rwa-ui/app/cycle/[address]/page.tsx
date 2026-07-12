"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { useAccount, useReadContracts } from "wagmi"
import Link from "next/link"
import Navbar from "@/components/navbar"
import { useCycleData } from "@/hooks/useCycleData"
import { useMarketOrders } from "@/hooks/useTokenMarketplace"
import { useWatchedWrite } from "@/hooks/useWatchedWrite"
import { getErrorMessage } from "@/lib/error-message"
import { CONTRACTS, NETWORK } from "@/constants/contracts"
import { PRODUCTION_CYCLE_ABI, VERIFIER_REGISTRY_ABI, CYCLE_SHARE_TOKEN_ABI, COLLATERAL_VAULT_ABI } from "@/contracts/abis"
import { formatShareAmount, parseStableAmount, stableAmountToNumber } from "@/lib/token-units"

const RISK_LABELS = ["","Very Low","Low","Moderate","Elevated","High","Significant","Severe","Critical","Extreme","Maximum"]
function riskColor(s: number) { return s <= 2 ? "var(--emerald)" : s <= 5 ? "var(--warning)" : "var(--danger)" }
function sc(n: string): string {
  const m: Record<string,string> = { FUNDING:"var(--gold)", ACTIVE:"var(--emerald)", HARVEST_SUBMITTED:"var(--warning)", DISTRIBUTED:"#6495ED", DEFAULTED:"var(--danger)" }
  return m[n] ?? "var(--text-muted)"
}

function TxBtn({ label, pending, onClick, disabled, style, danger }: {
  label: string; pending: string; onClick: () => Promise<void>
  disabled?: boolean; style?: React.CSSProperties; danger?: boolean
}) {
  const [running, setRunning] = useState(false)
  async function go() { if (running) return; setRunning(true); try { await onClick() } finally { setRunning(false) } }
  return (
    <button
      className={danger ? "btn-ghost" : "btn-primary"}
      style={{ ...(danger ? { color: "var(--danger)", borderColor: "rgba(224,82,82,0.3)", background: "rgba(224,82,82,0.08)" } : {}), ...style, opacity: (disabled || running) ? 0.55 : 1 }}
      onClick={go} disabled={disabled || running}
    >{running ? pending : label}</button>
  )
}

function CycleState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return <div style={{ minHeight:"100vh", background:"var(--bg-void)" }}><Navbar /><main style={{ maxWidth:640, margin:"90px auto", padding:"0 24px", textAlign:"center" }}><h1 style={{ fontFamily:"var(--font-display)", fontSize:30, fontWeight:400, marginBottom:12 }}>{title}</h1><p style={{ color:"var(--text-muted)", lineHeight:1.7, marginBottom:24 }}>{message}</p><div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>{onRetry && <button className="btn-primary" onClick={onRetry}>Retry</button>}<Link href="/" className="btn-ghost" style={{ textDecoration:"none" }}>Back to Explore</Link></div></main></div>
}

export default function CycleDetailPage() {
  const params       = useParams()
  const cycleAddress = params.address as string
  const { address: wallet } = useAccount()
  const cycle  = useCycleData(cycleAddress)
  const { orders: marketOrders, lowestListing, highestListing } = useMarketOrders(cycle.tokenAddress)
  const { send, approve } = useWatchedWrite()

  const [investAmount, setInvestAmount] = useState("")
  const [toast, setToast] = useState<{ msg: string; type: "success"|"error"; hash?: string }|null>(null)
  function showToast(msg: string, type: "success"|"error" = "success", hash?: string) {
    setToast({ msg, type, hash }); setTimeout(() => setToast(null), 9000)
  }

  const { data: extraData, refetch: refetchExtra } = useReadContracts({
    contracts: wallet && cycle.tokenAddress ? [
      { address: cycle.tokenAddress as `0x${string}`, abi: CYCLE_SHARE_TOKEN_ABI, functionName: "balanceOf", args: [wallet] },
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "verifiers", args: [wallet] },
    ] : [],
    query: { enabled: !!wallet && !!cycle.tokenAddress, refetchInterval: 8000 },
  })

  const myBal      = (extraData?.[0]?.result as bigint) ?? 0n
  const myFmt      = Number(formatShareAmount(myBal))
  const isVerifier = ((extraData?.[1]?.result as { active: boolean }|undefined)?.active) ?? false

  const { data: quorumData } = useReadContracts({
    contracts: [
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorum" },
    ],
    query: { refetchInterval: 10000 },
  })
  const verifierQuorum = Number(quorumData?.[0]?.result ?? 2n)

  const { data: opData } = useReadContracts({
    contracts: [
      { address: cycle.validatedAddress!, abi: PRODUCTION_CYCLE_ABI, functionName: "operator" },
    ],
    query: { refetchInterval: 10000 },
  })
  const operatorAddress = (opData?.[0]?.result as string) ?? ""
  const amOp = !!wallet && wallet.toLowerCase() === operatorAddress.toLowerCase()

  // Operator's collateral balance — shown after cycle distributes so they can withdraw
  const { data: colData } = useReadContracts({
    contracts: operatorAddress ? [
      { address: CONTRACTS.collateralVault, abi: COLLATERAL_VAULT_ABI, functionName: "collateralBalance", args: [operatorAddress as `0x${string}`] },
    ] : [],
    query: { enabled: !!operatorAddress, refetchInterval: 10000 },
  })
  const operatorCollateral = stableAmountToNumber((colData?.[0]?.result as bigint) ?? 0n)

  // ROI is now read directly from cycle data (no oracle needed)
  const grossROI = cycle.grossROI
  const netROI   = cycle.netROI
  const riskScore = cycle.oracle?.risk ?? (() => {
    const colRatio = cycle.capitalRequired > 0n ? Number(cycle.collateralAmount) / Number(cycle.capitalRequired) : 0
    const base = { Agricultural: 3, "Trade Finance": 2, Commodities: 4, "Equipment Leasing": 2, Energy: 5, Manufacturing: 3, Other: 4 }[cycle.category] ?? 4
    return Math.max(1, Math.min(10, base + (colRatio >= 0.2 ? -1 : colRatio >= 0.1 ? 0 : 1)))
  })()

  const canDefault = useMemo(() => {
    return cycle.isActive && (Number(cycle.startTime) + Number(cycle.duration)) < Math.floor(Date.now() / 1000)
  }, [cycle.isActive, cycle.startTime, cycle.duration])

  async function addToken() {
    if (typeof window === "undefined" || !window.ethereum || !cycle.tokenAddress) return
    try {
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: { type: "ERC20", options: { address: cycle.tokenAddress, symbol: cycle.cycleSymbol.slice(0,11), decimals: 6 } },
      })
    } catch {}
  }

  async function handleInvest() {
    if (!wallet || !investAmount) return
    const amt = parseStableAmount(investAmount)
    try {
      await approve(CONTRACTS.stablecoin, cycle.validatedAddress!)
      const hash = await send({ address: cycle.validatedAddress!, abi: PRODUCTION_CYCLE_ABI, functionName: "invest", args: [amt] })
      showToast(`Invested $${investAmount}! ${cycle.cycleSymbol} tokens are in your wallet.`, "success", hash)
      setInvestAmount(""); refetchExtra(); setTimeout(addToken, 800)
    } catch (e: unknown) { showToast(getErrorMessage(e, "Investment failed"), "error") }
  }

  async function handleApproveMilestone(id: number) {
    try {
      const hash = await send({ address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "approveMilestone", args: [cycle.validatedAddress!, id] })
      showToast(`Milestone ${id === 99 ? "harvest" : id + 1} approved!`, "success", hash)
    } catch (e: unknown) { showToast(getErrorMessage(e, "Approval failed"), "error") }
  }

  async function handleReleaseMilestone(id: number) {
    try {
      const hash = await send({ address: cycle.validatedAddress!, abi: PRODUCTION_CYCLE_ABI, functionName: "releaseMilestone", args: [id] })
      showToast(`Milestone ${id + 1} — capital released to your wallet!`, "success", hash)
    } catch (e: unknown) { showToast(getErrorMessage(e, "Release failed"), "error") }
  }

  async function handleSubmitHarvest() {
    try {
      const hash = await send({ address: cycle.validatedAddress!, abi: PRODUCTION_CYCLE_ABI, functionName: "submitHarvest" })
      showToast("Harvest submitted! Cycle in settlement state.", "success", hash)
    } catch (e: unknown) { showToast(getErrorMessage(e, "Failed"), "error") }
  }

  async function handleRepayAndDistribute() {
    const amt = cycle.expectedRevenue
    if (amt <= 0n) return
    try {
      await approve(CONTRACTS.stablecoin, cycle.validatedAddress!)
      const hash = await send({
        address: cycle.validatedAddress!,
        abi: PRODUCTION_CYCLE_ABI,
        functionName: "repayAndDistribute",
        args: [amt],
      })
      showToast("Capital distributed. Investors can now withdraw. Collateral is either auto-refunded to your wallet or remains withdrawable from the vault if auto-release was skipped.", "success", hash)
    } catch (e: unknown) { showToast(getErrorMessage(e, "Distribution failed"), "error") }
  }

  async function handleWithdraw() {
    try {
      const hash = await send({ address: cycle.validatedAddress!, abi: PRODUCTION_CYCLE_ABI, functionName: "withdraw" })
      showToast("Withdrawn! Principal + yield sent to your wallet.", "success", hash)
      refetchExtra()
    } catch (e: unknown) { showToast(getErrorMessage(e, "Withdrawal failed"), "error") }
  }

  async function handleWithdrawCollateral() {
    try {
      const hash = await send({
        address: CONTRACTS.collateralVault, abi: COLLATERAL_VAULT_ABI,
        functionName: "withdrawCollateral",
        args: [parseStableAmount(operatorCollateral.toFixed(6))],
      })
      showToast(`$${operatorCollateral.toLocaleString(undefined, { maximumFractionDigits: 0 })} collateral returned to your wallet!`, "success", hash)
    } catch (e: unknown) { showToast(getErrorMessage(e, "Withdrawal failed"), "error") }
  }

  async function handleTriggerDefault() {
    try {
      const hash = await send({ address: cycle.validatedAddress!, abi: PRODUCTION_CYCLE_ABI, functionName: "triggerDefault" })
      showToast("Default triggered — collateral slashed.", "success", hash)
    } catch (e: unknown) { showToast(getErrorMessage(e, "Failed"), "error") }
  }

  if (cycle.addressState === "invalid") return <CycleState title="Invalid cycle address" message="The URL does not contain a valid EVM address." />
  if (cycle.addressState === "no-contract") return <CycleState title="Cycle unavailable" message="No contract bytecode exists at this address on Arc Testnet." />
  if (cycle.addressState === "read-error") return <CycleState title="Cycle data unavailable" message="Essential onchain cycle data could not be read. The RPC may be temporarily unavailable." onRetry={cycle.retry} />

  if (cycle.isLoading || cycle.addressState === "loading") return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: 13 }}>Loading cycle…</p>
      </div>
    </div>
  )

  const stateC     = sc(cycle.stateName)
  const invAmt     = Number(investAmount) || 0
  // Correct yield calculation: uses netROI which already accounts for fees
  const estYield   = netROI > 0 ? invAmt * (netROI / 100) : 0
  const netBack    = invAmt + estYield
  // Expected revenue from on-chain
  const revUSD = stableAmountToNumber(cycle.expectedRevenue)

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 32px" }}>
        <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-dim)", marginBottom: 20 }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Explore</Link>
          {" / "}<span style={{ color: "var(--text-muted)" }}>{cycle.category}</span>
          {" / "}<span style={{ color: "var(--text-primary)" }}>{cycle.cycleName || cycleAddress.slice(0,14) + "…"}</span>
        </p>

        {cycle.addressState === "partial" && <div className="card" style={{ padding:12, marginBottom:16, color:"var(--warning)" }}>Some secondary cycle data is temporarily unavailable. Core cycle data is shown below.</div>}
        <div className="cycle-layout responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Title card */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>{cycle.category}</span>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, marginBottom: 4 }}>{cycle.cycleName}</h1>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>📍 {cycle.location}</p>
                  <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>
                    Token: <span style={{ color: "var(--gold)" }}>{cycle.cycleSymbol}</span>
                    {operatorAddress && (
                      <> · Operator: <a href={`${NETWORK.blockExplorer}/address/${operatorAddress}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}>{operatorAddress.slice(0,8)}…{operatorAddress.slice(-4)} ↗</a> · <Link href={`/credit-passport/${operatorAddress}`} style={{ color: "var(--gold)", textDecoration: "none" }}>Credit Passport</Link></>
                    )}
                  </p>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 100, border: `1px solid ${stateC}44`, background: `${stateC}11`, fontSize: 12, fontFamily: "var(--font-mono)", color: stateC }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: stateC }}/>{cycle.stateName}
                </div>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16 }}>{cycle.description || "No description provided."}</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>${cycle.totalRaisedUSD.toLocaleString()} raised</span>
                <span style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>{cycle.progressPct}% of ${cycle.capitalRequiredUSD.toLocaleString()}</span>
              </div>
              <div className="progress-track" style={{ height: 8 }}><div className="progress-fill" style={{ width: `${cycle.progressPct}%` }} /></div>
            </div>

            {/* Stats */}
            <div className="cycle-stats responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { label: "Net ROI",      value: netROI > 0 ? `${netROI}%` : grossROI > 0 ? `${grossROI}%` : "—", color: "var(--emerald)" },
                { label: "Duration",     value: cycle.durationDays > 0 ? `${cycle.durationDays}d` : "—", color: "var(--text-primary)" },
                { label: "Risk",         value: RISK_LABELS[riskScore] ?? `${riskScore}/10`, color: riskColor(riskScore) },
                { label: "Total fees",   value: `${cycle.protocolFeePercent + cycle.reservePercent}%`, color: "var(--text-muted)" },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
                  <p className="stat-label">{s.label}</p>
                  <p style={{ fontSize: 18, fontFamily: "var(--font-display)", color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Yield estimate */}
            {(grossROI > 0 || revUSD > 0) && (
              <div className="card" style={{ padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600 }}>Yield estimate</h3>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: cycle.oracle?.exists ? "var(--emerald)" : "var(--gold)", padding: "2px 8px", background: cycle.oracle?.exists ? "rgba(45,212,160,0.1)" : "rgba(201,168,76,0.1)", borderRadius: 100 }}>
                    {cycle.oracle?.exists ? "On-chain oracle" : "Operator-stated"}
                  </span>
                </div>
                <div className="cycle-yield responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 10 }}>
                  {[
                    { label: "Expected revenue", value: revUSD > 0 ? `$${revUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—" },
                    { label: "Gross profit",     value: cycle.capitalRequiredUSD > 0 && revUSD > cycle.capitalRequiredUSD ? `$${(revUSD - cycle.capitalRequiredUSD).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—" },
                    { label: "Net ROI (after fees)", value: netROI > 0 ? `${netROI}%` : grossROI > 0 ? `${grossROI}%` : "—" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "var(--bg-surface)", borderRadius: 8, padding: 12 }}>
                      <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{s.label}</p>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                  {cycle.oracle?.exists
                    ? `On-chain oracle — gross ROI ${grossROI}%, net to investors after ${cycle.protocolFeePercent + cycle.reservePercent}% fees: ${netROI}%.`
                    : `Operator-stated revenue: $${revUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} — gross ROI ${grossROI}%, net after ${cycle.protocolFeePercent + cycle.reservePercent}% fees: ${netROI}%.`}
                </p>
              </div>
            )}

            {/* Milestones */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Capital release milestones</h3>
              {cycle.milestones.map((m, i) => (
                <div key={m.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i < 3 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: m.released ? "rgba(45,212,160,0.15)" : "var(--bg-surface)", border: `1px solid ${m.released ? "var(--emerald)" : "var(--border)"}`, fontSize: 12, color: m.released ? "var(--emerald)" : "var(--text-dim)" }}>
                    {m.released ? "✓" : m.id + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: m.released ? "var(--emerald)" : "var(--text-primary)" }}>{m.label}</span>
                      <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--gold)" }}>{m.pct}% · ${((cycle.capitalRequiredUSD * m.pct) / 100).toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>{m.description}</p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: m.quorumReached ? "var(--emerald)" : "var(--text-dim)" }}>
                        {m.quorumReached ? "✓ Quorum reached" : `${m.approvalCount}/${verifierQuorum} verifier approvals`}
                      </span>
                      {isVerifier && cycle.isActive && !m.released && !m.quorumReached && (
                        <TxBtn label="Approve" pending="Approving…" style={{ padding: "3px 10px", fontSize: 11, background: "linear-gradient(135deg,#7F77DD,#534AB7)" }} onClick={() => handleApproveMilestone(m.id)} />
                      )}
                      {amOp && cycle.isActive && !m.released && m.quorumReached && (
                        <TxBtn label="Release capital →" pending="Releasing…" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => handleReleaseMilestone(m.id)} />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {cycle.isActive && (
                <div style={{ marginTop: 14, padding: 14, background: "rgba(127,119,221,0.06)", borderRadius: 8, border: "1px solid rgba(127,119,221,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>Harvest confirmation (milestone 99)</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Required before the operator can enter the repayment and distribution phase.</p>
                    </div>
                    {isVerifier && (
                      <TxBtn label="Approve harvest" pending="Approving…" style={{ marginLeft: 12, padding: "6px 14px", fontSize: 12, background: "linear-gradient(135deg,#7F77DD,#534AB7)", flexShrink: 0 }} onClick={() => handleApproveMilestone(99)} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Secondary market */}
            {marketOrders.length > 0 && (
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600 }}>Secondary market — {cycle.cycleSymbol}</h3>
                  <Link href="/market" style={{ fontSize: 12, color: "var(--gold)", textDecoration: "none" }}>All orders →</Link>
                </div>
                <table>
                  <thead><tr><th>Amount</th><th>Price / token</th><th>Total</th><th>Seller</th></tr></thead>
                  <tbody>
                    {marketOrders.slice(0, 5).map(o => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{o.amountFormatted.toLocaleString()}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: "var(--emerald)" }}>${o.priceFormatted.toFixed(4)}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>${(o.amountFormatted * o.priceFormatted).toFixed(2)}</td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{o.seller.slice(0,8)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="card" style={{ padding:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                <div><p style={{ fontSize:14, fontWeight:600, marginBottom:5 }}>Transferable cycle-share position</p><p style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.65, maxWidth:720 }}>Funding mints cycle tokens that carry the settlement or recovery claim. Holders may trade through the USDC order book where listings and counterparties exist; liquidity is not guaranteed. After distribution, the current holder redeems from Portfolio.</p></div>
                <Link href="/market" className="btn-primary" style={{ textDecoration:"none" }}>Trade token</Link>
              </div>
              <div style={{ display:"flex", gap:18, flexWrap:"wrap", marginTop:14, fontSize:12, fontFamily:"var(--font-mono)" }}><span>{marketOrders.length} active order(s)</span><span>Lowest ask: {lowestListing === null ? "-" : `$${lowestListing.toFixed(4)}`}</span><span>Highest ask: {highestListing === null ? "-" : `$${highestListing.toFixed(4)}`}</span></div>
            </div>
            {/* Contract links */}
            <div className="card" style={{ padding: 14, display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[{ label: "Cycle contract", addr: cycleAddress }, { label: "Share token", addr: cycle.tokenAddress }].filter(l => l.addr).map(l => (
                <div key={l.label}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{l.label}</p>
                  <a href={`${NETWORK.blockExplorer}/address/${l.addr}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", textDecoration: "none" }}>{l.addr.slice(0,10)}…{l.addr.slice(-6)} ↗</a>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — sticky action panel */}
          <div className="cycle-actions" style={{ position: "sticky", top: 76, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Investor position */}
            {wallet && myBal > 0n && (
              <div className="card" style={{ padding: 20, borderColor: "rgba(45,212,160,0.25)" }}>
                <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--emerald)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Your position</p>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Tokens held</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>{myFmt.toLocaleString(undefined, { maximumFractionDigits: 4 })} {cycle.cycleSymbol}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Invested value</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>${myFmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                {netROI > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Est. return</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--emerald)" }}>${(myFmt * (1 + netROI / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <button className="btn-ghost" style={{ width: "100%", fontSize: 12, marginBottom: 8 }} onClick={addToken}>+ Add {cycle.cycleSymbol} to wallet</button>
                {cycle.isDistributed && (
                  <TxBtn label="Withdraw principal + yield →" pending="Withdrawing…" style={{ width: "100%", background: "linear-gradient(135deg,#2DD4A0,#1a9e78)" }} onClick={handleWithdraw} />
                )}
                {!cycle.isDistributed && (
                  <a href="/market" style={{ display: "block", textAlign: "center", marginTop: 6, fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>Sell on secondary market →</a>
                )}
              </div>
            )}

            {/* Invest */}
            {cycle.isFunding && (
              <div className="card" style={{ padding: 24, borderColor: "rgba(201,168,76,0.2)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Invest in this cycle</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
                  USDC locks in escrow. You receive {cycle.cycleSymbol} tokens instantly — tradeable on the secondary market.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Amount (USDC)</label>
                  <input type="number" placeholder="500" value={investAmount} onChange={e => setInvestAmount(e.target.value)} min="1" />
                </div>
                {invAmt > 0 && netROI > 0 && (
                  <div style={{ padding: 12, background: "var(--bg-surface)", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                    {[
                      ["You invest",      `$${invAmt.toLocaleString()}`],
                      ["Tokens received", `${invAmt.toLocaleString()} ${cycle.cycleSymbol}`],
                      ["Est. yield",      `+$${estYield.toFixed(2)}`],
                      ["Net return",      `$${netBack.toFixed(2)}`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "var(--text-muted)" }}>{k}</span>
                        <span style={{ fontFamily: "var(--font-mono)", color: k === "Net return" ? "var(--emerald)" : "var(--text-primary)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                <TxBtn
                  label={!wallet ? "Connect wallet" : "Invest →"}
                  pending="Approving USDC… then investing…"
                  style={{ width: "100%" }}
                  onClick={handleInvest}
                  disabled={!wallet || !investAmount || Number(investAmount) <= 0}
                />
                <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", marginTop: 8 }}>Two wallet confirmations: approve USDC → invest</p>
              </div>
            )}

            {/* Operator controls */}
            {amOp && (cycle.isActive || cycle.isHarvestSubmitted) && (
              <div className="card" style={{ padding: 20, borderColor: "rgba(201,168,76,0.2)" }}>
                <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Operator controls</p>
                {cycle.isActive && (
                  <TxBtn label="Submit harvest (milestone 99)" pending="Submitting…" style={{ width: "100%", marginBottom: 12, background: "linear-gradient(135deg,#7F77DD,#534AB7)" }} onClick={handleSubmitHarvest} />
                )}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Return amount (capital + profit)</label>
                  <input type="number" value={revUSD > 0 ? revUSD.toString() : ""} readOnly />
                  <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 3 }}>Exact settlement required by this cycle.</p>
                </div>
                <TxBtn
                  label={`Pay exact settlement: $${revUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })} ->`}
                  pending="Approving… transferring… distributing…"
                  style={{ width: "100%" }}
                  onClick={handleRepayAndDistribute}
                  disabled={cycle.expectedRevenue <= 0n}
                />
              </div>
            )}

            {/* Operator collateral refund prompt */}
            {amOp && cycle.isDistributed && operatorCollateral > 0 && (
              <div className="card" style={{ padding: 16, borderColor: "rgba(45,212,160,0.3)" }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--emerald)", marginBottom: 6 }}>✓ Cycle complete — collateral still in vault</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                  ${operatorCollateral.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC is ready to withdraw from the CollateralVault.
                </p>
                <TxBtn label="Withdraw collateral →" pending="Withdrawing…" style={{ width: "100%", background: "linear-gradient(135deg,#2DD4A0,#1a9e78)" }} onClick={handleWithdrawCollateral} />
              </div>
            )}

            {amOp && cycle.isDistributed && operatorCollateral === 0 && cycle.capitalRequiredUSD > 0 && (
              <div className="card" style={{ padding: 16, borderColor: "rgba(45,212,160,0.22)" }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--emerald)", marginBottom: 6 }}>Cycle complete - collateral already refunded</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  This cycle finished successfully and the vault no longer holds collateral for your operator address. If auto-release was enabled, the refund was sent directly to your wallet during distribution.
                </p>
              </div>
            )}

            {/* Default trigger */}
            {canDefault && (
              <div className="card" style={{ padding: 16, borderColor: "rgba(224,82,82,0.3)" }}>
                <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>Cycle exceeded its duration. Anyone can trigger default to slash operator collateral.</p>
                <TxBtn label="Trigger default" pending="Triggering…" danger style={{ width: "100%" }} onClick={handleTriggerDefault} />
              </div>
            )}

            {/* Become a verifier prompt */}
            {!isVerifier && wallet && cycle.isActive && (
              <Link href="/verifier" style={{ textDecoration: "none" }}>
                <div className="card" style={{ padding: 16, cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(127,119,221,0.3)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                  <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>Become a verifier ↗</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Stake USDC to approve milestones and earn protocol fees.</p>
                </div>
              </Link>
            )}
          </div>
        </div>
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
