import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const BASE_RPC    = process.env.BASE_RPC    || "";
const ARC_RPC     = process.env.ARC_RPC     || "https://rpc.testnet.arc.network";

// ── Why runs: 1? ──────────────────────────────────────────────────────────────
// The Solidity optimizer's `runs` parameter controls the tradeoff between
// deployment cost and runtime gas.
//
//   runs: 200  → optimise for 200+ calls → LARGER bytecode, cheaper per-call gas
//   runs: 1    → optimise for minimal bytecode size → hits 24KB limit less often
//
// ProductionCycleFactoryV2 deploys ProductionCycle inline (the full bytecode is
// embedded in the factory). With runs:200 the combined bytecode exceeds the EVM
// 24KB limit (EIP-170). With runs:1 it stays under.
//
// Runtime gas impact: ~5–15% higher per call. For a testnet RWA protocol where
// deploy is rare and function calls are infrequent, this is the right tradeoff.
// ─────────────────────────────────────────────────────────────────────────────

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1          // minimise bytecode size — avoids 24KB EIP-170 limit
      },
      viaIR: true        // enables cross-function optimisation, reduces size further
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,  // only for local tests — never for mainnet
    },
    baseTestnet: {
      url:      BASE_RPC,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      // No allowUnlimitedContractSize here — contracts must fit within 24KB
    },
    arcTestnet: {
      url:      ARC_RPC,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 5042002,
      // Arc Testnet uses USDC as native gas, but Hardhat deploy flow is standard EVM.
    }
  }
};

export default config;
