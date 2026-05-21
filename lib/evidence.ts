export type EvidenceFile = {
  name: string
  url: string
}

export type EvidenceManifest = {
  version?: number
  files?: EvidenceFile[]
}

export function isEvidenceLink(value: string) {
  return /^https?:\/\//i.test(value) || /^(ipfs:\/\/|Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[1-9A-Za-z]{20,})/.test(value)
}

export function buildEvidenceManifest(files: EvidenceFile[]) {
  return JSON.stringify({ version: 1, files })
}

export function parseEvidenceManifest(cidOrUrl: string): EvidenceManifest | null {
  try {
    const parsed = JSON.parse(cidOrUrl) as EvidenceManifest
    if (Array.isArray(parsed.files)) return parsed
  } catch {}
  return null
}

export function resolveEvidenceUrl(cidOrUrl: string): string {
  const manifest = parseEvidenceManifest(cidOrUrl)
  if (manifest?.files?.length) {
    return resolveEvidenceUrl(manifest.files[0].url)
  }

  const raw = cidOrUrl.trim()
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^ipfs:\/\//i.test(raw)) return `https://ipfs.io/ipfs/${raw.replace(/^ipfs:\/\//i, "")}`
  if (/^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/.test(raw) || /^bafy[1-9A-Za-z]{20,}$/.test(raw)) {
    return `https://ipfs.io/ipfs/${raw}`
  }

  return ""
}

export function getEvidenceFiles(cidOrUrl: string): EvidenceFile[] {
  const manifest = parseEvidenceManifest(cidOrUrl)
  if (!manifest?.files?.length) return []
  return manifest.files
    .map((file, index) => ({ name: file.name || `File ${index + 1}`, url: resolveEvidenceUrl(file.url) }))
    .filter((file) => !!file.url)
}
