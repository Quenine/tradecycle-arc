"use client"

import { useAccount, useReadContracts } from "wagmi"
import Navbar from "@/components/navbar"
import { CONTRACTS, NETWORK, STABLECOIN } from "@/constants/contracts"
import { ERC20_ABI } from "@/contracts/abis"
import ConnectWallet from "@/components/connect-wallet"
import { stableAmountToNumber } from "@/lib/token-units"

const CIRCLE_FAUCET_URL = "https://faucet.circle.com"

export default function FaucetPage() {
  const { address } = useAccount()

  const { data } = useReadContracts({
    contracts: address ? [
      { chainId: NETWORK.chainId, address: CONTRACTS.stablecoin, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
    ] : [],
    query: { enabled: !!address, refetchInterval: 5000 },
  })

  const balance = stableAmountToNumber((data?.[0]?.result as bigint) ?? 0n)

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--gold-glow)", border: "1px solid var(--border-gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px", color: "var(--gold)" }}>$</div>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>{NETWORK.name} funding</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 400, marginBottom: 12 }}>Get Arc USDC</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>Arc uses USDC for gas and app transfers. Use Circle&apos;s faucet for testnet funds, then return here to invest, verify, or launch cycles.</p>
        </div>

        {!address ? (
          <div style={{ textAlign: "center" }}><ConnectWallet /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 24 }}>
              <p className="stat-label">Your {STABLECOIN.symbol} balance</p>
              <p style={{ fontSize: 34, fontFamily: "var(--font-display)", marginTop: 4 }}>{balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>{address}</p>
            </div>

            <a className="btn-primary" href={CIRCLE_FAUCET_URL} target="_blank" rel="noopener noreferrer" style={{ width: "100%", padding: "16px 0", fontSize: 16, textAlign: "center", textDecoration: "none" }}>
              Open Circle faucet
            </a>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[{ label: "Network", value: NETWORK.name }, { label: "Token", value: `${STABLECOIN.symbol} (ERC-20)` }, { label: "Decimals", value: String(STABLECOIN.decimals) }, { label: "Explorer", value: NETWORK.blockExplorerName }].map(s => (
                <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
                  <p className="stat-label">{s.label}</p>
                  <p style={{ fontSize: 14, fontFamily: "var(--font-mono)" }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
