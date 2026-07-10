"use client"

import { useState, useRef } from "react"
import { useAccount, useReadContracts } from "wagmi"
import Link from "next/link"
import Navbar from "@/components/navbar"
import { CONTRACTS, NETWORK } from "@/constants/contracts"
import { FACTORY_V2_ABI } from "@/contracts/abis-v2"
import { PRODUCTION_CYCLE_ABI, VERIFIER_REGISTRY_ABI, COLLATERAL_VAULT_ABI } from "@/contracts/abis"
import ConnectWallet from "@/components/connect-wallet"
import { useWatchedWrite } from "@/hooks/useWatchedWrite"
import { stableAmountToNumber } from "@/lib/token-units"
import { buildEvidenceManifest, getEvidenceFiles, isEvidenceLink, resolveEvidenceUrl, type EvidenceFile } from "@/lib/evidence"

const STATE_L = ["Funding","Active","Harvest submitted","Distributed","Defaulted"]
const STATE_C = ["var(--gold)","var(--emerald)","var(--warning)","#6495ED","var(--danger)"]
const M_PCT   = [40, 30, 20, 10]
const M_NAMES = ["Production start","Mid-cycle checkpoint","Harvest / completion","Final settlement"]

// ── Evidence uploader ─────────────────────────────────────────────────────────
// Stores a URL/CID string. In production, replace the "upload" flow with an
// IPFS pinning service (web3.storage, nft.storage, Pinata). For testnet,
// operators can paste any public URL (Google Drive share, Dropbox, etc).
function EvidenceUploader({ onSubmit, label, disabled }: {
  onSubmit: (cid: string) => Promise<void>
  label:    string
  disabled: boolean
}) {
  const [currentUrl, setCurrentUrl] = useState("")
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function addFileUrl() {
    const trimmed = currentUrl.trim()
    if (!trimmed) return
    if (!isEvidenceLink(trimmed)) {
      alert("Use a public https:// URL, ipfs:// URL, or raw IPFS CID.")
      return
    }
    setFiles((current) => [...current, { name: `${label} file ${current.length + 1}`, url: trimmed }])
    setCurrentUrl("")
  }

  async function handleSubmit() {
    if (files.length === 0) return
    setLoading(true)
    try {
      await onSubmit(buildEvidenceManifest(files))
    } finally {
      setLoading(false)
      setCurrentUrl("")
      setFiles([])
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length > 0) {
      setCurrentUrl("")
      alert(`Selected ${dropped.length} file(s). Upload them to IPFS or a public URL first, then paste each final link below.`)
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{ border: `1px dashed ${dragging ? "var(--gold)" : "var(--border)"}`, borderRadius: 8, padding: "14px 16px", background: dragging ? "rgba(201,168,76,0.04)" : "var(--bg-surface)", marginBottom: 8, cursor: "pointer" }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          multiple
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx"
          style={{ display: "none" }}
          onChange={e => {
            const selected = Array.from(e.target.files ?? [])
            if (selected.length > 0) {
              setCurrentUrl("")
              alert(`Selected ${selected.length} file(s). Upload them to IPFS or a public URL first, then paste each final link below.`)
            }
          }}
        />
        <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginBottom: 4 }}>
          Drop one or more images, PDFs, or videos here
        </p>
        <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center" }}>
          Upload each file to a public URL or IPFS first, then paste every final link below
        </p>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Paste IPFS CID or public file URL"
          value={currentUrl}
          onChange={e => setCurrentUrl(e.target.value)}
          style={{ flex: 1, margin: 0, fontSize: 12 }}
          onKeyDown={e => { if (e.key === "Enter") addFileUrl() }}
        />
        <button
          onClick={addFileUrl}
          disabled={disabled || loading || !currentUrl.trim()}
          style={{ padding: "0 14px", borderRadius: 6, border: "none", background: "var(--gold)", color: "#000", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, opacity: (disabled || loading || !currentUrl.trim()) ? 0.5 : 1 }}
        >
          Add file
        </button>
      </div>
      {files.length > 0 && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "var(--bg-surface)" }}>
          {files.map((file, index) => (
            <div key={`${file.url}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{file.url}</span>
              <button onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 11 }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={disabled || loading || files.length === 0}
        style={{ marginTop: 10, width: "100%", height: 40, borderRadius: 8, border: "none", background: "var(--gold)", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: (disabled || loading || files.length === 0) ? 0.5 : 1 }}
      >
        {loading ? "Submitting…" : `Submit ${files.length} ${files.length === 1 ? "file" : "files"}`}
      </button>
      <p style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 5 }}>
        Stored on-chain as one evidence package so verifiers can review every file for this step.
      </p>
    </div>
  )
}

function EvidenceModal({ label, cid, timestamp, onClose }: { label: string; cid: string; timestamp: number; onClose: () => void }) {
  const files = getEvidenceFiles(cid)
  const fallbackUrl = resolveEvidenceUrl(cid)
  const visibleFiles = files.length > 0 ? files : fallbackUrl ? [{ name: label, url: fallbackUrl }] : []

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
      <div style={{ background:"var(--bg-card)", borderRadius:16, padding:28, maxWidth:720, width:"100%", maxHeight:"85vh", overflow:"auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ fontSize:16, fontWeight:600 }}>{label}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--text-muted)", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:"10px 14px", background:"var(--bg-surface)", borderRadius:8, marginBottom:14 }}>
          <p style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--text-muted)", marginBottom:4 }}>Stored evidence package:</p>
          <p style={{ fontSize:12, fontFamily:"var(--font-mono)", color:"var(--gold)", wordBreak:"break-all" }}>{cid}</p>
          {timestamp > 0 && <p style={{ fontSize:11, color:"var(--text-dim)", marginTop:6 }}>Submitted {new Date(timestamp * 1000).toLocaleString()}</p>}
        </div>
        {visibleFiles.length === 0 ? (
          <p style={{ fontSize:13, color:"var(--danger)" }}>This evidence string is not a valid public URL, IPFS CID, or evidence package.</p>
        ) : visibleFiles.map((file) => (
          <div key={file.url} style={{ padding:"10px 14px", background:"var(--bg-surface)", borderRadius:8, marginBottom:10, display:"flex", justifyContent:"space-between", gap:12 }}>
            <span style={{ fontSize:12, color:"var(--text-primary)", overflow:"hidden", textOverflow:"ellipsis" }}>{file.name}</span>
            <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"var(--gold)", textDecoration:"none", flexShrink:0 }}>Open ↗</a>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Per-cycle panel ───────────────────────────────────────────────────────────
function CyclePanel({ cycleAddr, wallet, globalToast }: {
  cycleAddr:   string
  wallet:      `0x${string}`
  globalToast: (msg: string, type: "success"|"error", hash?: string) => void
}) {
  const { send, approve } = useWatchedWrite()
  const [busy,        setBusy]        = useState("")
  const [openEv,      setOpenEv]      = useState<number | null>(null)  // which milestone evidence uploader is open
  const [viewingEv,   setViewingEv]   = useState<{ label: string; cid: string; timestamp: number } | null>(null)
  const ca = cycleAddr as `0x${string}`

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "cycleName"           as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "state"               as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "operator"            as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "capitalRequired"     as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "totalRaised"         as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "duration"            as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "startTime"           as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "collateralAmount"    as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "expectedRevenue"     as const },
      // milestones
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "milestoneReleased",  args: [0] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "milestoneReleased",  args: [1] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "milestoneReleased",  args: [2] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "milestoneReleased",  args: [3] as const },
      // evidence
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceSubmitted",  args: [0] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceSubmitted",  args: [1] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceSubmitted",  args: [2] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceSubmitted",  args: [3] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceSubmitted",  args: [99] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceCID",        args: [0] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceCID",        args: [1] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceCID",        args: [2] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceCID",        args: [3] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceCID",        args: [99] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceTimestamp",  args: [0] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceTimestamp",  args: [1] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceTimestamp",  args: [2] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceTimestamp",  args: [3] as const },
      { address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "evidenceTimestamp",  args: [99] as const },
      // quorum
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorumReached", args: [ca, 0]  as const },
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorumReached", args: [ca, 1]  as const },
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorumReached", args: [ca, 2]  as const },
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorumReached", args: [ca, 3]  as const },
      { address: CONTRACTS.verifierRegistry, abi: VERIFIER_REGISTRY_ABI, functionName: "quorumReached", args: [ca, 99] as const },
      // collateral
      { address: CONTRACTS.collateralVault, abi: COLLATERAL_VAULT_ABI, functionName: "collateralBalance", args: [wallet] },
    ],
    query: { refetchInterval: 6000 },
  })

  const name      = (data?.[0]?.result as string)  ?? "…"
  const state     = Number(data?.[1]?.result ?? 0)
  const opAddr    = (data?.[2]?.result as string)   ?? ""
  const capRaw    = (data?.[3]?.result as bigint)   ?? 0n
  const raisedRaw = (data?.[4]?.result as bigint)   ?? 0n
  const durSecs   = (data?.[5]?.result as bigint)   ?? 0n
  const startT    = Number(data?.[6]?.result        ?? 0n)
  const settlementRaw = (data?.[8]?.result as bigint) ?? 0n
  const capUSD    = stableAmountToNumber(capRaw)
  const raisedUSD = stableAmountToNumber(raisedRaw)
  const settlementUSD = stableAmountToNumber(settlementRaw)
  const progress  = capUSD > 0 ? Math.min(100, Math.round((raisedUSD / capUSD) * 100)) : 0
  const isExpired = Math.floor(Date.now() / 1000) > startT + Number(durSecs)
  const colOnDeposit = stableAmountToNumber((data?.[33]?.result as bigint) ?? 0n)

  if (opAddr.toLowerCase() !== wallet.toLowerCase()) return null

  const milestones = [0,1,2,3].map(i => ({
    id:           i,
    released:     (data?.[9  + i]?.result as boolean) ?? false,
    evidenceDone: (data?.[13 + i]?.result as boolean) ?? false,
    evidenceCID:  (data?.[18 + i]?.result as string) ?? "",
    evidenceTime: Number(data?.[23 + i]?.result ?? 0n),
    quorumReached:(data?.[28 + i]?.result as boolean) ?? false,
    pct:          M_PCT[i],
    name:         M_NAMES[i],
  }))
  const harvestDone = (data?.[17]?.result as boolean) ?? false
  const harvestCID      = (data?.[22]?.result as string) ?? ""
  const harvestTime     = Number(data?.[27]?.result ?? 0n)
  const harvestQuorum   = (data?.[32]?.result as boolean) ?? false
  const allReleased     = milestones.every(m => m.released)

  const c = STATE_C[state] ?? "var(--text-muted)"

  async function doTx(key: string, fn: () => Promise<string>) {
    setBusy(key)
    try {
      const hash = await fn()
      refetch()
      setTimeout(refetch, 1500)
      return hash
    } catch (e: any) {
      globalToast(e?.shortMessage ?? e?.message ?? "Transaction failed", "error")
      throw e
    } finally {
      setBusy("")
    }
  }

  async function handleSubmitEvidence(milestoneId: number, cid: string) {
    if (milestoneId === 99) {
      const hash = await doTx("ev99", () => send({ address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "submitHarvestEvidence", args: [cid] }))
      globalToast("Harvest evidence submitted — verifiers can now review.", "success", hash)
    } else {
      const hash = await doTx(`ev${milestoneId}`, () => send({ address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "submitMilestoneEvidence", args: [milestoneId, cid] }))
      globalToast(`M${milestoneId + 1} evidence submitted — verifiers can now review.`, "success", hash)
    }
    setOpenEv(null)
  }

  return (
    <>
    {viewingEv && <EvidenceModal label={viewingEv.label} cid={viewingEv.cid} timestamp={viewingEv.timestamp} onClose={() => setViewingEv(null)} />}
    <div className="card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, marginBottom: 4 }}>{name}</h3>
          <a href={`/cycle/${cycleAddr}`} style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", textDecoration: "none" }}>
            {cycleAddr.slice(0,10)}…{cycleAddr.slice(-6)} ↗
          </a>
        </div>
        <span style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontFamily: "var(--font-mono)", background: `${c}11`, border: `1px solid ${c}33`, color: c }}>
          {STATE_L[state] ?? "Unknown"}
        </span>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
          <span style={{ color: "var(--text-muted)" }}>Funding progress</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>${raisedUSD.toLocaleString()} / ${capUSD.toLocaleString()}</span>
        </div>
        <div className="progress-track" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      </div>

      {/* Collateral status */}
      {colOnDeposit > 0 && state === 3 && (
        <div style={{ padding: 12, background: "rgba(45,212,160,0.06)", borderRadius: 8, border: "1px solid rgba(45,212,160,0.2)", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--emerald)" }}>✓ Cycle complete — collateral still in vault</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>${colOnDeposit.toLocaleString()} USDC ready to withdraw</p>
          </div>
          <button onClick={() => doTx("colWithdraw", async () => {
            const colWei = (data?.[33]?.result as bigint) ?? 0n
            return send({ address: CONTRACTS.collateralVault, abi: COLLATERAL_VAULT_ABI, functionName: "withdrawCollateral", args: [colWei] })
          })} disabled={busy === "colWithdraw"}
            style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "var(--emerald)", color: "#000", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>
            {busy === "colWithdraw" ? "…" : "Withdraw"}
          </button>
        </div>
      )}

      {/* ACTIVE state: milestone workflow */}
      {state === 1 && (
        <>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.7 }}>
            For each milestone: <strong>submit evidence</strong> → verifiers review → <strong>release capital</strong> when quorum is reached.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {milestones.map(m => {
              const step = m.released ? "done" : m.quorumReached ? "release" : m.evidenceDone ? "waiting" : "evidence"
              return (
                <div key={m.id} style={{ padding: "14px 16px", borderRadius: 10, background: m.released ? "rgba(45,212,160,0.06)" : "var(--bg-surface)", border: `1px solid ${m.released ? "rgba(45,212,160,0.2)" : m.quorumReached ? "rgba(201,168,76,0.3)" : m.evidenceDone ? "rgba(127,119,221,0.2)" : "var(--border)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: m.released ? "rgba(45,212,160,0.2)" : "var(--bg-surface)", border: `1px solid ${m.released ? "var(--emerald)" : "var(--border)"}`, color: m.released ? "var(--emerald)" : "var(--text-dim)", flexShrink: 0 }}>
                          {m.released ? "✓" : m.id + 1}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: m.released ? "var(--emerald)" : "var(--text-primary)" }}>
                          {m.name}
                        </span>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)" }}>{m.pct}% · ${(capUSD * m.pct / 100).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: m.released ? "var(--emerald)" : m.quorumReached ? "var(--gold)" : m.evidenceDone ? "rgba(127,119,221,0.9)" : "var(--text-dim)", marginLeft: 30 }}>
                        {step === "done"     && "✓ Capital released to your wallet"}
                        {step === "release"  && "✓ Quorum reached — click Release to claim capital"}
                        {step === "waiting"  && "Verifiers reviewing evidence…"}
                        {step === "evidence" && "Step 1: upload evidence for verifiers to review"}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginLeft: 12, flexShrink: 0 }}>
                      {m.evidenceDone && m.evidenceCID && (
                        <button onClick={() => setViewingEv({ label: `M${m.id + 1} evidence`, cid: m.evidenceCID, timestamp: m.evidenceTime })} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid rgba(127,119,221,0.3)", background: "rgba(127,119,221,0.08)", color: "rgba(180,176,255,0.95)", fontSize: 11, cursor: "pointer" }}>
                          View evidence
                        </button>
                      )}
                      {step === "evidence" && (
                        <button onClick={() => setOpenEv(openEv === m.id ? null : m.id)} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.08)", color: "var(--gold)", fontSize: 11, cursor: "pointer" }}>
                          📎 Upload evidence
                        </button>
                      )}
                      {step === "waiting" && m.evidenceDone && (
                        <span style={{ fontSize: 11, color: "rgba(127,119,221,0.9)", fontFamily: "var(--font-mono)" }}>Evidence uploaded ✓</span>
                      )}
                      {step === "release" && (
                        <button onClick={() => doTx(`r${m.id}`, () => send({ address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "releaseMilestone", args: [m.id] }))}
                          disabled={busy === `r${m.id}`}
                          style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "var(--gold)", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: busy === `r${m.id}` ? 0.6 : 1 }}>
                          {busy === `r${m.id}` ? "…" : `Release $${(capUSD * m.pct / 100).toLocaleString()} →`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Evidence uploader (inline, only for the open milestone) */}
                  {openEv === m.id && step === "evidence" && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      <EvidenceUploader
                        label={`M${m.id + 1} evidence`}
                        disabled={busy === `ev${m.id}`}
                        onSubmit={cid => handleSubmitEvidence(m.id, cid)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Harvest section */}
          {allReleased && (
            <div style={{ padding: 16, background: "rgba(127,119,221,0.06)", borderRadius: 10, border: "1px solid rgba(127,119,221,0.2)", marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Final harvest confirmation</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.6 }}>
                Submit final harvest evidence (product delivered, buyer payment received). Verifiers approve, then you can return capital and distribute yield.
              </p>
              {!harvestDone && (
                <>
                  <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-dim)", marginBottom: 8 }}>Step 1: upload harvest evidence</p>
                  <EvidenceUploader label="Harvest evidence" disabled={busy === "ev99"} onSubmit={cid => handleSubmitEvidence(99, cid)} />
                </>
              )}
              {harvestDone && !harvestQuorum && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                  <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(127,119,221,0.9)" }}>
                    Evidence uploaded ✓ — verifiers reviewing…
                  </p>
                  {harvestCID && (
                    <button onClick={() => setViewingEv({ label: "Harvest evidence", cid: harvestCID, timestamp: harvestTime })} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid rgba(127,119,221,0.3)", background: "rgba(127,119,221,0.08)", color: "rgba(180,176,255,0.95)", fontSize: 11, cursor: "pointer" }}>
                      View evidence
                    </button>
                  )}
                </div>
              )}
              {harvestQuorum && (
                <button onClick={() => doTx("harvest", () => send({ address: ca, abi: PRODUCTION_CYCLE_ABI, functionName: "submitHarvest" }))}
                  disabled={busy === "harvest"}
                  style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#7F77DD,#534AB7)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: busy === "harvest" ? 0.6 : 1 }}>
                  {busy === "harvest" ? "…" : "Submit harvest → enter distribution phase"}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Distribution phase */}
      {state === 2 && (
        <div style={{ padding: 16, background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Return capital + distribute yield</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
            Pay the exact settlement amount stored for this cycle. The contract splits fees automatically and investors can then withdraw their principal + yield. <strong>Collateral is either auto-refunded to your wallet on success or remains withdrawable from the vault if auto-release was skipped.</strong>
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              value={settlementUSD > 0 ? settlementUSD.toString() : ""}
              readOnly
              style={{ flex: 1, margin: 0 }}
            />
            <button
              onClick={() => doTx("dist", async () => {
                await approve(CONTRACTS.stablecoin, ca)
                return send({
                  address: ca,
                  abi: PRODUCTION_CYCLE_ABI,
                  functionName: "repayAndDistribute",
                  args: [settlementRaw],
                })
              })}
              disabled={busy === "dist" || settlementRaw <= 0n}
              style={{ padding: "0 16px", borderRadius: 8, border: "none", background: "var(--gold)", color: "#000", fontWeight: 600, fontSize: 13, cursor: "pointer", flexShrink: 0, opacity: (busy === "dist" || settlementRaw <= 0n) ? 0.5 : 1, height: 44 }}>
              {busy === "dist" ? "Processing…" : "Distribute →"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
            Exact amount: ${settlementUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC. Fees auto-deducted on-chain (protocol + reserve + 0.5% verifier rewards)
          </p>
        </div>
      )}

      {state === 1 && isExpired && (
        <div style={{ marginTop: 12, padding: 12, background: "rgba(224,82,82,0.06)", borderRadius: 8, border: "1px solid rgba(224,82,82,0.2)" }}>
          <p style={{ fontSize: 12, color: "var(--danger)" }}>⚠ Cycle exceeded duration. Investors can trigger default. Distribute now to avoid collateral slash.</p>
        </div>
      )}

      {state === 3 && (
        <div style={{ marginTop: 14, padding: 14, background: "rgba(45,212,160,0.06)", borderRadius: 8, border: "1px solid rgba(45,212,160,0.15)", textAlign: "center" }}>
          <p style={{ color: "var(--emerald)", fontWeight: 600, fontSize: 14 }}>✓ Cycle completed and distributed</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Investors can withdraw from their portfolio. If collateral is still shown above, withdraw it from the vault; otherwise it has already been auto-refunded.</p>
        </div>
      )}

      {state === 4 && (
        <div style={{ marginTop: 14, padding: 14, background: "rgba(224,82,82,0.06)", borderRadius: 8, border: "1px solid rgba(224,82,82,0.2)" }}>
          <p style={{ color: "var(--danger)", fontWeight: 600 }}>Cycle defaulted. Collateral was slashed and distributed to investors.</p>
        </div>
      )}
    </div>
    </>
  )
}

// ── Dashboard page ────────────────────────────────────────────────────────────
export default function OperatorDashboard() {
  const { address } = useAccount()
  const [toast, setToast] = useState<{ msg: string; type: "success"|"error"; hash?: string } | null>(null)

  function showToast(msg: string, type: "success"|"error" = "success", hash?: string) {
    setToast({ msg, type, hash }); setTimeout(() => setToast(null), 8000)
  }

  const { data, isLoading } = useReadContracts({
    contracts: address ? [
      { address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "getAllCycles" },
      { address: CONTRACTS.factory, abi: FACTORY_V2_ABI, functionName: "approvedOperators", args: [address] },
    ] : [],
    query: { enabled: !!address, refetchInterval: 10000 },
  })

  const allCycles  = (data?.[0]?.result as string[]) ?? []
  const isApproved = (data?.[1]?.result as boolean)  ?? false

  if (!address) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}><Navbar />
      <div style={{ maxWidth: 500, margin: "120px auto", textAlign: "center", padding: "0 32px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, marginBottom: 12 }}>Operator dashboard</h2>
        <ConnectWallet />
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-void)" }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--gold)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Operator</p>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 400 }}>My cycles</h1>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {isApproved ? (
              <Link href="/operator" className="btn-primary" style={{ textDecoration: "none" }}>+ New cycle</Link>
            ) : (
              <Link href="/operator" className="btn-ghost" style={{ textDecoration: "none" }}>Apply as operator →</Link>
            )}
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading…</div>
        ) : allCycles.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: "center" }}>
            <p style={{ fontSize: 18, color: "var(--text-muted)", marginBottom: 8 }}>No cycles yet</p>
            <Link href="/operator" className="btn-primary" style={{ textDecoration: "none" }}>Create your first cycle</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {allCycles.map(addr => (
              <CyclePanel key={addr} cycleAddr={addr} wallet={address} globalToast={showToast} />
            ))}
            <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", paddingTop: 4 }}>
              Only your cycles shown · Total on protocol: {allCycles.length}
            </p>
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{toast.type === "success" ? "✓" : "✕"}</span>
          <div>
            <p>{toast.msg}</p>
            {toast.hash && <a href={`${NETWORK.blockExplorer}/tx/${toast.hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--gold)", fontFamily: "var(--font-mono)", textDecoration: "none" }}>View on {NETWORK.blockExplorerName} ↗</a>}
          </div>
        </div>
      )}
    </div>
  )
}
