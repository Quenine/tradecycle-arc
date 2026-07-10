import pkg from "hardhat"
const { ethers, network } = pkg
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ARC_TESTNET_USDC = "0x3600000000000000000000000000000000000000"

const ERC20_METADATA_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]

function stablecoinAddressForNetwork() {
  if (process.env.STABLECOIN_ADDRESS) return process.env.STABLECOIN_ADDRESS
  if (network.name === "arcTestnet") return ARC_TESTNET_USDC
  return ""
}

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log("Deploying with:", deployer.address)
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), network.name === "arcTestnet" ? "USDC\n" : "ETH\n")

  let mockUSDCFaucet: string | undefined
  let stablecoin = stablecoinAddressForNetwork()

  if (!stablecoin) {
    console.log("1/10 MockUSDCFaucet...")
    const faucet = await (await ethers.getContractFactory("MockUSDCFaucet")).deploy()
    await faucet.waitForDeployment()
    mockUSDCFaucet = await faucet.getAddress()
    stablecoin = mockUSDCFaucet
  } else {
    console.log("1/10 Using configured stablecoin:", stablecoin)
  }

  const stable = await ethers.getContractAt(ERC20_METADATA_ABI, stablecoin)
  const stableDecimals = Number(await stable.decimals())
  const stableSymbol = await stable.symbol()
  const units = (value: string) => ethers.parseUnits(value, stableDecimals)
  const minimumVerifierStake = units(process.env.MIN_VERIFIER_STAKE ?? "10")
  console.log(`Stablecoin: ${stableSymbol} (${stableDecimals} decimals)`)

  console.log("2/10 VerifierRegistry...")
  const vr = await (await ethers.getContractFactory("VerifierRegistry")).deploy(
    stablecoin,
    minimumVerifierStake,
  )
  await vr.waitForDeployment()
  const verifierRegistry = await vr.getAddress()

  console.log("3/9 CollateralVault...")
  const cv = await (await ethers.getContractFactory("CollateralVault")).deploy(stablecoin)
  await cv.waitForDeployment()
  const collateralVault = await cv.getAddress()

  console.log("4/9 ReservePool...")
  const rp = await (await ethers.getContractFactory("ReservePool")).deploy(stablecoin)
  await rp.waitForDeployment()
  const reservePool = await rp.getAddress()

  console.log("5/9 ProtocolTreasury...")
  const pt = await (await ethers.getContractFactory("ProtocolTreasury")).deploy(stablecoin)
  await pt.waitForDeployment()
  const treasury = await pt.getAddress()

  console.log("6/9 YieldOracle...")
  const yo = await (await ethers.getContractFactory("YieldOracle")).deploy()
  await yo.waitForDeployment()
  const yieldOracle = await yo.getAddress()

  console.log("7/10 LiquidityVault...")
  const lv = await (await ethers.getContractFactory("LiquidityVault")).deploy(stablecoin)
  await lv.waitForDeployment()
  const liquidityVault = await lv.getAddress()

  console.log("8/10 LiquidityManager...")
  const lm = await (await ethers.getContractFactory("LiquidityManager")).deploy(stablecoin)
  await lm.waitForDeployment()
  const liquidityManager = await lm.getAddress()

  console.log("9/10 CycleTokenMarketplaceV2...")
  const mp = await (await ethers.getContractFactory("CycleTokenMarketplaceV2")).deploy(stablecoin, treasury)
  await mp.waitForDeployment()
  const tokenMarketplace = await mp.getAddress()

  console.log("10/10 ProductionCycleFactoryV2...")
  const f2 = await (await ethers.getContractFactory("ProductionCycleFactoryV2")).deploy(
    stablecoin,
    verifierRegistry,
    collateralVault,
    reservePool,
    treasury,
    liquidityVault,
    liquidityManager,
  )
  await f2.waitForDeployment()
  const factory = await f2.getAddress()

  await (await vr.setFactory(factory)).wait()
  await (await cv.setFactory(factory)).wait()
  await (await lm.setFactory(factory)).wait()
  await (await lm.setVault(liquidityVault)).wait()
  await (await lv.setLiquidityManager(liquidityManager)).wait()
  await (await f2.setApprovalMode(1, 0)).wait()

  const addresses = {
    MockUSDCFaucet: mockUSDCFaucet ?? "",
    stablecoin,
    stablecoinSymbol: stableSymbol,
    stablecoinDecimals: Number(stableDecimals),
    minimumVerifierStake: minimumVerifierStake.toString(),
    VerifierRegistry: verifierRegistry,
    CollateralVault: collateralVault,
    ReservePool: reservePool,
    ProtocolTreasury: treasury,
    YieldOracle: yieldOracle,
    LiquidityVault: liquidityVault,
    LiquidityManager: liquidityManager,
    CycleTokenMarketplaceV2: tokenMarketplace,
    ProductionCycleFactoryV2: factory,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    network: network.name,
  }

  const outPath = path.join(__dirname, "..", "deployments", `${network.name}.json`)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2))

  console.log("\nPaste into rwa-ui/constants/contracts.ts:")
  console.log(`export const CONTRACTS = {
  factory:          "${factory}" as \`0x\${string}\`,
  stablecoin:       "${stablecoin}" as \`0x\${string}\`,
  treasury:         "${treasury}" as \`0x\${string}\`,
  reservePool:      "${reservePool}" as \`0x\${string}\`,
  verifierRegistry: "${verifierRegistry}" as \`0x\${string}\`,
  collateralVault:  "${collateralVault}" as \`0x\${string}\`,
  yieldOracle:      "${yieldOracle}" as \`0x\${string}\`,
  liquidityVault:   "${liquidityVault}" as \`0x\${string}\`,
  liquidityManager: "${liquidityManager}" as \`0x\${string}\`,
  tokenMarketplace: "${tokenMarketplace}" as \`0x\${string}\`,
} as const`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
