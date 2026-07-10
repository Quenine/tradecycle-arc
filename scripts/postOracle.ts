import { ethers, network } from "hardhat"
import * as fs from "fs"
import * as path from "path"

// ============================================================
//  postOracle.ts — Post yield estimates for all deployed cycles
//
//  YieldOracle.updateEstimate is onlyOwner, so regular operators
//  cannot call it from the UI. This script is run by the deployer
//  to post estimates for all cycles.
//
//  Run after any new cycles are created:
//    npx hardhat run scripts/postOracle.ts --network arcTestnet
//
//  For each cycle, reads on-chain data and posts an estimate
//  derived from collateralAmount (10% of capital) and category.
//  If the operator set a description with revenue info, parse it.
//
//  To post with operator-stated revenue, pass it as an env var:
//    CYCLE_ADDR=0x... REVENUE=61000 npx hardhat run scripts/postOracle.ts --network arcTestnet
// ============================================================

const FACTORY_ABI = [
  { name: "getAllCycles", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
] as const

const CYCLE_ABI = [
  { name: "capitalRequired",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "collateralAmount",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "duration",           type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "category",           type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "reservePercent",     type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "protocolFeePercent", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "cycleName",          type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const

const ORACLE_ABI = [
  { name: "updateEstimate", type: "function", stateMutability: "nonpayable", inputs: [{ name: "cycle", type: "address" }, { name: "expectedRevenue", type: "uint256" }, { name: "estimatedCost", type: "uint256" }, { name: "riskScore", type: "uint8" }], outputs: [] },
  { name: "estimates", type: "function", stateMutability: "view", inputs: [{ name: "cycle", type: "address" }], outputs: [{ name: "expectedRevenue", type: "uint256" }, { name: "estimatedCost", type: "uint256" }, { name: "estimatedProfit", type: "uint256" }, { name: "estimatedROI", type: "uint256" }, { name: "riskScore", type: "uint8" }, { name: "exists", type: "bool" }] },
] as const

const CATEGORY_ROI: Record<string, number> = {
  "Agricultural":      22,
  "Trade Finance":     12,
  "Commodities":       18,
  "Equipment Leasing": 12,
  "Energy":            20,
  "Manufacturing":     16,
  "Other":             14,
}

const deployments = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "deployments", `${network.name}.json`), "utf8")
)
const stableDecimals = Number(deployments.stablecoinDecimals ?? 6)
const stableUnit = 10 ** stableDecimals

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log("Posting oracle estimates with:", deployer.address)
  console.log("")

  const factory = await ethers.getContractAt(FACTORY_ABI, deployments.ProductionCycleFactoryV2)
  const oracle  = await ethers.getContractAt(ORACLE_ABI,  deployments.YieldOracle)

  const cycles = await factory.getAllCycles() as string[]
  console.log(`Found ${cycles.length} cycles\n`)

  for (const cycleAddr of cycles) {
    const cycle = await ethers.getContractAt(CYCLE_ABI, cycleAddr)

    const [capitalRequired, collateralAmount, duration, category, reservePct, protocolPct, cycleName] = await Promise.all([
      cycle.capitalRequired(),
      cycle.collateralAmount(),
      cycle.duration(),
      cycle.category(),
      cycle.reservePercent(),
      cycle.protocolFeePercent(),
      cycle.cycleName(),
    ])

    // Check if oracle data already exists
    const existing = await oracle.estimates(cycleAddr)
    if (existing.exists) {
      console.log(`SKIP  ${cycleName} — oracle already set (ROI: ${existing.estimatedROI}%)`)
      continue
    }

    const capNum      = Number(capitalRequired) / stableUnit
    const colNum      = Number(collateralAmount) / stableUnit
    const colRatio    = capNum > 0 ? colNum / capNum : 0
    const durDays     = Number(duration) / 86400
    const totalFees   = Number(reservePct) + Number(protocolPct)

    // Use category benchmark mid-point as per-cycle ROI
    const midROI   = CATEGORY_ROI[category] ?? 14
    const colBonus = Math.min(colRatio * 15, 3)
    const grossROI = Math.round(midROI + colBonus)

    const expectedRevenue = BigInt(Math.round(capNum * (1 + grossROI / 100) * stableUnit))
    const estimatedCost   = capitalRequired

    const durationRisk = durDays > 180 ? 2 : durDays > 90 ? 1 : 0
    const colCredit    = colRatio >= 0.2 ? -1 : colRatio >= 0.1 ? 0 : 1
    const baseRisk     = category === "Trade Finance" || category === "Equipment Leasing" ? 2 :
                         category === "Agricultural" || category === "Manufacturing" ? 3 :
                         category === "Energy" ? 5 : 4
    const riskScore    = Math.max(1, Math.min(10, baseRisk + durationRisk + colCredit))

    console.log(`POST  ${cycleName}`)
    console.log(`      Capital: $${capNum.toLocaleString()} · Collateral: $${colNum.toLocaleString()} (${(colRatio*100).toFixed(0)}%)`)
    console.log(`      Gross ROI: ${grossROI}% · Net: ~${Math.round(grossROI * (1 - totalFees/100))}% · Risk: ${riskScore}/10`)

    try {
      const tx = await oracle.updateEstimate(cycleAddr, expectedRevenue, estimatedCost, riskScore)
      await tx.wait()
      console.log(`      ✓ Posted (tx: ${tx.hash})`)
    } catch (e: any) {
      console.error(`      ✗ Failed: ${e.message?.slice(0, 80)}`)
    }
    console.log("")
  }

  console.log("Done")
}

main().catch(e => { console.error(e); process.exit(1) })
