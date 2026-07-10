import pkg from "hardhat";
const { ethers, network } = pkg;
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ERC20_METADATA_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

async function main() {
  const depPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const deployment = JSON.parse(fs.readFileSync(depPath, "utf8")) as {
    stablecoin: string;
    VerifierRegistry: string;
  };

  const registryAddress = process.env.VERIFIER_REGISTRY_ADDRESS || deployment.VerifierRegistry;
  const targetStake = process.env.MIN_VERIFIER_STAKE || "10";

  const stable = await ethers.getContractAt(ERC20_METADATA_ABI, deployment.stablecoin);
  const stableDecimals = Number(await stable.decimals());
  const stableSymbol = await stable.symbol();
  const targetStakeUnits = ethers.parseUnits(targetStake, stableDecimals);

  const registry = await ethers.getContractAt("VerifierRegistry", registryAddress);
  const currentStake = await registry.minimumStake();

  console.log(`Network: ${network.name}`);
  console.log(`VerifierRegistry: ${registryAddress}`);
  console.log(`Stablecoin: ${stableSymbol} (${stableDecimals} decimals)`);
  console.log(`Current minimum stake: ${ethers.formatUnits(currentStake, stableDecimals)} ${stableSymbol}`);
  console.log(`Target minimum stake: ${targetStake} ${stableSymbol}`);

  if (currentStake === targetStakeUnits) {
    console.log("No update needed.");
    return;
  }

  const tx = await registry.setMinimumStake(targetStakeUnits);
  console.log("Transaction:", tx.hash);
  await tx.wait();
  console.log("Minimum verifier stake updated.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
