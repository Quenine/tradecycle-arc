import pkg from "hardhat"
const { ethers, network } = pkg
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const abi = [
  "function stablecoin() view returns (address)",
  "function factory() view returns (address)",
  "function owner() view returns (address)",
  "function minimumStake() view returns (uint256)",
  "function quorum() view returns (uint256)",
  "function vault() view returns (address)",
  "function liquidityManager() view returns (address)",
  "function verifierRegistry() view returns (address)",
  "function collateralVault() view returns (address)",
  "function reservePool() view returns (address)",
  "function treasury() view returns (address)",
  "function liquidityVault() view returns (address)",
  "function approvalMode() view returns (uint8)",
  "function setFactory(address)",
  "function setVault(address)",
  "function setLiquidityManager(address)",
]

type Deployment = Record<string, string | number>
type Status = "PASS" | "FAIL" | "N/A"

type Row = {
  target: string
  check: string
  status: Status
  details: string
}

type RepairSpec = {
  target: string
  address: string
  getter: string
  setter: string
  expected: string
}

const repairMode =
  process.env.REPAIR_ARC_WIRING === "true" ||
  process.env.npm_lifecycle_event === "repair:arc" ||
  process.argv.slice(2).includes("repair")

function deploymentPath() {
  return path.join(__dirname, "..", "deployments", "arcTestnet.json")
}

function asAddress(value: unknown, key: string): string {
  if (typeof value !== "string" || !ethers.isAddress(value) || value === ZERO_ADDRESS) {
    throw new Error(`Invalid deployment address for ${key}`)
  }
  return ethers.getAddress(value)
}

function optionalAddress(value: unknown): string | undefined {
  if (typeof value !== "string" || value === "") return undefined
  if (!ethers.isAddress(value) || value === ZERO_ADDRESS) return undefined
  return ethers.getAddress(value)
}

function eq(a: string, b: string) {
  return ethers.getAddress(a) === ethers.getAddress(b)
}

function fmt(value: unknown) {
  if (typeof value === "bigint") return value.toString()
  return String(value)
}

function printRows(title: string, rows: Row[]) {
  console.log(`\n${title}`)
  console.table(rows.map((row) => ({
    Contract: row.target,
    Check: row.check,
    Status: row.status,
    Details: row.details,
  })))
}

async function tryRead(contract: any, fn: string): Promise<{ ok: true; value: unknown } | { ok: false; reason: string }> {
  try {
    return { ok: true, value: await contract[fn]() }
  } catch (error: any) {
    return { ok: false, reason: error?.shortMessage ?? error?.message ?? "not exposed" }
  }
}

async function checkAddressGetter(rows: Row[], target: string, contract: any, getter: string, expected: string) {
  const result = await tryRead(contract, getter)
  if (!result.ok) {
    rows.push({ target, check: `${getter}()`, status: "N/A", details: "Not exposed by this contract" })
    return
  }

  const actual = fmt(result.value)
  rows.push({
    target,
    check: `${getter}()`,
    status: ethers.isAddress(actual) && eq(actual, expected) ? "PASS" : "FAIL",
    details: `${actual} expected ${expected}`,
  })
}

async function checkReadable(rows: Row[], target: string, contract: any, getter: string) {
  const result = await tryRead(contract, getter)
  rows.push({
    target,
    check: `${getter}() readable`,
    status: result.ok ? "PASS" : "N/A",
    details: result.ok ? fmt(result.value) : "Not exposed by this contract",
  })
}

async function getOwner(contract: any): Promise<string | undefined> {
  const owner = await tryRead(contract, "owner")
  if (!owner.ok) return undefined
  const value = fmt(owner.value)
  return ethers.isAddress(value) ? ethers.getAddress(value) : undefined
}

async function maybeRepair(spec: RepairSpec, signerAddress: string) {
  const contract = await ethers.getContractAt(abi, spec.address)
  const current = fmt(await contract[spec.getter]())
  if (ethers.isAddress(current) && eq(current, spec.expected)) return undefined

  const owner = await getOwner(contract)
  if (!owner) {
    throw new Error(`${spec.target}.${spec.setter} cannot be repaired because owner() is not exposed`)
  }
  if (!eq(owner, signerAddress)) {
    throw new Error(`${spec.target}.${spec.setter} cannot be repaired: signer ${signerAddress} is not owner ${owner}`)
  }

  console.log(`Repairing ${spec.target}.${spec.setter} -> ${spec.expected}`)
  const tx = await contract[spec.setter](spec.expected)
  console.log(`${spec.target}.${spec.setter} tx: ${tx.hash}`)
  await tx.wait()

  const updated = fmt(await contract[spec.getter]())
  if (!ethers.isAddress(updated) || !eq(updated, spec.expected)) {
    throw new Error(`${spec.target}.${spec.setter} repair did not persist`)
  }

  return tx.hash as string
}

async function main() {
  if (network.name !== "arcTestnet") {
    throw new Error(`verifyArcDeployment must run on arcTestnet, got ${network.name}`)
  }

  const raw = fs.readFileSync(deploymentPath(), "utf8")
  const deployment = JSON.parse(raw) as Deployment

  const addresses = {
    stablecoin: asAddress(deployment.stablecoin, "stablecoin"),
    VerifierRegistry: asAddress(deployment.VerifierRegistry, "VerifierRegistry"),
    CollateralVault: asAddress(deployment.CollateralVault, "CollateralVault"),
    ReservePool: asAddress(deployment.ReservePool, "ReservePool"),
    ProtocolTreasury: asAddress(deployment.ProtocolTreasury, "ProtocolTreasury"),
    YieldOracle: asAddress(deployment.YieldOracle, "YieldOracle"),
    LiquidityVault: asAddress(deployment.LiquidityVault, "LiquidityVault"),
    LiquidityManager: asAddress(deployment.LiquidityManager, "LiquidityManager"),
    CycleTokenMarketplaceV2: asAddress(deployment.CycleTokenMarketplaceV2, "CycleTokenMarketplaceV2"),
    ProductionCycleFactoryV2: asAddress(deployment.ProductionCycleFactoryV2, "ProductionCycleFactoryV2"),
    MockUSDCFaucet: optionalAddress(deployment.MockUSDCFaucet),
  }

  const [signer] = await ethers.getSigners()
  const signerAddress = signer?.address
  if (repairMode && !signerAddress) {
    throw new Error("REPAIR mode requires a configured arcTestnet signer")
  }
  console.log(`Network: ${network.name}`)
  console.log(`Signer: ${signerAddress ?? "not configured"}`)
  console.log(`Mode: ${repairMode ? "REPAIR" : "VERIFY"}`)

  const bytecodeRows: Row[] = []
  for (const [name, address] of Object.entries(addresses)) {
    if (!address) continue
    const code = await ethers.provider.getCode(address)
    bytecodeRows.push({
      target: name,
      check: "bytecode exists",
      status: code && code !== "0x" ? "PASS" : "FAIL",
      details: address,
    })
  }

  const cv = await ethers.getContractAt(abi, addresses.CollateralVault)
  const vr = await ethers.getContractAt(abi, addresses.VerifierRegistry)
  const lm = await ethers.getContractAt(abi, addresses.LiquidityManager)
  const lv = await ethers.getContractAt(abi, addresses.LiquidityVault)
  const factory = await ethers.getContractAt(abi, addresses.ProductionCycleFactoryV2)
  const treasury = await ethers.getContractAt(abi, addresses.ProtocolTreasury)
  const reservePool = await ethers.getContractAt(abi, addresses.ReservePool)
  const marketplace = await ethers.getContractAt(abi, addresses.CycleTokenMarketplaceV2)
  const yieldOracle = await ethers.getContractAt(abi, addresses.YieldOracle)

  const rows: Row[] = []

  await checkAddressGetter(rows, "CollateralVault", cv, "stablecoin", addresses.stablecoin)
  await checkAddressGetter(rows, "CollateralVault", cv, "factory", addresses.ProductionCycleFactoryV2)
  await checkReadable(rows, "CollateralVault", cv, "owner")

  await checkAddressGetter(rows, "VerifierRegistry", vr, "stablecoin", addresses.stablecoin)
  await checkAddressGetter(rows, "VerifierRegistry", vr, "factory", addresses.ProductionCycleFactoryV2)
  await checkReadable(rows, "VerifierRegistry", vr, "minimumStake")
  await checkReadable(rows, "VerifierRegistry", vr, "quorum")
  await checkReadable(rows, "VerifierRegistry", vr, "owner")

  await checkAddressGetter(rows, "LiquidityManager", lm, "stablecoin", addresses.stablecoin)
  await checkAddressGetter(rows, "LiquidityManager", lm, "factory", addresses.ProductionCycleFactoryV2)
  await checkAddressGetter(rows, "LiquidityManager", lm, "vault", addresses.LiquidityVault)
  await checkReadable(rows, "LiquidityManager", lm, "owner")

  await checkAddressGetter(rows, "LiquidityVault", lv, "stablecoin", addresses.stablecoin)
  await checkAddressGetter(rows, "LiquidityVault", lv, "liquidityManager", addresses.LiquidityManager)
  await checkReadable(rows, "LiquidityVault", lv, "owner")

  await checkAddressGetter(rows, "ProductionCycleFactoryV2", factory, "stablecoin", addresses.stablecoin)
  await checkAddressGetter(rows, "ProductionCycleFactoryV2", factory, "verifierRegistry", addresses.VerifierRegistry)
  await checkAddressGetter(rows, "ProductionCycleFactoryV2", factory, "collateralVault", addresses.CollateralVault)
  await checkAddressGetter(rows, "ProductionCycleFactoryV2", factory, "reservePool", addresses.ReservePool)
  await checkAddressGetter(rows, "ProductionCycleFactoryV2", factory, "treasury", addresses.ProtocolTreasury)
  await checkAddressGetter(rows, "ProductionCycleFactoryV2", factory, "liquidityVault", addresses.LiquidityVault)
  await checkAddressGetter(rows, "ProductionCycleFactoryV2", factory, "liquidityManager", addresses.LiquidityManager)
  await checkReadable(rows, "ProductionCycleFactoryV2", factory, "approvalMode")
  await checkReadable(rows, "ProductionCycleFactoryV2", factory, "owner")

  await checkAddressGetter(rows, "ProtocolTreasury", treasury, "stablecoin", addresses.stablecoin)
  await checkReadable(rows, "ProtocolTreasury", treasury, "owner")

  await checkAddressGetter(rows, "ReservePool", reservePool, "stablecoin", addresses.stablecoin)
  await checkReadable(rows, "ReservePool", reservePool, "owner")

  await checkAddressGetter(rows, "CycleTokenMarketplaceV2", marketplace, "stablecoin", addresses.stablecoin)
  await checkAddressGetter(rows, "CycleTokenMarketplaceV2", marketplace, "treasury", addresses.ProtocolTreasury)
  await checkReadable(rows, "CycleTokenMarketplaceV2", marketplace, "owner")

  await checkReadable(rows, "YieldOracle", yieldOracle, "owner")

  printRows("Bytecode checks", bytecodeRows)
  printRows("Wiring checks", rows)

  const failed = rows.some((row) => row.status === "FAIL") || bytecodeRows.some((row) => row.status === "FAIL")
  const repairable: RepairSpec[] = [
    { target: "CollateralVault", address: addresses.CollateralVault, getter: "factory", setter: "setFactory", expected: addresses.ProductionCycleFactoryV2 },
    { target: "VerifierRegistry", address: addresses.VerifierRegistry, getter: "factory", setter: "setFactory", expected: addresses.ProductionCycleFactoryV2 },
    { target: "LiquidityManager", address: addresses.LiquidityManager, getter: "factory", setter: "setFactory", expected: addresses.ProductionCycleFactoryV2 },
    { target: "LiquidityManager", address: addresses.LiquidityManager, getter: "vault", setter: "setVault", expected: addresses.LiquidityVault },
    { target: "LiquidityVault", address: addresses.LiquidityVault, getter: "liquidityManager", setter: "setLiquidityManager", expected: addresses.LiquidityManager },
  ]

  if (failed && repairMode) {
    const txHashes: string[] = []
    for (const spec of repairable) {
      const txHash = await maybeRepair(spec, signerAddress as string)
      if (txHash) txHashes.push(txHash)
    }
    console.log("\nRepairs performed")
    if (txHashes.length === 0) {
      console.log("None")
    } else {
      txHashes.forEach((hash) => console.log(hash))
    }
  }

  if (failed && !repairMode) {
    throw new Error("Arc deployment verification failed. Run npm run repair:arc only if failures are the safe wiring mismatches listed above.")
  }

  if (repairMode) {
    const postRows: Row[] = []
    await checkAddressGetter(postRows, "CollateralVault", cv, "factory", addresses.ProductionCycleFactoryV2)
    await checkAddressGetter(postRows, "VerifierRegistry", vr, "factory", addresses.ProductionCycleFactoryV2)
    await checkAddressGetter(postRows, "LiquidityManager", lm, "factory", addresses.ProductionCycleFactoryV2)
    await checkAddressGetter(postRows, "LiquidityManager", lm, "vault", addresses.LiquidityVault)
    await checkAddressGetter(postRows, "LiquidityVault", lv, "liquidityManager", addresses.LiquidityManager)
    printRows("Post-repair wiring checks", postRows)
    if (postRows.some((row) => row.status === "FAIL")) {
      throw new Error("Post-repair verification failed")
    }
  }

  console.log("\nArc deployment verification complete.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
