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
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>FundR</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px,5vw,58px)", fontWeight: 400, lineHeight: 1.08, color: "var(--text-primary)", marginBottom: 20, letterSpacing: "-0.02em" }}>
            Invest in the world&apos;s <br /><span className="text-gold">real economy</span>, on-chain.
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 520, marginBottom: 32 }}>
            FundR connects global capital to real production cycles - agriculture, trade finance, commodities - with milestone-gated releases, verifier accountability, and automatic yield distribution.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <a href="#cycles" className="btn-primary">Browse cycles -&gt;</a>
            <Link href="/how-it-works" className="btn-ghost" style={{ textDecoration: "none" }}>How it works</Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Total cycles", value: stats.isLoading ? "-" : stats.totalCycles.toString(), sub: `deployed on ${NETWORK.name}` },
            { label: "Reserve pool", value: stats.isLoading ? "-" : `$${stats.reserveBalance.toLocaleString()}`, sub: "investor protection" },
            { label: "Treasury", value: stats.isLoading ? "-" : `$${stats.treasuryBalance.toLocaleString()}`, sub: "protocol revenue" },
            { label: "Network", value: "Arc", sub: "EVM - USDC settlement" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <p className="stat-label">{s.label}</p>
              <p style={{ fontSize: 28, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{s.value}</p>
              <p className="stat-sub">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--bg-card)", padding: "28px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", display: "flex", gap: 0 }}>
          {[
            { icon: "1", title: "Operator lists cycle", desc: "A real business deposits collateral, sets a capital target, and defines the expected revenue path." },
            { icon: "2", title: "Investors fund it", desc: "USDC is locked in the contract and investors receive cycle tokens representing their position." },
            { icon: "3", title: "Verifiers approve", desc: "Staked verifiers review submitted evidence before each milestone release." },
            { icon: "4", title: "Yield distributes", desc: "Principal and profit are distributed on-chain and investors can withdraw when the cycle settles." },
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
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-primary)", marginBottom: 8 }}>Self-sustaining on-chain economics</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>Every cycle contributes to the FundR treasury and reserve structure. Those flows support operations, investor protection, and transparent on-chain accounting.</p>
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
