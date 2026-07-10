import pkg from "hardhat"
const { ethers, network } = pkg
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const [deployer] = await ethers.getSigners()
  const depPath = path.join(__dirname, "..", "deployments", `${network.name}.json`)
  const deployment = JSON.parse(fs.readFileSync(depPath, "utf8"))

  const stablecoin = process.env.STABLECOIN_ADDRESS || deployment.stablecoin
  const treasury = process.env.TREASURY_ADDRESS || deployment.ProtocolTreasury
  if (!stablecoin || !treasury) {
    throw new Error("Missing stablecoin or treasury address")
  }

  console.log("Deploying patched CycleTokenMarketplaceV2")
  console.log("Network:", network.name)
  console.log("Deployer:", deployer.address)
  console.log("Stablecoin:", stablecoin)
  console.log("Treasury:", treasury)

  const Marketplace = await ethers.getContractFactory("CycleTokenMarketplaceV2")
  const marketplace = await Marketplace.deploy(stablecoin, treasury)
  await marketplace.waitForDeployment()
  const marketplaceAddress = await marketplace.getAddress()

  deployment.CycleTokenMarketplaceV2 = marketplaceAddress
  deployment.updatedAt = new Date().toISOString()
  deployment.marketplacePatchedAt = deployment.updatedAt
  deployment.marketplacePatchedBy = deployer.address
  fs.writeFileSync(depPath, JSON.stringify(deployment, null, 2))

  console.log("Patched marketplace:", marketplaceAddress)
  console.log("Updated:", depPath)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
