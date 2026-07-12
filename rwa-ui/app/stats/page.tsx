
"use client"

import Link from "next/link"
import { useReadContracts } from "wagmi"
import Navbar from "@/components/navbar"
import { CONTRACTS, NETWORK } from "@/constants/contracts"
import { FACTORY_V2_ABI } from "@/contracts/abis-v2"
import { RESERVE_POOL_ABI, VERIFIER_REGISTRY_ABI, ERC20_ABI, TOKEN_MARKETPLACE_ABI } from "@/contracts/abis"
import { stableAmountToNumber } from "@/lib/token-units"

export default function StatsPage() {
  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: CONTRACTS.factory,          abi: FACTORY_V2_ABI,      functionName: "getAllCycles" },
      { address: CONTRACTS.factory,          abi: FACTORY_V2_ABI,      functionName: "approvalMode" },
      { address: CONTRACTS.reservePool,      abi: RESERVE_POOL_ABI,    functionName: "reserveBalance" },
      { address: CONTRACTS.stablecoin,       abi: ERC20_ABI,           functionName: "balanceOf", args: [CONTRACTS.treasury] },
      { address: CONTRACTS.stablecoin,       abi: ERC20_ABI,           functionName: "balanceOf", args: [CONTRACTS.collateralVault] },
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorum" },
      { address: CONTRACTS.tokenMarketplace, abi: TOKEN_MARKETPLACE_ABI, functionName: "nextOrderId" },
      { address: CONTRACTS.tokenMarketplace, abi: TOKEN_MARKETPLACE_ABI, functionName: "tradingFeeBps" },
      { address: CONTRACTS.tokenMarketplace, abi: TOKEN_MARKETPLACE_ABI, functionName: "totalFeesCollected" },
    ],
    query: { refetchInterval: 15000 },
  })

  const cycles        = (data?.[0]?.result as string[]) ?? []
  const totalCycles   = cycles.length
  const approvalMode  = Number(data?.[1]?.result ?? 0)
  const reserveBal    = stableAmountToNumber((data?.[2]?.result as bigint) ?? 0n)
  const treasuryBal   = stableAmountToNumber((data?.[3]?.result as bigint) ?? 0n)
  const collateralTVL = stableAmountToNumber((data?.[4]?.result as bigint) ?? 0n)
  const quorum        = Number(data?.[5]?.result ?? 2n)
  const marketOrders  = Number(data?.[6]?.result ?? 0n)
  const marketFeeBps  = Number(data?.[7]?.result ?? 0n)
  const marketFees    = stableAmountToNumber((data?.[8]?.result as bigint) ?? 0n)
  const totalTVL      = reserveBal + treasuryBal + collateralTVL

  const MODE_LABELS = ["Manual review","Open (instant)","Collateral gate"]

  const STATS = [
    { label: "Total cycles",        value: isLoading ? "—" : totalCycles.toString(),                        sub: `deployed on ${NETWORK.name}`,  color: "var(--text-primary)" },
    { label: "Protocol treasury",   value: isLoading ? "—" : `$${Math.round(treasuryBal).toLocaleString()}`, sub: "fee revenue accrued",           color: "var(--emerald)" },
    { label: "Reserve pool",        value: isLoading ? "—" : `$${Math.round(reserveBal).toLocaleString()}`,  sub: "investor protection fund",      color: "var(--gold)" },
    { label: "Operator collateral", value: isLoading ? "—" : `$${Math.round(collateralTVL).toLocaleString()}`, sub: "locked in CollateralVault",  color: "#6495ED" },
    { label: "Total value locked",  value: isLoading ? "—" : `$${Math.round(totalTVL).toLocaleString()}`,   sub: "across all protocol contracts", color: "var(--text-primary)" },
    { label: "Verifier quorum",     value: isLoading ? "—" : `${quorum} approvals`,                         sub: "required per milestone",        color: "var(--text-primary)" },
    { label: "Protocol fee",        value: "2%",                                                              sub: "of cycle profit",               color: "var(--text-muted)" },
    { label: "Marketplace orders", value: isLoading ? "—" : marketOrders.toString(), sub: "orders created; not trading volume", color: "var(--gold)" },
    { label: "Marketplace fee", value: isLoading ? "—" : `${marketFeeBps / 100}%`, sub: "deducted from seller proceeds", color: "var(--gold)" },
    { label: "Market fees collected", value: isLoading ? "—" : `$${marketFees.toFixed(4)}`, sub: "read from order-book contract", color: "var(--emerald)" },
    { label: "Approval mode",       value: isLoading ? "—" : MODE_LABELS[approvalMode],                    sub: "operator onboarding",           color: approvalMode === 1 ? "var(--emerald)" : "var(--warning)" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Live protocol data</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 400, marginBottom: 12, lineHeight: 1.1 }}>Protocol statistics</h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)", maxWidth: 560 }}>All data read directly from deployed smart contracts on {NETWORK.name}. No database, no API — fully on-chain.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 40 }}>
          {STATS.map(s => (
            <div key={s.label} className="stat-card">
              <p className="stat-label">{s.label}</p>
              <p style={{ fontSize: s.value.length > 8 ? 20 : 28, fontFamily: "var(--font-display)", color: s.color, marginBottom: 4 }}>{s.value}</p>
              <p className="stat-sub">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 28, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Deployed contracts — {NETWORK.name}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 10 }}>
            {Object.entries(CONTRACTS).filter(([, v]) => v).map(([name, addr]) => (
              <a key={name} href={`${NETWORK.blockExplorer}/address/${addr}`} target="_blank" rel="noopener noreferrer"
                style={{ padding: "12px 16px", background: "var(--bg-surface)", borderRadius: 8, textDecoration: "none", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{name}</span>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)" }}>{addr.slice(0,10)}…{addr.slice(-6)} ↗</span>
              </a>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>All deployed cycles ({cycles.length})</h3>
            <Link href="/" style={{ fontSize: 13, color: "var(--gold)", textDecoration: "none" }}>Browse all →</Link>
          </div>
          {cycles.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No cycles deployed yet.</p> : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {cycles.map((addr, i) => (
                <Link key={addr} href={`/cycle/${addr}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < cycles.length - 1 ? "1px solid var(--border)" : "none", textDecoration: "none" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>{addr}</span>
                  <span style={{ fontSize: 12, color: "var(--gold)", flexShrink: 0, marginLeft: 16 }}>View →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
