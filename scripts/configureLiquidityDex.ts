import pkg from "hardhat"
const { ethers, network } = pkg
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const APEXISWAP_ARC_TESTNET = {
  factory: "0x2B865487A1008D2694C1D367c761f00a564aCECb",
  router: "0x437b1aBf6e5a69548849b15EC35f83A73Fa1E28F",
}

async function main() {
  const [deployer] = await ethers.getSigners()
  const depPath = path.join(__dirname, "..", "deployments", `${network.name}.json`)
  const deployment = JSON.parse(fs.readFileSync(depPath, "utf8"))
  const liquidityManager = deployment.LiquidityManager
  if (!liquidityManager) throw new Error("Missing LiquidityManager in deployment file")

  const dexFactory = process.env.DEX_FACTORY || (network.name === "arcTestnet" ? APEXISWAP_ARC_TESTNET.factory : "")
  const dexRouter = process.env.DEX_ROUTER || (network.name === "arcTestnet" ? APEXISWAP_ARC_TESTNET.router : "")
  if (!dexFactory || !dexRouter) {
    throw new Error("Set DEX_FACTORY and DEX_ROUTER for this network")
  }

  const lm = await ethers.getContractAt("LiquidityManager", liquidityManager)
  console.log("Configuring LiquidityManager DEX")
  console.log("Network:", network.name)
  console.log("Deployer:", deployer.address)
  console.log("LiquidityManager:", liquidityManager)
  console.log("Factory:", dexFactory)
  console.log("Router:", dexRouter)

  const tx = await lm.setDex(dexFactory, dexRouter)
  console.log("setDex tx:", tx.hash)
  await tx.wait()

  deployment.dexFactory = dexFactory
  deployment.dexRouter = dexRouter
  deployment.dexConfiguredAt = new Date().toISOString()
  fs.writeFileSync(depPath, JSON.stringify(deployment, null, 2))

  console.log("DEX configured.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
