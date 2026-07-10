"use client"

import Link from "next/link"
import Navbar from "@/components/navbar"

const FUNDING_ROUTES = [
  {
    status: "Implemented",
    title: "Direct Arc USDC",
    eyebrow: "Live demo path",
    tone: "var(--emerald)",
    points: [
      "Investors connect a wallet on Arc Testnet.",
      "They get or hold USDC on Arc.",
      "They approve USDC for the selected TradeCycle contract.",
      "They fund a production cycle from the cycle detail page.",
      "USDC is held by the ProductionCycle contract and released through verifier-approved milestones.",
    ],
  },
  {
    status: "Architecture-ready",
    title: "Gateway-ready: Unified USDC liquidity",
    eyebrow: "Circle Gateway expansion",
    tone: "var(--gold)",
    points: [
      "Circle Gateway can support unified USDC balances across supported chains.",
      "For TradeCycle, Gateway would help investors or treasury operators access USDC liquidity on Arc without manually managing balances on each chain.",
      "This is an architecture-ready extension, not required for the current demo flow.",
    ],
  },
  {
    status: "Future extension",
    title: "CCTP / Bridge Kit funding",
    eyebrow: "Cross-chain USDC entry",
    tone: "#6495ED",
    points: [
      "CCTP / Bridge Kit can support cross-chain USDC movement where investors start from another chain and settle funding on Arc.",
      "TradeCycle's core cycle funding path remains the same after USDC arrives on Arc.",
    ],
  },
  {
    status: "Future extension",
    title: "Circle Wallets onboarding",
    eyebrow: "Embedded wallet path",
    tone: "#6495ED",
    points: [
      "Circle Wallets can support embedded wallet onboarding for non-crypto-native SMEs, investors, and verifiers.",
      "This would reduce onboarding friction without changing the underlying TradeCycle contracts.",
    ],
  },
  {
    status: "Gated concept",
    title: "USYC treasury/reserve float",
    eyebrow: "Enterprise concept",
    tone: "var(--warning)",
    points: [
      "USYC is an enterprise/gated concept for idle treasury, reserve, or inventory float.",
      "It is not implemented in this TradeCycle demo.",
    ],
  },
] as const

const TEST_TODAY = [
  { label: "Connect wallet", href: "/" },
  { label: "Get test USDC", href: "/faucet" },
  { label: "Fund a cycle", href: "/" },
  { label: "Submit milestone evidence", href: "/operator/dashboard" },
  { label: "Verify milestone", href: "/verifier" },
  { label: "Release tranche", href: "/operator/dashboard" },
  { label: "Repay and distribute", href: "/operator/dashboard" },
  { label: "View Credit Passport", href: "/credit-passport" },
] as const

export default function FundingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 32px 72px" }}>
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 30 }}>
          <div>
            <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>Circle stack map</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px,5vw,54px)", fontWeight: 400, lineHeight: 1.08, color: "var(--text-primary)", marginBottom: 14 }}>USDC Funding Routes</h1>
            <p style={{ fontSize: 17, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 680 }}>How capital can reach TradeCycle cycles on Arc.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <Link href="/demo" className="btn-primary" style={{ textDecoration: "none" }}>View Demo</Link>
            <Link href="/submission" className="btn-ghost" style={{ textDecoration: "none" }}>Submission Fit</Link>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 28 }}>
          {FUNDING_ROUTES.map((route) => (
            <div key={route.title} className="card" style={{ padding: 24, display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>
              <div>
                <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>{route.eyebrow}</p>
                <span style={{ display: "inline-flex", border: `1px solid ${route.tone}44`, background: `${route.tone}14`, color: route.tone, borderRadius: 999, padding: "5px 10px", fontSize: 11, fontFamily: "var(--font-mono)" }}>{route.status}</span>
              </div>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, color: "var(--text-primary)", marginBottom: 12 }}>{route.title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {route.points.map((point) => (
                    <div key={point} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: route.tone, lineHeight: 1.5 }}>-</span>
                      <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="card" style={{ padding: 26, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Live test path</p>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400 }}>What you can test today</h2>
            </div>
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <Link href="/demo" className="btn-ghost" style={{ textDecoration: "none" }}>Open guided demo</Link>
              <Link href="/submission" className="btn-ghost" style={{ textDecoration: "none" }}>Submission Fit</Link>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {TEST_TODAY.map((item, index) => (
              <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
                <div style={{ minHeight: 92, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold)", marginBottom: 8 }}>{String(index + 1).padStart(2, "0")}</p>
                  <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.45 }}>{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ padding: 18, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>Gateway, CCTP / Bridge Kit, Circle Wallets, and USYC are shown as expansion paths only. The current demo implements direct Arc Testnet USDC funding into TradeCycle cycle contracts.</p>
        </section>
      </main>
    </div>
  )
}
