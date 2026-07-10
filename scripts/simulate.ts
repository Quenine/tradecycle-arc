// import { ethers } from "hardhat";
// import { getContracts } from "./getContracts";

// async function main() {

//   const provider = ethers.provider;

//   const operator = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
//   const verifier2 = new ethers.Wallet(process.env.VERIFIER2_PRIVATE_KEY!, provider);

//   const contracts = getContracts();

//   console.log("Operator:", operator.address);
//   console.log("Verifier2:", verifier2.address);

//   const MockUSDC = await ethers.getContractAt(
//     "MockUSDC",
//     contracts.MockUSDC,
//     operator
//   );

//   const Factory = await ethers.getContractAt(
//     "ProductionCycleFactory",
//     contracts.ProductionCycleFactory,
//     operator
//   );

//   const Verifier1 = await ethers.getContractAt(
//     "VerifierRegistry",
//     contracts.VerifierRegistry,
//     operator
//   );

//   const Verifier2 = await ethers.getContractAt(
//     "VerifierRegistry",
//     contracts.VerifierRegistry,
//     verifier2
//   );

//   /* ---------------- NONCE CONTROL ---------------- */

//   let operatorNonce = await provider.getTransactionCount(operator.address, "latest");
//   let verifier2Nonce = await provider.getTransactionCount(verifier2.address, "latest");

//   let tx;

//   /* ---------------- CREATE FRESH CYCLE ---------------- */

//   console.log("Creating fresh cycle...");

// //   tx = await Factory.createCycle(
// //     ethers.parseEther("10000"), // capital
// //     ethers.parseEther("1000"),  // collateral
// //     60 * 60 * 24 * 30,          // duration
// //     5,
// //     5,
// //     "Simulation Cycle",
// //     "SIM01",
// //     { nonce: operatorNonce++ }
// //   );

//   await tx.wait();

//   const cycles = await Factory.getAllCycles();
//   const cycleAddress = cycles[cycles.length - 1];

//   console.log("Using cycle:", cycleAddress);

//   const Cycle = await ethers.getContractAt(
//     "ProductionCycle",
//     cycleAddress,
//     operator
//   );

//   /* ---------------- PREPARE INVESTMENT ---------------- */

//   console.log("Minting stablecoin to operator...");

//   tx = await MockUSDC.mint(
//     operator.address,
//     ethers.parseEther("10000"),
//     { nonce: operatorNonce++ }
//   );

//   await tx.wait();

//   /* ---------------- INVEST ---------------- */

//   console.log("Approving investment...");

//   tx = await MockUSDC.approve(
//     cycleAddress,
//     ethers.parseEther("10000"),
//     { nonce: operatorNonce++ }
//   );

//   await tx.wait();

//   console.log("Investing...");

//   tx = await Cycle.invest(
//     ethers.parseEther("10000"),
//     { nonce: operatorNonce++ }
//   );

//   await tx.wait();

//   /* ---------------- MILESTONE ---------------- */

//   console.log("Verifier1 approving milestone...");

//   tx = await Verifier1.approveMilestone(
//     cycleAddress,
//     0,
//     { nonce: operatorNonce++ }
//   );

//   await tx.wait();

//   console.log("Verifier2 approving milestone...");

//   tx = await Verifier2.approveMilestone(
//     cycleAddress,
//     0,
//     { nonce: verifier2Nonce++ }
//   );

//   await tx.wait();

//   console.log("Releasing milestone...");

//   tx = await Cycle.releaseMilestone(
//     0,
//     { nonce: operatorNonce++ }
//   );

//   await tx.wait();

//   /* ---------------- REVENUE ---------------- */

//   console.log("Injecting revenue...");

//   tx = await MockUSDC.mint(
//     cycleAddress,
//     ethers.parseEther("12000"), // capital + profit
//     { nonce: operatorNonce++ }
//   );

//   await tx.wait();

//   /* ---------------- HARVEST ---------------- */

//   console.log("Verifier1 approving harvest...");

//   tx = await Verifier1.approveMilestone(
//     cycleAddress,
//     99,
//     { nonce: operatorNonce++ }
//   );

//   await tx.wait();

//   console.log("Verifier2 approving harvest...");

//   tx = await Verifier2.approveMilestone(
//     cycleAddress,
//     99,
//     { nonce: verifier2Nonce++ }
//   );

//   await tx.wait();

//   console.log("Submitting harvest...");

//   tx = await Cycle.submitHarvest(
//     { nonce: operatorNonce++ }
//   );

//   await tx.wait();

//   /* ---------------- DISTRIBUTION ---------------- */

//   console.log("Distributing profits...");

//   tx = await Cycle.distribute(
//     { nonce: operatorNonce++ }
//   );

//   await tx.wait();

//   console.log("Withdrawing payout...");

//   tx = await Cycle.withdraw(
//     { nonce: operatorNonce++ }
//   );

//   await tx.wait();

//   console.log("\nLifecycle complete.");
//   console.log("Protocol test successful.");

//   await new Promise((resolve) => setTimeout(resolve, 3000));
//   process.exit(0);
// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });