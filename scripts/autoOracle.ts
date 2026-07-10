// ============================================================
//  scripts/autoOracle.ts
//
//  Posts yield estimates on-chain for all cycles.
//  Run after deploying cycles:
//    npx hardhat run scripts/autoOracle.ts --network arcTestnet
//    CYCLE_ADDRESS=0x... npx hardhat run scripts/autoOracle.ts --network arcTestnet
// ============================================================

import { ethers, network } from "hardhat"
import * as fs from "fs"
import * as path from "path"

const YIELD_ORACLE_ABI = [
  "function updateEstimate(address cycle, uint256 expectedRevenue, uint256 estimatedCost, uint8 riskScore) external",
  "function estimates(address) view returns (uint256,uint256,uint256,uint256,uint8,bool)",
]

const FACTORY_ABI = [
  "function getAllCycles() view returns (address[])",
]

const CYCLE_ABI = [
  "function capitalRequired() view returns (uint256)",
  "function collateralAmount() view returns (uint256)",
  "function expectedRevenue() view returns (uint256)",
  "function duration() view returns (uint256)",
  "function category() view returns (string)",
  "function cycleName() view returns (string)",
  "function reservePercent() view returns (uint8)",
  "function protocolFeePercent() view returns (uint8)",
]

const CATEGORY_RISK: Record<string, number> = {
  "Agricultural":      3,
  "Trade Finance":     2,
  "Commodities":       4,
  "Equipment Leasing": 2,
  "Energy":            5,
  "Manufacturing":     3,
  "Other":             4,
}

async function main() {
  const [deployer] = await ethers.getSigners()
  const depPath    = path.join(__dirname, `../deployments/${network.name}.json`)
  const dep        = JSON.parse(fs.readFileSync(depPath, "utf8"))
  const stableDecimals = Number(dep.stablecoinDecimals ?? 6)
  const stableUnit = 10 ** stableDecimals

  const factory = new ethers.Contract(dep.ProductionCycleFactoryV2 ?? dep.ProductionCycleFactory, FACTORY_ABI, deployer)
  const oracle  = new ethers.Contract(dep.YieldOracle, YIELD_ORACLE_ABI, deployer)

  const targetCycle = process.env.CYCLE_ADDRESS
  const cycles: string[] = targetCycle ? [targetCycle] : await factory.getAllCycles()

  console.log(`\n🔮 Auto Oracle — processing ${cycles.length} cycle(s)\n`)

  let updated = 0, skipped = 0

  for (const cycleAddr of cycles) {
    try {
      const [,,,,, exists] = await oracle.estimates(cycleAddr)
      if (exists && !targetCycle) {
        skipped++
        continue
      }

      const cycle = new ethers.Contract(cycleAddr, CYCLE_ABI, deployer)
      const [capitalRequired, collateralAmount, onChainRevenue, durationSecs, category, cycleName, reservePercent, protocolFeePercent] = await Promise.all([
        cycle.capitalRequired(),
        cycle.collateralAmount(),
        cycle.expectedRevenue(),
        cycle.duration(),
        cycle.category(),
        cycle.cycleName(),
        cycle.reservePercent(),
        cycle.protocolFeePercent(),
      ])

      const capNum = Number(capitalRequired) / stableUnit
      const durationDays = Math.round(Number(durationSecs) / 86400)

      // Use operator-stated revenue if present, otherwise compute from benchmarks
      let expectedRevenue: bigint
      let grossROI: number

      if (onChainRevenue > capitalRequired) {
        expectedRevenue = onChainRevenue
        grossROI = Math.round(((Number(onChainRevenue) / stableUnit - capNum) / capNum) * 100)
      } else {
        // Fallback: per-cycle benchmark mid-point
        const benchmarks: Record<string, [number, number]> = {
          "Agricultural":      [12, 35],
          "Trade Finance":     [6,  18],
          "Commodities":       [10, 28],
          "Equipment Leasing": [8,  16],
          "Energy":            [12, 28],
          "Manufacturing":     [10, 22],
          "Other":             [8,  20],
        }
        const [lo, hi] = benchmarks[category as string] ?? [8, 20]
        grossROI = Math.round((lo + hi) / 2)
        const mult = BigInt(Math.round((1 + grossROI / 100) * 10_000))
        expectedRevenue = (capitalRequired * mult) / 10_000n
      }

      // Risk scoring
      const colRatio     = Number(collateralAmount) / Number(capitalRequired)
      const baseRisk     = CATEGORY_RISK[category as string] ?? 4
      const durationRisk = durationDays > 180 ? 2 : durationDays > 90 ? 1 : 0
      const colCredit    = colRatio >= 0.2 ? -1 : colRatio >= 0.1 ? 0 : 1
      const riskScore    = Math.max(1, Math.min(10, baseRisk + durationRisk + colCredit))

      const totalFees = Number(reservePercent) + Number(protocolFeePercent)
      const netROI    = Math.round(grossROI * (1 - totalFees / 100))

      console.log(`Cycle: ${cycleName} (${cycleAddr.slice(0,10)}…)`)
      console.log(`  Category: ${category}  ·  Duration: ${durationDays}d  ·  Capital: $${capNum.toLocaleString()}`)
      console.log(`  Gross ROI: ${grossROI}%  ·  Net ROI: ${netROI}%  ·  Risk: ${riskScore}/10`)

      const tx = await oracle.updateEstimate(cycleAddr, expectedRevenue, capitalRequired, riskScore)
      await tx.wait()
      console.log(`  ✓ Posted  (${tx.hash.slice(0, 18)}…)\n`)
      updated++

    } catch (err: any) {
      console.error(`  ✕ Failed: ${cycleAddr}: ${err.message?.slice(0, 100)}\n`)
    }
  }

  console.log(`Done. Updated: ${updated}  Skipped (already set): ${skipped}`)
}

main().catch(e => { console.error(e); process.exit(1) })
