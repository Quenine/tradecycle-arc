import { formatUnits, parseUnits } from "viem"
import { PROFIT_PER_TOKEN_DECIMALS, SHARE_TOKEN_DECIMALS, STABLECOIN } from "@/constants/contracts"

export const PROFIT_PER_TOKEN_SCALE = 10n ** BigInt(PROFIT_PER_TOKEN_DECIMALS)

export function parseStableAmount(value: string) {
  return parseUnits(value, STABLECOIN.decimals)
}

export function formatStableAmount(value: bigint) {
  return formatUnits(value, STABLECOIN.decimals)
}

export function stableAmountToNumber(value: bigint) {
  return Number(formatStableAmount(value))
}

export function parseShareAmount(value: string) {
  return parseUnits(value, SHARE_TOKEN_DECIMALS)
}

export function formatShareAmount(value: bigint) {
  return formatUnits(value, SHARE_TOKEN_DECIMALS)
}

export function shareAmountToNumber(value: bigint) {
  return Number(formatShareAmount(value))
}
