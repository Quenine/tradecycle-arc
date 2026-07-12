import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ignoredDirs = new Set([
  ".git",
  "node_modules",
  ".next",
  "out",
  "artifacts",
  "cache",
  "typechain-types",
  "coverage",
  "dist",
  "build",
])
const ignoredFiles = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".env", ".env.local"])
const extensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".json",
  ".md",
  ".css",
  ".scss",
  ".sol",
  ".html",
  ".yml",
  ".yaml",
])
const signatureCodes = [
  [0xfffd],
  [0x00c3, 0x0192],
  [0x00c3, 0x201a],
  [0x00c3, 0x0192, 0x00c6, 0x2019],
  [0x00c3, 0x00a2, 0x00e2, 0x201a, 0x00ac],
  [0x00c3, 0x00a2, 0x00e2, 0x201a, 0x00ac, 0x00e2, 0x201e, 0x00a2],
  [0x00c3, 0x00a2, 0x00e2, 0x201a, 0x00ac, 0x00c5, 0x201c],
  [0x00c3, 0x00a2, 0x00e2, 0x201a, 0x00ac, 0x00c2],
  [0x00c3, 0x00a2, 0x00e2, 0x201a, 0x00ac, 0x00e2, 0x20ac, 0x201c],
  [0x00c3, 0x00a2, 0x00e2, 0x201a, 0x00ac, 0x00e2, 0x20ac],
  [0x00c3, 0x00b0, 0x00c5, 0xb8],
  [0x00c3, 0x00af, 0x00c2, 0x00bf, 0x00c2, 0x00bd],
]
const signatures = signatureCodes.map((codes) => String.fromCodePoint(...codes))
const controlCharPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(path.join(dir, entry.name), files)
      continue
    }
    if (!entry.isFile()) continue
    if (ignoredFiles.has(entry.name)) continue
    const fullPath = path.join(dir, entry.name)
    if (extensions.has(path.extname(entry.name))) files.push(fullPath)
  }
  return files
}

const findings = []
for (const file of walk(root)) {
  const rel = path.relative(root, file)
  const text = fs.readFileSync(file, "utf8")
  text.split(/\r?\n/).forEach((line, index) => {
    for (const signature of signatures) {
      if (line.includes(signature)) {
        findings.push({ file: rel, line: index + 1, signature })
      }
    }
    if (controlCharPattern.test(line)) {
      findings.push({ file: rel, line: index + 1, signature: "control-character" })
    }
  })
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.log(`${finding.file}:${finding.line}: ${finding.signature}`)
  }
  process.exit(1)
}

console.log("Text integrity check passed.")
