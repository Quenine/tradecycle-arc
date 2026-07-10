"use client"

import Link from "next/link"
import Navbar from "@/components/navbar"

type Status = "Ready" | "In progress" | "Planned before submission" | "Placeholder needed"

const REQUIREMENTS: { item: string; detail: string; status: Status }[] = [
  { item: "Title and short description", detail: "TradeCycle: USDC milestone finance for SMEs on Arc.", status: "Ready" },
  { item: "Track selected", detail: "Best SME Trade Finance & Working Capital Workflow.", status: "Ready" },
  { item: "Circle Developer Account email", detail: "Add the submitting team email before final form submission.", status: "Placeholder needed" },
  { item: "Circle products used on Arc", detail: "Implemented path uses Arc Testnet and USDC. Gateway, CCTP / Bridge Kit, Wallets, and USYC are described only as expansion paths.", status: "Ready" },
  { item: "Functional MVP", detail: "Cycle creation, USDC funding, verifier milestone approval, settlement, portfolio withdrawal, market, and Credit Passport flows are present.", status: "Ready" },
  { item: "Frontend", detail: "Next.js app with judge pages for demo, funding routes, and submission fit.", status: "Ready" },
  { item: "Smart-contract backend", detail: "Existing deployed contracts power factory, production cycles, verifier registry, collateral vault, reserve, treasury, and marketplace behavior.", status: "Ready" },
  { item: "Architecture diagram", detail: "Prepare final visual showing SME operator, investor, verifier, USDC escrow, repayment distribution, and Credit Passport.", status: "Planned before submission" },
  { item: "Video demo", detail: "Record a 2-3 minute walkthrough using /demo as the script.", status: "Planned before submission" },
  { item: "GitHub repository", detail: "Add final public repository URL in the submission form.", status: "Placeholder needed" },
  { item: "Demo app URL", detail: "Add deployed demo URL after final deployment.", status: "Placeholder needed" },
  { item: "Circle Product Feedback", detail: "Prepare feedback covering Gateway, CCTP / Bridge Kit, Wallets, and USYC fit for TradeCycle.", status: "Planned before submission" },
]

const PRODUCT_MAP = [
  { status: "Implemented", product: "Arc", detail: "Smart contract settlement layer for cycle creation, escrow, verifier-gated releases, repayment, and distribution." },
  { status: "Implemented", product: "USDC", detail: "Funding, escrow, milestone releases, repayment, protocol fees, and investor withdrawals." },
  { status: "Architecture-ready", product: "Circle Gateway", detail: "Unified USDC liquidity for treasury routing, reserve pool funding, operator payouts, and multi-party settlement movement." },
  { status: "Future extension", product: "CCTP / Bridge Kit", detail: "Cross-chain USDC funding and settlement extension when investors start from another chain and settle on Arc." },
  { status: "Future extension", product: "Circle Wallets", detail: "Embedded wallet onboarding for non-crypto-native SMEs, investors, and verifiers without changing TradeCycle contracts." },
  { status: "Gated concept", product: "USYC", detail: "Enterprise concept for idle treasury, reserve, or inventory float; not implemented unless access is granted." },
  { status: "Not core to this track", product: "StableFX", detail: "More relevant to FX and remittance flows than this SME working capital workflow." },
  { status: "Not core to this track", product: "Nanopayments", detail: "More relevant to agentic economy or pay-per-use flows than cycle finance." },
] as const

const WIN_POINTS = [
  "Not just invoice escrow",
  "Full cycle finance workflow",
  "Verifier-approved milestone release",
  "Tokenized investor positions",
  "Automated repayment waterfall",
  "SME Credit Passport as reusable financing reputation",
  "Clear Arc/USDC settlement layer",
] as const

const FINAL_ASSETS = [
  "Deployed demo URL",
  "GitHub URL",
  "2-3 minute video",
  "Architecture diagram",
  "Circle Product Feedback document",
  "README setup instructions",
  "Final submission form answers",
] as const

const APP_ROUTES = [
  { label: "Guided Demo", href: "/demo" },
  { label: "Funding Routes", href: "/funding" },
  { label: "Market", href: "/market" },
  { label: "Operator", href: "/operator" },
  { label: "Verifier", href: "/verifier" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Stats", href: "/stats" },
] as const

function statusColor(status: string) {
  if (status === "Ready" || status === "Implemented") return "var(--emerald)"
  if (status === "In progress" || status === "Architecture-ready") return "var(--gold)"
  if (status === "Placeholder needed" || status === "Gated concept") return "var(--warning)"
  if (status === "Not core to this track") return "var(--text-muted)"
  return "#6495ED"
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status)
  return (
    <span style={{ display: "inline-flex", border: `1px solid ${color}44`, background: `${color}14`, color, borderRadius: 999, padding: "5px 10px", fontSize: 11, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
      {status}
    </span>
  )
}

export default function SubmissionPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "64px 32px 72px" }}>
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>Hackathon readiness</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px,5vw,54px)", fontWeight: 400, lineHeight: 1.08, color: "var(--text-primary)", marginBottom: 14 }}>Submission Fit</h1>
            <p style={{ fontSize: 17, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 720 }}>How TradeCycle maps to the Stablecoin Commerce Stack Challenge.</p>
          </div>
          <Link href="/demo" className="btn-primary" style={{ textDecoration: "none", flexShrink: 0 }}>Run Demo</Link>
        </section>

        <section className="card" style={{ padding: 26, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 28 }}>
            <div>
              <p className="stat-label" style={{ marginBottom: 8 }}>Selected track</p>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 400, lineHeight: 1.25, marginBottom: 14 }}>Best SME Trade Finance & Working Capital Workflow</h2>
              <StatusBadge status="Ready" />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 14 }}>Prize target: 1st Place / 2nd Place category</p>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Why this track fits</p>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8 }}>
                TradeCycle provides USDC working capital, milestone escrow, verifier-approved releases, tokenized investor positions, automated repayment distribution, and SME Credit Passport.
              </p>
            </div>
          </div>
        </section>

        <section className="card" style={{ padding: 24, marginBottom: 18 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 400, marginBottom: 16 }}>Challenge requirement coverage</h2>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Requirement</th><th>Status</th><th>Notes</th></tr></thead>
              <tbody>
                {REQUIREMENTS.map((row) => (
                  <tr key={row.item}>
                    <td style={{ fontWeight: 600 }}>{row.item}</td>
                    <td><StatusBadge status={row.status} /></td>
                    <td style={{ color: "var(--text-muted)", lineHeight: 1.55 }}>{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card" style={{ padding: 24, marginBottom: 18 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 400, marginBottom: 16 }}>Circle / Arc product map</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
            {PRODUCT_MAP.map((item) => (
              <div key={item.product} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                  <p style={{ fontSize: 15, fontWeight: 600 }}>{item.product}</p>
                  <StatusBadge status={item.status} />
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 400, marginBottom: 16 }}>Why this can win</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {WIN_POINTS.map((point) => (
                <div key={point} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--emerald)", lineHeight: 1.4 }}>✓</span>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 400, marginBottom: 16 }}>Required final assets</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FINAL_ASSETS.map((asset) => (
                <div key={asset} style={{ display: "flex", justifyContent: "space-between", gap: 14, borderBottom: "1px solid var(--border)", paddingBottom: 9 }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{asset}</span>
                  <StatusBadge status={asset.includes("README") ? "Ready" : "Planned before submission"} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 400, marginBottom: 16 }}>Useful app routes</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {APP_ROUTES.map((route) => (
              <Link key={route.href} href={route.href} style={{ textDecoration: "none", color: "var(--gold)", border: "1px solid var(--border-gold)", background: "var(--gold-glow)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                {route.label}
              </Link>
            ))}
          </div>
        </section>

        <section style={{ padding: 18, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>Only Arc and USDC are marked implemented. Gateway, CCTP / Bridge Kit, Circle Wallets, USYC, StableFX, and Nanopayments are not claimed as implemented integrations.</p>
        </section>
      </main>
    </div>
  )
}
