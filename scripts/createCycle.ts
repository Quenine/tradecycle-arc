import { ethers, network } from "hardhat";
import { getContracts } from "./getContracts";

const ERC20_METADATA_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const contracts = getContracts();

  const factoryAddress = contracts.ProductionCycleFactoryV2 ?? contracts.factory;
  const stablecoinAddress = contracts.stablecoin ?? contracts.MockUSDCFaucet;
  if (!factoryAddress) throw new Error(`No ProductionCycleFactoryV2 address found for ${network.name}`);
  if (!stablecoinAddress) throw new Error(`No stablecoin address found for ${network.name}`);

  const stable = await ethers.getContractAt(ERC20_METADATA_ABI, stablecoinAddress);
  const stableDecimals = Number(await stable.decimals());
  const stableSymbol = await stable.symbol();
  const units = (value: string) => ethers.parseUnits(value, stableDecimals);

  console.log("Operator:", deployer.address);
  console.log(`Stablecoin: ${stableSymbol} (${stableDecimals} decimals)`);

  const factory = await ethers.getContractAt("ProductionCycleFactoryV2", factoryAddress, deployer);
  const approved = await factory.approvedOperators(deployer.address);

  if (!approved) {
    console.log("Approving operator...");
    await (await factory.approveOperator(deployer.address)).wait();
    console.log("Operator approved");
  }

  console.log("Creating new production cycle...");
  const capitalRequired = units(process.env.CYCLE_CAPITAL ?? "10000");
  const collateralAmount = units(process.env.CYCLE_COLLATERAL ?? "1000");
  const expectedRevenue = units(process.env.CYCLE_EXPECTED_REVENUE ?? "11200");
  const duration = BigInt(Number(process.env.CYCLE_DURATION_DAYS ?? "30") * 24 * 60 * 60);
  const liquidityContribution = units(process.env.CYCLE_LIQUIDITY ?? "0");

  const tx = await factory.createCycle(
    capitalRequired,
    collateralAmount,
    expectedRevenue,
    duration,
    Number(process.env.CYCLE_RESERVE_PERCENT ?? "1"),
    Number(process.env.CYCLE_PROTOCOL_FEE_PERCENT ?? "1"),
    liquidityContribution,
    process.env.CYCLE_NAME ?? "Ibadan Poultry Batch 01",
    process.env.CYCLE_SYMBOL ?? "IBP01",
    process.env.CYCLE_CATEGORY ?? "Agricultural",
    process.env.CYCLE_LOCATION ?? "Ibadan, Nigeria",
    process.env.CYCLE_DESCRIPTION ?? "Commercial broiler poultry farm",
  );

  const receipt = await tx.wait();
  console.log("Transaction:", receipt?.hash);

  const cycles = await factory.getAllCycles();
  console.log("Cycle created:", cycles[cycles.length - 1]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
