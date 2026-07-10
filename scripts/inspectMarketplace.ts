import pkg from "hardhat"
const { ethers, network } = pkg
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const depPath = path.join(__dirname, "..", "deployments", `${network.name}.json`)
  const deployment = JSON.parse(fs.readFileSync(depPath, "utf8"))
  const marketplaceAddress = deployment.CycleTokenMarketplaceV2
  const factoryAddress = deployment.ProductionCycleFactoryV2
  const stablecoin = deployment.stablecoin

  const marketplace = await ethers.getContractAt("CycleTokenMarketplaceV2", marketplaceAddress)
  const factory = await ethers.getContractAt("ProductionCycleFactoryV2", factoryAddress)
  const cycles: string[] = await factory.getAllCycles()
  const nextOrderId = await marketplace.nextOrderId()
  const fee = await marketplace.tradingFeeBps()
  const feesCollected = await marketplace.totalFeesCollected()

  console.log("network", network.name)
  console.log("marketplace", marketplaceAddress)
  console.log("factory", factoryAddress)
  console.log("stablecoin", stablecoin)
  console.log("nextOrderId", nextOrderId.toString())
  console.log("tradingFeeBps", fee.toString())
  console.log("totalFeesCollected", ethers.formatUnits(feesCollected, deployment.stablecoinDecimals ?? 6))
  console.log("cycles", cycles.length)

  for (const cycleAddress of cycles) {
    const cycle = await ethers.getContractAt("ProductionCycle", cycleAddress)
    const token = await cycle.cycleToken()
    const symbol = await cycle.cycleSymbol()
    const name = await cycle.cycleName()
    const state = await cycle.state()
    const tokenOrders = await marketplace.getTokenOrders(token)
    console.log("cycle", cycleAddress, symbol, name, "state", state.toString(), "token", token, "tokenOrders", tokenOrders.map((id: bigint) => id.toString()).join(",") || "-")
  }

  for (let i = 0n; i < nextOrderId; i++) {
    const order = await marketplace.orders(i)
    console.log("order", i.toString(), {
      seller: order.seller,
      token: order.token,
      amount: ethers.formatUnits(order.amount, 6),
      originalAmount: ethers.formatUnits(order.originalAmount, 6),
      pricePerToken: ethers.formatUnits(order.pricePerToken, deployment.stablecoinDecimals ?? 6),
      active: order.active,
    })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
