"use client"

import { useState } from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import Navbar from "@/components/navbar"
import ConnectWallet from "@/components/connect-wallet"

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function isAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

export default function CreditPassportLandingPage() {
  const { address, isConnected } = useAccount()
  const [operatorInput, setOperatorInput] = useState("")
  const trimmedInput = operatorInput.trim()
  const hasValidInput = isAddress(trimmedInput)

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "64px 32px 72px" }}>
        <section style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>TradeCycle</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px,5vw,54px)", fontWeight: 400, lineHeight: 1.08, marginBottom: 14 }}>My Credit Passport</h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 680 }}>
            Open a testnet reputation profile built from readable TradeCycle operator activity. This is not a regulated credit score.
          </p>
        </section>

        <section className="card" style={{ padding: 28, marginBottom: 18 }}>
          {isConnected && address ? (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Connected wallet</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>{shortAddress(address)}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 20 }}>
                Open the connected wallet&apos;s operator finance history, including cycles created, funding progress, repayments, defaults, and readable milestone evidence controls.
              </p>
              <Link href={`/credit-passport/${address}`} className="btn-primary" style={{ textDecoration: "none" }}>Open My Passport -&gt;</Link>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Connect a wallet</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 18 }}>
                Connect a wallet to open your own Credit Passport, or inspect another SME operator address manually.
              </p>
              <ConnectWallet />
            </>
          )}
        </section>

        <section className="card" style={{ padding: 28 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Inspect another operator</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16 }}>
            Enter an EVM operator address to view its available TradeCycle history on Arc Testnet.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="0x..."
              value={operatorInput}
              onChange={(event) => setOperatorInput(event.target.value)}
              style={{ flex: "1 1 360px" }}
            />
            {hasValidInput ? (
              <Link href={`/credit-passport/${trimmedInput}`} className="btn-primary" style={{ textDecoration: "none" }}>View Passport</Link>
            ) : (
              <button className="btn-ghost" disabled style={{ opacity: 0.55 }}>Enter valid address</button>
            )}
          </div>
          {trimmedInput && !hasValidInput && (
            <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 10 }}>Enter a valid 0x EVM address.</p>
          )}
        </section>
      </main>
    </div>
  )
}
