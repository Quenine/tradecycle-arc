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
  const registry = await ethers.getContractAt("VerifierRegistry", deployment.VerifierRegistry)
  const factory = await ethers.getContractAt("ProductionCycleFactoryV2", deployment.ProductionCycleFactoryV2)
  const usdc = await ethers.getContractAt("IERC20", deployment.stablecoin)

  const verifierList: string[] = await registry.getVerifierList()
  const cycles: string[] = await factory.getAllCycles()

  console.log("network", network.name)
  console.log("registry", deployment.VerifierRegistry)
  console.log("factory", await registry.factory())
  console.log("expectedFactory", deployment.ProductionCycleFactoryV2)
  console.log("minimumStake", ethers.formatUnits(await registry.minimumStake(), deployment.stablecoinDecimals ?? 6))
  console.log("quorum", (await registry.quorum()).toString())
  console.log("activeVerifierCount", (await registry.activeVerifierCount()).toString())
  console.log("registryUsdcBalance", ethers.formatUnits(await usdc.balanceOf(deployment.VerifierRegistry), deployment.stablecoinDecimals ?? 6))
  console.log("cycles", cycles.length)

  for (const cycleAddress of cycles) {
    const cycle = await ethers.getContractAt("ProductionCycle", cycleAddress)
    console.log("cycle", cycleAddress, await cycle.cycleSymbol(), "state", (await cycle.state()).toString())
  }

  for (const verifier of verifierList) {
    const info = await registry.verifiers(verifier)
    console.log("verifier", verifier, {
      active: info.active,
      stake: ethers.formatUnits(info.stake, deployment.stablecoinDecimals ?? 6),
      pendingReward: ethers.formatUnits(info.pendingReward, deployment.stablecoinDecimals ?? 6),
      totalEarned: ethers.formatUnits(info.totalEarned, deployment.stablecoinDecimals ?? 6),
      approvalsGiven: info.approvalsGiven.toString(),
      canUnstake: await registry.canUnstake(verifier),
      activeAssignments: (await registry.activeCycleApprovalsCount(verifier)).toString(),
    })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
