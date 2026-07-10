"use client"

import Link from "next/link"
import { useState } from "react"
import { useAccount, useReadContracts } from "wagmi"
import { useQueryClient } from "@tanstack/react-query"
import Navbar from "@/components/navbar"
import ConnectWallet from "@/components/connect-wallet"
import { CONTRACTS, NETWORK, PROTOCOL_FEES } from "@/constants/contracts"
import { FACTORY_V2_ABI, FAUCET_ABI } from "@/contracts/abis-v2"
import { COLLATERAL_VAULT_ABI } from "@/contracts/abis"
import { useWatchedWrite } from "@/hooks/useWatchedWrite"
import { parseStableAmount, stableAmountToNumber } from "@/lib/token-units"

const CATEGORIES = ["Agricultural", "Trade Finance", "Commodities", "Equipment Leasing", "Energy", "Manufacturing", "Other"]
const OPERATOR_FIELD_LIMITS = {
  name: 80,
  businessType: 80,
  location: 100,
  description: 360,
  cycleName: 80,
  cycleLocation: 100,
  cycleDescription: 480,
}
const MILESTONES = [
  { pct: 40, label: "M1 - Production start", desc: "Production begins" },
  { pct: 30, label: "M2 - Mid-cycle checkpoint", desc: "Progress confirmed by verifiers" },
  { pct: 20, label: "M3 - Harvest / delivery", desc: "Product ready or delivered" },
  { pct: 10, label: "M4 - Final settlement", desc: "Buyer payment received" },
]

export default function OperatorPage() {
  const { address } = useAccount()
  const { send, approve } = useWatchedWrite()
  const queryClient = useQueryClient()

  const [appForm, setAppForm] = useState({ name: "", businessType: "", location: "", description: "" })
  const [form, setForm] = useState({
    cycleName: "",
    cycleSymbol: "",
    category: "Agricultural",
    location: "",
    description: "",
    capitalRequired: "",
    expectedRevenue: "",
    duration: "",
    reservePercent: String(PROTOCOL_FEES.defaultReserveFee),
    protocolFeePercent: String(PROTOCOL_FEES.defaultProtocolFee),
    operatorLiquidityContribution: "0",
  })
  const [isApplying, setIsApplying] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [step, setStep] = useState("")
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error"; hash?: string } | null>(null)

  function toast$(msg: string, type: "success" | "error" = "success", hash?: string) {
    setToast({ msg, type, hash })
    setTimeout(() => setToast(null), 12000)
  }

  const { data, refetch } = useReadContracts({
    contracts: address ? [
      { address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "approvedOperators", args: [address] },
      { address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "applications", args: [address] },
      { address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "approvalMode" },
      { address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "DEFAULT_RESERVE_PERCENT" },
      { address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "DEFAULT_PROTOCOL_FEE_PERCENT" },
      { address: CONTRACTS.stablecoin, abi: FAUCET_ABI, functionName: "balanceOf", args: [address] },
      { address: CONTRACTS.collateralVault, abi: COLLATERAL_VAULT_ABI, functionName: "collateralBalance", args: [address] },
    ] : [],
    query: { enabled: !!address, refetchInterval: 6000 },
  })

  const isApproved = (data?.[0]?.result as boolean) ?? false
  const appData = data?.[1]?.result as { name?: string; businessType?: string; status?: number } | undefined
  const appStatus = Number(appData?.status ?? 0)
  const approvalMode = Number(data?.[2]?.result ?? 0)
  const defaultReservePercent = Number(data?.[3]?.result ?? BigInt(PROTOCOL_FEES.defaultReserveFee))
  const defaultProtocolFeePercent = Number(data?.[4]?.result ?? BigInt(PROTOCOL_FEES.defaultProtocolFee))
  const usdcBalance = stableAmountToNumber((data?.[5]?.result as bigint) ?? 0n)
  const colOnDeposit = stableAmountToNumber((data?.[6]?.result as bigint) ?? 0n)
  const hasPending = appStatus === 1
  const isOpen = approvalMode === 1

  const cap = Number(form.capitalRequired) || 0
  const rev = Number(form.expectedRevenue) || 0
  const collateral = cap > 0 ? Math.ceil(cap * 0.1) : 0
  const operatorLiquidityContribution = Number(form.operatorLiquidityContribution) || 0
  const totalRequiredCash = collateral + Math.max(operatorLiquidityContribution, 0)
  const gross = rev > cap ? rev - cap : 0
  const pFee = gross * (defaultProtocolFeePercent / 100)
  const rFee = gross * (defaultReservePercent / 100)
  const vFee = gross * 0.005
  const invProfit = gross - pFee - rFee - vFee
  const netROI = cap > 0 && invProfit > 0 ? Math.round((invProfit / cap) * 100) : 0
  const hasFunds = totalRequiredCash > 0 && totalRequiredCash <= usdcBalance
  const formValid = !!form.cycleName.trim() && !!form.cycleSymbol.trim() && cap > 0 && rev > cap && Number(form.duration) > 0 && hasFunds

  async function handleApply() {
    const application = {
      name: appForm.name.trim(),
      businessType: appForm.businessType.trim(),
      location: appForm.location.trim(),
      description: appForm.description.trim(),
    }
    if (!application.name || !application.businessType) return
    setIsApplying(true)
    try {
      const hash = await send({
        address: CONTRACTS.factory,
        abi: FACTORY_V2_ABI,
        functionName: "applyAsOperator",
        args: [application.name, application.businessType, application.location, application.description],
      })
      toast$(isOpen ? "Approved instantly. You can create a cycle below." : "Application submitted for review.", "success", hash)
      refetch()
    } catch (error: unknown) {
      const err = error as { shortMessage?: string; message?: string }
      toast$(err.shortMessage ?? err.message ?? "Failed", "error")
    }
    setIsApplying(false)
  }

  async function handleDeploy() {
    if (!formValid || !address) return

    setIsDeploying(true)
    const cycleText = {
      name: form.cycleName.trim(),
      symbol: form.cycleSymbol.trim().toUpperCase(),
      location: form.location.trim(),
      description: form.description.trim(),
    }
    const capWei = parseStableAmount(form.capitalRequired)
    const colWei = parseStableAmount(collateral.toString())
    const revWei = parseStableAmount(form.expectedRevenue)
    const liquidityWei = parseStableAmount(String(Math.max(operatorLiquidityContribution, 0)))
    const durSec = BigInt(Number(form.duration) * 86400)

    try {
      setStep("Tx 1/3 - Approving USDC for collateral")
      await approve(CONTRACTS.stablecoin, CONTRACTS.collateralVault)

      if (operatorLiquidityContribution > 0 && CONTRACTS.liquidityVault !== "0x0000000000000000000000000000000000000000") {
        setStep("Tx 2/4 - Approving operator launch liquidity")
        await approve(CONTRACTS.stablecoin, CONTRACTS.liquidityVault)
      }

      setStep(operatorLiquidityContribution > 0 ? "Tx 3/4 - Depositing collateral" : "Tx 2/3 - Depositing collateral")
      await send({
        address: CONTRACTS.collateralVault,
        abi: COLLATERAL_VAULT_ABI,
        functionName: "depositCollateral",
        args: [colWei],
      })

      setStep(operatorLiquidityContribution > 0 ? "Tx 4/4 - Deploying cycle contract" : "Tx 3/3 - Deploying cycle contract")
      const createHash = await send({
        address: CONTRACTS.factory,
        abi: FACTORY_V2_ABI,
        functionName: "createCycle",
        args: [
          capWei,
          colWei,
          revWei,
          durSec,
          defaultReservePercent,
          defaultProtocolFeePercent,
          liquidityWei,
          cycleText.name,
          cycleText.symbol,
          form.category,
          cycleText.location,
          cycleText.description,
        ],
      })

      toast$(
        `"${form.cycleName}" is live. Investors can fund it now, and your $${collateral.toLocaleString()} collateral will be returned on successful completion.`,
        "success",
        createHash,
      )
      setForm((current) => ({
        ...current,
        cycleName: "",
        cycleSymbol: "",
        description: "",
        capitalRequired: "",
        expectedRevenue: "",
        duration: "",
        operatorLiquidityContribution: "0",
      }))
      await queryClient.invalidateQueries()
    } catch (error: unknown) {
      const err = error as { shortMessage?: string; message?: string }
      toast$(err.shortMessage ?? err.message ?? "Deployment failed", "error")
    }

    setStep("")
    setIsDeploying(false)
  }

  async function handleWithdrawCollateral() {
    if (colOnDeposit <= 0) return
    try {
      const colWei = parseStableAmount(colOnDeposit.toFixed(6))
      const hash = await send({
        address: CONTRACTS.collateralVault,
        abi: COLLATERAL_VAULT_ABI,
        functionName: "withdrawCollateral",
        args: [colWei],
      })
      toast$(`$${colOnDeposit.toLocaleString()} collateral returned to wallet.`, "success", hash)
      refetch()
    } catch (error: unknown) {
      const err = error as { shortMessage?: string }
      toast$(err.shortMessage ?? "Withdrawal failed", "error")
    }
  }

  if (!address) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
        <Navbar />
        <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 32px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, marginBottom: 12 }}>Operator portal</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 28 }}>Connect your wallet to list a production cycle.</p>
          <ConnectWallet />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Operator portal</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 400, marginBottom: 8 }}>Launch a production cycle</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 620 }}>
            Get funded by global investors. Capital releases in verifier-approved milestones after you submit evidence. You can also add operator launch liquidity so your token has deeper trading support when funding completes.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ padding: "8px 14px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", fontSize: 13 }}>
            USDC: <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>${usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          {colOnDeposit > 0 && (
            <div style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(45,212,160,0.08)", border: "1px solid rgba(45,212,160,0.2)", fontSize: 13, color: "var(--emerald)", display: "flex", alignItems: "center", gap: 10 }}>
              Collateral on deposit: ${colOnDeposit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <button onClick={handleWithdrawCollateral} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(45,212,160,0.15)", border: "1px solid rgba(45,212,160,0.3)", color: "var(--emerald)", cursor: "pointer" }}>
                Withdraw
              </button>
            </div>
          )}
          {isApproved && <div style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(45,212,160,0.08)", border: "1px solid rgba(45,212,160,0.2)", fontSize: 13, color: "var(--emerald)" }}>Approved operator</div>}
          {isOpen && <div style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", fontSize: 13, color: "var(--gold)" }}>Open mode - instant approval</div>}
          {usdcBalance < 100 && <Link href="/faucet" style={{ padding: "8px 14px", borderRadius: 8, background: "var(--gold-glow)", border: "1px solid var(--border-gold)", fontSize: 13, color: "var(--gold)", textDecoration: "none" }}>Need USDC - Faucet</Link>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!isApproved && (
              <div className="card" style={{ padding: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Step 1 - Apply as operator</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.7 }}>
                  {isOpen ? "Open mode - approved instantly on submission." : "Reviewed within 24 hours."}
                </p>
                {hasPending ? (
                  <div style={{ padding: 14, background: "rgba(244,165,34,0.08)", borderRadius: 8, border: "1px solid rgba(244,165,34,0.2)" }}>
                    <p style={{ color: "var(--warning)", fontWeight: 500 }}>Application pending review</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{appData?.name} - {appData?.businessType}</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Business name *</label><input type="text" placeholder="Kwame Farms Ltd" maxLength={OPERATOR_FIELD_LIMITS.name} value={appForm.name} onChange={(e) => setAppForm((current) => ({ ...current, name: e.target.value }))} /></div>
                      <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Business type *</label><input type="text" placeholder="Agricultural Commodities" maxLength={OPERATOR_FIELD_LIMITS.businessType} value={appForm.businessType} onChange={(e) => setAppForm((current) => ({ ...current, businessType: e.target.value }))} /></div>
                    </div>
                    <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Country / region</label><input type="text" placeholder="Kumasi, Ghana" maxLength={OPERATOR_FIELD_LIMITS.location} value={appForm.location} onChange={(e) => setAppForm((current) => ({ ...current, location: e.target.value }))} /></div>
                    <div style={{ marginBottom: 18 }}><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Describe your business</label><textarea rows={3} placeholder="What you produce, who buys from you..." maxLength={OPERATOR_FIELD_LIMITS.description} value={appForm.description} onChange={(e) => setAppForm((current) => ({ ...current, description: e.target.value }))} /></div>
                    <button className="btn-primary" style={{ width: "100%" }} onClick={handleApply} disabled={isApplying || !appForm.name || !appForm.businessType}>
                      {isApplying ? "Submitting..." : isOpen ? "Apply - approved instantly" : "Submit application"}
                    </button>
                  </>
                )}
              </div>
            )}

            {isApproved && (
              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(45,212,160,0.15)", border: "1px solid var(--emerald)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--emerald)" }}>OK</div>
                  <span style={{ fontSize: 13, color: "var(--emerald)" }}>Approved operator</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 4 }}>Create a production cycle</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.7 }}>
                  Default flow: approve USDC, deposit collateral, deploy the cycle. If you add operator launch liquidity, there is one extra approval so your cycle can open with deeper trading support.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Cycle name *</label><input type="text" placeholder="Kumasi Cocoa Export Q4" maxLength={OPERATOR_FIELD_LIMITS.cycleName} value={form.cycleName} onChange={(e) => setForm((current) => ({ ...current, cycleName: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Token symbol (3-5 chars) *</label><input type="text" placeholder="COCOA" maxLength={5} value={form.cycleSymbol} onChange={(e) => setForm((current) => ({ ...current, cycleSymbol: e.target.value.toUpperCase() }))} /></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Category</label><select value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
                  <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Location</label><input type="text" placeholder="Kumasi, Ghana" maxLength={OPERATOR_FIELD_LIMITS.cycleLocation} value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} /></div>
                </div>

                <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Description</label><textarea rows={2} placeholder="What you produce, how capital is used, who your buyers are..." maxLength={OPERATOR_FIELD_LIMITS.cycleDescription} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} /></div>

                <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12 }}>Financial parameters</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Capital to raise (USDC) *</label><input type="number" placeholder="1000" min="1" value={form.capitalRequired} onChange={(e) => setForm((current) => ({ ...current, capitalRequired: e.target.value }))} /><p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 3 }}>Investors fund this</p></div>
                  <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Expected revenue (USDC) *</label><input type="number" placeholder="1220" min="1" value={form.expectedRevenue} onChange={(e) => setForm((current) => ({ ...current, expectedRevenue: e.target.value }))} /><p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 3 }}>Stored on-chain for ROI</p></div>
                  <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Duration (days) *</label><input type="number" placeholder="90" min="1" value={form.duration} onChange={(e) => setForm((current) => ({ ...current, duration: e.target.value }))} /></div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Optional operator launch liquidity (USDC)</label>
                  <input type="number" placeholder="0" min="0" value={form.operatorLiquidityContribution} onChange={(e) => setForm((current) => ({ ...current, operatorLiquidityContribution: e.target.value }))} />
                  <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 3 }}>
                    Optional. This goes into the protocol liquidity vault for your cycle so the token can open with stronger market depth after funding completes.
                  </p>
                </div>

                {cap > 0 && (
                  <div style={{ padding: 12, background: "rgba(201,168,76,0.06)", borderRadius: 8, border: "1px solid rgba(201,168,76,0.2)", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>Collateral - auto-deposited (10%)</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Returned after successful cycle completion</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--gold)" }}>${collateral.toLocaleString()}</p>
                      <p style={{ fontSize: 11, marginTop: 2, color: totalRequiredCash > usdcBalance ? "var(--danger)" : "var(--emerald)" }}>
                        {totalRequiredCash > usdcBalance ? "Insufficient balance" : "Available"}
                      </p>
                    </div>
                  </div>
                )}

                {operatorLiquidityContribution > 0 && (
                  <div style={{ padding: 12, background: "rgba(45,212,160,0.06)", borderRadius: 8, border: "1px solid rgba(45,212,160,0.2)", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--emerald)" }}>Operator launch liquidity</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Supports stronger post-funding trading conditions</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--emerald)" }}>${operatorLiquidityContribution.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {cap > 0 && rev > 0 && rev <= cap && (
                  <div style={{ padding: 10, background: "rgba(224,82,82,0.06)", borderRadius: 8, border: "1px solid rgba(224,82,82,0.2)", marginBottom: 14 }}>
                    <p style={{ fontSize: 12, color: "var(--danger)" }}>Expected revenue must exceed capital required.</p>
                  </div>
                )}

                {cap > 0 && rev > cap && (
                  <div style={{ padding: 14, background: "var(--bg-surface)", borderRadius: 8, marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Live preview - what investors see</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                      {[
                        { label: "Gross profit", value: `$${gross.toLocaleString()}` },
                        { label: "Protocol fees", value: `$${(pFee + rFee + vFee).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                        { label: "Investor yield", value: `$${invProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, hi: true },
                        { label: "Net ROI", value: `${netROI}%`, hi: true },
                      ].map((item) => (
                        <div key={item.label} style={{ background: "var(--bg-card)", borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
                          <p style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 4 }}>{item.label}</p>
                          <p style={{ fontFamily: "var(--font-display)", fontSize: 16, color: item.hi ? "var(--emerald)" : "var(--text-primary)" }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 8 }}>Protocol fee {defaultProtocolFeePercent}% + reserve {defaultReservePercent}% + verifier rewards 0.5%</p>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                  <div style={{ padding: 12, background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border)" }}><p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 5 }}>Reserve fee</p><p style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{defaultReservePercent}%</p></div>
                  <div style={{ padding: 12, background: "var(--bg-surface)", borderRadius: 8, border: "1px solid var(--border)" }}><p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 5 }}>Protocol fee</p><p style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{defaultProtocolFeePercent}%</p></div>
                </div>

                {isDeploying && step && (
                  <div style={{ padding: 14, background: "rgba(201,168,76,0.08)", borderRadius: 8, border: "1px solid rgba(201,168,76,0.2)", marginBottom: 14 }}>
                    <p style={{ fontSize: 13, color: "var(--gold)", fontWeight: 500 }}>{step}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Do not close this page. Each step waits for on-chain confirmation.</p>
                  </div>
                )}

                <button className="btn-primary" style={{ width: "100%" }} onClick={handleDeploy} disabled={isDeploying || !formValid}>
                  {isDeploying ? (step || "Processing...") : `Deploy production cycle${operatorLiquidityContribution > 0 ? " (4 confirmations)" : " (3 confirmations)"}`}
                </button>

                {!formValid && cap > 0 && (
                  <p style={{ fontSize: 12, color: "var(--warning)", marginTop: 10, textAlign: "center" }}>
                    {totalRequiredCash > usdcBalance
                      ? `Need $${totalRequiredCash.toLocaleString()} USDC total for collateral and launch liquidity`
                      : rev <= cap
                        ? "Expected revenue must exceed capital"
                        : "Fill all required fields"}
                  </p>
                )}

                <Link href="/operator/dashboard" style={{ display: "block", textAlign: "center", marginTop: 14, fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>
                  View my active cycles and submit evidence
                </Link>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Capital release schedule</p>
              {MILESTONES.map((item, index) => (
                <div key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: index < 3 ? "1px solid var(--border)" : "none" }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: "var(--text-dim)" }}>{item.desc}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--gold)" }}>{item.pct}%</span>
                    {cap > 0 && <p style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>${((cap * item.pct) / 100).toLocaleString()}</p>}
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 10 }}>You submit evidence for each stage. The configured verifier quorum must approve before capital releases.</p>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Lifecycle overview</p>
              {[
                ["1. Deploy", "Deposit collateral and create the cycle contract"],
                ["2. Investors fund", "USDC is collected until the capital target is reached"],
                ["3. Active phase", "Upload evidence, get verifier approval, then release capital milestone by milestone"],
                ["4. Harvest", "Submit final evidence, get final approval, and return capital plus profit"],
                ["5. Distributed", "Yield is split between investors, protocol, and verifiers"],
                ["6. Withdraw collateral", "Your 10% collateral comes back after successful completion"],
              ].map(([title, body]) => (
                <div key={title} style={{ marginBottom: 9 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>{title}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{toast.type === "success" ? "OK" : "ERR"}</span>
          <div>
            <p>{toast.msg}</p>
            {toast.hash && (
              <a href={`${NETWORK.blockExplorer}/tx/${toast.hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--gold)", fontFamily: "var(--font-mono)", textDecoration: "none" }}>
                View on {NETWORK.blockExplorerName}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
