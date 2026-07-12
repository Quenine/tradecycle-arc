"use client"

import Link from "next/link"
import { CircleCheck, Minus } from "lucide-react"
import { useParams } from "next/navigation"
import { useMemo } from "react"
import { useAccount, useReadContracts } from "wagmi"
import Navbar from "@/components/navbar"
import { CONTRACTS, MILESTONE_LABELS, NETWORK } from "@/constants/contracts"
import { FACTORY_V2_ABI } from "@/contracts/abis-v2"
import { COLLATERAL_VAULT_ABI, PRODUCTION_CYCLE_ABI, RESERVE_POOL_ABI, VERIFIER_REGISTRY_ABI } from "@/contracts/abis"
import { stableAmountToNumber } from "@/lib/token-units"

const STATE_LABELS = ["Funding", "Active", "Harvest submitted", "Repaid", "Defaulted"]
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

type CycleSummary = {
  address: string
  name: string
  stateId: number
  capitalRequired: bigint
  totalRaised: bigint
  expectedRevenue: bigint
  collateralAmount: bigint
  submittedMilestones: number
  approvedMilestones: number
}

type ApplicationResult = readonly [string, string, string, string, string, bigint, number]

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function isAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

function scoreLabel(score: number, hasHistory: boolean) {
  if (!hasHistory) return "No cycle history yet"
  if (score >= 80) return "Strong onchain repayment profile"
  if (score >= 65) return "Developing positive history"
  if (score >= 45) return "Early operating history"
  return "Watchlist"
}

function signalLabel(stateId: number) {
  if (stateId === 0) return "Funding"
  if (stateId === 1 || stateId === 2) return "Active"
  if (stateId === 3) return "Repaid"
  if (stateId === 4) return "Defaulted"
  return "Unknown"
}

function money(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export default function CreditPassportPage() {
  const params = useParams()
  const { address } = useAccount()
  const operatorParam = String(params.operator ?? "")
  const isZeroOperator = operatorParam.toLowerCase() === ZERO_ADDRESS.toLowerCase()
  const operator = isAddress(operatorParam) ? operatorParam : ZERO_ADDRESS
  const hasValidOperator = isAddress(operatorParam) && !isZeroOperator
  const showMyPassportLink = Boolean(address && hasValidOperator && address.toLowerCase() !== operator.toLowerCase())

  const { data: cycleListData, isLoading: isLoadingCycles } = useReadContracts({
    contracts: [
      { chainId: NETWORK.chainId, address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "getAllCycles" },
      { chainId: NETWORK.chainId, address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "approvedOperators", args: [operator] },
      { chainId: NETWORK.chainId, address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "applications", args: [operator] },
      { chainId: NETWORK.chainId, address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorum" },
      { chainId: NETWORK.chainId, address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "minimumStake" },
      { chainId: NETWORK.chainId, address: CONTRACTS.reservePool, abi: RESERVE_POOL_ABI, functionName: "reserveBalance" },
      { chainId: NETWORK.chainId, address: CONTRACTS.collateralVault, abi: COLLATERAL_VAULT_ABI, functionName: "collateralBalance", args: [operator] },
    ],
    query: { enabled: hasValidOperator, refetchInterval: 10000 },
  })

  const allCycles = useMemo(() => (cycleListData?.[0]?.result as readonly string[] | undefined) ?? [], [cycleListData])

  const { data: operatorData, isLoading: isLoadingOperators } = useReadContracts({
    contracts: allCycles.map((cycle) => ({
      chainId: NETWORK.chainId,
      address: cycle as `0x${string}`,
      abi: PRODUCTION_CYCLE_ABI,
      functionName: "operator" as const,
    })),
    query: { enabled: hasValidOperator && allCycles.length > 0, refetchInterval: 10000 },
  })

  const operatorCycles = useMemo(() => {
    const target = operator.toLowerCase()
    return allCycles.filter((cycle, index) => String(operatorData?.[index]?.result ?? "").toLowerCase() === target)
  }, [allCycles, operator, operatorData])

  const { data: cycleData, isLoading: isLoadingDetails } = useReadContracts({
    contracts: operatorCycles.flatMap((cycle) => {
      const cc = { chainId: NETWORK.chainId, address: cycle as `0x${string}`, abi: PRODUCTION_CYCLE_ABI } as const
      return [
        { ...cc, functionName: "cycleName" as const },
        { ...cc, functionName: "state" as const },
        { ...cc, functionName: "capitalRequired" as const },
        { ...cc, functionName: "totalRaised" as const },
        { ...cc, functionName: "expectedRevenue" as const },
        { ...cc, functionName: "collateralAmount" as const },
        ...MILESTONE_LABELS.flatMap((milestone) => [
          { ...cc, functionName: "evidenceSubmitted" as const, args: [milestone.id] as const },
          { chainId: NETWORK.chainId, address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorumReached" as const, args: [cycle as `0x${string}`, milestone.id] as const },
        ]),
      ]
    }),
    query: { enabled: operatorCycles.length > 0, refetchInterval: 10000 },
  })

  const cycles: CycleSummary[] = useMemo(() => {
    const readsPerCycle = 6 + MILESTONE_LABELS.length * 2
    return operatorCycles.map((cycle, index) => {
      const offset = index * readsPerCycle
      let submittedMilestones = 0
      let approvedMilestones = 0
      MILESTONE_LABELS.forEach((_, milestoneIndex) => {
        if ((cycleData?.[offset + 6 + milestoneIndex * 2]?.result as boolean | undefined) === true) submittedMilestones += 1
        if ((cycleData?.[offset + 7 + milestoneIndex * 2]?.result as boolean | undefined) === true) approvedMilestones += 1
      })

      return {
        address: cycle,
        name: (cycleData?.[offset]?.result as string | undefined) || "Untitled cycle",
        stateId: Number(cycleData?.[offset + 1]?.result ?? -1),
        capitalRequired: (cycleData?.[offset + 2]?.result as bigint | undefined) ?? 0n,
        totalRaised: (cycleData?.[offset + 3]?.result as bigint | undefined) ?? 0n,
        expectedRevenue: (cycleData?.[offset + 4]?.result as bigint | undefined) ?? 0n,
        collateralAmount: (cycleData?.[offset + 5]?.result as bigint | undefined) ?? 0n,
        submittedMilestones,
        approvedMilestones,
      }
    })
  }, [cycleData, operatorCycles])

  const completedCycles = cycles.filter((cycle) => cycle.stateId === 3).length
  const activeCycles = cycles.filter((cycle) => cycle.stateId === 1 || cycle.stateId === 2).length
  const fundedOrActiveCycles = cycles.filter((cycle) => cycle.stateId === 1 || cycle.stateId === 2 || cycle.stateId === 3).length
  const defaultedCycles = cycles.filter((cycle) => cycle.stateId === 4).length
  const totalCapitalRequested = cycles.reduce((sum, cycle) => sum + stableAmountToNumber(cycle.capitalRequired), 0)
  const totalCapitalRaised = cycles.reduce((sum, cycle) => sum + stableAmountToNumber(cycle.totalRaised), 0)
  const submittedMilestones = cycles.reduce((sum, cycle) => sum + cycle.submittedMilestones, 0)
  const approvedMilestones = cycles.reduce((sum, cycle) => sum + cycle.approvedMilestones, 0)
  const totalMilestoneSlots = cycles.length * MILESTONE_LABELS.length
  const milestoneProgress = totalMilestoneSlots > 0 ? approvedMilestones / totalMilestoneSlots : 0
  const repaymentReliability = completedCycles + defaultedCycles > 0 ? Math.round((completedCycles / (completedCycles + defaultedCycles)) * 100) : null

  const score = useMemo(() => {
    if (cycles.length === 0) return 0
    const raw = 50 + completedCycles * 15 + fundedOrActiveCycles * 5 + Math.round(milestoneProgress * 20) - defaultedCycles * 25
    return Math.max(0, Math.min(100, raw))
  }, [completedCycles, cycles.length, defaultedCycles, fundedOrActiveCycles, milestoneProgress])

  const approvedOperator = (cycleListData?.[1]?.result as boolean | undefined) ?? false
  const application = cycleListData?.[2]?.result as ApplicationResult | undefined
  const businessName = application?.[1] || "Not available from current deployment."
  const businessType = application?.[2] || "Not available from current deployment."
  const operatorLocation = application?.[3] || "Not available from current deployment."
  const verifierQuorum = Number(cycleListData?.[3]?.result ?? 0n)
  const minimumStake = stableAmountToNumber((cycleListData?.[4]?.result as bigint | undefined) ?? 0n)
  const reserveBalance = stableAmountToNumber((cycleListData?.[5]?.result as bigint | undefined) ?? 0n)
  const vaultCollateral = stableAmountToNumber((cycleListData?.[6]?.result as bigint | undefined) ?? 0n)
  const hasCycleCollateral = cycles.some((cycle) => cycle.collateralAmount > 0n)
  const isLoading = isLoadingCycles || isLoadingOperators || isLoadingDetails

  const metrics = [
    { label: "Total cycles", value: String(cycles.length), sub: "Created by this operator" },
    { label: "Active cycles", value: String(activeCycles), sub: "Active or harvest submitted" },
    { label: "Completed cycles", value: String(completedCycles), sub: "Distributed onchain" },
    { label: "Defaulted cycles", value: String(defaultedCycles), sub: "Default state" },
    { label: "Total capital requested", value: money(totalCapitalRequested), sub: "USDC target across cycles" },
    { label: "Total capital raised", value: money(totalCapitalRaised), sub: "USDC funded onchain" },
    { label: "Milestones submitted / approved", value: totalMilestoneSlots > 0 ? `${submittedMilestones} / ${approvedMilestones}` : "Not available from current deployment.", sub: "Evidence submitted / quorum reached" },
    { label: "Repayment reliability", value: repaymentReliability === null ? "Not enough settled history" : `${repaymentReliability}%`, sub: "Completed vs defaulted cycles" },
  ]

  const controls = [
    { label: "Operator approval flow", status: approvedOperator ? "Verified" : "Not approved or not available", detail: approvedOperator ? "Factory marks this operator as approved." : "Factory approval is readable, but this address is not currently approved." },
    { label: "Collateral-backed cycle support", status: hasCycleCollateral || vaultCollateral > 0 ? "Visible" : "Not available from current deployment.", detail: hasCycleCollateral ? "At least one cycle reports collateralAmount onchain." : vaultCollateral > 0 ? "Collateral vault balance is readable for this operator." : "No readable collateral balance for this operator." },
    { label: "Verifier quorum before milestone release", status: verifierQuorum > 0 ? "Enabled" : "Not available from current deployment.", detail: verifierQuorum > 0 ? `${verifierQuorum} verifier approval(s) required for quorum. Minimum verifier stake: ${money(minimumStake)} USDC.` : "Verifier quorum read returned no value." },
    { label: "Milestone evidence hash / CID flow", status: submittedMilestones > 0 ? "Used" : "Readable, no submissions yet", detail: `${submittedMilestones} evidence submission(s) read across this operator's cycles.` },
    { label: "Reserve pool support", status: reserveBalance > 0 ? "Funded" : "Readable", detail: `Reserve pool balance: ${money(reserveBalance)} USDC.` },
    { label: "Default recovery path", status: "Available", detail: "Cycle contracts expose triggerDefault and withdrawAfterDefault paths." },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 32px 72px" }}>
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>TradeCycle</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px,5vw,54px)", fontWeight: 400, lineHeight: 1.08, marginBottom: 12 }}>Credit Passport</h1>
            <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 620 }}>Onchain SME finance history for TradeCycle operators.</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8 }}>{hasValidOperator ? shortAddress(operator) : isZeroOperator ? "No operator selected" : "Invalid operator address"}</span>
              {hasValidOperator && <a href={`${NETWORK.blockExplorer}/address/${operator}`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ textDecoration: "none", fontSize: 12, padding: "6px 10px" }}>View on {NETWORK.blockExplorerName} -&gt;</a>}
              {showMyPassportLink && address && <Link href={`/credit-passport/${address}`} className="btn-ghost" style={{ textDecoration: "none", fontSize: 12, padding: "6px 10px" }}>Open my passport</Link>}
            </div>
          </div>
          <Link href="/operator" className="btn-primary" style={{ textDecoration: "none", flexShrink: 0 }}>Create a Cycle</Link>
        </section>

        {!hasValidOperator ? (
          <div className="card" style={{ padding: 32 }}>
            <p style={{ color: isZeroOperator ? "var(--text-primary)" : "var(--danger)", fontWeight: 600, marginBottom: 8 }}>{isZeroOperator ? "No operator selected." : "Invalid operator address."}</p>
            <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>{isZeroOperator ? "The zero address is a placeholder, not a real TradeCycle operator. Open your connected wallet passport or enter an operator address." : "Credit Passport routes require an EVM address."}</p>
            <Link href="/credit-passport" className="btn-primary" style={{ textDecoration: "none" }}>Open Credit Passport</Link>
          </div>
        ) : (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, marginBottom: 16 }}>
              <div className="card" style={{ padding: 28, borderColor: cycles.length > 0 ? "rgba(201,168,76,0.28)" : "var(--border)" }}>
                <p className="stat-label" style={{ marginBottom: 10 }}>Credit Passport Score</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 58, color: cycles.length > 0 ? "var(--gold)" : "var(--text-dim)", lineHeight: 1 }}>{cycles.length > 0 ? score : "--"}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 18 }}>/ 100</span>
                </div>
                <p style={{ fontSize: 14, color: cycles.length > 0 ? "var(--text-primary)" : "var(--text-muted)", marginBottom: 10 }}>{scoreLabel(score, cycles.length > 0)}</p>
                <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.7 }}>Demo score derived from readable onchain activity: cycle outcomes, funding, milestone progress, and defaults. It is not a regulated credit rating.</p>
              </div>

              <div className="card" style={{ padding: 24 }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Operator profile</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  {[{ label: "Business name", value: businessName }, { label: "Business type", value: businessType }, { label: "Location", value: operatorLocation }].map((item) => (
                    <div key={item.label} style={{ background: "var(--bg-surface)", borderRadius: 8, padding: 14 }}>
                      <p className="stat-label" style={{ marginBottom: 5 }}>{item.label}</p>
                      <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
              {metrics.map((metric) => (
                <div key={metric.label} className="stat-card">
                  <p className="stat-label">{metric.label}</p>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-primary)", marginTop: 3 }}>{isLoading ? "..." : metric.value}</p>
                  <p className="stat-sub">{metric.sub}</p>
                </div>
              ))}
            </section>

            <section className="card" style={{ padding: 24, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, marginBottom: 16 }}>Risk controls</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                {controls.map((control) => (
                  <div key={control.label} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: control.status.startsWith("Not") ? "var(--text-dim)" : "var(--emerald)", lineHeight: 1.4, display: "inline-flex", paddingTop: 1 }}>{control.status.startsWith("Not") ? <Minus aria-hidden="true" size={16} /> : <CircleCheck aria-hidden="true" size={16} />}</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{control.label}</p>
                      <p style={{ fontSize: 12, color: "var(--gold)", marginBottom: 3 }}>{control.status}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{control.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400 }}>Cycle history</h2>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>{cycles.length} cycle(s)</span>
              </div>

              {isLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading onchain history...</div>
              ) : cycles.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", background: "var(--bg-surface)", borderRadius: 8 }}>
                  <p style={{ fontSize: 18, color: "var(--text-primary)", marginBottom: 8 }}>No cycle history yet.</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>This operator has no recorded TradeCycle history yet.</p>
                  <Link href="/operator" className="btn-primary" style={{ textDecoration: "none" }}>Create a Cycle</Link>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr><th>Cycle</th><th>State</th><th>Capital required</th><th>Total raised</th><th>Expected revenue</th><th>Credit signal</th><th></th></tr>
                    </thead>
                    <tbody>
                      {cycles.map((cycle) => (
                        <tr key={cycle.address}>
                          <td>
                            <p style={{ fontWeight: 600 }}>{cycle.name}</p>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)" }}>{shortAddress(cycle.address)}</p>
                          </td>
                          <td>{STATE_LABELS[cycle.stateId] ?? "Unknown"}</td>
                          <td>{money(stableAmountToNumber(cycle.capitalRequired))}</td>
                          <td>{money(stableAmountToNumber(cycle.totalRaised))}</td>
                          <td>{cycle.expectedRevenue > 0n ? money(stableAmountToNumber(cycle.expectedRevenue)) : "Not available from current deployment."}</td>
                          <td><span style={{ color: cycle.stateId === 4 ? "var(--danger)" : cycle.stateId === 3 ? "var(--emerald)" : "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{signalLabel(cycle.stateId)}</span></td>
                          <td><Link href={`/cycle/${cycle.address}`} style={{ color: "var(--gold)", textDecoration: "none", fontSize: 12 }}>Open -&gt;</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section style={{ padding: 18, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)" }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>Testnet demonstration only. This Credit Passport is not a regulated credit score, investment recommendation, or lending decision.</p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
