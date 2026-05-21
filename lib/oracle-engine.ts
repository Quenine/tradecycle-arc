// ============================================================

import { stableAmountToNumber } from "@/lib/token-units"
//  lib/oracle-engine.ts
//
//  Computes yield estimates for display on cycle cards and
//  detail pages. Used as the fallback when the on-chain oracle
//  has no data (because YieldOracle.updateEstimate is onlyOwner
//  and the deployer script must be run separately).
//
//  KEY FIX: the previous version multiplied benchmark ROI by
//  durationYears (e.g. 90/365 = 0.25), producing artificially
//  tiny numbers like 1-2% for short test cycles. That was wrong.
//
//  Real-world RWA cycles have per-cycle ROI, not per-annum.
//  A 90-day cocoa export cycle that returns 22% does so over
//  90 days — not a fraction of 22%. The benchmark range is the
//  FULL cycle return, not annualised.
//
//  If the operator provided expectedRevenue (stored in the oracle
//  or passed explicitly), that always takes priority and the ROI
//  is computed exactly: (revenue - capital) / capital * 100.
// ============================================================

export interface OracleEstimate {
  expectedRevenue:  bigint
  estimatedCost:    bigint
  estimatedProfit:  bigint
  estimatedROI:     number   // gross % for the full cycle
  netROI:           number   // after protocol + reserve fees
  riskScore:        number   // 1–10
  confidence:       "high" | "medium" | "low"
  reasoning:        string
}

// Per-cycle (not per-annum) ROI benchmarks for each category
export const CATEGORY_BENCHMARKS: Record<string, {
  roiMin: number; roiMax: number; baseRisk: number; description: string
}> = {
  "Agricultural":      { roiMin: 12, roiMax: 35, baseRisk: 3, description: "Crop production — seasonal yield tied to harvest cycles" },
  "Trade Finance":     { roiMin:  6, roiMax: 18, baseRisk: 2, description: "Invoice-backed import/export — high predictability" },
  "Commodities":       { roiMin: 10, roiMax: 28, baseRisk: 4, description: "Physical commodity arbitrage — market-price dependent" },
  "Equipment Leasing": { roiMin:  8, roiMax: 16, baseRisk: 2, description: "Capital equipment rental — fixed income, asset-backed" },
  "Energy":            { roiMin: 12, roiMax: 28, baseRisk: 5, description: "Energy production — regulatory and price risk" },
  "Manufacturing":     { roiMin: 10, roiMax: 22, baseRisk: 3, description: "Physical goods manufacturing — input cost and demand risk" },
  "Other":             { roiMin:  8, roiMax: 20, baseRisk: 4, description: "Miscellaneous production cycles" },
}

export function computeOracleEstimate(params: {
  capitalRequired:        bigint
  collateralAmount:       bigint
  durationDays:           number
  category:               string
  protocolFeePercent:     number
  reservePercent:         number
  operatorExpectedRevenue?: bigint  // if provided, always used directly
}): OracleEstimate {
  const { capitalRequired, collateralAmount, durationDays, category,
          protocolFeePercent, reservePercent, operatorExpectedRevenue } = params

  const benchmark  = CATEGORY_BENCHMARKS[category] ?? CATEGORY_BENCHMARKS["Other"]
  const capNum     = stableAmountToNumber(capitalRequired)
  const colNum     = stableAmountToNumber(collateralAmount)
  const colRatio   = capNum > 0 ? colNum / capNum : 0
  const totalFees  = protocolFeePercent + reservePercent

  let expectedRevenue: bigint
  let grossROI: number

  if (operatorExpectedRevenue && operatorExpectedRevenue > capitalRequired) {
    // Operator stated exact revenue — use it, compute ROI precisely
    expectedRevenue = operatorExpectedRevenue
    grossROI = Math.round(
      ((stableAmountToNumber(operatorExpectedRevenue) - capNum) / capNum) * 100
    )
  } else {
    // Benchmark-based estimate — use mid-range as per-cycle return
    // NOT multiplied by duration years — these are cycle-level returns
    const colBonus = Math.min(colRatio * 15, 3)   // better collateral → modest bonus
    grossROI = Math.round((benchmark.roiMin + benchmark.roiMax) / 2 + colBonus)
    grossROI = Math.max(3, grossROI)               // floor at 3% for realism
    const mult = BigInt(Math.round((1 + grossROI / 100) * 10_000))
    expectedRevenue = (capitalRequired * mult) / 10_000n
  }

  const estimatedCost   = capitalRequired
  const estimatedProfit = expectedRevenue - estimatedCost

  // Net ROI investors actually see after fees
  const profitAfterFees = stableAmountToNumber(estimatedProfit) * (1 - totalFees / 100)
  const netROI = capNum > 0 ? Math.round((profitAfterFees / capNum) * 100) : 0

  // Risk scoring: base + duration modifier + collateral credit
  const durationRisk = durationDays > 180 ? 2 : durationDays > 90 ? 1 : 0
  const colCredit    = colRatio >= 0.2 ? -1 : colRatio >= 0.1 ? 0 : 1
  const riskScore    = Math.max(1, Math.min(10, benchmark.baseRisk + durationRisk + colCredit))

  const confidence: "high" | "medium" | "low" =
    (operatorExpectedRevenue && operatorExpectedRevenue > capitalRequired) ? "high" :
    colRatio >= 0.1 && durationDays <= 180 ? "medium" : "low"

  const reasoning = operatorExpectedRevenue && operatorExpectedRevenue > capitalRequired
    ? `Operator-stated revenue: $${stableAmountToNumber(operatorExpectedRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })} — gross ROI ${grossROI}%, net to investors after ${totalFees}% fees: ${netROI}%.`
    : `${category} benchmark ${benchmark.roiMin}–${benchmark.roiMax}% per cycle. Estimated gross: ${grossROI}%, net to investors after ${totalFees}% fees: ${netROI}%.`

  return { expectedRevenue, estimatedCost, estimatedProfit, estimatedROI: grossROI, netROI, riskScore, confidence, reasoning }
}

const RISK_LABELS = ["","Very Low","Low","Moderate","Elevated","High","Significant","Severe","Critical","Extreme","Maximum"]

export function formatOracleEstimate(e: OracleEstimate) {
  return {
    roi:        `${e.estimatedROI}%`,          // gross ROI
    netRoi:     `${e.netROI}%`,                // net ROI after fees
    revenue:    `$${stableAmountToNumber(e.expectedRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    profit:     `$${stableAmountToNumber(e.estimatedProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    risk:       e.riskScore,
    riskLabel:  RISK_LABELS[e.riskScore] ?? `${e.riskScore}/10`,
    confidence: e.confidence,
    reasoning:  e.reasoning,
  }
}
