"use client"

import Link from "next/link"
import { useCycleData } from "@/hooks/useCycleData"

const STATE_BADGE = ["badge-funding","badge-active","badge-harvest","badge-distributed","badge-defaulted"]
const STATE_LABEL = ["Funding","Active","Harvest","Distributed","Defaulted"]
const RISK_LABELS = ["","Very Low","Low","Moderate","Elevated","High","Significant","Severe","Critical","Extreme","Maximum"]

function riskColor(s: number) {
  return s <= 2 ? "var(--emerald)" : s <= 5 ? "var(--warning)" : "var(--danger)"
}

export default function CycleCard({ address }: { address: string }) {
  const cycle = useCycleData(address)

  if (cycle.isLoading) {
    return (
      <div className="card" style={{ padding: 24, minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>Loading…</span>
      </div>
    )
  }

  // Use oracle risk if available, otherwise derive from collateral ratio
  const riskScore = cycle.oracle?.risk ?? (() => {
    const colRatio = cycle.capitalRequired > 0n
      ? Number(cycle.collateralAmount) / Number(cycle.capitalRequired)
      : 0
    const base = { Agricultural: 3, "Trade Finance": 2, Commodities: 4, "Equipment Leasing": 2, Energy: 5, Manufacturing: 3, Other: 4 }[cycle.category] ?? 4
    const colCredit = colRatio >= 0.2 ? -1 : colRatio >= 0.1 ? 0 : 1
    return Math.max(1, Math.min(10, base + colCredit))
  })()

  // netROI is computed directly in useCycleData from operator's on-chain expectedRevenue
  const displayROI = cycle.netROI > 0 ? `${cycle.netROI}%` : cycle.grossROI > 0 ? `${cycle.grossROI}%` : "—"
  const hasROI     = cycle.netROI > 0 || cycle.grossROI > 0

  return (
    <div
        className="card"
        style={{ padding: 24, transition: "border-color 0.2s, transform 0.15s", display: "flex", flexDirection: "column", gap: 14 }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(201,168,76,0.35)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)" }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{cycle.category}</p>
            <Link href={`/cycle/${address}`} style={{ textDecoration: "none" }}><h3 style={{ fontSize: 17, fontFamily: "var(--font-display)", fontWeight: 400, color: "var(--text-primary)", lineHeight: 1.2 }}>{cycle.cycleName || "Untitled cycle"}</h3></Link>
            {cycle.location && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{cycle.location}</p>}
          </div>
          <span className={`badge ${STATE_BADGE[cycle.stateId] ?? "badge-funding"}`}>
            {STATE_LABEL[cycle.stateId] ?? "Unknown"}
          </span>
        </div>

        {/* Funding progress */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              ${cycle.totalRaisedUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} raised
            </span>
            <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: cycle.progressPct >= 100 ? "var(--emerald)" : "var(--text-muted)" }}>
              {cycle.progressPct}%
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${cycle.progressPct}%` }} />
          </div>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 3 }}>
            Target: ${cycle.capitalRequiredUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        {cycle.operator && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>Operator {cycle.operator.slice(0, 6)}...{cycle.operator.slice(-4)}</span>
            <Link href={`/credit-passport/${cycle.operator}`} style={{ fontSize: 11, color: "var(--gold)", textDecoration: "none", flexShrink: 0 }}>View Credit Passport</Link>
          </div>
        )}
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingTop: 12, borderTop: cycle.operator ? "none" : "1px solid var(--border)" }}>
          {[
            ["Capital required", `$${cycle.capitalRequiredUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
            ["Expected revenue", cycle.expectedRevenue > 0n ? `$${Number(cycle.expectedRevenue / 1000000n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "Not available"],
            ["Net ROI", displayROI],
            ["Duration", cycle.durationDays > 0 ? `${cycle.durationDays}d` : "-"],
          ].map(([label, value]) => (
            <div key={label} style={{ background: "var(--bg-surface)", borderRadius: 8, padding: 12 }}>
              <p className="stat-label" style={{ marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 16, fontFamily: "var(--font-display)", color: label === "Net ROI" && hasROI ? "var(--emerald)" : "var(--text-primary)" }}>{value}</p>
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 4 }}>
            <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: riskColor(riskScore) }}>Risk: {RISK_LABELS[riskScore] ?? `${riskScore}/10`}{!cycle.oracle ? " (estimated)" : ""}</span>
            <Link href={`/cycle/${address}`} className="btn-primary" style={{ textDecoration: "none", padding: "8px 12px", fontSize: 12 }}>Open cycle</Link>
          </div>
        </div>
      </div>
  )
}
