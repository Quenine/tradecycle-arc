"use client"

import { useState } from "react"
import Link from "next/link"
import Navbar from "@/components/navbar"
import CycleCard from "@/components/cycle-card"
import { useProtocolStats } from "@/hooks/useProtocolStats"
import { NETWORK, PROTOCOL_FEES } from "@/constants/contracts"

export default function HomePage() {
  const stats = useProtocolStats()
  const [search, setSearch] = useState("")

  const filtered = stats.cycleAddresses.filter((addr) =>
    !search || addr.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 32px 60px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>TradeCycle</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px,5vw,58px)", fontWeight: 400, lineHeight: 1.08, color: "var(--text-primary)", marginBottom: 20, letterSpacing: "-0.02em" }}>
            USDC milestone finance <br />for <span className="text-gold">SMEs on Arc</span>.
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 520, marginBottom: 32 }}>
            TradeCycle helps SMEs raise USDC working capital for real production and trade cycles. Investors fund a cycle, verifiers approve milestone releases, and repayment is automatically distributed on Arc.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/demo" className="btn-primary" style={{ textDecoration: "none" }}>View Demo -&gt;</Link>
            <a href="#cycles" className="btn-ghost">Browse Cycles</a>
            <Link href="/operator" className="btn-ghost" style={{ textDecoration: "none" }}>Create a Cycle</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 28, maxWidth: 620 }}>
            {["USDC escrow", "Verifier release", "Credit Passport"].map((item) => (
              <div key={item} className="workflow-node" style={{ padding: 12 }}>
                <p style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="institutional-card" style={{ padding: 24 }}>
          <p className="page-kicker">Core value chain</p>
          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            {[
              ["Fund", "Investors put USDC into the ProductionCycle contract."],
              ["Verify", "Staked verifiers approve milestone evidence."],
              ["Release", "Capital moves to the operator by approved tranche."],
              ["Repay", "Expected revenue is repaid and distributed on Arc."],
              ["Credit Passport", "Completed cycles add onchain operator reputation."],
            ].map(([title, body]) => (
              <div key={title} className="workflow-node">
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{title}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{body}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Cycles", value: stats.isLoading ? "-" : stats.totalCycles.toString(), sub: NETWORK.name },
              { label: "Network", value: "Arc", sub: "USDC settlement" },
            ].map((s) => (
              <div key={s.label} className="stat-card" style={{ padding: 16 }}>
                <p className="stat-label">{s.label}</p>
                <p style={{ fontSize: 24, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{s.value}</p>
                <p className="stat-sub">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--bg-card)", padding: "30px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", display: "flex", gap: 0 }}>
          {[
            { icon: "1", title: "SME creates a cycle", desc: "An operator deposits collateral, sets a USDC capital target, and submits the production plan." },
            { icon: "2", title: "Investors fund it", desc: "USDC is locked in the cycle contract and investors receive cycle tokens for their position." },
            { icon: "3", title: "Verifiers release milestones", desc: "Staked verifiers review evidence before each tranche reaches the operator." },
            { icon: "4", title: "Repayment distributes", desc: "When the cycle settles, repayment and profit are distributed on Arc and the operator builds an onchain credit passport." },
          ].map((step, i) => (
            <div key={i} style={{ flex: 1, padding: "0 28px", borderRight: i < 3 ? "1px solid var(--border)" : "none", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, color: "var(--gold)", lineHeight: 1, marginTop: 2 }}>{step.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{step.title}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 32px 8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
          {[
            { title: "SME Operators", desc: "Raise USDC working capital, unlock funds through approved milestones, and build a repayment record cycle by cycle." },
            { title: "Investors", desc: "Fund real production and trade cycles on Arc Testnet, track evidence, and withdraw after automated settlement." },
            { title: "Verifiers", desc: "Stake USDC, review operator evidence, approve milestones, and earn protocol rewards for accountable checks." },
          ].map((role) => (
            <div key={role.title} style={{ padding: 24, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--text-primary)", marginBottom: 10 }}>{role.title}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{role.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="cycles" style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--text-primary)" }}>Live cycles</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{stats.totalCycles} production cycles - {NETWORK.name}</p>
          </div>
          <input type="text" placeholder="Search by address..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
        </div>

        {stats.isLoading ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading cycles from chain...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 32, marginBottom: 12, color: "var(--text-dim)" }}>0</p>
            <p style={{ color: "var(--text-muted)", fontSize: 15 }}>{search ? "No cycles match your search." : "No cycles deployed yet."}</p>
            {!search && <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 6 }}>Operators can create the first cycle from the <Link href="/operator" style={{ color: "var(--gold)", textDecoration: "none" }}>Operator portal</Link>.</p>}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
            {filtered.map((addr) => <CycleCard key={addr} address={addr} />)}
          </div>
        )}
      </section>

      <section style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)", padding: "40px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 60, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Protocol Revenue</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-primary)", marginBottom: 8 }}>Onchain settlement economics</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>Every completed TradeCycle contributes to treasury and reserve flows while leaving a transparent repayment trail for the operator.</p>
          </div>
          <div style={{ display: "flex", gap: 32, flexShrink: 0 }}>
            {[
              { label: "Protocol fee", value: `${PROTOCOL_FEES.defaultProtocolFee}%`, desc: "of cycle profit" },
              { label: "Reserve cut", value: `${PROTOCOL_FEES.defaultReserveFee}%`, desc: "of cycle profit" },
              { label: "Trade fee", value: `${PROTOCOL_FEES.marketplaceTradingFee}%`, desc: "per token trade" },
            ].map((f) => (
              <div key={f.label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 28, fontFamily: "var(--font-display)", color: "var(--gold)" }}>{f.value}</p>
                <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</p>
                <p style={{ fontSize: 11, color: "var(--text-dim)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
