"use client"

import Link from "next/link"
import { useState } from "react"
import { useAccount, useReadContracts } from "wagmi"
import Navbar from "@/components/navbar"
import ConnectWallet from "@/components/connect-wallet"
import { ARC_TESTNET_DEX, CONTRACTS, NETWORK, PROTOCOL_FEES, PROTOCOL_OWNER } from "@/constants/contracts"
import { FACTORY_V2_ABI, YIELD_ORACLE_WRITE_ABI } from "@/contracts/abis-v2"
import { ERC20_ABI, LIQUIDITY_MANAGER_ABI, LIQUIDITY_VAULT_ABI, PRODUCTION_CYCLE_ABI, RESERVE_POOL_ABI, TOKEN_MARKETPLACE_ABI, TREASURY_ABI } from "@/contracts/abis"
import { useWatchedWrite } from "@/hooks/useWatchedWrite"
import { parseStableAmount, stableAmountToNumber } from "@/lib/token-units"

type PendingApplication = {
  applicant: `0x${string}`
  name: string
  businessType: string
  location: string
  description: string
  appliedAt: bigint
  status: number
}

type ContractWriteError = {
  shortMessage?: string
  message?: string
}

export default function AdminPage() {
  const { address } = useAccount()
  const { send, approve } = useWatchedWrite()
  const isOwner = address?.toLowerCase() === PROTOCOL_OWNER.toLowerCase()

  const [oracleForm, setOracleForm] = useState({ cycle: "", revenue: "", cost: "", risk: "3" })
  const [withdrawForm, setWithdrawForm] = useState({ to: "", amount: "" })
  const [reserveForm, setReserveForm] = useState({ cycle: "", amount: "" })
  const [liquidityCycle, setLiquidityCycle] = useState("")
  const [liquidityFundForm, setLiquidityFundForm] = useState({ amount: "" })
  const [vaultTopUpForm, setVaultTopUpForm] = useState({ amount: "" })
  const [dexForm, setDexForm] = useState({ factory: "", router: "" })
  const [seedForm, setSeedForm] = useState({ tokenSeedBps: "200", stableSeedBps: "200" })
  const [approvalMode, setApprovalMode] = useState("0")
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const hasLiquidityManager = CONTRACTS.liquidityManager !== "0x0000000000000000000000000000000000000000"
  const hasLiquidityVault = CONTRACTS.liquidityVault !== "0x0000000000000000000000000000000000000000"
  const hasMarketplace = CONTRACTS.tokenMarketplace !== "0x0000000000000000000000000000000000000000"
  const liquidityRetrySupported = process.env.NEXT_PUBLIC_LIQUIDITY_MANAGER_HAS_RETRY === "true"

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  function refreshAdminReads() {
    refetch()
    refetchMarketplace()
    refetchLiquidityManager()
    refetchLiquidityVault()
    refetchLaunch()
  }

  async function copyText(label: string, value: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    await navigator.clipboard.writeText(value)
    showToast(`${label} copied`)
  }

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "getAllCycles" },
      { address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "totalApplicants" },
      { address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "approvalMode" },
      { address: CONTRACTS.reservePool, abi: RESERVE_POOL_ABI, functionName: "reserveBalance" },
      { address: CONTRACTS.stablecoin, abi: ERC20_ABI, functionName: "balanceOf", args: [CONTRACTS.treasury] },
    ],
    query: { enabled: isOwner, refetchInterval: 15000 },
  })
  const totalApplicants = Number(data?.[1]?.result ?? 0n)
  const { data: applicantIndexData } = useReadContracts({
    contracts: totalApplicants > 0
      ? Array.from({ length: totalApplicants }, (_, index) => ({
          address: CONTRACTS.factory,
          abi: FACTORY_V2_ABI,
          functionName: "applicants" as const,
          args: [BigInt(index)],
        }))
      : [],
    query: { enabled: isOwner && totalApplicants > 0, refetchInterval: 15000 },
  })
  const applicantAddresses = (applicantIndexData ?? [])
    .map((entry) => entry.result as `0x${string}` | undefined)
    .filter((value): value is `0x${string}` => Boolean(value))
  const { data: applicationData } = useReadContracts({
    contracts: applicantAddresses.length > 0
      ? applicantAddresses.map((applicant) => ({
          address: CONTRACTS.factory,
          abi: FACTORY_V2_ABI,
          functionName: "applications" as const,
          args: [applicant],
        }))
      : [],
    query: { enabled: isOwner && applicantAddresses.length > 0, refetchInterval: 15000 },
  })
  const { data: marketplaceData, refetch: refetchMarketplace } = useReadContracts({
    contracts: hasMarketplace ? [
      { address: CONTRACTS.tokenMarketplace, abi: TOKEN_MARKETPLACE_ABI, functionName: "totalFeesCollected" },
      { address: CONTRACTS.tokenMarketplace, abi: TOKEN_MARKETPLACE_ABI, functionName: "tradingFeeBps" },
      { address: CONTRACTS.tokenMarketplace, abi: TOKEN_MARKETPLACE_ABI, functionName: "nextOrderId" },
    ] : [],
    query: { enabled: isOwner && hasMarketplace, refetchInterval: 15000 },
  })
  const { data: liquidityManagerData, refetch: refetchLiquidityManager } = useReadContracts({
    contracts: hasLiquidityManager ? [
      { address: CONTRACTS.stablecoin, abi: ERC20_ABI, functionName: "balanceOf", args: [CONTRACTS.liquidityManager] },
      { address: CONTRACTS.liquidityManager, abi: LIQUIDITY_MANAGER_ABI, functionName: "vault" },
      { address: CONTRACTS.liquidityManager, abi: LIQUIDITY_MANAGER_ABI, functionName: "dexFactory" },
      { address: CONTRACTS.liquidityManager, abi: LIQUIDITY_MANAGER_ABI, functionName: "dexRouter" },
      { address: CONTRACTS.liquidityManager, abi: LIQUIDITY_MANAGER_ABI, functionName: "tokenSeedBps" },
      { address: CONTRACTS.liquidityManager, abi: LIQUIDITY_MANAGER_ABI, functionName: "stableSeedBps" },
    ] : [],
    query: { enabled: isOwner && hasLiquidityManager, refetchInterval: 15000 },
  })
  const { data: liquidityVaultData, refetch: refetchLiquidityVault } = useReadContracts({
    contracts: hasLiquidityVault ? [
      { address: CONTRACTS.stablecoin, abi: ERC20_ABI, functionName: "balanceOf", args: [CONTRACTS.liquidityVault] },
      { address: CONTRACTS.liquidityVault, abi: LIQUIDITY_VAULT_ABI, functionName: "liquidityManager" },
    ] : [],
    query: { enabled: isOwner && hasLiquidityVault, refetchInterval: 15000 },
  })

  const cycles = (data?.[0]?.result as string[]) ?? []
  const pendingApps = ((applicationData ?? [])
    .map((entry) => {
      const result = entry.result as readonly [`0x${string}`, string, string, string, string, bigint, number] | undefined
      if (!result) return null
      const [applicant, name, businessType, location, description, appliedAt, status] = result
      return { applicant, name, businessType, location, description, appliedAt, status } satisfies PendingApplication
    })
    .filter((entry): entry is PendingApplication => Boolean(entry))
    .filter((entry) => Number(entry?.status ?? 0) === 1)) ?? []
  const currentMode = Number(data?.[2]?.result ?? 0)
  const reserveBal = stableAmountToNumber((data?.[3]?.result as bigint) ?? 0n)
  const treasuryBal = stableAmountToNumber((data?.[4]?.result as bigint) ?? 0n)
  const currentManagerVault = (liquidityManagerData?.[1]?.result as string) ?? ""
  const currentDexFactory = (liquidityManagerData?.[2]?.result as string) ?? ""
  const currentDexRouter = (liquidityManagerData?.[3]?.result as string) ?? ""
  const currentTokenSeedBps = Number(liquidityManagerData?.[4]?.result ?? 0n)
  const currentStableSeedBps = Number(liquidityManagerData?.[5]?.result ?? 0n)
  const liquidityVaultBal = stableAmountToNumber((liquidityVaultData?.[0]?.result as bigint) ?? 0n)
  const currentVaultManager = (liquidityVaultData?.[1]?.result as string) ?? ""
  const marketplaceFeesCollected = stableAmountToNumber((marketplaceData?.[0]?.result as bigint) ?? 0n)
  const marketplaceFeeBps = Number(marketplaceData?.[1]?.result ?? BigInt(Math.round(PROTOCOL_FEES.marketplaceTradingFee * 100)))
  const marketplaceOrderCount = Number(marketplaceData?.[2]?.result ?? 0n)
  const dexConfigured = currentDexFactory !== "" && currentDexFactory !== "0x0000000000000000000000000000000000000000" && currentDexRouter !== "" && currentDexRouter !== "0x0000000000000000000000000000000000000000"
  const { data: liquidityData } = useReadContracts({
    contracts: liquidityCycle ? [
      { address: liquidityCycle as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "cycleName" as const },
      { address: liquidityCycle as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "cycleSymbol" as const },
      { address: liquidityCycle as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "cycleToken" as const },
    ] : [],
    query: { enabled: !!liquidityCycle, refetchInterval: 10000 },
  })
  const liquidityToken = (liquidityData?.[2]?.result as `0x${string}` | undefined) ?? undefined
  const liquidityName = (liquidityData?.[0]?.result as string) ?? ""
  const liquiditySymbol = (liquidityData?.[1]?.result as string) ?? ""
  const { data: liquidityBalances } = useReadContracts({
    contracts: address && liquidityToken ? [
      { address: liquidityToken, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      { address: CONTRACTS.stablecoin, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
    ] : [],
    query: { enabled: !!address && !!liquidityToken, refetchInterval: 10000 },
  })
  const { data: launchData, refetch: refetchLaunch } = useReadContracts({
    contracts: hasLiquidityManager && liquidityCycle ? [
      { address: CONTRACTS.liquidityManager, abi: LIQUIDITY_MANAGER_ABI, functionName: "launches" as const, args: [liquidityCycle as `0x${string}`] },
      { address: liquidityCycle as `0x${string}`, abi: PRODUCTION_CYCLE_ABI, functionName: "state" as const },
    ] : [],
    query: { enabled: isOwner && hasLiquidityManager && !!liquidityCycle, refetchInterval: 10000 },
  })
  const launchConfig = launchData?.[0]?.result as readonly [bigint, bigint, boolean, boolean, boolean] | undefined
  const liquidityCycleState = Number(launchData?.[1]?.result ?? 0)
  const liquidityLaunch = launchConfig
    ? {
        tokenInvestment: stableAmountToNumber(launchConfig[0]),
        stableLiquidity: stableAmountToNumber(launchConfig[1]),
        invested: launchConfig[2],
        launched: launchConfig[3],
        enabled: launchConfig[4],
      }
    : null
  const ownerTokenBalance = stableAmountToNumber((liquidityBalances?.[0]?.result as bigint) ?? 0n)
  const ownerStableBalance = stableAmountToNumber((liquidityBalances?.[1]?.result as bigint) ?? 0n)
  const estROI = oracleForm.revenue && oracleForm.cost
    ? Math.round(((Number(oracleForm.revenue) - Number(oracleForm.cost)) / Number(oracleForm.cost)) * 100)
    : null

  async function handleApprove(op: string) {
    try {
      await send({ address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "approveOperator", args: [op as `0x${string}`] })
      showToast("Operator approved")
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  async function handleReject(op: string) {
    try {
      await send({ address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "rejectOperator", args: [op as `0x${string}`] })
      showToast("Operator rejected")
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  async function handleSetOracle() {
    if (!oracleForm.cycle || !oracleForm.revenue || !oracleForm.cost) return
    try {
      await send({
        address: CONTRACTS.yieldOracle,
        abi: YIELD_ORACLE_WRITE_ABI,
        functionName: "updateEstimate",
        args: [
          oracleForm.cycle as `0x${string}`,
          parseStableAmount(oracleForm.revenue),
          parseStableAmount(oracleForm.cost),
          Number(oracleForm.risk),
        ],
      })
      showToast("Oracle estimate set")
      setOracleForm((form) => ({ ...form, cycle: "", revenue: "", cost: "" }))
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  async function handleSetMode() {
    try {
      await send({
        address: CONTRACTS.factory,
        abi: FACTORY_V2_ABI,
        functionName: "setApprovalMode",
        args: [Number(approvalMode), parseStableAmount("1000")],
      })
      showToast("Approval mode updated")
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  async function handleWithdraw() {
    if (!withdrawForm.to || !withdrawForm.amount) return
    try {
      await send({
        address: CONTRACTS.treasury,
        abi: TREASURY_ABI,
        functionName: "withdraw",
        args: [withdrawForm.to as `0x${string}`, parseStableAmount(withdrawForm.amount)],
      })
      showToast(`$${withdrawForm.amount} withdrawn from treasury`)
      setWithdrawForm({ to: "", amount: "" })
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  async function handleReserveCompensation() {
    if (!reserveForm.cycle || !reserveForm.amount) return
    try {
      await send({
        address: CONTRACTS.reservePool,
        abi: RESERVE_POOL_ABI,
        functionName: "compensate",
        args: [reserveForm.cycle as `0x${string}`, parseStableAmount(reserveForm.amount)],
      })
      showToast(`$${reserveForm.amount} added to the cycle recovery pool`)
      setReserveForm({ cycle: "", amount: "" })
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  function fillMarketplaceFeeWithdrawal() {
    const amount = Math.min(marketplaceFeesCollected, treasuryBal)
    if (amount <= 0) return
    setWithdrawForm((form) => ({
      ...form,
      amount: amount.toFixed(6).replace(/\.?0+$/, ""),
    }))
  }

  async function handleSyncReserves() {
    try {
      await send({
        address: CONTRACTS.reservePool,
        abi: RESERVE_POOL_ABI,
        functionName: "syncReserves",
      })
      showToast("Reserve accounting synced to on-chain USDC balance")
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  async function handleFundLiquidityManager() {
    if (!hasLiquidityManager || !liquidityFundForm.amount) return
    try {
      await approve(CONTRACTS.stablecoin, CONTRACTS.liquidityManager)
      await send({
        address: CONTRACTS.liquidityManager,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: "fund",
        args: [parseStableAmount(liquidityFundForm.amount)],
      })
      showToast(`$${liquidityFundForm.amount} sent to liquidity manager`)
      setLiquidityFundForm({ amount: "" })
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  async function handleTopUpVaultFromTreasury() {
    if (!hasLiquidityVault || !vaultTopUpForm.amount) return
    try {
      await send({
        address: CONTRACTS.treasury,
        abi: TREASURY_ABI,
        functionName: "withdraw",
        args: [CONTRACTS.liquidityVault, parseStableAmount(vaultTopUpForm.amount)],
      })
      showToast(`$${vaultTopUpForm.amount} allocated from treasury to liquidity vault`)
      setVaultTopUpForm({ amount: "" })
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  async function handleDepositVaultFromWallet() {
    if (!hasLiquidityVault || !vaultTopUpForm.amount) return
    try {
      await approve(CONTRACTS.stablecoin, CONTRACTS.liquidityVault)
      await send({
        address: CONTRACTS.liquidityVault,
        abi: LIQUIDITY_VAULT_ABI,
        functionName: "deposit",
        args: [parseStableAmount(vaultTopUpForm.amount)],
      })
      showToast(`$${vaultTopUpForm.amount} deposited from wallet into liquidity vault`)
      setVaultTopUpForm({ amount: "" })
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  async function handleSetDex() {
    if (!hasLiquidityManager || !dexForm.factory || !dexForm.router) return
    try {
      await send({
        address: CONTRACTS.liquidityManager,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: "setDex",
        args: [dexForm.factory as `0x${string}`, dexForm.router as `0x${string}`],
      })
      showToast("DEX routing updated")
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  function useDefaultDex() {
    setDexForm({ factory: ARC_TESTNET_DEX.factory, router: ARC_TESTNET_DEX.router })
    showToast(`${ARC_TESTNET_DEX.name} Arc Testnet addresses filled`)
  }

  async function handleRetryLiquidityLaunch() {
    if (!hasLiquidityManager || !liquidityCycle) return
    try {
      await send({
        address: CONTRACTS.liquidityManager,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: "retryLiquidityLaunch",
        args: [liquidityCycle as `0x${string}`],
      })
      showToast("Liquidity launch retry submitted")
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Retry failed. The deployed manager may need the retry upgrade.", "error")
    }
  }

  async function handleSetSeedConfig() {
    if (!hasLiquidityManager) return
    try {
      await send({
        address: CONTRACTS.liquidityManager,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: "setSeedConfig",
        args: [Number(seedForm.tokenSeedBps), Number(seedForm.stableSeedBps)],
      })
      showToast("Liquidity seed config updated")
      refreshAdminReads()
    } catch (error) {
      const e = error as ContractWriteError
      showToast(e.shortMessage ?? e.message ?? "Failed", "error")
    }
  }

  if (!address) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
        <Navbar />
        <div style={{ maxWidth: 520, margin: "120px auto", textAlign: "center", padding: "0 32px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, marginBottom: 12 }}>Admin access</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 28 }}>Connect the protocol owner wallet to access protocol operations.</p>
          <ConnectWallet />
        </div>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
        <Navbar />
        <div style={{ maxWidth: 620, margin: "120px auto", textAlign: "center", padding: "0 32px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, marginBottom: 12 }}>Restricted page</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            This page is only visible to the configured protocol owner wallet. Admin actions are not exposed to general users.
          </p>
          <Link href="/" className="btn-ghost" style={{ textDecoration: "none" }}>Back to protocol</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Protocol operations</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 400, marginBottom: 8 }}>Admin dashboard</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Total cycles", value: cycles.length, color: "var(--text-primary)" },
            { label: "Pending apps", value: pendingApps.length, color: pendingApps.length > 0 ? "var(--warning)" : "var(--text-primary)" },
            { label: "Withdrawable fees", value: `$${treasuryBal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: "var(--emerald)" },
            { label: "DEX status", value: dexConfigured ? "Ready" : "Needs setup", color: dexConfigured ? "var(--emerald)" : "var(--warning)" },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <p className="stat-label">{stat.label}</p>
              <p style={{ fontSize: 28, fontFamily: "var(--font-display)", color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 18, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {[
              ["Treasury USDC", `$${treasuryBal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, "Protocol cycle fees and marketplace fees available to withdraw."],
              ["Marketplace fees", `$${marketplaceFeesCollected.toLocaleString(undefined, { maximumFractionDigits: 4 })}`, `${marketplaceFeeBps / 100}% fee across ${marketplaceOrderCount} listed orders.`],
              ["Reserve pool", `$${reserveBal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, "Investor protection capital, not operating revenue."],
              ["Liquidity vault", `$${liquidityVaultBal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, "USDC available for automated cycle-token liquidity."],
            ].map(([label, value, sub]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <p className="stat-label">{label}</p>
                <p style={{ fontSize: 20, fontFamily: "var(--font-display)", marginBottom: 4 }}>{value}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card" style={{ padding: 24, gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Pending operator applications ({pendingApps.length})</h3>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select value={approvalMode} onChange={(e) => setApprovalMode(e.target.value)} style={{ width: "auto" }}>
                  <option value="0">Manual review</option>
                  <option value="1">Open (instant)</option>
                  <option value="2">Collateral gate</option>
                </select>
                <button className="btn-ghost" style={{ fontSize: 12, padding: "8px 14px" }} onClick={handleSetMode}>Set mode</button>
              </div>
            </div>
            {pendingApps.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No pending applications. Current mode: {["Manual", "Open", "Collateral"][currentMode]}.</p>
            ) : (
              <table>
                <thead><tr><th>Name</th><th>Business type</th><th>Location</th><th>Applicant</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {pendingApps.map((app) => (
                    <tr key={app.applicant}>
                      <td style={{ fontWeight: 500 }}>{app.name}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{app.businessType}</td>
                      <td style={{ fontSize: 13 }}>{app.location}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>{app.applicant.slice(0, 8)}…</td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(Number(app.appliedAt) * 1000).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn-primary" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => handleApprove(app.applicant)}>Approve</button>
                          <button className="btn-ghost" style={{ padding: "5px 12px", fontSize: 12, color: "var(--danger)" }} onClick={() => handleReject(app.applicant)}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Set yield oracle estimate</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.7 }}>Manually override oracle for a specific cycle. Normally auto-set when an operator creates a cycle.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Cycle contract address</label><input type="text" placeholder="0x…" value={oracleForm.cycle} onChange={(e) => setOracleForm((form) => ({ ...form, cycle: e.target.value }))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Expected revenue (USDC)</label><input type="number" placeholder="61000" value={oracleForm.revenue} onChange={(e) => setOracleForm((form) => ({ ...form, revenue: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Estimated cost (USDC)</label><input type="number" placeholder="50000" value={oracleForm.cost} onChange={(e) => setOracleForm((form) => ({ ...form, cost: e.target.value }))} /></div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Risk score (1-10)</label>
                <input type="range" min="1" max="10" value={oracleForm.risk} onChange={(e) => setOracleForm((form) => ({ ...form, risk: e.target.value }))} style={{ padding: 0, height: "auto", background: "transparent", border: "none" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
                  <span>Very low</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: Number(oracleForm.risk) <= 3 ? "var(--emerald)" : Number(oracleForm.risk) <= 6 ? "var(--warning)" : "var(--danger)" }}>{oracleForm.risk}/10</span>
                  <span>Extreme</span>
                </div>
              </div>
              {estROI !== null && (
                <div style={{ padding: 12, background: "var(--bg-surface)", borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)" }}>Calculated ROI</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--emerald)" }}>{estROI}%</span>
                </div>
              )}
              <button className="btn-primary" onClick={handleSetOracle} disabled={!oracleForm.cycle || !oracleForm.revenue || !oracleForm.cost}>Set oracle estimate</button>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Treasury withdrawal</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.7 }}>Withdraw protocol fee revenue for team salaries, operations, and platform development.</p>
            <div style={{ padding: 14, background: "var(--bg-surface)", borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, color: "var(--text-muted)" }}>Withdrawable treasury</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--emerald)" }}>${treasuryBal.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, color: "var(--text-muted)" }}>Marketplace fees collected</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>${marketplaceFeesCollected.toLocaleString(undefined, { maximumFractionDigits: 4 })} USDC</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "var(--text-muted)" }}>Fee sources</span><span style={{ fontSize: 12 }}>Cycle profit fee + trade fee</span></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Withdraw to address</label><input type="text" placeholder="0x…" value={withdrawForm.to} onChange={(e) => setWithdrawForm((form) => ({ ...form, to: e.target.value }))} /></div>
              <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Amount (USDC)</label><input type="number" placeholder="1000" value={withdrawForm.amount} onChange={(e) => setWithdrawForm((form) => ({ ...form, amount: e.target.value }))} /></div>
              <button className="btn-primary" onClick={handleWithdraw} disabled={!withdrawForm.to || !withdrawForm.amount}>Withdraw from treasury</button>
              <button className="btn-ghost" onClick={fillMarketplaceFeeWithdrawal} disabled={marketplaceFeesCollected <= 0 || treasuryBal <= 0}>Use withdrawable marketplace fees</button>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Reserve pool operations</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.7 }}>
              The reserve pool is investor protection capital. Compensation is sent to a distressed cycle contract, which adds it to the token-holder recovery pool. Investors then withdraw their proportional recovery from Portfolio.
            </p>
            <div style={{ padding: 14, background: "var(--bg-surface)", borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, color: "var(--text-muted)" }}>Reserve balance</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>${Math.round(reserveBal).toLocaleString()} USDC</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "var(--text-muted)" }}>Withdrawal policy</span><span style={{ fontSize: 12, color: "var(--text-primary)" }}>Compensate only</span></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Compensate cycle address</label><input type="text" placeholder="0x…" value={reserveForm.cycle} onChange={(e) => setReserveForm((form) => ({ ...form, cycle: e.target.value }))} /></div>
              <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Amount (USDC)</label><input type="number" placeholder="500" value={reserveForm.amount} onChange={(e) => setReserveForm((form) => ({ ...form, amount: e.target.value }))} /></div>
              <button className="btn-primary" onClick={handleReserveCompensation} disabled={!reserveForm.cycle || !reserveForm.amount}>Add compensation to cycle recovery</button>
              <button className="btn-ghost" onClick={handleSyncReserves}>Sync reserve accounting</button>
            </div>
          </div>

          <div className="card" style={{ padding: 24, gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Auto-liquidity control center</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.7 }}>
              Configure and fund the protocol liquidity manager here. It cannot mint capital from nothing, but once funded and pointed at the right DEX, it can auto-invest and auto-launch markets as cycles complete funding.
            </p>

            {!hasLiquidityManager || !hasLiquidityVault ? (
              <div style={{ padding: 16, background: "rgba(224,82,82,0.06)", border: "1px solid rgba(224,82,82,0.2)", borderRadius: 10 }}>
                <p style={{ fontSize: 13, color: "var(--danger)" }}>Liquidity vault and manager addresses must both be configured. Deploy the updated contracts and replace the zero addresses in [contracts.ts](/abs/path/c:/Users/USER/Desktop/WEB3/RWA_PROJECT/rwa-ui/constants/contracts.ts).</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div className="card" style={{ padding: 20, background: "var(--bg-surface)" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Fund protocol liquidity</p>
                  <div style={{ marginBottom: 12, padding: 12, background: "var(--bg-card)", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Treasury balance</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>${treasuryBal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Liquidity vault</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>${liquidityVaultBal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Owner wallet</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>${ownerStableBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Amount (USDC)</label><input type="number" placeholder="5000" value={vaultTopUpForm.amount} onChange={(e) => setVaultTopUpForm({ amount: e.target.value })} /></div>
                  <button className="btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={handleTopUpVaultFromTreasury} disabled={!vaultTopUpForm.amount}>Allocate from treasury</button>
                  <button className="btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={handleDepositVaultFromWallet} disabled={!vaultTopUpForm.amount}>Deposit from wallet</button>
                </div>

                <div className="card" style={{ padding: 20, background: "var(--bg-surface)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>DEX configuration</p>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: dexConfigured ? "var(--emerald)" : "var(--warning)" }}>
                      {dexConfigured ? "READY" : "NOT SET"}
                    </span>
                  </div>
                  <div style={{ marginBottom: 12, padding: 12, background: "var(--bg-card)", borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Vault linked to manager</p>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 8, wordBreak: "break-all" }}>{currentManagerVault || "Not set"}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Current factory</p>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 8, wordBreak: "break-all" }}>{currentDexFactory || "Not set"}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Current router</p>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{currentDexRouter || "Not set"}</p>
                  </div>
                  <button className="btn-ghost" style={{ width: "100%", marginBottom: 10 }} onClick={useDefaultDex}>
                    Use {ARC_TESTNET_DEX.name} Arc Testnet
                  </button>
                  <div style={{ marginBottom: 10 }}><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>DEX factory</label><input type="text" placeholder="0x..." value={dexForm.factory} onChange={(e) => setDexForm((form) => ({ ...form, factory: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>DEX router</label><input type="text" placeholder="0x..." value={dexForm.router} onChange={(e) => setDexForm((form) => ({ ...form, router: e.target.value }))} /></div>
                  <button className="btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={handleSetDex} disabled={!dexForm.factory || !dexForm.router}>Save DEX settings</button>
                </div>

                <div className="card" style={{ padding: 20, background: "var(--bg-surface)" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Seed settings</p>
                  <div style={{ marginBottom: 12, padding: 12, background: "var(--bg-card)", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Vault manager</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{currentVaultManager ? "Linked" : "Not linked"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Token seed</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{currentTokenSeedBps} bps</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Stable seed</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{currentStableSeedBps} bps</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Fallback direct manager top-up</label>
                    <input type="number" placeholder="1000" value={liquidityFundForm.amount} onChange={(e) => setLiquidityFundForm({ amount: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 10 }}><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Token seed basis points</label><input type="number" placeholder="200" value={seedForm.tokenSeedBps} onChange={(e) => setSeedForm((form) => ({ ...form, tokenSeedBps: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Stable seed basis points</label><input type="number" placeholder="200" value={seedForm.stableSeedBps} onChange={(e) => setSeedForm((form) => ({ ...form, stableSeedBps: e.target.value }))} /></div>
                  <button className="btn-ghost" style={{ width: "100%", marginTop: 12 }} onClick={handleFundLiquidityManager} disabled={!liquidityFundForm.amount}>Fund manager directly</button>
                  <button className="btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={handleSetSeedConfig}>Save seed config</button>
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24, gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Liquidity launch monitor</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.7 }}>
              Once funding completes, the liquidity manager should auto-launch the cycle token market against USDC. Use this panel to verify the token addresses, confirm the owner inventory, and keep a manual DEX fallback handy if a pool ever needs intervention.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Cycle to inspect</label>
                <select value={liquidityCycle} onChange={(e) => setLiquidityCycle(e.target.value)}>
                  <option value="">Select a cycle</option>
                  {cycles.map((cycle) => (
                    <option key={cycle} value={cycle}>{cycle}</option>
                  ))}
                </select>

                {liquidityCycle && liquidityToken && (
                  <>
                    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                      <div className="stat-card">
                        <p className="stat-label">Owner cycle-token balance</p>
                        <p style={{ fontSize: 24, fontFamily: "var(--font-display)" }}>{ownerTokenBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                        <p className="stat-sub">{liquiditySymbol || "Cycle token"}</p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">Owner USDC balance</p>
                        <p style={{ fontSize: 24, fontFamily: "var(--font-display)" }}>${ownerStableBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        <p className="stat-sub">Available as paired liquidity</p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">Seed investment</p>
                        <p style={{ fontSize: 24, fontFamily: "var(--font-display)", color: liquidityLaunch?.invested ? "var(--emerald)" : "var(--warning)" }}>{liquidityLaunch?.invested ? "Done" : "Pending"}</p>
                        <p className="stat-sub">${(liquidityLaunch?.tokenInvestment ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} token seed</p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-label">DEX launch</p>
                        <p style={{ fontSize: 24, fontFamily: "var(--font-display)", color: liquidityLaunch?.launched ? "var(--emerald)" : "var(--warning)" }}>{liquidityLaunch?.launched ? "Launched" : "Open"}</p>
                        <p className="stat-sub">${(liquidityLaunch?.stableLiquidity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} stable seed</p>
                      </div>
                    </div>

                    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        ["Cycle contract", liquidityCycle],
                        ["Cycle token", liquidityToken],
                        ["USDC", CONTRACTS.stablecoin],
                      ].map(([label, value]) => (
                        <div key={label} style={{ padding: "12px 14px", background: "var(--bg-surface)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{label}</p>
                            <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
                          </div>
                          <button className="btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => copyText(label, value)}>
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div style={{ padding: 18, background: "var(--bg-surface)", borderRadius: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                  {liquidityName ? `${liquidityName} launch checklist` : "Launch checklist"}
                </p>
                {[ 
                  "Make sure the liquidity vault has enough USDC before this cycle finishes funding.",
                  "Confirm the protocol has seed cycle tokens and stablecoin inventory ready for auto-launch.",
                  `Use the copied addresses above if you need to inspect the pair or verify the correct token on ${NETWORK.blockExplorerName}.`,
                  "If auto-launch fails after DEX setup, retry the launch from this panel on the upgraded liquidity manager.",
                  "After launch, monitor early liquidity depth so retail users can trade with low slippage.",
                ].map((step, index) => (
                  <p key={step} style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, lineHeight: 1.6 }}>
                    {index + 1}. {step}
                  </p>
                ))}
                <div style={{ padding: 12, background: "var(--bg-card)", borderRadius: 8, margin: "12px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Selected cycle state</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{["FUNDING", "ACTIVE", "HARVEST", "DISTRIBUTED", "DEFAULTED"][liquidityCycleState] ?? "UNKNOWN"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Launch config</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{liquidityLaunch?.enabled ? "Enabled" : "Not enabled"}</span>
                  </div>
                  {!liquidityRetrySupported && (
                    <p style={{ fontSize: 11, color: "var(--warning)", lineHeight: 1.5, marginTop: 10 }}>
                      Retry requires the upgraded LiquidityManager deployment. Future cycles can still auto-launch now that DEX settings are configured.
                    </p>
                  )}
                </div>
                <button
                  className="btn-ghost"
                  style={{ width: "100%", marginBottom: 10 }}
                  onClick={handleRetryLiquidityLaunch}
                  disabled={!liquidityRetrySupported || !liquidityCycle || !dexConfigured || liquidityLaunch?.launched || !liquidityLaunch?.enabled}
                >
                  Retry liquidity launch
                </button>
                <Link href="/market" className="btn-primary" style={{ marginTop: 10, textDecoration: "none", display: "inline-flex" }}>
                  Open Trade page
                </Link>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24, gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>All deployed cycles ({cycles.length})</h3>
            {cycles.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No cycles deployed yet.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 8 }}>
                {cycles.map((cycle) => (
                  <Link
                    key={cycle}
                    href={`/cycle/${cycle}`}
                    style={{ padding: 12, background: "var(--bg-surface)", borderRadius: 8, textDecoration: "none", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{cycle.slice(0, 10)}…{cycle.slice(-8)}</span>
                    <span style={{ fontSize: 11, color: "var(--gold)" }}>View →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? "✓" : "✕"} {toast.msg}</div>}
    </div>
  )
}
