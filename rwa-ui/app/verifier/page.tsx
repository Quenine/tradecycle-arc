"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useAccount, useReadContracts, usePublicClient } from "wagmi"
import { decodeEventLog } from "viem"
import Navbar from "@/components/navbar"
import { CONTRACTS, MIN_VERIFIER_STAKE_USDC, NETWORK } from "@/constants/contracts"
import { ERC20_ABI, VERIFIER_REGISTRY_ABI, PRODUCTION_CYCLE_ABI } from "@/contracts/abis"
import { FACTORY_V2_ABI } from "@/contracts/abis-v2"
import ConnectWallet from "@/components/connect-wallet"
import { useWatchedWrite } from "@/hooks/useWatchedWrite"
import { parseStableAmount, stableAmountToNumber } from "@/lib/token-units"
import { getEvidenceFiles, resolveEvidenceUrl } from "@/lib/evidence"

// ── Types ─────────────────────────────────────────────────────────────────────
const ZERO   = "0x0000000000000000000000000000000000000000" as `0x${string}`
const M_NAMES = ["Production start (40%)","Mid-cycle checkpoint (30%)","Harvest / completion (20%)","Final settlement (10%)"]

interface EvidenceCID { milestoneId: number; cid: string; timestamp: number }
interface VerifierInfo {
  active: boolean
  stake: bigint
  pendingReward: bigint
  totalEarned: bigint
  approvalsGiven: bigint
}

function normalizeVerifierInfo(result: unknown): VerifierInfo {
  const tuple = result as Partial<VerifierInfo> & readonly unknown[]
  return {
    active: Boolean(tuple?.active ?? tuple?.[0] ?? false),
    stake: BigInt((tuple?.stake ?? tuple?.[1] ?? 0n) as bigint | number | string),
    pendingReward: BigInt((tuple?.pendingReward ?? tuple?.[2] ?? 0n) as bigint | number | string),
    totalEarned: BigInt((tuple?.totalEarned ?? tuple?.[3] ?? 0n) as bigint | number | string),
    approvalsGiven: BigInt((tuple?.approvalsGiven ?? tuple?.[4] ?? 0n) as bigint | number | string),
  }
}

// ── Evidence modal ────────────────────────────────────────────────────────────
function EvidenceModal({ ev, onClose }: { ev: EvidenceCID; onClose: () => void }) {
  const files = getEvidenceFiles(ev.cid)
  const url = files[0]?.url ?? resolveEvidenceUrl(ev.cid)
  const isValid = !!url
  const isImage = isValid && /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)
  const isVideo = isValid && /\.(mp4|mov|webm)(\?|$)/i.test(url)
  const isPDF   = isValid && /\.pdf(\?|$)/i.test(url)

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
      <div style={{ background:"var(--bg-card)", borderRadius:16, padding:28, maxWidth:720, width:"100%", maxHeight:"85vh", overflow:"auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ fontSize:16, fontWeight:600 }}>
            {ev.milestoneId === 99 ? "Harvest evidence" : `Milestone ${ev.milestoneId + 1} evidence`}
          </h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text-muted)", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        <div style={{ padding:"10px 14px", background:"var(--bg-surface)", borderRadius:8, marginBottom:14 }}>
          <p style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--text-muted)", marginBottom:4 }}>Content identifier:</p>
          <p style={{ fontSize:12, fontFamily:"var(--font-mono)", color:"var(--gold)", wordBreak:"break-all" }}>{ev.cid}</p>
          <p style={{ fontSize:11, color:"var(--text-dim)", marginTop:6 }}>
            Submitted {new Date(ev.timestamp * 1000).toLocaleString()}
          </p>
        </div>

        {files.length > 1 && (
          <div style={{ padding:"10px 14px", background:"var(--bg-surface)", borderRadius:8, marginBottom:14 }}>
            <p style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--text-muted)", marginBottom:8 }}>Evidence package files</p>
            {files.map((file) => (
              <div key={file.url} style={{ display:"flex", justifyContent:"space-between", gap:12, marginBottom:6 }}>
                <span style={{ fontSize:12, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis" }}>{file.name}</span>
                <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"var(--gold)", textDecoration:"none", flexShrink:0 }}>Open ↗</a>
              </div>
            ))}
          </div>
        )}

        {isImage && (
          <Image src={url} alt="Evidence" width={960} height={640} unoptimized style={{ width:"100%", height:"auto", borderRadius:10, marginBottom:12, maxHeight:420, objectFit:"contain", background:"#000" }} />
        )}
        {isVideo && (
          <video src={url} controls style={{ width:"100%", borderRadius:10, marginBottom:12 }} />
        )}
        {isPDF && (
          <iframe src={url} style={{ width:"100%", height:460, borderRadius:10, border:"none", marginBottom:12 }} title="Evidence" />
        )}
        {!isValid && (
          <div style={{ padding:24, background:"var(--bg-surface)", borderRadius:10, textAlign:"center", marginBottom:12 }}>
            <p style={{ fontSize:20, marginBottom:8 }}>⚠️</p>
            <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:0 }}>Evidence link is invalid or not publicly accessible.</p>
          </div>
        )}
        {isValid && !isImage && !isVideo && !isPDF && (
          <div style={{ padding:24, background:"var(--bg-surface)", borderRadius:10, textAlign:"center", marginBottom:12 }}>
            <p style={{ fontSize:20, marginBottom:8 }}>📎</p>
            <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:12 }}>Document or file (cannot preview inline)</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration:"none" }}>Open in new tab ↗</a>
          </div>
        )}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ textDecoration:"none" }}>Open ↗</a>
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Hook: read EvidenceSubmitted events for a cycle ───────────────────────────
// Evidence CIDs are emitted in events (not stored as strings on-chain).
// We read the last 5000 blocks of logs to find them.
function useEvidenceCIDs(cycleAddress: string): EvidenceCID[] {
  const publicClient = usePublicClient()
  const [evidences, setEvidences] = useState<EvidenceCID[]>([])

  useEffect(() => {
    if (!publicClient || !cycleAddress) return

    const EV_ABI = [{
      name: "EvidenceSubmitted", type: "event",
      inputs: [
        { name: "milestoneId", type: "uint8",   indexed: true },
        { name: "cid",         type: "string",  indexed: false },
        { name: "hash",        type: "bytes32", indexed: false },
      ],
    }] as const

    publicClient.getBlockNumber().then((latestBlock) => publicClient.getLogs({
      address: cycleAddress as `0x${string}`,
      event:   EV_ABI[0] as any,
      fromBlock: latestBlock > 9_999n ? latestBlock - 9_999n : 0n,
      toBlock: latestBlock,
    })).then(async logs => {
      const parsed: EvidenceCID[] = []
      const seen = new Set<number>()
      for (const log of [...logs].reverse()) {
        try {
          const dec = decodeEventLog({ abi: EV_ABI, data: log.data, topics: log.topics }) as { args: { milestoneId: number; cid: string } }
          const id = Number(dec.args.milestoneId)
          if (seen.has(id)) continue
          seen.add(id)
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
          parsed.push({ milestoneId: id, cid: dec.args.cid, timestamp: Number(block.timestamp) })
        } catch {}
      }
      setEvidences(parsed)
    }).catch(() => {})
  }, [publicClient, cycleAddress])

  return evidences
}

// ── Per-cycle approval panel ──────────────────────────────────────────────────
function CyclePanel({ cycleAddr, wallet, isVerifier, onApprove }: {
  cycleAddr:  string
  wallet:     `0x${string}` | undefined
  isVerifier: boolean
  onApprove:  (cycle: string, milestone: number) => Promise<void>
}) {
  const ca  = cycleAddr as `0x${string}`
  const w   = wallet ?? ZERO
  const evidences = useEvidenceCIDs(cycleAddr)
  const [viewing, setViewing] = useState<EvidenceCID | null>(null)

  const { data: meta } = useReadContracts({
    contracts: [
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "cycleName"  as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "state"      as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "category"   as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "location"   as const },
    ],
    query: { refetchInterval: 6000 },
  })

  const { data: mData, refetch: refetchM } = useReadContracts({
    contracts: [
      // For each milestone: approvalCount, quorumReached, myApproval, released, evidenceSubmitted, evidenceCID, evidenceTimestamp
      ...[0,1,2,3].flatMap(id => ([
        { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "approvalCount" as const, args: [ca, id]    as [`0x${string}`, number] },
        { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorumReached" as const, args: [ca, id]    as [`0x${string}`, number] },
        { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "approvals"     as const, args: [ca, id, w] as [`0x${string}`, number, `0x${string}`] },
        { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "milestoneReleased" as const, args: [id] as [number] },
        { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceSubmitted" as const, args: [id] as [number] },
        { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceCID" as const, args: [id] as [number] },
        { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceTimestamp" as const, args: [id] as [number] },
      ])),
      // harvest (milestone 99)
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "approvalCount" as const, args: [ca, 99]    as [`0x${string}`, number] },
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorumReached" as const, args: [ca, 99]    as [`0x${string}`, number] },
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "approvals"     as const, args: [ca, 99, w] as [`0x${string}`, number, `0x${string}`] },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceSubmitted" as const, args: [99] as [number] },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceCID" as const, args: [99] as [number] },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceTimestamp" as const, args: [99] as [number] },
    ],
    query: { refetchInterval: 5000 },
  })

  const cycleState = Number(meta?.[1]?.result ?? 0)
  if (cycleState !== 1) return null   // only show ACTIVE cycles

  const perM = [0,1,2,3].map(i => ({
    id:            i,
    approvalCount: Number(mData?.[i*7+0]?.result ?? 0n),
    quorumReached: (mData?.[i*7+1]?.result as boolean) ?? false,
    iApproved:     (mData?.[i*7+2]?.result as boolean) ?? false,
    released:      (mData?.[i*7+3]?.result as boolean) ?? false,
    evidenceDone:  (mData?.[i*7+4]?.result as boolean) ?? false,
    evidenceCID:   (mData?.[i*7+5]?.result as string) ?? "",
    evidenceTime:  Number(mData?.[i*7+6]?.result ?? 0n),
  }))

  const harvestBase   = 4 * 7
  const harvestCount  = Number(mData?.[harvestBase+0]?.result ?? 0n)
  const harvestQuorum = (mData?.[harvestBase+1]?.result as boolean) ?? false
  const harvestMine   = (mData?.[harvestBase+2]?.result as boolean) ?? false
  const harvestEvDone = (mData?.[harvestBase+3]?.result as boolean) ?? false
  const harvestCID    = (mData?.[harvestBase+4]?.result as string) ?? ""
  const harvestTime   = Number(mData?.[harvestBase+5]?.result ?? 0n)
  const allReleased   = perM.every(m => m.released)

  // Nothing pending → don't show this cycle
  const anyPending = perM.some(m => !m.released && (!m.quorumReached || !m.released)) || (allReleased && !harvestQuorum)
  if (!anyPending) return null

  const name     = (meta?.[0]?.result as string) ?? "…"
  const category = (meta?.[2]?.result as string) ?? ""
  const location = (meta?.[3]?.result as string) ?? ""

  function getEvidence(id: number): EvidenceCID | undefined {
    const cid = id === 99 ? harvestCID : perM.find(m => m.id === id)?.evidenceCID
    const timestamp = id === 99 ? harvestTime : perM.find(m => m.id === id)?.evidenceTime
    if (cid) return { milestoneId: id, cid, timestamp: timestamp ?? 0 }
    return evidences.find(e => e.milestoneId === id)
  }

  async function doApprove(milestoneId: number) {
    try {
      await onApprove(cycleAddr, milestoneId)
      setTimeout(() => refetchM(), 2000)
    } catch {}
  }

  return (
    <>
      {viewing && <EvidenceModal ev={viewing} onClose={() => setViewing(null)} />}

      <div className="card" style={{ padding:22 }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <p style={{ fontWeight:600, fontSize:15, marginBottom:3 }}>{name}</p>
            <p style={{ fontSize:12, color:"var(--text-muted)", marginBottom:4 }}>{category} · 📍 {location}</p>
            <a href={`/cycle/${cycleAddr}`} style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--gold)", textDecoration:"none" }}>
              {cycleAddr.slice(0,10)}…{cycleAddr.slice(-6)} ↗
            </a>
          </div>
          <span style={{ padding:"3px 12px", borderRadius:100, background:"rgba(45,212,160,0.1)", border:"1px solid rgba(45,212,160,0.2)", fontSize:11, fontFamily:"var(--font-mono)", color:"var(--emerald)" }}>ACTIVE</span>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {perM.map(m => {
            const ev = getEvidence(m.id)
            const canApprove = isVerifier && !m.released && !m.iApproved && !m.quorumReached && m.evidenceDone
            return (
              <div key={m.id} style={{ padding:"12px 14px", background:"var(--bg-surface)", borderRadius:8, opacity: m.released ? 0.4 : 1, border: m.evidenceDone && !m.released ? "1px solid rgba(201,168,76,0.2)" : "1px solid transparent" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color: m.released ? "var(--emerald)" : "var(--text-primary)", marginBottom:3 }}>
                      {m.released ? "✓ " : ""}{M_NAMES[m.id]}
                    </p>
                    <p style={{ fontSize:11, fontFamily:"var(--font-mono)", color: m.released ? "var(--emerald)" : m.quorumReached ? "var(--emerald)" : m.evidenceDone ? "var(--warning)" : "var(--text-dim)" }}>
                      {m.released        ? "Capital released to operator"
                      : m.quorumReached  ? "✓ Quorum reached — operator can release capital"
                      : m.evidenceDone   ? `${m.approvalCount}/2 approvals${m.iApproved ? " · you approved" : " · review evidence below"}`
                      :                   "Waiting for operator to submit evidence"}
                    </p>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                    {m.evidenceDone && !m.released && (
                      <button
                        onClick={() => setViewing(ev ?? { milestoneId: m.id, cid: `Evidence on-chain — check EvidenceSubmitted event on ${NETWORK.blockExplorerName}`, timestamp: 0 })}
                        style={{ padding:"5px 12px", borderRadius:5, border:"1px solid rgba(201,168,76,0.35)", background:"rgba(201,168,76,0.06)", fontSize:12, color:"var(--gold)", cursor:"pointer", fontFamily:"var(--font-mono)" }}>
                        📎 View evidence
                      </button>
                    )}
                    {canApprove && <ABtn label="Approve" onClick={() => doApprove(m.id)} />}
                    {m.iApproved && !m.quorumReached && (
                      <span style={{ fontSize:11, color:"var(--emerald)", fontFamily:"var(--font-mono)" }}>✓ You approved</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Harvest milestone — only shown after all 4 capital milestones released */}
          {allReleased && !harvestQuorum && (
            <div style={{ padding:"12px 14px", background:"rgba(127,119,221,0.06)", borderRadius:8, border:"1px solid rgba(127,119,221,0.15)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:3 }}>Final harvest confirmation (milestone 99)</p>
                  <p style={{ fontSize:11, fontFamily:"var(--font-mono)", color: harvestEvDone ? "var(--warning)" : "var(--text-dim)" }}>
                    {harvestEvDone
                      ? `${harvestCount}/2 approvals${harvestMine ? " · you approved" : " · review evidence"}`
                      : "Waiting for operator harvest evidence"}
                  </p>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                  {harvestEvDone && (
                    <button
                      onClick={() => {
                        const ev = getEvidence(99)
                        setViewing(ev ?? { milestoneId: 99, cid: "Evidence on-chain — check EvidenceSubmitted event", timestamp: 0 })
                      }}
                      style={{ padding:"5px 12px", borderRadius:5, border:"1px solid rgba(201,168,76,0.35)", background:"rgba(201,168,76,0.06)", fontSize:12, color:"var(--gold)", cursor:"pointer", fontFamily:"var(--font-mono)" }}>
                      📎 View evidence
                    </button>
                  )}
                  {isVerifier && harvestEvDone && !harvestMine && !harvestQuorum && (
                    <ABtn label="Approve harvest" onClick={() => doApprove(99)} />
                  )}
                  {harvestMine && <span style={{ fontSize:11, color:"var(--emerald)", fontFamily:"var(--font-mono)" }}>✓ You approved</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function ABtn({ label, onClick }: { label: string; onClick: () => Promise<void> }) {
  const [loading, setLoading] = useState(false)
  async function go() { setLoading(true); try { await onClick() } finally { setLoading(false) } }
  return (
    <button onClick={go} disabled={loading}
      style={{ padding:"7px 16px", borderRadius:6, border:"none", background:"linear-gradient(135deg,#7F77DD,#534AB7)", color:"#fff", fontSize:12, fontWeight:500, cursor:"pointer", flexShrink:0, opacity: loading ? 0.6 : 1 }}>
      {loading ? "…" : label}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VerifierPage() {
  const { address } = useAccount()
  const { send, approveAmount } = useWatchedWrite()

  const [stakeAmt,    setStakeAmt]    = useState("")
  const [isStaking,   setIsStaking]   = useState(false)
  const [isUnstaking, setIsUnstaking] = useState(false)
  const [isClaiming,  setIsClaiming]  = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success"|"error"; hash?: string } | null>(null)

  function showToast(msg: string, type: "success"|"error" = "success", hash?: string) {
    setToast({ msg, type, hash }); setTimeout(() => setToast(null), 8000)
  }

  // ── Chain reads — 4s poll so registration shows immediately ──────────────
  const { data, refetch } = useReadContracts({
    contracts: address ? [
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "verifiers",           args: [address] }, // 0 — 5-field struct
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "minimumStake" },                        // 1
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorum" },                               // 2
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "activeVerifierCount" },                  // 3
      { address: CONTRACTS.factory,          abi: FACTORY_V2_ABI,         functionName: "getAllCycles" },                        // 4
      { address: CONTRACTS.stablecoin,       abi: ERC20_ABI,              functionName: "balanceOf", args: [address] },          // 5
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "canUnstake", args: [address] },         // 6
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "activeCycleApprovalsCount", args: [address] }, // 7
      { address: CONTRACTS.stablecoin,       abi: ERC20_ABI,              functionName: "allowance", args: [address, CONTRACTS.verifierRegistry] }, // 8
    ] : [],
    query: { enabled: !!address, refetchInterval: 4000 },
  })

  // Belt-and-suspenders: also read verifierActive() separately
  const { data: activeData } = useReadContracts({
    contracts: address ? [
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "verifierActive", args: [address] },
    ] : [],
    query: { enabled: !!address, refetchInterval: 4000 },
  })

  const vInfo = normalizeVerifierInfo(data?.[0]?.result)

  // Use BOTH struct.active AND the separate verifierActive() view — whichever is true
  const isVerifier    = (vInfo?.active === true) || ((activeData?.[0]?.result as boolean) === true)
  const myStake       = stableAmountToNumber(vInfo?.stake         ?? 0n)
  const pendingRew    = stableAmountToNumber(vInfo?.pendingReward ?? 0n)
  const totalEarned   = stableAmountToNumber(vInfo?.totalEarned   ?? 0n)
  const approvalsGiven = Number(vInfo?.approvalsGiven ?? 0n)
  const minStakeRaw   = data?.[1]?.result as bigint | undefined
  const minStake      = minStakeRaw !== undefined ? stableAmountToNumber(minStakeRaw) : MIN_VERIFIER_STAKE_USDC
  const quorum        = Number(data?.[2]?.result ?? 2n)
  const activeCount   = Number(data?.[3]?.result ?? 0n)
  const allCycles     = (data?.[4]?.result as string[]) ?? []
  const usdcBal       = stableAmountToNumber((data?.[5]?.result as bigint) ?? 0n)
  const canUnstake    = (data?.[6]?.result as boolean) ?? false
  const activeAssignments = Number(data?.[7]?.result ?? 0n)
  const currentAllowance = (data?.[8]?.result as bigint) ?? 0n
  const stakeAmountNumber = Number(stakeAmt) || 0
  const stakeBelowMinimum = !!stakeAmt && stakeAmountNumber < minStake
  const stakeAboveBalance = !!stakeAmt && stakeAmountNumber > usdcBal
  const canRegister = !!stakeAmt && !stakeBelowMinimum && !stakeAboveBalance

  async function handleRegister() {
    if (!stakeAmt || Number(stakeAmt) < minStake) {
      showToast(`Minimum verifier stake is $${minStake.toLocaleString()} USDC.`, "error")
      return
    }
    setIsStaking(true)
    try {
      const amt = parseStableAmount(stakeAmt)
      if (((data?.[5]?.result as bigint) ?? 0n) < amt) {
        throw new Error(`Your ERC-20 USDC balance is below the $${Number(stakeAmt).toLocaleString()} stake amount.`)
      }
      if (currentAllowance < amt) {
        await approveAmount(CONTRACTS.stablecoin, CONTRACTS.verifierRegistry, amt)
      }
      const hash = await send({ address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "registerVerifier", args: [amt] })
      showToast(`Registered! $${stakeAmt} staked — you can now approve milestones.`, "success", hash)
      setStakeAmt("")
      setTimeout(refetch, 1500)
    } catch (e: any) { showToast(e?.shortMessage ?? e?.message ?? "Registration failed", "error") }
    setIsStaking(false)
  }

  async function handleUnstake() {
    setIsUnstaking(true)
    try {
      const hash = await send({ address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "unstake", args: [] })
      showToast(`Unstaked — $${(myStake + pendingRew).toFixed(2)} returned to wallet.`, "success", hash)
      setTimeout(refetch, 1500)
    } catch (e: any) { showToast(e?.shortMessage ?? e?.message ?? "Unstake failed", "error") }
    setIsUnstaking(false)
  }

  async function handleClaim() {
    if (pendingRew <= 0) return
    setIsClaiming(true)
    try {
      const hash = await send({ address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "claimRewards", args: [] })
      showToast(`$${pendingRew.toFixed(4)} USDC rewards claimed!`, "success", hash)
      setTimeout(refetch, 1500)
    } catch (e: any) { showToast(e?.shortMessage ?? e?.message ?? "Claim failed", "error") }
    setIsClaiming(false)
  }

  async function handleApprove(cycle: string, milestone: number) {
    const hash = await send({ address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "approveMilestone", args: [cycle as `0x${string}`, milestone] })
    showToast(`Milestone ${milestone === 99 ? "harvest" : milestone + 1} approved on-chain!`, "success", hash)
    setTimeout(refetch, 2000)
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!address) return (
    <div style={{ minHeight:"100vh", background:"var(--bg-void)" }}><Navbar />
      <div style={{ maxWidth:500, margin:"120px auto", textAlign:"center", padding:"0 32px" }}>
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:400, marginBottom:12 }}>Verifier portal</h2>
        <p style={{ color:"var(--text-muted)", fontSize:14, marginBottom:28 }}>Connect wallet to stake and approve milestones.</p>
        <ConnectWallet />
      </div>
    </div>
  )

  const estPerCycle = activeCount > 0 ? "Varies by stake and cycle profit" : "—"

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-void)" }}>
      <Navbar />
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"48px 32px" }}>

        {/* Header */}
        <div style={{ marginBottom:32 }}>
          <p style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--gold)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Verifier portal</p>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:36, fontWeight:400, marginBottom:8 }}>Stake. Verify. Earn.</h1>
          <p style={{ fontSize:14, color:"var(--text-muted)", maxWidth:580, lineHeight:1.7 }}>
            Review operator evidence on-chain, approve milestones, and earn <strong style={{ color:"var(--gold)" }}>0.5% of gross profit</strong> from every completed cycle, split proportionally by active verifier stake.
          </p>
        </div>

        {/* Status chips */}
        <div style={{ display:"flex", gap:10, marginBottom:32, flexWrap:"wrap" }}>
          <div style={{ padding:"10px 18px", borderRadius:8, background: isVerifier ? "rgba(45,212,160,0.08)" : "var(--bg-card)", border:`1px solid ${isVerifier ? "rgba(45,212,160,0.25)" : "var(--border)"}`, fontSize:13, color: isVerifier ? "var(--emerald)" : "var(--text-muted)" }}>
            {isVerifier ? `✓ Active verifier · $${myStake.toLocaleString(undefined,{maximumFractionDigits:0})} staked` : "Not registered"}
          </div>
          <div style={{ padding:"10px 18px", borderRadius:8, background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:13, fontFamily:"var(--font-mono)", color:"var(--text-muted)" }}>
            {activeCount} active · quorum {quorum} · min ${ minStake.toLocaleString()}
          </div>
          <div style={{ padding:"10px 18px", borderRadius:8, background:"var(--bg-card)", border:"1px solid var(--border)", fontSize:12, fontFamily:"var(--font-mono)", color:"var(--text-muted)" }}>
            Registry {CONTRACTS.verifierRegistry.slice(0,10)}…{CONTRACTS.verifierRegistry.slice(-6)}
          </div>
          {isVerifier && pendingRew > 0.0001 && (
            <button onClick={handleClaim} disabled={isClaiming} style={{ padding:"10px 18px", borderRadius:8, background:"rgba(201,168,76,0.1)", border:"1px solid rgba(201,168,76,0.3)", fontSize:13, color:"var(--gold)", cursor:"pointer" }}>
              {isClaiming ? "Claiming…" : `Claim $${pendingRew.toFixed(4)} USDC`}
            </button>
          )}
        </div>

        <div style={{ display:"grid", gridTemplateColumns: isVerifier ? "1fr 280px" : "1fr 380px", gap:24 }}>

          {/* Left: cycle list */}
          <div>
            <h3 style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Cycles requiring verification</h3>
            <p style={{ fontSize:12, color:"var(--text-muted)", marginBottom:16, lineHeight:1.7 }}>
              Each milestone shows whether the operator has uploaded evidence. Click <strong>View evidence</strong> to review it, then <strong>Approve</strong> if satisfied. Capital unlocks when {quorum} verifiers approve.
            </p>
            {allCycles.length === 0 ? (
              <div className="card" style={{ padding:48, textAlign:"center" }}>
                <p style={{ color:"var(--text-muted)" }}>No cycles deployed yet.</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {allCycles.map(addr => (
                  <CyclePanel key={addr} cycleAddr={addr} wallet={address} isVerifier={isVerifier}
                    onApprove={handleApprove} />
                ))}
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {isVerifier ? (
              <>
                {/* Stats */}
                <div className="card" style={{ padding:22 }}>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Your stats</p>
                  {[
                    { label:"Staked",             value:`$${myStake.toLocaleString(undefined,{maximumFractionDigits:2})}` },
                    { label:"Pending rewards",    value:`$${pendingRew.toFixed(4)}`,   color: pendingRew>0 ? "var(--gold)" : undefined },
                    { label:"Lifetime earned",    value:`$${totalEarned.toFixed(4)}` },
                    { label:"Milestones approved",value:approvalsGiven.toString() },
                    { label:"Open assignments",   value:activeAssignments.toString() },
                  ].map(s => (
                    <div key={s.label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                      <span style={{ fontSize:12, color:"var(--text-muted)" }}>{s.label}</span>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:13, color:(s as any).color ?? "var(--text-primary)" }}>{s.value}</span>
                    </div>
                  ))}
                  {pendingRew > 0.0001 && (
                    <button className="btn-primary" style={{ width:"100%", marginTop:14, background:"linear-gradient(135deg,#C9A84C,#9a7a30)" }} onClick={handleClaim} disabled={isClaiming}>
                      {isClaiming ? "Claiming…" : `Claim $${pendingRew.toFixed(4)} USDC`}
                    </button>
                  )}
                </div>

                {/* How you earn */}
                <div className="card" style={{ padding:20 }}>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>How you earn</p>
                  {[
                    ["Source",    "0.5% of gross profit from every completed cycle"],
                    ["Split",     "Distributed in proportion to each active verifier stake"],
                    ["Per cycle", `${estPerCycle} USDC per completed cycle`],
                    ["Paid",      "Auto-credited when cycle distributes"],
                    ["Withdraw",  "Claim any time, or on unstake"],
                  ].map(([k,v]) => (
                    <div key={k} style={{ marginBottom:8 }}>
                      <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>{k}</p>
                      <p style={{ fontSize:12, color:"var(--text-primary)", lineHeight:1.5 }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Unstake */}
                <div className="card" style={{ padding:20, borderColor:"rgba(224,82,82,0.15)" }}>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Unstake</p>
                  <p style={{ fontSize:12, color:"var(--text-muted)", marginBottom:14, lineHeight:1.6 }}>
                    Returns ${(myStake + pendingRew).toLocaleString(undefined,{maximumFractionDigits:2})} (stake + rewards). You can only unstake after every unfinished cycle you approved has been completed or distributed.
                  </p>
                  {activeAssignments > 0 && (
                    <div style={{ padding:12, background:"rgba(224,82,82,0.08)", border:"1px solid rgba(224,82,82,0.18)", borderRadius:8, marginBottom:12 }}>
                      <p style={{ fontSize:12, color:"var(--danger)", lineHeight:1.6 }}>
                        You still have {activeAssignments} unfinished verifier assignment{activeAssignments === 1 ? "" : "s"} tied to live cycles, so unstaking is locked for safety.
                      </p>
                    </div>
                  )}
                  <button className="btn-ghost" style={{ width:"100%", color:"var(--danger)", borderColor:"rgba(224,82,82,0.3)" }} onClick={handleUnstake} disabled={isUnstaking || !canUnstake}>
                    {isUnstaking ? "Unstaking…" : `Unstake $${(myStake+pendingRew).toLocaleString(undefined,{maximumFractionDigits:2})}`}
                  </button>
                  {!canUnstake && (
                    <p style={{ fontSize:11, color:"var(--text-dim)", marginTop:10, lineHeight:1.5 }}>
                      Unstake unlocks automatically after those active cycles are no longer in progress.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Register */}
                <div className="card" style={{ padding:24 }}>
                  <h3 style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Become a verifier</h3>
                  <p style={{ fontSize:12, color:"var(--text-muted)", marginBottom:16, lineHeight:1.7 }}>
                    Stake USDC, review operator evidence, and approve milestones to earn protocol fees automatically.
                  </p>

                  {/* Reward perks highlight */}
                  <div style={{ padding:14, background:"rgba(201,168,76,0.06)", border:"1px solid rgba(201,168,76,0.2)", borderRadius:8, marginBottom:16 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:"var(--gold)", marginBottom:8 }}>💰 Verifier rewards</p>
                    {[
                      ["Earn",   "0.5% of gross profit per completed cycle"],
                      ["Split",  `Pro rata by stake across ${activeCount || "—"} active verifiers`],
                      ["Est.",   `${estPerCycle} USDC per cycle`],
                      ["Payout", "Automatic when cycle distributes"],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:"flex", gap:8, marginBottom:5 }}>
                        <span style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--gold)", minWidth:36 }}>{k}</span>
                        <span style={{ fontSize:11, color:"var(--text-muted)" }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding:12, background:"var(--bg-surface)", borderRadius:8, fontSize:12, marginBottom:14 }}>
                    {[
                      ["Min stake",     `$${minStake.toLocaleString()} USDC`],
                      ["Your balance",  `$${usdcBal.toLocaleString(undefined,{maximumFractionDigits:0})} USDC`],
                      ["Approved",      `$${stableAmountToNumber(currentAllowance).toLocaleString(undefined,{maximumFractionDigits:2})} USDC`],
                      ["Slash risk",    "Only if you approve fraudulent milestones"],
                      ["Unstake",       "Any time you choose"],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ color:"var(--text-muted)" }}>{k}</span>
                        <span style={{ fontFamily:"var(--font-mono)" }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:12, color:"var(--text-muted)", display:"block", marginBottom:5 }}>Stake amount (USDC)</label>
                    <input type="number" placeholder={`${minStake}`} value={stakeAmt} onChange={e => setStakeAmt(e.target.value)} min={minStake} />
                  </div>
                  <button className="btn-primary" style={{ width:"100%" }} onClick={handleRegister} disabled={isStaking || !canRegister}>
                    {isStaking ? "Staking…" : "Stake & register as verifier →"}
                  </button>
                  {stakeBelowMinimum && (
                    <p style={{ fontSize:11, color:"var(--danger)", textAlign:"center", marginTop:8 }}>Minimum stake is ${minStake.toLocaleString()} USDC.</p>
                  )}
                  {stakeAboveBalance && (
                    <p style={{ fontSize:11, color:"var(--danger)", textAlign:"center", marginTop:8 }}>Your ERC-20 USDC balance is too low for this stake amount.</p>
                  )}
                  {usdcBal < minStake && (
                    <Link href="/faucet" style={{ display:"block", textAlign:"center", marginTop:10, fontSize:12, color:"var(--gold)", textDecoration:"none" }}>Need USDC? → Faucet</Link>
                  )}
                </div>

                <div className="card" style={{ padding:20 }}>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>How verification works</p>
                  {[
                    "Operator submits milestone evidence (image, video, PDF)",
                    "Evidence CID is stored on-chain permanently",
                    `You click View Evidence to review it`,
                    "Click Approve if you are satisfied",
                    `Capital releases to operator once ${quorum} verifiers approve`,
                    "You earn 0.5% of cycle profit when cycle completes",
                  ].map((s,i) => (
                    <p key={i} style={{ fontSize:12, color:"var(--text-muted)", marginBottom:7, paddingLeft:16, position:"relative", lineHeight:1.5 }}>
                      <span style={{ position:"absolute", left:0, color:"var(--gold)", fontWeight:700 }}>{i+1}.</span>{s}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span style={{ fontSize:16, flexShrink:0 }}>{toast.type === "success" ? "✓" : "✕"}</span>
          <div>
            <p>{toast.msg}</p>
            {toast.hash && <a href={`${NETWORK.blockExplorer}/tx/${toast.hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"var(--gold)", fontFamily:"var(--font-mono)", textDecoration:"none" }}>View on {NETWORK.blockExplorerName} ↗</a>}
          </div>
        </div>
      )}
    </div>
  )
}
