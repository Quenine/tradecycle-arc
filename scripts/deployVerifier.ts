import pkg from "hardhat";
const { ethers, network } = pkg;
import * as fs from "fs";
import * as path from "path";

const ARC_TESTNET_USDC = "0x3600000000000000000000000000000000000000";
const ERC20_METADATA_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    network.name === "arcTestnet" ? "USDC\n" : "ETH\n"
  );

  const stablecoin =
    process.env.STABLECOIN_ADDRESS ||
    (network.name === "arcTestnet" ? ARC_TESTNET_USDC : "0xaA0A59D10B3d089b8c38dC049A3425734ec0594e");
  console.log("Stablecoin (existing):", stablecoin);
  const stable = await ethers.getContractAt(ERC20_METADATA_ABI, stablecoin);
  const stableDecimals = Number(await stable.decimals());
  const stableSymbol = await stable.symbol();
  console.log(`Stablecoin: ${stableSymbol} (${stableDecimals} decimals)`);

  // Deploy VerifierRegistry
  console.log("Deploying VerifierRegistry…");
  const vr = await (await ethers.getContractFactory("VerifierRegistry")).deploy(
    stablecoin,
    ethers.parseUnits(process.env.MIN_VERIFIER_STAKE ?? "10", stableDecimals)
  );
  await vr.waitForDeployment();
  const verifierRegistry = await vr.getAddress();
  console.log("VerifierRegistry:", verifierRegistry);

  // Save addresses
  const addresses = {
    VerifierRegistry: verifierRegistry,
    MockUSDCFaucet: stablecoin,
    stablecoin,
    stablecoinSymbol: stableSymbol,
    stablecoinDecimals: stableDecimals,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    network: network.name,
  };

  const outPath = path.join(__dirname, "..", "deployments", `${network.name}-verifierRegistry.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));

  console.log("\n✓ Deployment complete!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
