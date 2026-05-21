"use client"

import Link from "next/link"
import Navbar from "@/components/navbar"
import { PROTOCOL_FEES } from "@/constants/contracts"

const STEPS = [
  { n: "01", icon: "1", title: "Operator applies and deposits collateral", body: "A real business applies to become an operator, defines the revenue path for its cycle, and deposits USDC collateral before deployment.", color: "var(--gold)" },
  { n: "02", icon: "2", title: "Investors fund the cycle", body: "The cycle contract accepts USDC until the capital target is reached. Investors immediately receive cycle-share tokens representing their claim on principal plus yield.", color: "var(--emerald)" },
  { n: "03", icon: "3", title: "Verifiers approve milestones", body: "Staked verifiers review evidence packages submitted by the operator. Once quorum is reached, the operator can release each capital tranche in sequence.", color: "#6495ED" },
  { n: "04", icon: "4", title: "Operator returns capital plus profit", body: "After the real-world business completes its cycle, the operator repays the contract and triggers distribution. Profit is routed to the treasury, reserve pool, verifiers, and investors according to protocol rules.", color: "var(--gold)" },
  { n: "05", icon: "5", title: "Investors withdraw principal plus yield", body: "Once a cycle is distributed, any investor can withdraw. The protocol burns the investor's cycle-share tokens and returns principal plus net profit.", color: "var(--emerald)" },
]

export default function HowItWorksPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>Documentation</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px,5vw,52px)", fontWeight: 400, lineHeight: 1.1, marginBottom: 20 }}>How FundR works</h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 600, margin: "0 auto" }}>
            FundR is a milestone-gated, verifier-accountable, automatically-distributing real-world yield protocol. Capital flows from global investors to real production businesses and back entirely on-chain.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {STEPS.map((step, i) => (
            <div key={step.n} style={{ display: "flex", gap: 32, paddingBottom: 56, position: "relative" }}>
              {i < STEPS.length - 1 && (
                <div style={{ position: "absolute", left: 20, top: 48, bottom: 0, width: 1, background: "linear-gradient(to bottom, var(--border), transparent)" }} />
              )}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${step.color}18`, border: `1px solid ${step.color}44`, fontSize: 18, color: step.color, zIndex: 1 }}>
                  {step.icon}
                </div>
              </div>
              <div style={{ paddingTop: 8 }}>
                <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-dim)", marginBottom: 6 }}>Step {step.n}</p>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, color: "var(--text-primary)", marginBottom: 12, lineHeight: 1.3 }}>{step.title}</h3>
                <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.8 }}>{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ margin: "0 0 48px", padding: 32, background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, marginBottom: 20 }}>Protocol economics</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              { label: "Protocol treasury fee", value: `${PROTOCOL_FEES.defaultProtocolFee}%`, desc: "of cycle profit, funds operations and team" },
              { label: "Reserve pool cut", value: `${PROTOCOL_FEES.defaultReserveFee}%`, desc: "of cycle profit, protects investors from losses" },
              { label: "Marketplace fee", value: `${PROTOCOL_FEES.marketplaceTradingFee}%`, desc: "per token trade on the secondary market" },
            ].map((f) => (
              <div key={f.label} style={{ padding: 16, background: "var(--bg-surface)", borderRadius: 8 }}>
                <p style={{ fontSize: 28, fontFamily: "var(--font-display)", color: "var(--gold)", marginBottom: 6 }}>{f.value}</p>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{f.label}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 32, background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 48 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, marginBottom: 20 }}>Security mechanisms</h3>
          {[
            { icon: "LOCK", title: "Operator collateral", desc: "Operators lock USDC before creating a cycle. If they default, the protocol can slash collateral and redirect value toward investors." },
            { icon: "RISK", title: "Verifier stake and slashing", desc: "Verifiers stake USDC to approve milestones. Fraudulent approvals can be penalised, creating real accountability." },
            { icon: "SAFE", title: "Non-custodial escrow", desc: "Investor capital is locked inside the cycle smart contract, not held by FundR." },
            { icon: "DATA", title: "On-chain oracle", desc: "Yield estimates are stored on-chain at cycle creation time and remain auditable for anyone reviewing the deal." },
          ].map((s) => (
            <div key={s.title} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, flexShrink: 0, lineHeight: 1.8, color: "var(--gold)", minWidth: 40 }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s.title}</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", display: "flex", gap: 14, justifyContent: "center" }}>
          <Link href="/" className="btn-primary" style={{ textDecoration: "none" }}>Browse live cycles -&gt;</Link>
          <Link href="/faucet" className="btn-ghost" style={{ textDecoration: "none" }}>Get testnet USDC</Link>
        </div>
      </div>
    </div>
  )
}
