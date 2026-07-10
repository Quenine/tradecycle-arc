"use client"

import Link from "next/link"
import Navbar from "@/components/navbar"

const DEMO_STEPS = [
  {
    step: "01",
    role: "Investor / SME Operator / Verifier",
    title: "Connect wallet and switch to Arc Testnet",
    why: "Every action in the demo uses an EVM wallet on Arc Testnet, with USDC as the payment and gas asset.",
    href: "/",
    cta: "Open app",
  },
  {
    step: "02",
    role: "Investor / SME Operator / Verifier",
    title: "Get test USDC",
    why: "Test USDC lets users fund cycles, stake as verifiers, and repay demo cycles without using real funds.",
    href: "/faucet",
    cta: "Get USDC",
  },
  {
    step: "03",
    role: "SME Operator",
    title: "Apply or register as an SME operator",
    why: "Operator approval creates the controlled entry point for businesses that want to raise working capital.",
    href: "/operator",
    cta: "Operator portal",
  },
  {
    step: "04",
    role: "SME Operator",
    title: "Deposit collateral if needed",
    why: "Collateral adds downside protection and makes the cycle more accountable before investor funds are accepted.",
    href: "/operator",
    cta: "Prepare cycle",
  },
  {
    step: "05",
    role: "SME Operator",
    title: "Create a trade cycle",
    why: "The cycle stores capital required, expected revenue, milestone schedule, fees, collateral, and operator details onchain.",
    href: "/operator",
    cta: "Create cycle",
  },
  {
    step: "06",
    role: "Investor",
    title: "Fund the cycle with USDC",
    why: "Investor USDC is escrowed in the cycle contract and represented by cycle tokens for that position.",
    href: "/",
    cta: "Browse cycles",
  },
  {
    step: "07",
    role: "SME Operator",
    title: "Submit milestone evidence",
    why: "Evidence CIDs or hashes make production progress reviewable before more working capital is released.",
    href: "/operator/dashboard",
    cta: "Operator dashboard",
  },
  {
    step: "08",
    role: "Verifier",
    title: "Approve milestone evidence",
    why: "Staked verifiers create a quorum-gated control before milestone funds can move to the operator.",
    href: "/verifier",
    cta: "Verifier page",
  },
  {
    step: "09",
    role: "SME Operator",
    title: "Release milestone funds",
    why: "Once quorum is reached, the operator can release the approved tranche from escrow into working capital.",
    href: "/operator/dashboard",
    cta: "Release funds",
  },
  {
    step: "10",
    role: "SME Operator / Verifier",
    title: "Submit harvest or final evidence",
    why: "Final evidence marks the end of the real-world production or trade cycle before repayment.",
    href: "/operator/dashboard",
    cta: "Submit final evidence",
  },
  {
    step: "11",
    role: "SME Operator",
    title: "Repay expected revenue",
    why: "The operator pays the exact expected revenue shown by the platform so settlement can distribute funds automatically.",
    href: "/operator/dashboard",
    cta: "Settle cycle",
  },
  {
    step: "12",
    role: "Investor",
    title: "Withdraw payout",
    why: "After distribution, investors withdraw principal plus net profit from their Portfolio.",
    href: "/portfolio",
    cta: "Portfolio",
  },
  {
    step: "13",
    role: "Investor / SME Operator / Verifier",
    title: "View the operator Credit Passport",
    why: "Completed cycles, defaults, capital raised, milestones, and repayment history become an onchain SME finance profile.",
    href: "/credit-passport",
    cta: "Credit Passport route",
  },
] as const

const QUICK_LINKS = [
  { label: "Browse Cycles", href: "/" },
  { label: "Get Test USDC", href: "/faucet" },
  { label: "Funding Routes", href: "/funding" },
  { label: "Submission Fit", href: "/submission" },
  { label: "Create a Cycle", href: "/operator" },
  { label: "Verifier Console", href: "/verifier" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Stats", href: "/stats" },
  { label: "Market", href: "/market" },
] as const


function stepCue(step: string) {
  if (step === "04" || step === "10") return "Context"
  if (step === "03" || step === "06" || step === "08" || step === "11") return "Role switch"
  return "Required"
}

function cueColor(cue: string) {
  if (cue === "Required") return "var(--emerald)"
  if (cue === "Role switch") return "var(--gold)"
  return "#6495ED"
}
export default function DemoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 32px 72px" }}>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 28, alignItems: "start", marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>Arc Testnet guide</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px,5vw,56px)", fontWeight: 400, lineHeight: 1.08, color: "var(--text-primary)", marginBottom: 16 }}>TradeCycle Demo</h1>
            <p style={{ fontSize: 17, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 680 }}>Run the full USDC milestone finance workflow on Arc Testnet.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
              <Link href="/" className="btn-primary" style={{ textDecoration: "none" }}>Browse Cycles -&gt;</Link>
              <Link href="/operator" className="btn-ghost" style={{ textDecoration: "none" }}>Create a Cycle</Link>
              <Link href="/verifier" className="btn-ghost" style={{ textDecoration: "none" }}>Verify Evidence</Link>
            </div>
          </div>

          <div className="card" style={{ padding: 26, borderColor: "rgba(201,168,76,0.28)" }}>
            <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Demo scenario</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 400, lineHeight: 1.25, marginBottom: 12 }}>Agricultural export working capital</h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8 }}>
              An agricultural exporter needs USDC working capital to fulfill a produce supply order. Investors fund the cycle, verifiers approve production milestones, and repayment updates the SME&apos;s Credit Passport.
            </p>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, marginBottom: 18 }}>
          {[
            ["Investor", "Fund cycles and withdraw payout."],
            ["SME Operator", "Create cycles, submit evidence, repay revenue."],
            ["Verifier", "Review evidence and approve milestones."],
            ["Protocol/Admin", "Observe stats, reserves, and submission fit."],
          ].map(([role, detail]) => (
            <div key={role} className="institutional-card" style={{ padding: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 5 }}>{role}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{detail}</p>
            </div>
          ))}
        </section>

        <section className="card" style={{ padding: 22, marginBottom: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>What you can test today</p>
          <p className="trust-note" style={{ marginBottom: 14 }}>Use these routes to run the workflow without assuming any transaction has already happened.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href} style={{ textDecoration: "none", color: "var(--gold)", border: "1px solid var(--border-gold)", background: "var(--gold-glow)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {DEMO_STEPS.map((item) => (
            <div key={item.step} className="card" style={{ padding: 22, display: "grid", gridTemplateColumns: "76px 160px 1fr 170px", gap: 18, alignItems: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-gold)", background: "var(--gold-glow)", color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 13 }}>{item.step}</div>
              <div>
                <p className="stat-label">Role</p>
                <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>{item.role}</p>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</p>
                  <span style={{ border: `1px solid ${cueColor(stepCue(item.step))}44`, background: `${cueColor(stepCue(item.step))}14`, color: cueColor(stepCue(item.step)), borderRadius: 999, padding: "2px 8px", fontSize: 10, fontFamily: "var(--font-mono)" }}>{stepCue(item.step)}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{item.why}</p>
              </div>
              <Link href={item.href} className={item.step === "13" ? "btn-ghost" : "btn-primary"} style={{ textDecoration: "none", textAlign: "center", padding: "9px 12px", fontSize: 12 }}>
                {item.cta}
              </Link>
            </div>
          ))}
        </section>

        <section className="card" style={{ padding: 26, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Stablecoin finance workflow</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, marginBottom: 14 }}>Why this workflow matters</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
            {[
              { title: "USDC funding", desc: "Investors fund real SME trade cycles directly with test USDC on Arc Testnet." },
              { title: "Milestone escrow", desc: "Capital moves in tranches only after verifier-approved production evidence." },
              { title: "Automated distribution", desc: "Operator repayment triggers protocol distribution to investors and fee flows." },
              { title: "SME Credit Passport", desc: "Each cycle adds onchain history for operator reputation and future underwriting demos." },
            ].map((item) => (
              <div key={item.title} style={{ background: "var(--bg-surface)", borderRadius: 8, padding: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{item.title}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: 18, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>Testnet demonstration only. TradeCycle is not a regulated lending platform, credit rating service, or investment recommendation.</p>
        </section>
      </main>
    </div>
  )
}
